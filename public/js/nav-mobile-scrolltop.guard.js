(function(){
  // mobile only
  if (!('matchMedia' in window) || !matchMedia('(max-width: 900px)').matches) return;

  // Broad selectors so we don't need to know your exact classes
  var OPEN_SEL  = '.hamburger, .burger, .menu-toggle, [data-nav-toggle], [data-menu-toggle], [aria-controls*="menu"], [aria-controls*="nav"], button[aria-label*="menu" i]';
  var CLOSE_SEL = '.menu-overlay, .backdrop, [data-nav-overlay], .nav-backdrop, .nav-close, [data-close], button[aria-label*="close" i], .mobile-menu a, .menu-panel a, .nav-drawer a';
  
  function saveY(){
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.dataset.cbNavSavedY = String(y);
    return y;
  }
  function restoreY(){
    var y = +(document.documentElement.dataset.cbNavSavedY || 0);
    // minor delay so close animation finishes
    setTimeout(function(){ window.scrollTo(0, y); }, 60);
  }

  // Ensure page is at top before drawer becomes visible
  function preOpen(){
    saveY();
    // do it twice to beat frameworks that open async
    window.scrollTo(0, 0);
    setTimeout(function(){ window.scrollTo(0, 0); }, 0);
  }

  // Wire clicks (capture so nothing cancels us)
  document.addEventListener('click', function(e){
    var openToggle = e.target.closest(OPEN_SEL);
    if (openToggle){
      preOpen();
      // run one more after potential async toggle/change
      setTimeout(preOpen, 50);
      return;
    }
    var closeHit = e.target.closest(CLOSE_SEL);
    if (closeHit){
      restoreY();
    }
  }, true);

  // ESC close restores too
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') restoreY();
  });

  // As a safety net: if any element toggles to aria-hidden="false" (drawer open), we preOpen.
  try {
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var t = muts[i].target;
        if (t && t.getAttribute && t.getAttribute('aria-hidden') === 'false'){
          preOpen();
          break;
        }
      }
    });
    mo.observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['aria-hidden']});
  } catch(_) {}
})();
