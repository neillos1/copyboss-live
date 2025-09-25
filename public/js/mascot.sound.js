(function(){
  // Desktop-only preference, but still tolerant
  var prefersDesktop = matchMedia && matchMedia('(pointer: fine)').matches;
  var disabled = new URLSearchParams(location.search).get('noSound') === '1';

  if (disabled) return;

  var played = false;
  var audio;

  function getAudio(){
    if (audio) return audio;
    // Try to find an existing audio tag first
    audio = document.querySelector('#mascot-audio, #mascotSound, audio[data-sound="mascot"]');
    if (!audio){
      audio = new Audio();
      audio.preload = 'auto';
      // Try common paths; first that loads will play
      var candidates = [
        '/assets/audio/mascot-smash.mp3',
        '/audio/mascot-smash.mp3',
        '/sounds/mascot-smash.mp3'
      ];
      audio.src = candidates[0];
    }
    audio.crossOrigin = 'anonymous';
    audio.volume = 1.0;
    return audio;
  }

  function tryPlay(tag){
    if (played) return;
    var a = getAudio();
    // Don't attempt autoplay on touch-only devices to avoid UX issues
    if (!prefersDesktop && !tag) return;

    a.play().then(function(){
      played = true;
    }).catch(function(){
      // Autoplay blocked — arm a one-time user gesture
      ['pointerdown','keydown','touchstart','click'].forEach(function(evt){
        window.addEventListener(evt, function once(){
          if (played) return;
          a.play().then(function(){ played = true; }).catch(function(){/* ignore */});
          window.removeEventListener(evt, once, true);
        }, true);
      });
    });
  }

  // Play when mascot finishes (typical "smash" timing)
  window.addEventListener('mascot:finished', function(){ tryPlay('finish'); });

  // Also try shortly after load on desktop (in case finish event is early)
  if (document.readyState === 'complete') {
    setTimeout(function(){ tryPlay('load'); }, 500);
  } else {
    window.addEventListener('load', function(){ setTimeout(function(){ tryPlay('load'); }, 500); });
  }
})();
