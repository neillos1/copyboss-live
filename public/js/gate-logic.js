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
    
    if (!hasUsedFree) {
      console.log("🎁 Free analysis available – first-time user");
      localStorage.setItem("hasUsedFreeAnalysis", "true");
    } else {
      console.log("🚫 Free use exhausted – blurring Pro elements");
      proElements.forEach(el => {
        el.classList.add("blurred");
        el.style.position = "relative";
        el.style.filter = "blur(4px) brightness(0.7)";
        el.style.transition = "filter 0.4s ease";
        el.style.pointerEvents = "none";

        // Inject Unlock Button
        let btn = el.querySelector(".btn-upgrade");
        if (!btn) {
          btn = document.createElement("button");
          btn.className = "btn-upgrade";
          btn.textContent = "Unlock with Pro 💎";
          btn.onclick = () => window.location.href = stripeLinks.pro;
          btn.style.position = "absolute";
          btn.style.top = "50%";
          btn.style.left = "50%";
          btn.style.transform = "translate(-50%, -50%)";
          btn.style.zIndex = "999";
          btn.style.background = "linear-gradient(90deg,#00c6ff,#0072ff)";
          btn.style.border = "none";
          btn.style.color = "#fff";
          btn.style.padding = "10px 18px";
          btn.style.borderRadius = "8px";
          btn.style.fontSize = "14px";
          btn.style.cursor = "pointer";
          btn.style.boxShadow = "0 0 15px rgba(0,0,0,0.3)";
          el.appendChild(btn);
        }
      });
    }
  } else {
    console.log("✅ Pro user — all features unlocked");
    
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
