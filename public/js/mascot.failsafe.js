(function(){
  var OVERLAY_SEL = '#mascot-overlay, .mascot-overlay, [data-mascot-overlay]';
  var ROOT_SEL    = '#mascot, .mascot-root, [data-mascot-root]';
  var SKIP_SEL    = '.mascot-skip, [data-mascot-skip], .cb-skip, [data-skip]';

  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)||[]); }

  function unlockPage(){
    try{
      ['no-scroll','prevent-scroll','modal-open','menu-open','is-locked','locked']
      .forEach(c=>{ document.documentElement.classList.remove(c); document.body.classList.remove(c); });
      ['html','body'].forEach(tag=>{
        var el = document.querySelector(tag); if(!el) return;
        el.style.overflow=''; el.style.pointerEvents=''; el.style.touchAction='';
        if (getComputedStyle(el).position === 'fixed') el.style.position='';
      });
    }catch(_){}
  }

  function finishMascot(reason){
    document.documentElement.classList.add('mascot-done');
    document.body.classList.add('mascot-done');
    unlockPage();
    qsa(OVERLAY_SEL+','+ROOT_SEL).forEach(n=>{ try{ n.style.pointerEvents='none'; n.style.opacity='0'; n.remove(); }catch(_){ } });
    try{ window.dispatchEvent(new CustomEvent('mascot:finished',{detail:{reason:reason||'failsafe'}})); }catch(_){}
  }

  // Detect any full-screen overlay (fixed/absolute, covers most of viewport)
  function looksLikeOverlay(el){
    try{
      var cs=getComputedStyle(el), pos=cs.position;
      if(pos!=='fixed' && pos!=='absolute') return false;
      var r=el.getBoundingClientRect(), vw=window.innerWidth, vh=window.innerHeight;
      var big=(r.width>=vw*0.9 && r.height>=vh*0.9);
      var blocks=(cs.pointerEvents!=='none') || (+cs.zIndex||0) > 500;
      return big && blocks;
    }catch(_){ return false; }
  }
  function sweepOverlays(){
    try{
      var nodes=(document.body?document.body.getElementsByTagName('*'):[]);
      for(var i=nodes.length-1;i>=0;i--){ var el=nodes[i]; if(looksLikeOverlay(el)){ try{ el.style.pointerEvents='none'; el.style.opacity='0'; el.remove(); }catch(_){}} }
      // known containers too
      qsa(OVERLAY_SEL+','+ROOT_SEL).forEach(n=>{ try{ n.remove(); }catch(_){ } });
      finishMascot('sweep');
    }catch(_){}
  }

  function wire(){
    // Skip button
    document.addEventListener('click', e=>{ if(e.target.closest(SKIP_SEL)){ e.preventDefault(); finishMascot('skip'); }}, true);
    // Timers + interval sweeps (10s)
    [800,1600,2800,5000,8000].forEach(ms=>setTimeout(()=>sweepOverlays(), ms));
    var t0=Date.now(), iv=setInterval(()=>{ sweepOverlays(); if(Date.now()-t0>10000) clearInterval(iv); }, 700);
    // React to DOM changes / visibility / gestures
    try{ new MutationObserver(()=>sweepOverlays()).observe(document.documentElement,{subtree:true,childList:true,attributes:true}); }catch(_){}
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) sweepOverlays(); });
    ['pointerdown','keydown','touchstart'].forEach(evt=>window.addEventListener(evt,()=>sweepOverlays(),{capture:true}));
    // rAF loop (catch ::before/::after first paint)
    var rafCount=0;(function loop(){ rafCount++; sweepOverlays(); if(rafCount<12) requestAnimationFrame(loop); })();
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', wire); } else { wire(); }
})();