// CopyBoss – Footer External Link Guard (runs last, capture phase)
(function () {
  const SOCIAL_HREFS = {
    twitter:  "https://twitter.com/copybosshq",
    x:        "https://twitter.com/copybosshq",
    facebook: "https://facebook.com/copybosshq",
    instagram:"https://instagram.com/copybosshq",
    tiktok:   "https://www.tiktok.com/@copybosspro?lang=en-GB",
    youtube:  "https://youtube.com/copybosshq"
  };

  // Helper: normalize potential bad hrefs like "/https://..." or scheme-less
  const normalize = (url) => {
    if (!url) return "";
    let u = url.trim();
    if (/^\/+https?:\/\//i.test(u)) u = u.replace(/^\/+/, ""); // "/https://..." → "https://..."
    if (!/^https?:\/\//i.test(u)) {
      // if it looks like a social domain, prefix https://
      if (/(x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|youtube\.com)/i.test(u)) {
        u = "https://" + u.replace(/^https?:\/\//i, "");
      }
    }
    return u;
  };

  // Install a capture-phase handler that beats other listeners
  document.addEventListener("click", (e) => {
    const a = e.target.closest('footer .social a, .site-footer .social a, .footer-social a, a[data-external="true"]');
    if (!a) return;

    // Normalize/repair the href
    const orig = a.getAttribute("href") || "";
    let fixed = normalize(orig);

    // If marked by data-network, enforce the canonical URL
    const net = (a.getAttribute("data-network") || "").toLowerCase();
    if (SOCIAL_HREFS[net]) fixed = SOCIAL_HREFS[net];

    if (!fixed) return; // nothing to do

    // External open (hard lock)
    e.preventDefault();
    e.stopImmediatePropagation();

    // Guarantee external behavior
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "external noopener noreferrer");

    try {
      window.open(fixed, "_blank", "noopener");
    } catch (err) {
      // Fallback
      window.location.href = fixed;
    }
  }, { capture: true });
})();
