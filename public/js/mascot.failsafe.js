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

  function finishMascot(reason){
    try {
      // mark done
      document.documentElement.classList.add('mascot-done');
      // unblock interactions & remove overlays
      qsa(OVERLAY_SEL+','+ROOT_SEL).forEach(function(n){
        try {
          n.style.pointerEvents = 'none';
          n.style.opacity = '0';
          n.remove();
        } catch(_){}
      });
      // tell anything waiting (e.g., cookie banner)
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
    // if still present after 3.5s, finish; then sweep again at 7s
    setTimeout(function(){
      if (qs(OVERLAY_SEL) || qs(ROOT_SEL)) finishMascot('timer-3500');
    }, 3500);
    setTimeout(function(){
      if (qs(OVERLAY_SEL) || qs(ROOT_SEL)) finishMascot('timer-7000');
    }, 7000);
  }

  function observeSafety(){
    try{
      var mo = new MutationObserver(function(){
        // If anything toggles the mascot back in, neutralize quickly
        if (qs(OVERLAY_SEL) || qs(ROOT_SEL)) {
          // short delay to allow any CSS class flips to land
          setTimeout(function(){ finishMascot('observer'); }, 50);
        }
      });
      mo.observe(document.documentElement, {subtree:true, childList:true, attributes:true});
    }catch(_){}
  }

  function init(){
    if (bypassRequested()) { finishMascot('bypass'); return; }
    wireSkip();
    armTimers();
    observeSafety();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
