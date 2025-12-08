(function(){
  if (!('matchMedia' in window) || !matchMedia('(max-width: 900px)').matches) return;

  // Likely selectors used by your menu & overlay (additive list)
  var MENU_SEL   = '[data-mobile-menu], .mobile-menu, .menu-panel, .nav-drawer, .site-nav--mobile';
  var OVERLAY_SEL= '.menu-overlay, .backdrop, [data-nav-overlay], .nav-backdrop';

  function vhpx(){ return (window.innerHeight || document.documentElement.clientHeight || 640) + 'px'; }

  function visible(el){
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.01) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return true;
  }

  function lockBody(){
    if (document.documentElement.classList.contains('cb-nav-open')) return;
    var y = window.scrollY || 0;
    document.documentElement.classList.add('cb-nav-open');
    document.body.dataset._lockY = y;
    document.body.style.position = 'fixed';
    document.body.style.top = (-y) + 'px';
    document.body.style.left = '0'; document.body.style.right='0'; document.body.style.width='100%';
  }
  function unlockBody(){
    if (!document.documentElement.classList.contains('cb-nav-open')) return;
    if (window.vbSimpleModalIsOpen && window.vbSimpleModalIsOpen()) return;
    var y = +(document.body.dataset._lockY || 0);
    document.documentElement.classList.remove('cb-nav-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    if (!window.vbSimpleModalIsOpen || !window.vbSimpleModalIsOpen()) {
      window.scrollTo(0, y);
    }
  }

  function portalize(el, overlay){
    if (!el) return;
    if (el.__cbPortal) return; // already portaled this open
    // placeholder to restore position later
    var ph = document.createComment('cb-menu-portal-ph');
    el.__cbPortal = { parent: el.parentNode, next: el.nextSibling, placeholder: ph, overlay: null };

    // move overlay if present
    if (overlay && overlay.parentNode){
      var phOv = document.createComment('cb-overlay-ph');
      overlay.__cbPortal = { parent: overlay.parentNode, next: overlay.nextSibling, placeholder: phOv };
      overlay.parentNode.insertBefore(phOv, overlay.nextSibling);
      document.body.appendChild(overlay);
      overlay.classList.add('cb-menu-portal-overlay');
      overlay.style.display = 'block';
      el.__cbPortal.overlay = overlay;
    }

    // move menu into body and style
    el.parentNode.insertBefore(ph, el.nextSibling);
    document.body.appendChild(el);
    el.classList.add('cb-menu-portal');
    el.style.height = '100dvh';
    // fallback for older iOS
    el.style.setProperty('--cb-fallback-h', vhpx());
    if (!CSS.supports('height', '100dvh')) {
      el.style.height = 'var(--cb-fallback-h)';
      window.addEventListener('resize', function(){ el.style.setProperty('--cb-fallback-h', vhpx()); el.style.height = 'var(--cb-fallback-h)'; }, { passive:true });
    }
    try { el.scrollTop = 0; } catch(e){}
  }

  function unportalize(el){
    if (!el || !el.__cbPortal) return;
    var info = el.__cbPortal;
    el.classList.remove('cb-menu-portal');
    el.style.height = '';
    // restore element to original place
    if (info.parent){
      if (info.next) info.parent.insertBefore(el, info.next);
      else info.parent.appendChild(el);
    }
    if (info.placeholder && info.placeholder.parentNode) info.placeholder.parentNode.removeChild(info.placeholder);
    // restore overlay if we moved it
    var ov = info.overlay;
    if (ov && ov.__cbPortal){
      ov.classList.remove('cb-menu-portal-overlay');
      if (ov.__cbPortal.parent){
        if (ov.__cbPortal.next) ov.__cbPortal.parent.insertBefore(ov, ov.__cbPortal.next);
        else ov.__cbPortal.parent.appendChild(ov);
      }
      if (ov.__cbPortal.placeholder && ov.__cbPortal.placeholder.parentNode){
        ov.__cbPortal.placeholder.parentNode.removeChild(ov.__cbPortal.placeholder);
      }
      ov.__cbPortal = null;
    }
    el.__cbPortal = null;
  }

  function getMenu(){ return document.querySelector(MENU_SEL); }
  function getOverlay(){ return document.querySelector(OVERLAY_SEL); }

  function sync(){
    var menu = getMenu();
    if (!menu) return;
    var overlay = getOverlay();

    if (visible(menu)){
      portalize(menu, overlay);
      lockBody();
      try { menu.scrollTop = 0; } catch(e){}
    } else {
      unportalize(menu);
      unlockBody();
    }
  }

  // Observe attribute/class changes (framework toggles)
  try{
    var mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['class','style','aria-hidden','data-state']});
  }catch(e){}

  // Hook toggles
  document.addEventListener('click', function(e){
    if (e.target.closest('.hamburger, .burger, .menu-toggle, [data-nav-toggle], [aria-controls]')) {
      setTimeout(sync, 0);
      setTimeout(sync, 150);
    }
    // Close events (overlay tap or menu link)
    if (e.target.closest('.menu-overlay, .backdrop, [data-nav-overlay], .nav-backdrop, .mobile-menu a, .menu-panel a')) {
      setTimeout(sync, 50);
      setTimeout(sync, 200);
    }
  }, true);

  window.addEventListener('resize', sync, {passive:true});
  window.addEventListener('orientationchange', sync, {passive:true});
  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('load', sync);
})();
