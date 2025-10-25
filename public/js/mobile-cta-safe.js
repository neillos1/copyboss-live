(function(){
  if (window.__cbMobileCtasInit) return; 
  window.__cbMobileCtasInit = true;

  const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!isMobile) return;

  const root = document.getElementById('hero-ctas');
  if (!root) return;

  // Ensure hidden overlays don't block taps
  const killHidden = () => {
    document.querySelectorAll('.mascot-overlay, .modal-backdrop').forEach(el => {
      const hidden = el.hasAttribute('hidden') || 
                     el.getAttribute('aria-hidden') === 'true' || 
                     getComputedStyle(el).display === 'none' || 
                     getComputedStyle(el).opacity === '0';
      if (hidden) el.style.pointerEvents = 'none';
    });
  };
  killHidden();

  // Bridge touchend → click if any script blocked default click
  root.addEventListener('touchend', function(e){
    const a = e.target.closest('a[href]');
    if (!a) return;
    // If the browser already handled it, do nothing
    // Otherwise force navigation
    setTimeout(() => { 
      try { 
        a.click(); 
      } catch(_) { 
        location.assign(a.href); 
      } 
    }, 0);
  }, {passive: true});

  // Also ensure normal click works (no preventDefault here)
  root.addEventListener('click', function(e){
    const a = e.target.closest('a[href]');
    if (!a) return;
    // If some ancestor used preventDefault, force navigation
    if (e.defaultPrevented){
      e.stopPropagation();
      location.assign(a.href);
    }
  }, true);

  // Nudge layout once fonts are ready (fixes iOS first paint)
  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => setTimeout(() => window.dispatchEvent(new Event('resize')), 50));
  }
  window.addEventListener('load', () => { 
    setTimeout(() => window.dispatchEvent(new Event('resize')), 120); 
  }, {once: true});
})();
