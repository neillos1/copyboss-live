(function(){
  var OVERLAY_SEL = '#mascot-overlay, .mascot-overlay, [data-mascot-overlay]';
  var ROOT_SEL    = '#mascot, .mascot-root, [data-mascot-root]';
  var SKIP_SEL    = '.mascot-skip, [data-mascot-skip], .cb-skip, [data-skip]';

  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)||[]); }

  function bypassRequested(){
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('noMascot') === '1') { localStorage.setItem('cb_noMascot','1'); return true; }
      return localStorage.getItem('cb_noMascot') === '1';
    } catch(e){ return false; }
  }

  function unlockPage(){
    try{
      // Remove common lock classes
      ['no-scroll','prevent-scroll','modal-open','menu-open','is-locked','locked'].forEach(function(c){
        document.documentElement.classList.remove(c);
        document.body.classList.remove(c);
      });
      // Restore scroll/pointers
      ['html','body'].forEach(function(tag){
        var el = document.querySelector(tag);
        if (!el) return;
        el.style.overflow = '';
        el.style.pointerEvents = '';
        el.style.touchAction = '';
      });
      // Kill any leftover overlays
      qsa(OVERLAY_SEL+','+ROOT_SEL).forEach(function(n){
        try{ n.style.pointerEvents = 'none'; n.style.opacity = '0'; n.remove(); }catch(_){}
      });
    }catch(_){}
  }

  function finishMascot(reason){
    try {
      document.documentElement.classList.add('mascot-done');
      unlockPage();
      try { window.dispatchEvent(new CustomEvent('mascot:finished', { detail:{ reason: reason||'failsafe' } })); } catch(_){}
    } catch(_) {}
  }

  function wireSkip(){
    document.addEventListener('click', function(e){
      if (e.target.closest(SKIP_SEL)) {
        e.preventDefault();
        finishMascot('skip-click');
      }
    }, true);
  }

  function armTimers(){
    // Early sweep (2s), standard (3.5s), late (7s)
    [2000, 3500, 7000].forEach(function(ms){
      setTimeout(function(){
        if (qs(OVERLAY_SEL) || qs(ROOT_SEL)) finishMascot('timer-'+ms);
      }, ms);
    });
  }

  function observeSafety(){
    try{
      var mo = new MutationObserver(function(){
        if (qs(OVERLAY_SEL) || qs(ROOT_SEL)) {
          setTimeout(function(){ finishMascot('observer'); }, 60);
        }
      });
      mo.observe(document.documentElement, {subtree:true, childList:true, attributes:true});
    }catch(_){}
  }

  function focusEvents(){
    // If tab becomes visible and overlay still present, finish
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden && (qs(OVERLAY_SEL) || qs(ROOT_SEL))) finishMascot('visibility');
    });
    // Any user gesture should also flush the overlay
    ['pointerdown','keydown','touchstart'].forEach(function(evt){
      window.addEventListener(evt, function(){
        if (qs(OVERLAY_SEL) || qs(ROOT_SEL)) finishMascot('gesture');
      }, { once:false, capture:true });
    });
  }

  function init(){
    if (bypassRequested()) { finishMascot('bypass'); return; }
    wireSkip(); armTimers(); observeSafety(); focusEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
