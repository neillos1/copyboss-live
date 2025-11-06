console.log("🔐 Gate logic loaded:", {});

const hasUsedFree = localStorage.getItem("hasUsedFreeAnalysis") === "true";
const isPro = localStorage.getItem("vbProUnlocked") === "true";

const stripeLinks = {
  "2reports": "https://buy.stripe.com/3cI6oG1R25fn5bY6205os01",
  "15reports": "https://buy.stripe.com/00w6oGany37f33Qbmk5os00",
  "pro": "https://buy.stripe.com/3cI00idzK9vD8oacqo5os02"
};

// ============================================================
// ✅ FINAL PRO UNLOCK FIX — removes all blur permanently
// ============================================================
if (window.location.search.includes("success=1")) {
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

  const proElements = document.querySelectorAll("[data-pro='true']");

  // 🧠 For non-Pro users - apply blur to locked elements
  if (!isPro && !window.location.search.includes("success=1")) {
    // Ensure body does NOT have pro-active class
    document.body.classList.remove("pro-active");
    
    console.log("🎯 Gating blur applied for free user");
    
    // Blur 4 Pro-locked gauges (keep Sound Match and Viewer Understanding unblurred)
    const lockedGaugeIds = ['#viralGaugeCard', '#captionGaugeCard', '#engagementGaugeCard', '#ideaGaugeCard'];
    lockedGaugeIds.forEach(id => {
      const gauge = document.querySelector(id);
      if (gauge) {
        gauge.style.filter = 'blur(6px)';
        gauge.style.opacity = '0.7';
        gauge.style.pointerEvents = 'none';
        gauge.classList.add("blurred");
      }
    });
    
    // Blur 4 Pro-locked result cards (keep Sound Match and Viewer Understanding unblurred)
    const lockedCardIds = ['#viral-card', '#caption-card', '#engagementforecast-card', '#viralstrength-card'];
    lockedCardIds.forEach(id => {
      const card = document.querySelector(id);
      if (card) {
        card.style.filter = 'blur(6px)';
        card.style.opacity = '0.7';
        card.style.pointerEvents = 'none';
        card.classList.add("blurred");
      }
    });
  } else {
    console.log("✅ Blur removed for Pro user");
    
    // Enhanced cleanup for Pro users
    const cleanupProElements = () => {
      // Remove data-pro, blurred, and pro-blur classes
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
      
      // Also clean up any other blurred elements
      document.querySelectorAll(".blurred, .pro-blur").forEach(el => {
        el.classList.remove("blurred", "pro-blur");
        el.style.filter = "none";
        el.style.backdropFilter = "none";
        el.style.opacity = "1";
      });
      
      // Ensure pro-active class is set and overflow is auto
      if (!document.body.classList.contains("pro-active")) {
        document.body.classList.add("pro-active");
      }
      
      // Force overflow cleanup
      document.body.style.overflowY = "auto";
      document.documentElement.style.overflowY = "auto";
    };
    
    cleanupProElements();
    
    // Re-run cleanup after a short delay (but only if not pro-active)
    setTimeout(() => {
      if (!document.body.classList.contains("pro-active")) {
        cleanupProElements();
      }
    }, 500);
  }
  
  // Guard MutationObserver - don't run if pro-active class is already present
  if (!document.body.classList.contains("pro-active")) {
    // MutationObserver logic here if needed - currently handled by unlockAll in success handler
  }
});
