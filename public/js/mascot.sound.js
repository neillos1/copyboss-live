(function(){
  var audioEl = document.getElementById('mascotSound');
  if(!audioEl) return; // require explicit tag so path is correct
  var played=false;

  function play(){
    if(played) return;
    audioEl.play().then(()=>{ played=true; }).catch(()=>{ /* will fire on gesture */ });
  }

  // Play when mascot finishes
  window.addEventListener('mascot:finished', function(){ play(); });

  // If blocked, first user gesture will trigger it
  ['pointerdown','click','keydown','touchstart'].forEach(evt=>{
    window.addEventListener(evt, function once(){
      if(!played) play();
      window.removeEventListener(evt, once, true);
    }, true);
  });
})();