// ============================================================
// UNIFIED GATING SYSTEM: refreshGatingUI()
// ============================================================
// Single function that applies/removes gating based on tier
// Runs once on DOMContentLoaded and once after any tier update

(function initUnifiedGating() {
  'use strict';

  window.__lastVisualUnlockState = window.__lastVisualUnlockState ?? null;

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

  const LOCKED_CARD_SELECTORS = [
    '#cb-gauges .gauge-box:not(#soundGaugeCard):not(#viewerGaugeCard)',
    '#viral-card', '#caption-card', '#engagementforecast-card', '#viralstrength-card',
    '#viralGaugeCard', '#captionGaugeCard', '#engagementGaugeCard', '#ideaGaugeCard',
    '.report-card[data-locked]', '.gauge-container[data-locked]'
  ].join(', ');

  function computeVisualState() {
    const tier = window.getUserTier ? window.getUserTier() : 'free';
    let cbUserTier = '';
    let storedUserTier = '';
    let isProFlag = false;
    let reportCredits = 0;

    try {
      cbUserTier = localStorage.getItem('cb_userTier') || '';
      storedUserTier = localStorage.getItem('userTier') || '';
      isProFlag = localStorage.getItem('isPro') === 'true';
      reportCredits = Number(localStorage.getItem('reportCredits') || 0);
    } catch (e) {
      cbUserTier = '';
      storedUserTier = '';
      isProFlag = false;
      reportCredits = 0;
    }

    const isProVisual =
      cbUserTier === 'pro' ||
      storedUserTier === 'pro' ||
      isProFlag;

    const isPaidReportVisual =
      reportCredits > 0 ||
      cbUserTier === '2reports' ||
      cbUserTier === '15reports' ||
      storedUserTier === '2reports' ||
      storedUserTier === '15reports';

    const isVisuallyUnlocked = isProVisual || isPaidReportVisual;
    const stateKey = isVisuallyUnlocked
      ? `unlock:${cbUserTier || storedUserTier || tier}:c${reportCredits}`
      : 'lock:free';

    return {
      tier,
      isPro: isProVisual,
      reportCredits,
      hasReportCredits: reportCredits > 0,
      isVisuallyUnlocked,
      stateKey
    };
  }

  function cardNeedsUnlockWork(card) {
    if (
      card.classList.contains('gated') ||
      card.classList.contains('pro-locked') ||
      card.classList.contains('locked') ||
      card.classList.contains('pro-locked-results') ||
      card.classList.contains('locked-report') ||
      card.hasAttribute('data-locked')
    ) {
      return true;
    }
    if (card.querySelector('.cb-blur-layer, .locked-overlay, .cb-lock-overlay, .pro-locked-overlay')) {
      return true;
    }
    if (card.querySelector('.btn-upgrade, .upgrade-btn, .padlock-icon, .m-lock')) {
      return true;
    }
    return false;
  }

  function cardNeedsLockWork(card) {
    const isPremiumGauge = card.classList.contains('gauge-box');
    const isReportCard = card.classList.contains('report-card');

    if (isPremiumGauge && !card.classList.contains('pro-locked')) return true;
    if (isReportCard && (!card.classList.contains('pro-locked-results') || !card.classList.contains('locked-report'))) {
      return true;
    }
    if (!card.classList.contains('gated') && !card.classList.contains('pro-locked') && !isPremiumGauge) return true;

    const nativeOverlay = card.querySelector('.locked-overlay');
    if (nativeOverlay) {
      const overlayDisplay = nativeOverlay.style.display || getComputedStyle(nativeOverlay).display;
      if (overlayDisplay === 'none') return true;
      const padlock = nativeOverlay.querySelector('.padlock-icon, .m-lock, .lock-image');
      if (padlock) {
        const padlockDisplay = padlock.style.display || getComputedStyle(padlock).display;
        if (padlockDisplay === 'none') return true;
      }
      return false;
    }

    if (!card.querySelector('.cb-blur-layer')) return true;
    if (!card.querySelector('.cb-lock-overlay')) return true;
    const overlay = card.querySelector('.cb-lock-overlay');
    if (overlay && overlay.style.display === 'none') return true;
    return false;
  }

  function countPendingCardWork(lockedCards, isVisuallyUnlocked) {
    let pending = 0;
    lockedCards.forEach((card) => {
      if (isVisuallyUnlocked) {
        if (cardNeedsUnlockWork(card)) pending += 1;
      } else if (cardNeedsLockWork(card)) {
        pending += 1;
      }
    });
    return pending;
  }

  function unlockCard(card) {
    card.querySelectorAll('.cb-blur-layer').forEach((layer) => layer.remove());
    card.querySelectorAll('.locked-overlay, .cb-lock-overlay, .pro-locked-overlay').forEach((overlay) => {
      overlay.remove();
    });
    card.querySelectorAll('img[alt*="lock" i], img[src*="lock" i], img[alt*="padlock" i], .padlock-icon, .m-lock').forEach((img) => {
      img.style.display = 'none';
      if (img.parentElement?.classList.contains('padlock-icon')) {
        img.parentElement.remove();
      }
    });
    card.querySelectorAll('.btn-upgrade, .upgrade-btn, [class*="upgrade"]').forEach((btn) => btn.remove());
    card.classList.remove('gated', 'pro-locked', 'locked', 'pro-locked-results', 'locked-report');
    card.style.filter = 'none';
    card.style.opacity = '1';
    card.style.pointerEvents = 'auto';
    card.style.backdropFilter = 'none';
    card.removeAttribute('data-locked');
  }

  function lockCard(card) {
    const isReportCard = card.classList.contains('report-card');

    card.classList.add('gated', 'pro-locked');
    if (isReportCard) {
      card.classList.add('pro-locked-results', 'locked-report');
    }

    const nativeOverlay = card.querySelector('.locked-overlay');
    if (nativeOverlay) {
      nativeOverlay.style.display = '';
      nativeOverlay.style.visibility = 'visible';
      nativeOverlay.style.opacity = '1';
      nativeOverlay.querySelectorAll('.padlock-icon, .m-lock, .lock-image, .btn-upgrade').forEach(function (el) {
        el.style.display = '';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });
      return;
    }

    if (!card.querySelector('.cb-blur-layer')) {
      const blurLayer = document.createElement('div');
      blurLayer.className = 'cb-blur-layer';
      card.insertBefore(blurLayer, card.firstChild);
    }
    if (!card.querySelector('.cb-lock-overlay')) {
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
    }
    const lockOverlay = card.querySelector('.cb-lock-overlay');
    if (lockOverlay) {
      lockOverlay.style.display = 'flex';
      lockOverlay.style.zIndex = '5';
    }
  }

  function applyGatingUI(options) {
    if (window.__gatingRefreshRunning) return false;

    const state = computeVisualState();
    const { tier, reportCredits, isVisuallyUnlocked, stateKey } = state;
    const lockedCards = document.querySelectorAll(LOCKED_CARD_SELECTORS);
    const bodyHasProActive = document.body.classList.contains('pro-active');
    const bodyClassMatches = bodyHasProActive === isVisuallyUnlocked;
    const pending = countPendingCardWork(lockedCards, isVisuallyUnlocked);
    const sameState = window.__lastVisualUnlockState === stateKey;
    const force = Boolean(options && options.force);

    if (!force && sameState && bodyClassMatches && pending === 0) {
      return false;
    }

    window.__gatingRefreshRunning = true;
    window.__cbGatingMutating = true;

    try {
      if (isVisuallyUnlocked && !bodyHasProActive) {
        document.body.classList.add('pro-active');
      } else if (!isVisuallyUnlocked && bodyHasProActive) {
        document.body.classList.remove('pro-active');
      }

      let blurredCards = 0;
      let lockOverlays = 0;

      lockedCards.forEach((card) => {
        if (isVisuallyUnlocked) {
          if (!cardNeedsUnlockWork(card)) return;
          unlockCard(card);
        } else {
          if (!cardNeedsLockWork(card)) return;
          const hadBlur = !card.querySelector('.cb-blur-layer');
          const hadOverlay = !card.querySelector('.locked-overlay, .cb-lock-overlay');
          lockCard(card);
          if (hadBlur) blurredCards += 1;
          if (hadOverlay) lockOverlays += 1;
          else lockOverlays += 1;
        }
      });

      window.__lastVisualUnlockState = stateKey;

      console.log(
        `[GATING] tier=${tier}, reportCredits=${reportCredits}, visuallyUnlocked=${isVisuallyUnlocked}, pending=${pending}, blurredCards=${blurredCards}, lockOverlays=${lockOverlays}`
      );
      return true;
    } finally {
      window.__gatingRefreshRunning = false;
      requestAnimationFrame(() => {
        window.__cbGatingMutating = false;
      });
    }
  }

  let debounceTimer = null;
  window.refreshGatingUI = function refreshGatingUI(options) {
    if (window.__gatingRefreshRunning) return;

    const immediate = Boolean(options && options.immediate);
    if (immediate) {
      applyGatingUI(options);
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      applyGatingUI(options);
    }, 32);
  };

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.refreshGatingUI({ immediate: true }));
  } else {
    window.refreshGatingUI({ immediate: true });
  }

  // Late pass: only applies work if new cards still need gating/unlock
  setTimeout(() => {
    window.refreshGatingUI({ latePass: true, immediate: true });
  }, 1000);
})();
