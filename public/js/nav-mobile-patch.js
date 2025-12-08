(function(){
  // Mobile only
  if (!window.matchMedia || !matchMedia('(max-width: 900px)').matches) return;

  var menuSel = '[data-mobile-menu], .mobile-menu, .menu-panel, .nav-drawer, .site-nav--mobile';
  var lastLockY;

  function getMenu(){
    return document.querySelector(menuSel);
  }
  function isOpen(el){
    if (!el) return false;
    var cs = getComputedStyle(el);
    var vis = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity||'1') > 0.01;
    var aria = el.getAttribute('aria-hidden') === 'false';
    var cls  = el.classList.contains('open') || el.classList.contains('is-open') || (el.dataset.state === 'open');
    return vis || aria || cls;
  }
  function fixMenu(el){
    // Pin to viewport and reset its own scroll
    el.style.position = 'fixed';
    el.style.top = '0'; el.style.left = '0'; el.style.right = '0'; el.style.bottom = '0';
    el.style.height = '100vh'; el.style.maxHeight = '100vh';
    el.style.overflowY = 'auto'; el.style.webkitOverflowScrolling = 'touch';
    el.style.zIndex = '9999';
    // ensure content is at top on each open
    try { el.scrollTop = 0; } catch(e){}
  }
  function lockBody(){
    if (document.body.dataset._navLocked === '1') return;
    lastLockY = window.scrollY || window.pageYOffset || 0;
    document.body.dataset._navLocked = '1';
    document.body.style.position = 'fixed';
    document.body.style.top = (-lastLockY) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
  function unlockBody(){
    if (document.body.dataset._navLocked !== '1') return;
    if (window.vbSimpleModalIsOpen && window.vbSimpleModalIsOpen()) return;
    document.body.dataset._navLocked = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    if (typeof lastLockY === 'number' && (!window.vbSimpleModalIsOpen || !window.vbSimpleModalIsOpen())) {
      window.scrollTo(0, lastLockY);
    }
  }

  function sync(){
    var menu = getMenu();
    if (!menu) return;
    if (isOpen(menu)){
      fixMenu(menu);
      lockBody();
    } else {
      unlockBody();
    }
  }

  // Observe class/attr/display changes anywhere (menu frameworks toggle different things)
  try{
    var mo = new MutationObserver(function(){ sync(); });
    mo.observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['class','style','aria-hidden','data-state']});
    window.addEventListener('resize', sync, {passive:true});
    window.addEventListener('orientationchange', sync, {passive:true});

    // Also hook typical toggles so first open is instant
    document.addEventListener('click', function(e){
      if (e.target.closest('.hamburger, .burger, .menu-toggle, [data-nav-toggle]')) {
        setTimeout(sync, 0);
        setTimeout(sync, 150);
      }
    }, true);

    // Initial pass
    document.addEventListener('DOMContentLoaded', sync);
    window.addEventListener('load', sync);
  }catch(e){}
})();
