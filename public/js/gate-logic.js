console.log("🔐 Gate logic loaded:", {});

// 🚫 TEMPORARILY DISABLE LEGACY BLUR UNLOCK (GT FIX)
const __GT_DISABLE_BLUR_UNLOCK = true;

const hasUsedFree = localStorage.getItem("hasUsedFreeAnalysis") === "true";
// Strict Pro check: only treat as Pro when success=1 or localStorage.isPro === "true"
const urlParams = new URLSearchParams(window.location.search);
const isPro = urlParams.get("success") === "1" || localStorage.getItem("isPro") === "true";

// Gate check function for analysis
window.cbCanAnalyze = function() {
  // DEV ONLY: Localhost override for testing (does not affect production)
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return { allowed: true, reason: "DEV_LOCALHOST_OVERRIDE" };
  }
  
  const isProActive = localStorage.getItem('isPro') === 'true';
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

console.log("🔍 Gating detection:", {
  successParam: urlParams.get("success"),
  localStorageIsPro: localStorage.getItem("isPro")
});

const stripeLinks = {
  "2reports": "https://buy.stripe.com/3cI6oG1R25fn5bY6205os01",
  "15reports": "https://buy.stripe.com/00w6oGany37f33Qbmk5os00",
  "pro": "https://buy.stripe.com/3cI00idzK9vD8oacqo5os02"
};

const BLUR_TARGET_SELECTOR = "#viralGaugeCard, #captionGaugeCard, #engagementGaugeCard, #ideaGaugeCard, #viral-card, #caption-card, #engagementforecast-card, #viralstrength-card";

function scheduleBlurForFreeUsers(delay = 1500, logMessage = false) {
  const params = new URLSearchParams(window.location.search);
  const proActive = params.get("success") === "1" || localStorage.getItem("isPro") === "true";
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
    // Select both the locked containers and any elements inside them that might have filters
    const elements = document.querySelectorAll("[data-pro='true'], .blurred, .cb-card, .cb-gauge, .cb-report, .cb-result, .apexcharts-canvas, .apexcharts-inner, .apexcharts-svg, .apexcharts-radialbar, .apexcharts-radialbar path, .apexcharts-text");

    elements.forEach(el => {
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

  const params = new URLSearchParams(window.location.search);
  const proActive = params.get("success") === "1" || localStorage.getItem("isPro") === "true";
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
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.position = "relative";
    document.documentElement.style.height = "auto";
    document.body.style.overflow = "auto";
    document.body.style.position = "relative";
    document.body.style.height = "auto";

    document.querySelectorAll("*").forEach(el => {
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
