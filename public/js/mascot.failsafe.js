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
      ['no-scroll','prevent-scroll','modal-open','menu-open','is-locked','locked'].forEach(function(c){
        document.documentElement.classList.remove(c);
        document.body.classList.remove(c);
      });
      ['html','body'].forEach(function(tag){
        var el = document.querySelector(tag);
        if (!el) return;
        el.style.overflow = '';
        el.style.pointerEvents = '';
        el.style.touchAction = '';
        el.style.position = el.style.position === 'fixed' ? '' : el.style.position;
      });
    }catch(_){}
  }

  function finishMascot(reason){
    try {
      document.documentElement.classList.add('mascot-done');
      unlockPage();
      // Remove known containers
      qsa(OVERLAY_SEL+','+ROOT_SEL).forEach(function(n){ try{ n.style.pointerEvents='none'; n.style.opacity='0'; n.remove(); }catch(_){} });
      try { window.dispatchEvent(new CustomEvent('mascot:finished', { detail:{ reason: reason||'failsafe' } })); } catch(_){}
    } catch(_) {}
  }

  // --- Nuclear sweep: remove any full-screen overlay (fixed/absolute & big) ---
  function looksLikeOverlay(el){
    try{
      var cs = getComputedStyle(el);
      var pos = cs.position;
      if (pos !== 'fixed' && pos !== 'absolute') return false;
      var vw = Math.max(document.documentElement.clientWidth, window.innerWidth||0);
      var vh = Math.max(document.documentElement.clientHeight, window.innerHeight||0);
      var r = el.getBoundingClientRect();
      var big = (r.width >= vw*0.9 && r.height >= vh*0.9);
      var blocks = cs.pointerEvents !== 'none' || cs.zIndex && +cs.zIndex > 500;
      return big && blocks;
    }catch(_){ return false; }
  }
  function sweepOverlays(){
    try{
      var all = document.body ? document.body.getElementsByTagName('*') : [];
      for (var i=all.length-1;i>=0;i--){
        var el = all[i];
        if (looksLikeOverlay(el)){
          try { el.style.pointerEvents='none'; el.style.opacity='0'; el.remove(); }catch(_){}
        }
      }
      // also remove known ones
      qsa(OVERLAY_SEL+','+ROOT_SEL).forEach(function(n){ try{ n.remove(); }catch(_){} });
      unlockPage();
    }catch(_){}
  }

  function wireSkip(){
    document.addEventListener('click', function(e){
      if (e.target.closest(SKIP_SEL)) { e.preventDefault(); finishMascot('skip-click'); }
    }, true);
  }
  function armTimers(){
    [1200, 2500, 4000, 7000].forEach(function(ms){
      setTimeout(function(){ sweepOverlays(); finishMascot('timer-'+ms); }, ms);
    });
    // repeated sweeps for 10s
    var t0 = Date.now();
    var iv = setInterval(function(){
      sweepOverlays();
      if (Date.now()-t0 > 10000) clearInterval(iv);
    }, 900);
  }
  function observeSafety(){
    try{
      var mo = new MutationObserver(function(){ sweepOverlays(); });
      mo.observe(document.documentElement, {subtree:true, childList:true, attributes:true});
    }catch(_){}
  }
  function focusEvents(){
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) sweepOverlays(); });
    ['pointerdown','keydown','touchstart'].forEach(function(evt){
      window.addEventListener(evt, function(){ sweepOverlays(); }, { capture:true });
    });
  }
  function init(){
    if (bypassRequested()) { finishMascot('bypass'); return; }
    wireSkip(); armTimers(); observeSafety(); focusEvents();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
