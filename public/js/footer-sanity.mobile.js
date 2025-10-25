(function () {
  const mobile = matchMedia('(max-width: 768px)').matches;
  if (!mobile) return;

  // 1) Fix any accidental "/https://..." or scheme-less hrefs in social icons
  document.querySelectorAll('.site-footer .social a, footer .social a, .footer-social a, .social-link').forEach(a => {
    let raw = a.getAttribute('href') || '';
    if (!raw) return;
    raw = raw.trim();
    if (/^\/+https?:/i.test(raw)) { raw = raw.replace(/^\/+/, ''); }
    if (!/^https?:\/\//i.test(raw) && /(twitter|x\.com|facebook|instagram|tiktok|youtube)\.com/i.test(raw)) {
      raw = 'https://' + raw.replace(/^https?:\/\//i, '');
    }
    // Only set if changed (to avoid blowing away absolute URLs)
    if (raw !== a.getAttribute('href')) a.setAttribute('href', raw);

    // Guarantee external behavior
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });

  // 2) Unblock taps: ensure footer anchors are clickable and no overlay steals events
  //    (keep modals interactive)
  const unblock = `
    @media (max-width:768px){
      .site-footer, footer.site-footer { position: relative; z-index: 10; }
      .site-footer a, footer.site-footer a { pointer-events: auto !important; }
      .fx-layer, .bg-decor, .stars, .particles, .hero-overlay, .canvas-bg { pointer-events: none !important; }
      .modal, .modal *, .modal-overlay { pointer-events: auto !important; }
      .modal-overlay { position: fixed; inset: 0; z-index: 9998; }
      .modal       { z-index: 9999; }
      .site-footer .social a, footer .social a, .footer-social a, .social-link {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 44px; min-height: 44px; -webkit-tap-highlight-color: rgba(0,0,0,0); touch-action: manipulation;
      }
    }`;
  const style = document.createElement('style');
  style.textContent = unblock;
  document.head.appendChild(style);

  // 3) Make the modal opener robust with fallback
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-modal], a[aria-controls]');
    if (!a) return;
    const sel = a.getAttribute('data-modal') || a.getAttribute('aria-controls');
    if (!sel) return; // no modal attribute → do nothing special
    const modal = document.querySelector(sel);
    if (!modal) return; // let normal nav happen
    e.preventDefault();
    if (typeof window.openLegalModal === 'function') { window.openLegalModal(sel); return; }
    // Minimal fallback open if function missing
    modal.style.display = 'block';
    modal.removeAttribute('aria-hidden');
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) { overlay.style.display = 'block'; overlay.removeAttribute('aria-hidden'); }
  }, { capture: true });

  // 4) Kill rogue preventDefault on social icons (allow native nav)
  document.querySelectorAll('.site-footer .social, footer .social, .footer-social, .social-icons').forEach(node => {
    node.addEventListener('click', (evt) => {
      const a = evt.target.closest('a');
      if (!a) return;
      // If some upstream listener prevented default, re-trigger native nav
      if (evt.defaultPrevented) {
        window.open(a.href, '_blank', 'noopener');
      }
    }, { capture: true });
  });
})();
