// ============================================================
// UNIFIED GATING SYSTEM: refreshGatingUI()
// ============================================================
// Single function that applies/removes gating based on tier
// Runs once on DOMContentLoaded and once after any tier update

(function initUnifiedGating() {
  'use strict';
  
  // Inject CSS for blur layer system (once)
  if (!document.getElementById('cb-gating-styles')) {
    const style = document.createElement('style');
    style.id = 'cb-gating-styles';
    style.textContent = `
      /* Gated card container - relative positioning for blur layer */
      .report-card.gated,
      .gauge-container.gated,
      .cb-card.gated,
      .cb-gauge.gated {
        position: relative;
        overflow: hidden;
      }
      
      /* Blur layer - behind lock overlay, on top of content */
      .cb-blur-layer {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        background: rgba(0, 0, 0, 0.3);
        opacity: 1;
        transition: opacity 0.3s ease;
      }
      
      /* Content layer - below blur */
      .report-card.gated > *:not(.cb-blur-layer):not(.locked-overlay):not(.cb-lock-overlay),
      .gauge-container.gated > *:not(.cb-blur-layer):not(.locked-overlay):not(.cb-lock-overlay) {
        position: relative;
        z-index: 1;
      }
      
      /* Lock overlay - above blur, crisp and clickable */
      .locked-overlay,
      .cb-lock-overlay {
        position: absolute;
        inset: 0;
        z-index: 5;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
      }
      
      /* Pro/paid mode: hide blur layers and lock overlays */
      body.pro-active .cb-blur-layer,
      body.pro-active .locked-overlay,
      body.pro-active .cb-lock-overlay,
      body.paid-active .cb-blur-layer,
      body.paid-active .locked-overlay,
      body.paid-active .cb-lock-overlay {
        display: none !important;
        opacity: 0 !important;
      }
      
      /* Pro/paid mode: remove gated class */
      body.pro-active .gated,
      body.paid-active .gated {
        position: static;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Unified gating refresh function
  window.refreshGatingUI = function() {
    const tier = window.getUserTier ? window.getUserTier() : 'free';
    const credits = parseInt(localStorage.getItem('reportCredits') || '0', 10);
    const hasUnlockedUI = localStorage.getItem('hasUnlockedUI') === 'true';
    const isPro = tier === 'pro';
    const visuallyUnlocked = isPro || credits > 0 || hasUnlockedUI;
    let removedOverlays = 0;
    let removedBlurLayers = 0;
    let finalVisualResets = 0;
    let premiumGaugeUnlocks = 0;
    
    // Set body class for CSS targeting
    if (isPro) {
      document.body.classList.add('pro-active');
    } else {
      document.body.classList.remove('pro-active');
    }

    if (credits > 0 || hasUnlockedUI) {
      document.body.classList.add('paid-active');
      // Minimal debug log for paid-credit users
      if (!isPro) {
        console.log('[GATING VISUAL UNLOCK]', { tier, credits, visuallyUnlocked: true });
      }
    } else {
      document.body.classList.remove('paid-active');
    }

    if (!isPro && credits === 0 && hasUnlockedUI) {
      console.log('[GATING VISUAL UNLOCK]', { tier, credits, visuallyUnlocked: true, source: 'hasUnlockedUI' });
    }
    
    // Locked card selectors
    const lockedCardSelectors = [
      '#viralGaugeCard', '#captionGaugeCard', '#engagementGaugeCard', '#ideaGaugeCard',
      '#viral-card', '#caption-card', '#engagementforecast-card', '#viralstrength-card',
      '.report-card[data-locked]', '.gauge-container[data-locked]'
    ];
    
    const lockedCards = document.querySelectorAll(lockedCardSelectors.join(', '));
    
    let blurredCards = 0;
    let lockOverlays = 0;
    
    lockedCards.forEach(card => {
      if (visuallyUnlocked) {
        // Pro/paid-credit mode: remove ALL blur layers and locks
        // Remove blur layers (aggressive)
        const blurLayers = card.querySelectorAll('.cb-blur-layer');
        blurLayers.forEach(layer => {
          removedBlurLayers++;
          layer.remove();
        });
        
        // Remove ALL lock overlays (aggressive)
        const overlays = card.querySelectorAll('.cb-lock-overlay, .locked-overlay, .pro-locked-overlay');
        overlays.forEach(overlay => {
          removedOverlays++;
          overlay.remove();
        });
        
        // Remove padlock images
        const padlocks = card.querySelectorAll('img[alt*="lock" i], img[src*="lock" i], img[alt*="padlock" i], .padlock-icon, .m-lock');
        padlocks.forEach(img => {
          img.style.display = 'none';
          if (img.parentElement?.classList.contains('padlock-icon')) {
            img.parentElement.remove();
          }
        });
        
        // Remove upgrade buttons
        const upgradeBtns = card.querySelectorAll('.btn-upgrade, .upgrade-btn, [class*="upgrade"]');
        upgradeBtns.forEach(btn => btn.remove());
        
        // Remove gating/locked classes that can keep cards blocked
        card.classList.remove(
          'gated',
          'pro-locked',
          'locked',
          'pro-locked-results',
          'locked-report',
          'blurred',
          'pro-blur',
          'dimmed',
          'disabled'
        );
        
        // Force reset critical styles on the CARD itself
        card.style.opacity = '1';
        card.style.filter = 'none';
        card.style.backdropFilter = 'none';
        card.style.webkitBackdropFilter = 'none';
        card.style.pointerEvents = 'auto';
        card.style.background = '';
        card.style.mixBlendMode = '';
        
        // Also ensure no parent container is dimming
        let parent = card.parentElement;
        while (parent) {
          parent.style.opacity = '1';
          parent.style.filter = 'none';
          parent.style.backdropFilter = 'none';
          parent.style.webkitBackdropFilter = 'none';
          parent = parent.parentElement;
        }
        
        // Remove data-locked attribute if present
        card.removeAttribute('data-locked');

        console.log('[GATING FORCE RESET] applied to card');

        // Final visual reset: normalize card and descendants (charts can render but look dim)
        card.style.background = '#1e2a3a';
        card.style.backgroundImage = 'none';
        card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        card.querySelectorAll('*').forEach(el => {
          el.style.filter = 'none';
          el.style.opacity = '1';
        });
        finalVisualResets++;

        // Premium gauge cards: remove any remaining locked visual state after refresh.
        // These must remain viewable for previously paid/unlocked users (hasUnlockedUI) even when credits=0.
        if (
          card.id === 'viralGaugeCard' ||
          card.id === 'captionGaugeCard' ||
          card.id === 'engagementGaugeCard' ||
          card.id === 'ideaGaugeCard'
        ) {
          // Clear locked/dim classes on descendants (not just the card wrapper)
          card.querySelectorAll('.gated,.pro-locked,.locked,.pro-locked-results,.locked-report,.blurred,.pro-blur,.dimmed,.disabled').forEach(el => {
            el.classList.remove(
              'gated',
              'pro-locked',
              'locked',
              'pro-locked-results',
              'locked-report',
              'blurred',
              'pro-blur',
              'dimmed',
              'disabled'
            );
            el.style.opacity = '1';
            el.style.filter = 'none';
            el.style.visibility = 'visible';
            el.style.pointerEvents = 'auto';
          });
          premiumGaugeUnlocks++;
        }
      } else {
        // Free mode: add blur and locks
        // Add gated class
        card.classList.add('gated');
        
        // Create blur layer if missing
        if (!card.querySelector('.cb-blur-layer')) {
          const blurLayer = document.createElement('div');
          blurLayer.className = 'cb-blur-layer';
          card.insertBefore(blurLayer, card.firstChild);
          blurredCards++;
        }
        
        // Ensure lock overlay exists (create if missing)
        if (!card.querySelector('.locked-overlay, .cb-lock-overlay')) {
          const lockOverlay = document.createElement('div');
          lockOverlay.className = 'cb-lock-overlay';
          lockOverlay.innerHTML = `
            <div style="text-align: center; color: white; padding: 20px;">
              <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
              <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Unlock with Pro</div>
              <div style="font-size: 14px; opacity: 0.9;">Upgrade to view full analysis</div>
            </div>
          `;
          card.appendChild(lockOverlay);
          lockOverlays++;
        } else {
          lockOverlays++;
        }
        
        // Ensure lock overlay is visible
        const lockOverlay = card.querySelector('.locked-overlay, .cb-lock-overlay');
        if (lockOverlay) {
          lockOverlay.style.display = 'flex';
          lockOverlay.style.zIndex = '5';
        }
      }
    });

    // Real premium gauges in live DOM: #cb-gauges .gauge-box.pro-locked
    // When visually unlocked (Pro OR credits OR hasUnlockedUI), remove pro-locked class
    // so inline CSS pseudo-elements (::before/::after) and child blur no longer apply.
    let removedProLocked = 0;
    if (visuallyUnlocked) {
      const lockedGaugeBoxes = document.querySelectorAll('#cb-gauges .gauge-box.pro-locked');
      lockedGaugeBoxes.forEach(box => {
        box.classList.remove('pro-locked');
        box.querySelectorAll('.locked-overlay').forEach(overlay => overlay.remove());
        removedProLocked++;
      });
      if (removedProLocked > 0) {
        console.log('[GATING REAL GAUGE UNLOCK]', { removedProLocked });
      }
    }

    if (visuallyUnlocked) {
      console.log('[GATING CLEANUP]', { removedOverlays, removedBlurLayers, visuallyUnlocked: true });
      if (finalVisualResets > 0) {
        console.log('[GATING FINAL VISUAL RESET] applied');
      }
      if (premiumGaugeUnlocks > 0) {
        console.log('[GATING PREMIUM GAUGES UNLOCKED]', { count: premiumGaugeUnlocks });
      }
    }
    
    // Debug log
    console.log(`[GATING] tier=${tier}, blurredCards=${blurredCards}, lockOverlays=${lockOverlays}`);
  };
  
  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.refreshGatingUI);
  } else {
    window.refreshGatingUI();
  }
  
  // Re-run after a delay to catch late-rendered elements (but only if not Pro, to prevent re-locking)
  setTimeout(() => {
    const currentTier = window.getUserTier ? window.getUserTier() : 'free';
    if (currentTier !== 'pro') {
      window.refreshGatingUI();
    }
  }, 1000);
})();

