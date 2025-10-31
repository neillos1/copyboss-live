// ========================
// COPYBOSS ANALYZER GATING SYSTEM
// ========================
(function gateLogic() {
  'use strict';

  // Stripe Payment Links
  const stripeLinks = {
    "2reports": "https://buy.stripe.com/3cI6oG1R25fn5bY6205os01",
    "15reports": "https://buy.stripe.com/00w6oGany37f33Qbmk5os00",
    "pro": "https://buy.stripe.com/3cI00idzK9vD8oacqo5os02"
  };

  // Detect free use and Pro state
  const hasUsedFree = localStorage.getItem("hasUsedFreeAnalysis") === "true";
  const isPro = localStorage.getItem("vbProUnlocked") === "true";

  console.log('🔐 Gate logic loaded:', { hasUsedFree, isPro });

  // ========================
  // STRIPE SUCCESS CHECK
  // ========================
  if (window.location.search.includes("success=1")) {
    console.log('🎉 Stripe success detected — unlocking Pro...');
    localStorage.setItem("vbProUnlocked", "true");
    document.querySelectorAll("[data-pro='true']").forEach(el => {
      el.classList.remove("blurred");
      const badge = el.querySelector(".btn-upgrade");
      if (badge) badge.remove();
    });
    console.log('✅ Pro unlocked after Stripe payment');
  }

  // ========================
  // FREE USER BEHAVIOR
  // ========================
  function applyGating() {
    // If Pro, remove all blur and badges
    if (isPro || localStorage.getItem("vbProUnlocked") === "true") {
      document.querySelectorAll("[data-pro='true']").forEach(el => {
        el.classList.remove("blurred");
        const badge = el.querySelector(".btn-upgrade");
        if (badge) badge.remove();
      });
      console.log('✅ Pro user — all features unlocked');
      return;
    }

    // If free user hasn't used their free analysis yet
    if (!hasUsedFree) {
      console.log('🎁 Free user — allowing 2 free gauges');
      // Only "Sound Match" and "Viewer Understanding" are visible
      document.querySelectorAll("[data-pro='true']").forEach(el => {
        const title = el.querySelector('h1, h2, h3, .card-title, .metric-title, .title')?.textContent?.toLowerCase() || '';
        // These two should remain visible, others get blurred
        if (!title.includes('sound match') && !title.includes('viewer understanding')) {
          el.classList.add("blurred");
          injectUnlockButton(el);
        }
      });
      return;
    }

    // Free user has used their analysis — blur all Pro features
    console.log('🔒 Free user (used free analysis) — blurring Pro features');
    document.querySelectorAll("[data-pro='true']").forEach(el => {
      el.classList.add("blurred");
      injectUnlockButton(el);
    });
  }

  // ========================
  // INJECT UNLOCK BUTTON
  // ========================
  function injectUnlockButton(el) {
    // Remove existing button if any
    const existing = el.querySelector(".btn-upgrade");
    if (existing) existing.remove();

    // Create new unlock button
    const btn = document.createElement("button");
    btn.className = "btn-upgrade";
    btn.innerText = "Unlock with Pro 💎";
    btn.onclick = () => {
      console.log('🟢 Redirecting to Stripe Payment Link for Pro');
      window.location.href = stripeLinks.pro;
    };
    el.appendChild(btn);
  }

  // ========================
  // MARK FREE ANALYSIS AS USED
  // ========================
  function markFreeAnalysisUsed() {
    const currentFreeStatus = localStorage.getItem("hasUsedFreeAnalysis");
    if (currentFreeStatus !== "true" && !isPro) {
      localStorage.setItem("hasUsedFreeAnalysis", "true");
      console.log('✅ Free analysis marked as used');
      // Reapply gating after marking as used
      setTimeout(() => {
        applyGating();
      }, 500);
    }
  }

  // ========================
  // INITIALIZE ON DOM READY
  // ========================
  function init() {
    // Assign data-pro attributes based on content
    assignProAttributes();
    
    // Apply gating visuals
    applyGating();

    // Mark free analysis as used after analysis completes
    // Watch for chart rendering completion to detect analysis finish
    let analysisCheckInterval = setInterval(() => {
      const charts = document.querySelectorAll('.apexcharts-canvas');
      const hasResults = document.querySelectorAll('.report-card, .result-card').length > 0;
      
      // If we have at least 2 charts rendered and results are showing, mark as used
      if (charts.length >= 2 && hasResults && localStorage.getItem("hasUsedFreeAnalysis") !== "true") {
        markFreeAnalysisUsed();
        clearInterval(analysisCheckInterval);
      }
    }, 2000);

    // Stop checking after 30 seconds
    setTimeout(() => {
      clearInterval(analysisCheckInterval);
    }, 30000);
  }

  // ========================
  // ASSIGN DATA-PRO ATTRIBUTES
  // ========================
  function assignProAttributes() {
    const cardSelectors = '.gauge-box, .gauge-container, .report-card, .metric-card, .result-card';
    document.querySelectorAll(cardSelectors).forEach(card => {
      const titleEl = card.querySelector('h1, h2, h3, .card-title, .metric-title, .title');
      const title = (titleEl?.textContent || '').trim().toLowerCase();
      if (!title) return;
      
      // Only "Sound Match" and "Viewer Understanding" are free
      const isFree = title.includes('sound match') || title.includes('viewer understanding');
      card.setAttribute('data-pro', isFree ? 'false' : 'true');
    });
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Reapply gating when DOM updates (for SPA navigation)
  const gateObserver = new MutationObserver(() => {
    assignProAttributes();
    applyGating();
  });
  gateObserver.observe(document.body, { childList: true, subtree: true });

  console.log('✅ Gate logic initialized');
})();

