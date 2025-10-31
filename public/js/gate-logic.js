console.log("🔐 Gate logic loaded:", {});

const hasUsedFree = localStorage.getItem("hasUsedFreeAnalysis") === "true";
const isPro = localStorage.getItem("vbProUnlocked") === "true";

const stripeLinks = {
  "2reports": "https://buy.stripe.com/3cI6oG1R25fn5bY6205os01",
  "15reports": "https://buy.stripe.com/00w6oGany37f33Qbmk5os00",
  "pro": "https://buy.stripe.com/3cI00idzK9vD8oacqo5os02"
};

// ✅ Detect Stripe unlock via ?success=1
if (window.location.search.includes("success=1")) {
  console.log("🎉 Stripe success detected — unlocking Pro...");
  localStorage.setItem("vbProUnlocked", "true");
  localStorage.setItem("isPro", "true");
  setTimeout(() => {
    document.querySelectorAll("[data-pro='true']").forEach(el => {
      el.classList.remove("blurred");
      el.style.filter = "none";
      el.style.pointerEvents = "auto";
      const btn = el.querySelector(".btn-upgrade");
      if (btn) btn.remove();
    });
    console.log("✅ Pro unlocked after Stripe payment");
  }, 800);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Gate logic initialized");

  const proElements = document.querySelectorAll("[data-pro='true']");

  // 🧠 For non-Pro users
  if (!isPro) {
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
    proElements.forEach(el => {
      el.classList.remove("blurred");
      el.style.filter = "none";
      el.style.pointerEvents = "auto";
      const btn = el.querySelector(".btn-upgrade");
      if (btn) btn.remove();
    });
  }
});
