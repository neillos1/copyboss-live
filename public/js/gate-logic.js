console.log("🔐 Gate logic loaded:", {});

// 🚫 TEMPORARILY DISABLE LEGACY BLUR UNLOCK (GT FIX)
const __GT_DISABLE_BLUR_UNLOCK = true;

// Fix ReferenceError: ensure urlParams is defined
const params = new URLSearchParams(window.location.search);

// ============================================================
// SINGLE SOURCE OF TRUTH: getEntitlements()
// ============================================================
function getEntitlements() {
  // Dev mode rules (only active when ?dev=1 is present)
  const devMode = params.get("dev") === "1";
  
  if (devMode) {
    // Dev mode: check URL params
    const devPro = params.get("pro") === "1";
    const devFree = params.get("free") === "1";
    const devCredits = params.get("credits");
    
    const isPro = devPro && !devFree; // pro=1 overrides free=1
    const credits = devCredits ? Math.max(0, parseInt(devCredits)) : 0;
    
    // If devPro is true, set localStorage so it persists while testing
    if (isPro) {
      localStorage.setItem("isPro", "true");
    } else if (devFree) {
      localStorage.setItem("isPro", "false");
    }
    
    return { isPro, credits };
  }
  
  // Non-dev rules: read from backend user status if present, else localStorage
  // Check for backend user status (if available)
  const backendIsPro = window.userStatus?.isPro || window.userStatus?.tier === "pro" || window.userStatus?.plan === "pro";
  const backendCredits = window.userStatus?.credits || window.userStatus?.reportCredits;
  
  if (backendIsPro !== undefined || backendCredits !== undefined) {
    return {
      isPro: backendIsPro === true,
      credits: backendCredits ? Math.max(0, parseInt(backendCredits)) : 0
    };
  }
  
  // Fallback to localStorage keys
  const isPro = localStorage.getItem("isPro") === "true" || params.get("success") === "1";
  const credits = Math.max(0, parseInt(localStorage.getItem("reportCredits") || "0"));
  
  return { isPro, credits };
}

// ============================================================
// APPLY ENTITLEMENTS: applyEntitlements(entitlements)
// ============================================================
function applyEntitlements(entitlements) {
  const { isPro, credits } = entitlements;
  
  if (isPro) {
    // Pro: remove blur + remove locks + enable PRO-only buttons
    console.log("[GATING] Applying Pro entitlements - unlocking everything");
    
    const unlockAll = () => {
      // HARD BLOCK if Graph Help is open
      if (window.__graphHelpOpen) {
        console.log("[applyEntitlements] blocked — graph help open");
        return;
      }
      
      // Remove blur from all locked elements
      const elements = document.querySelectorAll(
        "[data-pro='true'], .blurred, .pro-locked, .cb-card, .cb-gauge, .cb-report, .cb-result, " +
        ".gauge-box.pro-locked, .pro-locked-results, .apexcharts-canvas, .apexcharts-inner, " +
        ".apexcharts-svg, .apexcharts-radialbar, .apexcharts-radialbar path, .apexcharts-text"
      );
      
      elements.forEach(el => {
        // Protect graph help modal
        if (el?.getAttribute?.('data-protected-modal') === 'graph-help' || 
            el?.closest?.('[data-protected-modal="graph-help"]')) {
          return;
        }
        // Remove blur/brightness/opacity filters
        el.classList.remove("blurred", "pro-locked");
        el.style.filter = "none";
        el.style.backdropFilter = "none";
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
        el.style.transition = "none";
        el.style.willChange = "auto";
      });
      
      // Hide locked overlays
      document.querySelectorAll(".locked-overlay").forEach(overlay => {
        overlay.style.display = "none";
        overlay.style.visibility = "hidden";
      });
      
      // Remove upgrade buttons
      document.querySelectorAll(".btn-upgrade").forEach(btn => btn.remove());
      
      // Remove blur from result content
      document.querySelectorAll(".result-content").forEach(content => {
        content.style.filter = "none";
        content.style.opacity = "1";
        content.style.pointerEvents = "auto";
      });
    };
    
    // Run unlock immediately and on delayed DOM loads
    unlockAll();
    setTimeout(unlockAll, 100);
    setTimeout(unlockAll, 500);
    setTimeout(unlockAll, 1000);
    setTimeout(unlockAll, 2000);
    
    // Add pro-active class
    document.body.classList.add("pro-active");
    
    console.log("[GATING] Pro unlock applied");
    
  } else {
    // Not Pro: apply blur/locks + keep upgrade modal working
    console.log("[GATING] Applying Free entitlements - keeping locks/blurs");
    
    document.body.classList.remove("pro-active");
    
    // Blur will be applied by scheduleBlurForFreeUsers if needed
  }
}

// Get entitlements once at load
const entitlements = getEntitlements();
console.log("[GATING] entitlements =", entitlements);

// Apply entitlements immediately
applyEntitlements(entitlements);

// Legacy variables for backward compatibility
const isProUser = entitlements.isPro;
const isPro = params.get("success") === "1" || isProUser;

const hasUsedFree = localStorage.getItem("hasUsedFreeAnalysis") === "true";

// Gate check function for analysis
window.cbCanAnalyze = function() {
  // DEV ONLY: Localhost override for testing (does not affect production)
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return { allowed: true, reason: "DEV_LOCALHOST_OVERRIDE" };
  }
  
  const { isPro: isProActive } = getEntitlements();
  const credits = parseInt(localStorage.getItem('reportCredits') || '0');
  const hasCredits = credits > 0;
  const freeUploadUsed = localStorage.getItem('freeUploadUsed') === 'true';
  
  if (isProActive) {
    return { allowed: true, reason: 'Pro user' };
  }
  
  if (hasCredits) {
    return { allowed: true, reason: `Has ${credits} credits` };
  }
  
  if (!freeUploadUsed) {
    return { allowed: true, reason: 'Free upload available' };
  }
  
  return { allowed: false, reason: 'No credits, free upload used, not Pro' };
};

// Global debug helper
window.__VB = {
  getEntitlements,
  applyEntitlements,
  refresh: () => {
    const e = getEntitlements();
    applyEntitlements(e);
    console.log("[GATING] Refreshed entitlements:", e);
  }
};

const stripeLinks = {
  "2reports": "https://buy.stripe.com/3cI6oG1R25fn5bY6205os01",
  "15reports": "https://buy.stripe.com/00w6oGany37f33Qbmk5os00",
  "pro": "https://buy.stripe.com/3cI00idzK9vD8oacqo5os02"
};

const BLUR_TARGET_SELECTOR = "#viralGaugeCard, #captionGaugeCard, #engagementGaugeCard, #ideaGaugeCard, #viral-card, #caption-card, #engagementforecast-card, #viralstrength-card";

function scheduleBlurForFreeUsers(delay = 1500, logMessage = false) {
  const { isPro: proActive } = getEntitlements();
  if (proActive) return;

  document.body.style.overflow = "auto";
  document.documentElement.style.overflow = "auto";
  document.body.style.position = "relative";
  document.body.style.height = "auto";

  setTimeout(() => {
    const targets = document.querySelectorAll(BLUR_TARGET_SELECTOR);
    if (!targets.length) return;

    targets.forEach(el => {
      el.style.filter = "blur(6px)";
      el.style.opacity = "0.7";
      // Keep pointer-events: none for blurred elements (they shouldn't be clickable)
      // But ensure upload button/file picker are NOT inside these blurred elements
      el.style.pointerEvents = "none";
      el.style.transition = "filter 0.3s ease, opacity 0.3s ease";
    });

    if (logMessage) {
      console.log("🎯 Final blur applied after chart render");
    }
  }, delay);
}

// ============================================================
// ✅ FINAL PRO UNLOCK FIX — removes all blur permanently
// ============================================================
if (!isPro) {
  console.log("🚫 Free user — blur removal blocked (final global guard)");
} else if (!__GT_DISABLE_BLUR_UNLOCK) {
  console.log("🎉 Stripe success detected — unlocking Pro...");
  localStorage.setItem("vbProUnlocked", "true");
  localStorage.setItem("isPro", "true");

  const unlockAll = () => {
    // HARD BLOCK if Graph Help is open
    if (window.__graphHelpOpen) {
      console.log("[unlockAll] blocked — graph help open");
      return;
    }
    
    // Select both the locked containers and any elements inside them that might have filters
    const elements = document.querySelectorAll("[data-pro='true'], .blurred, .cb-card, .cb-gauge, .cb-report, .cb-result, .apexcharts-canvas, .apexcharts-inner, .apexcharts-svg, .apexcharts-radialbar, .apexcharts-radialbar path, .apexcharts-text");

    elements.forEach(el => {
      // Protect graph help modal
      if (el?.getAttribute?.('data-protected-modal') === 'graph-help' || el?.closest?.('[data-protected-modal="graph-help"]')) {
        return;
      }
      // Remove blur/brightness/opacity filters at every level
      el.classList.remove("blurred");
      el.style.filter = "none";
      el.style.backdropFilter = "none";
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      el.style.transition = "none";
      el.style.willChange = "auto";
    });

    // Remove any unlock buttons that may still exist
    document.querySelectorAll(".btn-upgrade").forEach(btn => btn.remove());

    console.log("✅ Atomic blur removal completed");
  };

  // Run multiple times for delayed DOM loads
  unlockAll();                     // immediate
  setTimeout(unlockAll, 800);      // after gauges render
  setTimeout(unlockAll, 2000);     // after feedback loads
  setTimeout(unlockAll, 4000);     // after animations
  setTimeout(unlockAll, 7000);     // after observers reapply
  setTimeout(unlockAll, 10000);    // final safety sweep

  // Also clean up dynamically added elements (MutationObserver)
  // STOP observer if body.pro-active is already true
  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("pro-active")) {
      observer.disconnect(); // Stop observing once pro-active
      console.log("✅ MutationObserver stopped — pro-active already set");
      return;
    }
    unlockAll();
  });
  
  // Only observe if not already pro-active
  if (!document.body.classList.contains("pro-active")) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.body.classList.add("pro-active");
  
  // Force overflow cleanup one-time after Stripe success
  document.body.style.overflowY = "auto";
  document.documentElement.style.overflowY = "auto";
  
  console.log("💎 Pro-active mode enabled, observer conditionally running");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Gate logic initialized");

  // Re-apply entitlements on DOMContentLoaded to ensure locks/unlocks are correct
  const e = getEntitlements();
  applyEntitlements(e);

  const { isPro: proActive } = e;
  const proElements = document.querySelectorAll("[data-pro='true']");

  // 🧠 For non-Pro users - apply blur to locked elements
  if (!proActive) {
    if (!window.gateLogicAlreadyExecuted) {
      window.gateLogicAlreadyExecuted = true;
      document.body.classList.remove("pro-active");
      console.log("🚫 Free user — blur removal blocked (final guard)");
      console.log("🎯 Gating blur active for free user");

      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
      document.body.style.position = "relative";
      document.body.style.height = "auto";

      scheduleBlurForFreeUsers(1500, true);
      console.log("✅ Gate logic executed once");
    }
    return;
  }

  if (__GT_DISABLE_BLUR_UNLOCK) {
    console.log("🚫 Legacy blur unlock disabled (GT fix)");
    return;
  }

  if (!window.gateLogicAlreadyExecuted) {
    window.gateLogicAlreadyExecuted = true;
    console.log("✅ Blur removed for Pro user");

    const cleanupProElements = () => {
      proElements.forEach(el => {
        el.removeAttribute("data-pro");
        el.classList.remove("blurred", "pro-blur");
        el.style.filter = "none";
        el.style.backdropFilter = "none";
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
        const btn = el.querySelector(".btn-upgrade");
        if (btn) btn.remove();
      });

      document.querySelectorAll(".blurred, .pro-blur").forEach(el => {
        el.classList.remove("blurred", "pro-blur");
        el.style.filter = "none";
        el.style.backdropFilter = "none";
        el.style.opacity = "1";
      });

      if (!document.body.classList.contains("pro-active")) {
        document.body.classList.add("pro-active");
      }

      document.body.style.overflowY = "auto";
      document.documentElement.style.overflowY = "auto";
    };

    cleanupProElements();

    setTimeout(() => {
      if (!document.body.classList.contains("pro-active")) {
        cleanupProElements();
      }
    }, 500);

    console.log("✅ Gate logic executed once");
  }
});

function enforceFreeUserBlur() {
  if (!window.gateLogicAlreadyExecuted) {
    window.gateLogicAlreadyExecuted = true;
    scheduleBlurForFreeUsers(1500, false);
    console.log("✅ Gate logic executed once");
  }
}

window.addEventListener("load", () => {
  setTimeout(enforceFreeUserBlur, 1500);
  setTimeout(enforceFreeUserBlur, 3000); // backup pass
});

setInterval(() => {
  if (!window.gateLogicAlreadyExecuted) {
    window.gateLogicAlreadyExecuted = true;
    scheduleBlurForFreeUsers(1500, false);
    console.log("🧩 Global safety reblur pass executed for free user");
    console.log("✅ Gate logic executed once");
  }
}, 3000);

window.addEventListener("load", () => {
  setTimeout(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    console.log("✅ Scroll restored globally");
  }, 500);
});

(function forceScrollUnlock() {
  function unlockAll() {
    // HARD BLOCK if Graph Help is open
    if (window.__graphHelpOpen) {
      console.log("[unlockAll] blocked — graph help open");
      return;
    }
    
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.position = "relative";
    document.documentElement.style.height = "auto";
    document.body.style.overflow = "auto";
    document.body.style.position = "relative";
    document.body.style.height = "auto";

    document.querySelectorAll("*").forEach(el => {
      // Protect graph help modal
      if (el?.getAttribute?.('data-protected-modal') === 'graph-help' || el?.closest?.('[data-protected-modal="graph-help"]')) {
        return;
      }
      const cs = getComputedStyle(el);
      if (cs.overflow === "hidden" || cs.position === "fixed" || cs.height === "100vh") {
        el.style.overflow = "auto";
        el.style.position = "relative";
        el.style.height = "auto";
      }
    });

    window.onscroll = null;
    window.onwheel = null;
    window.ontouchmove = null;
    console.log("✅ Full CSS-level scroll unlock executed");
  }

  unlockAll();
  window.addEventListener("load", unlockAll);
  setTimeout(unlockAll, 1500);
  setInterval(unlockAll, 4000);
})();

/* --- GT NOV8 RUNTIME PATCH --- */
try {
  if (typeof Swal !== "function") {
    window.Swal = function () {
      return {
        fire: (opts) =>
          console.log(
            "⚠️ SweetAlert fallback active (GT patch)",
            opts || ""
          ),
      };
    };
  }

  if (window.__scrollUnlockObserver) {
    window.__scrollUnlockObserver.disconnect();
    console.log("🧩 Scroll unlock observer disconnected (GT patch)");
  }

  document.body.style.overflowY = "auto";
  document.body.style.paddingTop = "0";
  document.body.style.marginBottom = "0";

  document
    .querySelectorAll(".analyzer-container, .wrapper, main")
    .forEach((el) => {
      el.style.marginTop = "0";
      el.style.marginBottom = "0";
      el.style.paddingTop = "0";
      el.style.paddingBottom = "0";
    });

  requestAnimationFrame(() => {
    document.body.offsetHeight;
    console.log("✅ GT NOV8 runtime patch applied successfully");
  });
} catch (e) {
  console.warn("GT NOV8 patch error:", e);
}
/* --- END PATCH --- */
