(function () {
  // Try common CMPs; else show our simple modal; else go to page.
  function tryCMP() {
    try {
      if (window.Cookiebot && typeof window.Cookiebot.show === 'function') { window.Cookiebot.show(); return true; }
      if (window.OneTrust && typeof window.OneTrust.ToggleInfoDisplay === 'function') { window.OneTrust.ToggleInfoDisplay(); return true; }
      if (window._iub && _iub.cs && _iub.cs.api && typeof _iub.cs.api.open === 'function') { _iub.cs.api.open(); return true; }
      if (window.cy && typeof window.cy.showSettings === 'function') { window.cy.showSettings(); return true; }
      if (window.CookieConsent && typeof window.CookieConsent.openPreferences === 'function') { window.CookieConsent.openPreferences(); return true; }
      if (window.klaro && typeof window.klaro.show === 'function') { window.klaro.show(); return true; }
    } catch(e) {}
    return false;
  }

  function ensureOverlay() {
    var ov = document.querySelector('.modal-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'modal-overlay';
      ov.setAttribute('aria-hidden','true');
      ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.5)';
      document.body.appendChild(ov);
    }
    return ov;
  }

  function openModal(sel) {
    var m = document.querySelector(sel);
    if (!m) return false;
    var ov = ensureOverlay();
    m.style.display = 'block';
    m.setAttribute('aria-hidden','false');
    ov.style.display = 'block';
    ov.setAttribute('aria-hidden','false');
    return true;
  }
  function closeModal(sel) {
    var m = document.querySelector(sel);
    var ov = document.querySelector('.modal-overlay');
    if (m) { m.style.display = 'none'; m.setAttribute('aria-hidden','true'); }
    if (ov) { ov.style.display = 'none'; ov.setAttribute('aria-hidden','true'); }
  }
  window.openCookieModal = function(){ return openModal('#modal-cookies'); };
  window.closeCookieModal = function(){ return closeModal('#modal-cookies'); };

  // Click wiring (capture so nothing blocks it)
  document.addEventListener('click', function(e){
    var a = e.target.closest('[data-cookie-settings], a[href="#cookies"], a[href="#cookie-settings"]');
    if (!a) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (tryCMP()) return;
    if (!openModal('#modal-cookies')) window.location.href = '/cookie-policy.html';
  }, {capture:true});

  // Close buttons + overlay + ESC
  document.addEventListener('click', function(e){
    if (e.target.closest('[data-close-modal="#modal-cookies"], .modal-close[data-target="#modal-cookies"]')) {
      e.preventDefault(); closeModal('#modal-cookies');
    }
    if (e.target.classList && e.target.classList.contains('modal-overlay')) closeModal('#modal-cookies');
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeModal('#modal-cookies');
  });
})();

