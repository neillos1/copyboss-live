(function(){
  const mobile = matchMedia('(max-width: 768px)').matches;
  if (!mobile) return;

  const SOCIAL = {
    twitter:  "https://twitter.com/copybosshq",
    x:        "https://twitter.com/copybosshq",
    facebook: "https://facebook.com/copybosshq",
    instagram:"https://instagram.com/copybosshq",
    tiktok:   "https://www.tiktok.com/@copybosspro?lang=en-GB",
    youtube:  "https://youtube.com/copybosshq"
  };

  const LEGAL = [
    { re:/privacy/i, sel:'#modal-privacy', href:'/privacy.html' },
    { re:/terms/i,   sel:'#modal-terms',   href:'/terms.html'   },
    { re:/support/i, sel:'#modal-support', href:'/support.html' }
  ];

  const normalize = (u) => {
    if (!u) return '';
    let s = u.trim();
    if (/^\/+https?:\/\//i.test(s)) s = s.replace(/^\/+/, '');
    if (!/^https?:\/\//i.test(s) && /(x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|youtube\.com)/i.test(s)) {
      s = 'https://' + s.replace(/^https?:\/\//i, '');
    }
    return s;
  };

  // Helper: find the topmost footer anchor under a point, even if covered
  const anchorFromPoint = (x, y) => {
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      const a = el.closest && el.closest('footer a, .site-footer a, .footer-social a, .footer-links a');
      if (a) return a;
    }
    return null;
  };

  // Decide action for a footer anchor
  const handleAnchor = (a) => {
    // SOCIAL?
    const net = (a.getAttribute('data-network') || '').toLowerCase();
    if (SOCIAL[net]) {
      const url = SOCIAL[net];
      window.open(url, '_blank', 'noopener');
      return true;
    }

    // LEGAL?
    const text = (a.textContent || '').trim();
    const wiring = LEGAL.find(m => m.re.test(text));
    if (wiring) {
      const modal = document.querySelector(wiring.sel);
      if (modal) {
        if (typeof window.openLegalModal === 'function') window.openLegalModal(wiring.sel);
        else {
          modal.style.display='block';
          modal.removeAttribute('aria-hidden');
          const overlay = document.querySelector('.modal-overlay');
          if (overlay){ overlay.style.display='block'; overlay.removeAttribute('aria-hidden'); }
        }
        return true;
      } else {
        const url = a.getAttribute('href') || wiring.href;
        window.location.href = url;
        return true;
      }
    }

    // Otherwise, external social by href?
    let href = normalize(a.getAttribute('href') || '');
    if (href && /^https?:\/\//i.test(href)) {
      window.open(href,'_blank','noopener');
      return true;
    }
    return false;
  };

  // Capture-phase handlers that win over rogue listeners/overlays
  const router = (evt) => {
    const touch = evt.changedTouches ? evt.changedTouches[0] : null;
    const x = touch ? touch.clientX : evt.clientX;
    const y = touch ? touch.clientY : evt.clientY;

    const vh = window.innerHeight || document.documentElement.clientHeight;
    const bottomZone = y >= vh - 260; // bottom 260px of screen
    if (!bottomZone) return;

    const a = anchorFromPoint(x, y);
    if (!a) return;

    // Hard-stop other handlers and route
    evt.preventDefault();
    evt.stopImmediatePropagation();
    handleAnchor(a);
  };

  document.addEventListener('touchend', router, { capture:true, passive:false });
  document.addEventListener('click',    router, { capture:true });
})();
