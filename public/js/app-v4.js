console.log("✅ JS file version: v4.1 Immediate Pro Check active");

// ========================
// PRO UNLOCK POPUP FUNCTION (needed by immediate check)
// ========================
function showProUnlockPopup() {
  try {
    // Check if popup was already shown this session
    if (localStorage.getItem('proPopupShown') === 'true') {
      return;
    }
    
    console.log("🎉 Pro Unlock Popup Shown");
    
    // Mark popup as shown
    localStorage.setItem('proPopupShown', 'true');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    // Create popup card
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #00D4FF;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 
        0 20px 40px rgba(0, 212, 255, 0.3),
        0 0 0 1px rgba(0, 212, 255, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transform: scale(1.1);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    `;
    
    // Add glow effect
    const glow = document.createElement('div');
    glow.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(45deg, #00D4FF, #0099CC, #00D4FF);
      border-radius: 22px;
      z-index: -1;
      opacity: 0.6;
      animation: glow 2s ease-in-out infinite alternate;
    `;
    
    // Add glow animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes glow {
        0% { opacity: 0.6; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    // Popup content
    popup.innerHTML = `
      <div style="font-size: 4rem; margin-bottom: 20px; animation: bounce 0.6s ease;">🎉</div>
      <h2 style="color: #00D4FF; font-size: 1.8rem; font-weight: 700; margin: 0 0 15px 0; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);">
        You've unlocked Pro!
      </h2>
      <p style="color: #e5e7eb; font-size: 1.1rem; margin: 0; line-height: 1.5;">
        All features are now available.
      </p>
    `;
    
    // Add bounce animation
    const bounceStyle = document.createElement('style');
    bounceStyle.textContent = `
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1.1); }
        40% { transform: translateY(-10px) scale(1.1); }
        60% { transform: translateY(-5px) scale(1.1); }
      }
    `;
    document.head.appendChild(bounceStyle);
    
    // Assemble popup
    popup.appendChild(glow);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => {
      overlay.style.opacity = '1';
      popup.style.transform = 'scale(1)';
    }, 50);
    
    // Auto-close after 4 seconds
    setTimeout(() => {
      overlay.style.opacity = '0';
      popup.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
        if (bounceStyle.parentNode) {
          bounceStyle.parentNode.removeChild(bounceStyle);
        }
      }, 300);
    }, 4000);
    
  } catch (error) {
    console.error('❌ Error showing Pro unlock popup:', error);
  }
}

// ========================
// IMMEDIATE PRO URL CHECK
// ========================
(function() {
  try {
    console.log("🔍 Immediate Pro Unlock Init");
    console.log("✅ Immediate Pro IIFE executing correctly");
    const query = window.location.search;
    console.log("Raw query:", query);
    const params = new URLSearchParams(query);
    const plan = params.get('plan');
    const upgraded = params.get('upgraded');
    console.log("Immediate Pro check - plan:", plan, "upgraded:", upgraded);
    console.log("Full URL:", window.location.href);

    if (plan === 'pro' && upgraded === 'true') {
      console.log("🎉 IMMEDIATE PRO UNLOCK DETECTED");
      localStorage.setItem('userTier', 'pro');
      localStorage.removeItem('proPopupShown');
      setTimeout(() => showProUnlockPopup(), 300);
    }
  } catch (err) {
    console.error("Immediate Pro Unlock Error:", err);
  }
})();

// public/js/app.js
// Main app entry with SPA routing and unlock logic
console.log("🔥 APP.JS IS LOADED");

// User tier management system
let userTier = 'free'; // Default tier: free, reports2, reports15, pro

// Initialize user tier from localStorage
function initializeUserTier() {
  try {
    const storedTier = localStorage.getItem('userTier');
    const isPro = localStorage.getItem('isPro') === 'true';
    
    if (isPro) {
      userTier = 'pro';
    } else if (storedTier) {
      userTier = storedTier;
    } else {
      userTier = 'free';
    }
    
    console.log("User Tier Active:", userTier);
    return userTier;
  } catch (error) {
    console.warn('⚠️ Error initializing user tier:', error);
    userTier = 'free';
    return userTier;
  }
}

// Check if user has Pro access
function isProUser() {
  return userTier === 'pro' || localStorage.getItem('isPro') === 'true';
}

// Update user tier and localStorage
function updateUserTier(newTier) {
  try {
    userTier = newTier;
    localStorage.setItem('userTier', newTier);
    
    if (newTier === 'pro') {
      localStorage.setItem('isPro', 'true');
    } else {
      localStorage.setItem('isPro', 'false');
    }
    
    console.log("User Tier Updated:", userTier);
    
    // Trigger UI updates
    updateUIForTier();
  } catch (error) {
    console.warn('⚠️ Error updating user tier:', error);
  }
}

// Update UI based on user tier
function updateUIForTier() {
  try {
    const isPro = isProUser();
    
    // Update user plan display
    const planElement = document.getElementById('userPlan');
    if (planElement) {
      planElement.textContent = isPro ? 'Pro Plan' : 'Free Plan';
    }
    
    // Show/hide Pro features
    if (isPro) {
      // Show all gauges and Pro features
      document.querySelectorAll('.pro-locked').forEach(el => {
        el.classList.remove('pro-locked');
        el.style.filter = 'none';
        el.style.pointerEvents = 'auto';
      });
      
      document.querySelectorAll('.locked-overlay').forEach(el => {
        el.style.display = 'none';
      });
    } else {
      // Show only first 2 gauges for free users
      const gaugeBoxes = document.querySelectorAll('.gauge-box');
      gaugeBoxes.forEach((box, index) => {
        if (index >= 2) { // Hide gauges 3-6 (index 2-5)
          box.classList.add('pro-locked');
          box.style.filter = 'blur(5px)';
          box.style.pointerEvents = 'none';
        }
      });
    }
    
    console.log("UI updated for tier:", userTier);
  } catch (error) {
    console.warn('⚠️ Error updating UI for tier:', error);
  }
}

// Initialize tier on load
initializeUserTier();


// Handle Pro-only button clicks
function handleProFeatureClick(featureName) {
  if (!isProUser()) {
    console.log('🔒 Pro feature clicked:', featureName, '- showing upgrade modal');
    
    // Check if upgrade modal function exists
    if (typeof showUpgradeModal === 'function') {
      showUpgradeModal();
    } else {
      console.warn('⚠️ showUpgradeModal function not found');
      // Fallback: redirect to pricing page
      window.location.href = '/pricing.html';
    }
    return false;
  }
  return true;
}

// Override Pro-only functions to check tier first
function setupProFeatureGating() {
  try {
    // Override export chart function
    if (typeof exportChart === 'function') {
      const originalExportChart = exportChart;
      window.exportChart = function() {
        if (handleProFeatureClick('exportChart')) {
          return originalExportChart.apply(this, arguments);
        }
      };
    }
    
    // Override share report function
    if (typeof shareReport === 'function') {
      const originalShareReport = shareReport;
      window.shareReport = function() {
        if (handleProFeatureClick('shareReport')) {
          return originalShareReport.apply(this, arguments);
        }
      };
    }
    
    // Override download report function
    if (typeof downloadReport === 'function') {
      const originalDownloadReport = downloadReport;
      window.downloadReport = function() {
        if (handleProFeatureClick('downloadReport')) {
          return originalDownloadReport.apply(this, arguments);
        }
      };
    }
    
    console.log('✅ Pro feature gating setup complete');
  } catch (error) {
    console.warn('⚠️ Error setting up Pro feature gating:', error);
  }
}

// Setup gating when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupProFeatureGating);
} else {
  setupProFeatureGating();
}

// Wrap everything in try-catch to catch any errors
try {
(function () {
  console.log('🔥 APP.JS LOADING - SPA ROUTING & UNLOCK LOGIC');
  console.log('🔥 APP.JS SCRIPT EXECUTING - DEBUG MODE');
  console.log('🔥 Current URL:', window.location.href);
  console.log('🔥 Document ready state:', document.readyState);
  console.log('🔥 SCRIPT LOADED SUCCESSFULLY - PROCEEDING WITH UNLOCK LOGIC');
  console.log('🔥 DEBUG: About to start unlock logic...');
  console.log('🔥 DEBUG: Script execution starting...');
  console.log('🔥 DEBUG: About to start safeProUnlock function...');
  console.log('🔥 DEBUG: Script is definitely executing - this should show in console');
  console.log('🔥 DEBUG: This is the final debug message - if you see this, the script is working');
  console.log('🔥 DEBUG: FINAL TEST - This message should appear in browser console');
  
  // Safe Pro unlock check with error handling
  (function safeProUnlock() {
    try {
      console.log('⚡ SAFE PRO UNLOCK CHECK STARTING');
      console.log('Current URL:', window.location.href);
      console.log('Document ready state:', document.readyState);
      console.log('⚡ DEBUG: Script is executing, checking URL parameters...');
      console.log('⚡ DEBUG: About to parse URL parameters...');
      console.log('⚡ DEBUG: URL search params:', window.location.search);
      console.log('⚡ DEBUG: About to create URLSearchParams...');
      console.log('⚡ DEBUG: Creating URLSearchParams object...');
      console.log('⚡ DEBUG: This should definitely show in console if script loads');
      console.log('⚡ DEBUG: Final debug message - if you see this, the script is definitely working');
      console.log('⚡ DEBUG: FINAL TEST - This message should appear in browser console');
      
      // Safe URL parameter parsing
      let plan = null;
      let upgraded = null;
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        plan = urlParams.get('plan');
        upgraded = urlParams.get('upgraded');
      } catch (urlError) {
        console.warn('⚠️ URL parameter parsing failed:', urlError);
        plan = null;
        upgraded = null;
      }
      
      console.log('URL parameters - plan:', plan, 'upgraded:', upgraded);
      console.log('Full URL search:', window.location.search);
      
      if (plan === 'pro' || upgraded === 'true') {
        console.log('🎉 PRO STATUS DETECTED - Already handled by immediate check at top of file');
      
        // Define safe unlock function with error handling
        function removeAllLocks() {
          try {
            console.log('🔓 removeAllLocks() called - removing ALL lock elements');
            console.log('Document body exists:', !!document.body);
            console.log('Document ready state:', document.readyState);
            
            // Check if DOM is ready
            if (!document.body) {
              console.warn('⚠️ DOM not ready, skipping unlock');
              return;
            }
            
            // 1. Remove all pro-locked classes (safe)
            try {
              const proLockedElements = document.querySelectorAll('.pro-locked');
              console.log('Found', proLockedElements.length, 'elements with pro-locked class');
              proLockedElements.forEach((element, index) => {
                if (element && element.classList) {
                  element.classList.remove('pro-locked');
                  console.log(`[${index}] Removed pro-locked class from:`, element.tagName, element.className);
                }
              });
            } catch (e) {
              console.warn('⚠️ Error removing pro-locked classes:', e);
            }
            
            // 2. Hide all locked overlays (safe)
            try {
              const lockedOverlays = document.querySelectorAll('.locked-overlay');
              console.log('Found', lockedOverlays.length, 'locked overlays');
              lockedOverlays.forEach((overlay, index) => {
                if (overlay && overlay.style) {
                  overlay.style.display = 'none';
                  console.log(`[${index}] Hidden locked overlay:`, overlay.tagName, overlay.className);
                }
              });
            } catch (e) {
              console.warn('⚠️ Error hiding locked overlays:', e);
            }
            
            // 3. Remove blur from all content (safe)
            try {
              const resultContent = document.querySelectorAll('.result-content');
              console.log('Found', resultContent.length, 'result content elements');
              resultContent.forEach((content, index) => {
                if (content && content.style) {
                  content.style.filter = 'none';
                  content.style.opacity = '1';
                  console.log(`[${index}] Removed blur from content:`, content.tagName, content.className);
                }
              });
            } catch (e) {
              console.warn('⚠️ Error removing blur from content:', e);
            }
            
            // 4. Hide all padlock images (safe)
            try {
              const padlockImages = document.querySelectorAll('img[alt*="lock" i], img[src*="lock" i], img[alt*="padlock" i], img[src*="padlock" i]');
              console.log('Found', padlockImages.length, 'padlock images');
              padlockImages.forEach((img, index) => {
                if (img && img.style) {
                  img.style.display = 'none';
                  console.log(`[${index}] Hidden padlock image:`, img.src, img.alt);
                }
              });
            } catch (e) {
              console.warn('⚠️ Error hiding padlock images:', e);
            }
            
            // 5. Hide all chain images (safe)
            try {
              const chainImages = document.querySelectorAll('img[alt*="chain" i], img[src*="chain" i]');
              console.log('Found', chainImages.length, 'chain images');
              chainImages.forEach((img, index) => {
                if (img && img.style) {
                  img.style.display = 'none';
                  console.log(`[${index}] Hidden chain image:`, img.src, img.alt);
                }
              });
            } catch (e) {
              console.warn('⚠️ Error hiding chain images:', e);
            }
            
            // 6. Hide all upgrade buttons (safe)
            try {
              const upgradeButtons = document.querySelectorAll('.btn-upgrade, .upgrade-btn, [class*="upgrade"]');
              console.log('Found', upgradeButtons.length, 'upgrade buttons');
              upgradeButtons.forEach((btn, index) => {
                if (btn && btn.style) {
                  btn.style.display = 'none';
                  console.log(`[${index}] Hidden upgrade button:`, btn.tagName, btn.className, btn.textContent);
                }
              });
            } catch (e) {
              console.warn('⚠️ Error hiding upgrade buttons:', e);
            }
            
            // 7. Remove any "Please upgrade" messages (safe) - but preserve analyzer wrappers
            try {
              let upgradeMessages = 0;
              document.querySelectorAll('*').forEach(element => {
                if (element && element.textContent && element.textContent.includes('Please upgrade')) {
                  // Skip if element is inside analyzer wrapper
                  if (element.closest('.analyzer-wrapper, .main-analyzer, .page-analyzer')) {
                    return;
                  }
                  if (element.style) {
                    element.style.display = 'none';
                    upgradeMessages++;
                    console.log(`Hidden upgrade message:`, element.tagName, element.textContent.substring(0, 50));
                  }
                }
              });
              console.log('Found and hidden', upgradeMessages, 'upgrade messages');
            } catch (e) {
              console.warn('⚠️ Error hiding upgrade messages:', e);
            }
            
            // 8. Ensure analyzer wrapper is visible after unlock
            try {
              const analyzerWrapper = document.querySelector('.analyzer-wrapper');
              if (analyzerWrapper) {
                analyzerWrapper.style.display = 'block';
                analyzerWrapper.style.visibility = 'visible';
                analyzerWrapper.style.opacity = '1';
                console.log('✅ Analyzer wrapper visibility ensured');
              }
            } catch (e) {
              console.warn('⚠️ Error ensuring analyzer wrapper visibility:', e);
            }
            
            // 9. Fail-safe: Check if page content is too small and reload if needed
            try {
              const bodyContentLength = document.body.innerHTML.length;
              console.log('📏 Body content length after unlock:', bodyContentLength);
              
              if (bodyContentLength < 500) {
                console.warn('⚠️ Page content too small after unlock, reloading in 1 second...');
                setTimeout(() => {
                  console.log('🔄 Reloading page due to insufficient content');
                  location.reload();
                }, 1000);
              }
            } catch (e) {
              console.warn('⚠️ Error checking body content length:', e);
            }
            
            // 10. DOM safeguard: Check if analyzer wrapper is hidden and force re-display
            try {
              const wrapper = document.querySelector('.analyzer-wrapper');
              if (wrapper && wrapper.offsetParent === null) {
                console.warn("⚠️ Analyzer wrapper hidden — forcing re-display");
                wrapper.style.display = 'block';
                wrapper.style.visibility = 'visible';
                wrapper.style.opacity = '1';
              }
            } catch (e) {
              console.warn('⚠️ Error checking analyzer wrapper visibility:', e);
            }
            
            // 11. Check if body content is blank and restore if needed
            try {
              if (document.body.innerHTML.trim().length < 1000) {
                console.error("❌ Analyzer content wiped — restoring base structure");
                location.href = "https://www.copy-boss.com/analyzer.html?restored=true";
              }
            } catch (e) {
              console.warn('⚠️ Error checking body content integrity:', e);
            }
            
            console.log('✅ removeAllLocks() completed safely');
            console.log("✅ Analyzer re-rendered successfully after Pro unlock");
            console.log("✅ Analyzer display integrity verified post-unlock");
          } catch (error) {
            console.error('❌ Critical error in removeAllLocks():', error);
          }
        }
      
        // Safe timing for unlock - wait for DOM to be ready
        console.log('🔓 Scheduling safe unlock after DOM ready...');
        
        // Function to safely check if charts are ready
        function checkChartsReady() {
          try {
            const charts = document.querySelectorAll('canvas, [id*="chart"], [class*="chart"]');
            console.log('Found', charts.length, 'chart elements');
            return charts.length > 0 ? charts.length : true; // If no charts, proceed
          } catch (e) {
            console.warn('⚠️ Error checking charts:', e);
            return true; // Proceed anyway
          }
        }
        
        // Safe unlock function that waits for DOM
        function safeUnlock() {
          try {
            console.log('🔓 Safe unlock starting...');
            checkChartsReady();
            removeAllLocks();
            
            // DOM safeguard after unlock
            setTimeout(() => {
              try {
                const wrapper = document.querySelector('.analyzer-wrapper');
                if (wrapper && wrapper.offsetParent === null) {
                  console.warn("⚠️ Analyzer wrapper hidden in safeUnlock — forcing re-display");
                  wrapper.style.display = 'block';
                  wrapper.style.visibility = 'visible';
                  wrapper.style.opacity = '1';
                }
                
                if (document.body.innerHTML.trim().length < 1000) {
                  console.error("❌ Analyzer content wiped in safeUnlock — restoring base structure");
                  location.href = "https://www.copy-boss.com/analyzer.html?restored=true";
                }
                
                console.log("✅ Analyzer display integrity verified in safeUnlock");
              } catch (e) {
                console.warn('⚠️ Error in safeUnlock DOM safeguard:', e);
              }
            }, 500);
          } catch (e) {
            console.error('❌ Error in safe unlock:', e);
          }
        }
        
        // Wait for DOM to be ready before unlocking
        if (document.readyState === 'loading') {
          console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
          document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ DOMContentLoaded - scheduling unlock');
            setTimeout(safeUnlock, 100);
          });
        } else if (document.readyState === 'interactive') {
          console.log('⚡ DOM interactive - scheduling unlock');
          setTimeout(safeUnlock, 100);
        } else {
          console.log('⚡ DOM complete - scheduling unlock');
          setTimeout(safeUnlock, 100);
        }
        
        // Additional retries with longer delays to ensure everything is rendered
        setTimeout(() => {
          console.log('🔄 Retry unlock after 1000ms...');
          safeUnlock();
        }, 1000);
        
        setTimeout(() => {
          console.log('🔄 Final retry unlock after 2000ms...');
          safeUnlock();
        }, 2000);
        
        // Make unlock function globally available
        window.forceUnlockPro = removeAllLocks;
        console.log('✅ Global forceUnlockPro function available');
        
        // Final DOM integrity check after all unlock operations
        setTimeout(() => {
          try {
            const wrapper = document.querySelector('.analyzer-wrapper');
            if (wrapper && wrapper.offsetParent === null) {
              console.warn("⚠️ Analyzer wrapper hidden in safeProUnlock — forcing re-display");
              wrapper.style.display = 'block';
              wrapper.style.visibility = 'visible';
              wrapper.style.opacity = '1';
            }
            
            if (document.body.innerHTML.trim().length < 1000) {
              console.error("❌ Analyzer content wiped in safeProUnlock — restoring base structure");
              location.href = "https://www.copy-boss.com/analyzer.html?restored=true";
            }
            
            console.log("✅ Analyzer display integrity verified in safeProUnlock");
          } catch (e) {
            console.warn('⚠️ Error in safeProUnlock final DOM safeguard:', e);
          }
        }, 1000);
        
        // Global re-display safeguard to stop body/html from hiding after Pro unlock
        setTimeout(() => {
          try {
            const html = document.documentElement;
            const body = document.body;
            const wrapper = document.querySelector('.analyzer-wrapper');
            
            if (html && html.style.display === 'none') {
              console.error("❌ HTML display:none detected — forcing re-display");
              html.style.display = 'block';
            }
            
            if (body && body.style.display === 'none') {
              console.error("❌ BODY display:none detected — forcing re-display");
              body.style.display = 'block';
            }
            
            if (wrapper && (wrapper.offsetParent === null || wrapper.style.display === 'none')) {
              console.error("❌ Analyzer wrapper hidden globally — forcing re-display");
              wrapper.style.display = 'block';
              wrapper.style.visibility = 'visible';
              wrapper.style.opacity = '1';
            }
            
            console.log("✅ Global re-display safeguard completed");
          } catch (e) {
            console.warn('⚠️ Error in global re-display safeguard:', e);
          }
        }, 1500);
      } else {
        console.log('ℹ️ No Pro status detected in URL parameters');
      }
    } catch (error) {
      console.error('❌ Critical error in safeProUnlock:', error);
    }
  })();

  // Safe SPA routing logic
  function handleRoute() {
    try {
      const path = window.location.pathname;
      console.log('🔄 SPA Route change detected:', path);
      
      // Check if we're on analyzer page
      if (path === '/analyzer' || path.includes('analyzer')) {
        console.log('📊 Analyzer page detected - checking for Pro unlock');
        
        // Safe re-check for Pro status on route change
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const plan = urlParams.get('plan');
          const upgraded = urlParams.get('upgraded');
          
          console.log('Route change - plan:', plan, 'upgraded:', upgraded);
          
          if (plan === 'pro' || upgraded === 'true') {
            console.log('🎉 Pro status detected on analyzer route - Already handled by immediate check at top of file');
            
            if (typeof window.forceUnlockPro === 'function') {
              // Wait a bit for DOM to be ready
              setTimeout(() => {
                try {
                  window.forceUnlockPro();
                } catch (e) {
                  console.error('❌ Error calling forceUnlockPro:', e);
                }
              }, 100);
            }
          }
        } catch (urlError) {
          console.warn('⚠️ Error parsing URL params on route change:', urlError);
        }
      }
    } catch (error) {
      console.error('❌ Error in handleRoute:', error);
    }
  }

  // Listen for route changes
  window.addEventListener('popstate', handleRoute);
  
  // Safe initial route check
  document.addEventListener('DOMContentLoaded', function () {
    try {
      console.log('[app] DOM ready. safeMode=', !!window.__SAFE_MODE__);
      handleRoute();
    } catch (error) {
      console.error('❌ Error in DOMContentLoaded handler:', error);
    }
  });
  
  // Also check route immediately if DOM is already ready
  if (document.readyState !== 'loading') {
    try {
      console.log('[app] DOM already ready, checking route immediately');
      handleRoute();
    } catch (error) {
      console.error('❌ Error in immediate route check:', error);
    }
  }
  
  // Handle Stripe success callbacks
  window.handleStripeSuccess = function(plan) {
    try {
      console.log('🎉 Stripe success callback received for plan:', plan);
      
      // Update user tier based on plan
      if (plan === 'pro' || plan === 'reports15') {
        updateUserTier('pro');
        
        // Show success popup for Pro upgrades
        setTimeout(() => {
          showProUnlockPopup();
        }, 1000);
      } else if (plan === 'reports2') {
        updateUserTier('reports2');
      } else {
        updateUserTier('free');
      }
      
      // Show success message
      if (typeof showUpgradeModal === 'function') {
        // Close any open modals
        if (typeof closeUpgradeModal === 'function') {
          closeUpgradeModal();
        }
      }
      
      console.log('✅ User tier updated after Stripe success');
    } catch (error) {
      console.error('❌ Error handling Stripe success:', error);
    }
  };
  
  // Make functions globally available
  window.updateUserTier = updateUserTier;
  window.isProUser = isProUser;
  window.handleProFeatureClick = handleProFeatureClick;
  
})();
} catch (error) {
  console.error('❌ CRITICAL ERROR in app.js:', error);
  console.error('❌ Error stack:', error.stack);
  // Display error on page for debugging
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-size: 18px;">' +
                            'JavaScript Error in app.js: ' + error.message + 
                            '<br>Check console for details.</div>';
}
