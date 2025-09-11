/**
 * Bulletproof Mascot Overlay Controller
 * Triple failsafe system - can NEVER get stuck
 * Version 2.0 - Unstickable
 */
(function() {
    'use strict';
    
    let isFinished = false;
    let hardTimeout = null;
    let overlay = null;
    
    // Triple failsafe finish function
    function finishMascot(reason = 'normal') {
        if (isFinished) return;
        isFinished = true;
        
        console.log('🎭 Mascot finishing:', reason);
        
        try {
            // Find overlay (handle multiple instances)
            overlay = document.getElementById('cbMascotOverlay');
            
            if (overlay) {
                // Add closed class for CSS transition
                overlay.classList.add('cb-mascot--closed');
                overlay.style.pointerEvents = 'none';
            }
            
            // Restore body scroll
            document.body.classList.remove('no-scroll');
            
            // Show main content
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.transition = "opacity 0.6s ease-in-out";
                mainContent.style.opacity = "1";
            }
            
            // Set global flag and dispatch event for consent scheduler
            window.__cbMascotDone = true;
            window.dispatchEvent(new CustomEvent('mascot:finished', { 
                detail: { reason } 
            }));
            
            // Remove overlay from DOM after fade
            setTimeout(() => {
                try {
                    overlay?.remove?.();
                    overlay = null;
                } catch(e) {
                    console.warn('Could not remove mascot overlay:', e);
                }
            }, 120);
            
        } catch(e) {
            console.warn('Error in finishMascot:', e);
        }
        
        // Clear hard timeout
        if (hardTimeout) {
            clearTimeout(hardTimeout);
            hardTimeout = null;
        }
    }
    
    // Global error handlers (failsafe #4)
    function setupGlobalFailsafes() {
        let errorFailsafeCalled = false;
        
        function errorFailsafe() {
            if (!errorFailsafeCalled && !isFinished) {
                errorFailsafeCalled = true;
                finishMascot('error');
            }
        }
        
        window.addEventListener('error', errorFailsafe);
        window.addEventListener('unhandledrejection', errorFailsafe);
        
        // Page visibility failsafe
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible' && !isFinished) {
                finishMascot('visibility-restored');
            }
        });
        
        // Page show failsafe
        window.addEventListener('pageshow', function() {
            if (!isFinished) {
                finishMascot('page-show');
            }
        });
    }
    
    // Initialize mascot system
    function initMascot() {
        // Check kill switches first
        if (window.__cbMascotEnabled === false || document.body.dataset.mascot === "off") {
            console.log('🎭 Mascot disabled via kill switch');
            finishMascot('disabled');
            return;
        }
        
        // Find overlay
        overlay = document.getElementById('cbMascotOverlay');
        
        // Handle multiple overlays - keep first, remove rest
        const allOverlays = document.querySelectorAll('#cbMascotOverlay');
        if (allOverlays.length > 1) {
            console.warn('Multiple mascot overlays found, keeping first, removing rest');
            for (let i = 1; i < allOverlays.length; i++) {
                allOverlays[i].remove();
            }
            overlay = allOverlays[0];
        }
        
        // If no overlay found, finish immediately
        if (!overlay) {
            console.log('🎭 No mascot overlay found, finishing immediately');
            finishMascot('no-overlay');
            return;
        }
        
        console.log('🎭 Initializing mascot overlay');
        
        // Lock body scroll
        document.body.classList.add('no-scroll');
        
        // Hide main content initially
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.opacity = '0';
        }
        
        // Setup skip button (failsafe #2)
        const skipBtn = document.getElementById('cbMascotSkip');
        if (skipBtn) {
            // Multiple event types for maximum compatibility
            ['click', 'touchend', 'mousedown'].forEach(eventType => {
                skipBtn.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('🎭 Skip button pressed');
                    finishMascot('skip');
                }, { passive: false, capture: true });
            });
            
            // Ensure skip button is clickable
            skipBtn.style.pointerEvents = 'auto';
            skipBtn.style.zIndex = '9998';
        }
        
        // Create particles for background
        const particles = document.getElementById('particles');
        if (particles) {
            for (let i = 0; i < 50; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
                particles.appendChild(particle);
            }
        }
        
        // Glass shatter animation
        function createGlassShards() {
            const shardCount = 8;
            for (let i = 0; i < shardCount; i++) {
                const shard = document.createElement('img');
                shard.className = 'glass-shard';
                shard.style.pointerEvents = 'none'; // Prevent shards from blocking clicks
                
                const randomNumber = Math.floor(Math.random() * 5) + 1;
                shard.src = `assets/img/glass${randomNumber}.png`;
                shard.alt = 'Glass shard';
                
                const angle = (i / shardCount) * 2 * Math.PI + (Math.random() * 0.5);
                const distance = 200 + Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                const rotation = Math.random() * 360;
                
                shard.style.setProperty('--x', `${x}px`);
                shard.style.setProperty('--y', `${y}px`);
                shard.style.setProperty('--rotation', `${rotation}deg`);
                shard.style.left = '50%';
                shard.style.top = '50%';
                shard.style.transform = 'translate(-50%, -50%)';
                
                overlay.appendChild(shard);
            }
        }
        
        // Start animation sequence (failsafe #1)
        function startAnimation() {
            console.log("🎭 Starting mascot animation...");
            
            createGlassShards();
            
            setTimeout(() => {
                const shards = document.querySelectorAll('.glass-shard');
                shards.forEach(shard => {
                    shard.classList.add('animate');
                });
            }, 100);
            
            // Auto-finish after 2.5s (failsafe #1)
            setTimeout(() => {
                if (!isFinished) {
                    finishMascot('animation-complete');
                }
            }, 2500);
        }
        
        // Audio handling with fallbacks
        const audio = new Audio("assets/audio/glass-shatter.mp3");
        audio.volume = 0.3;
        audio.preload = "auto";
        
        // Try autoplay with fallbacks
        audio.play().then(() => {
            console.log("✅ Audio autoplay successful!");
            startAnimation();
        }).catch(() => {
            console.log("⚠️ Audio autoplay failed, continuing without audio");
            startAnimation();
        });
        
        // Hard timeout failsafe (failsafe #3) - MUST finish within 3s
        hardTimeout = setTimeout(() => {
            if (!isFinished) {
                console.warn("⚠️ Mascot hard timeout triggered - forcing finish");
                finishMascot('hard-timeout');
            }
        }, 3000);
    }
    
    // Setup global failsafes immediately
    setupGlobalFailsafes();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMascot);
    } else {
        initMascot();
    }
    
    // Expose finish function globally for debugging
    window.finishMascot = finishMascot;
    
})();
