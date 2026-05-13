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
      
      /* Pro mode: hide blur layers and lock overlays */
      body.pro-active .cb-blur-layer,
      body.pro-active .locked-overlay,
      body.pro-active .cb-lock-overlay {
        display: none !important;
        opacity: 0 !important;
      }
      
      /* Pro mode: remove gated class */
      body.pro-active .gated {
        position: static;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Unified gating refresh function
  window.refreshGatingUI = function() {
    const tier = window.getUserTier ? window.getUserTier() : 'free';
    let isPro = tier === 'pro';

    if (typeof window.__isProActive === 'function') {
      try {
        isPro = window.__isProActive();
      } catch (e) {
        console.warn('[GATING-UNIFIED] __isProActive failed, falling back to getUserTier()', e);
        isPro = tier === 'pro';
      }
    }
    
    // Set body class for CSS targeting
    if (isPro) {
      document.body.classList.add('pro-active');
    } else {
      document.body.classList.remove('pro-active');
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
      if (isPro) {
        // Pro mode: remove ALL blur layers and locks
        // Remove blur layer
        const blurLayers = card.querySelectorAll('.cb-blur-layer');
        blurLayers.forEach(layer => layer.remove());
        
        // Remove/hide ALL lock overlays (multiple selectors)
        const lockOverlays = card.querySelectorAll('.locked-overlay, .cb-lock-overlay, .pro-locked-overlay');
        lockOverlays.forEach(overlay => {
          overlay.style.display = 'none';
          overlay.remove(); // Remove from DOM entirely
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
        
        // Remove pro-locked classes
        card.classList.remove('gated', 'pro-locked', 'locked', 'pro-locked-results', 'locked-report');
        
        // Clear any inline filter/opacity/pointer-events styles
        card.style.filter = 'none';
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        card.style.backdropFilter = 'none';
        
        // Remove data-locked attribute if present
        card.removeAttribute('data-locked');
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
    let proActive = false;
    if (typeof window.__isProActive === 'function') {
      try {
        proActive = window.__isProActive();
      } catch (e) {
        console.warn('[GATING-UNIFIED] __isProActive failed in delayed refresh', e);
      }
    }
    const currentTier = window.getUserTier ? window.getUserTier() : 'free';
    if (!proActive && currentTier !== 'pro') {
      window.refreshGatingUI();
    }
  }, 1000);
})();

