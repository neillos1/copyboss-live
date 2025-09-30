/*
  mascot.failsafe.js
  Robust dev-only mascot bypass — safe for local development only.
  Activates only on localhost / local IPs or when ?debug=1 or ?devNoMascot=1 is present.
  Will NOT run on production hostnames.
*/
(function(){
  try {
    const host = (location && location.hostname) ? location.hostname : '';
    const isLocalHost = (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host)
    );
    const params = new URLSearchParams(location.search || '');
    const debugOn = params.get('debug') === '1' || params.get('devNoMascot') === '1' || params.get('devNoMascot') === 'true';

    if (!isLocalHost && !debugOn) {
      // production: do nothing
      return;
    }

    console.info('[DEV] mascot.failsafe.js active — local bypass enabled', {host, debugOn});

    // set global flags mascot implementations may check
    try { window.__MASCOT_SKIP = true; } catch(e) {}
    try { window.__MASCOT_BYPASS = true; } catch(e) {}
    try { window.SKIP_MASCOT = true; } catch(e) {}

    // Try calling known resolver functions if present
    try {
      const possibleResolvers = ['mascotReadyResolve','mascotReadyResolveFn','mascotResolve','mascotDone','mascotInitResolve','resolveMascot','__mascotResolve'];
      possibleResolvers.forEach(fnName => {
        const fn = window[fnName];
        if (typeof fn === 'function') {
          try { fn({skipped:true}); console.info('[DEV] called resolver', fnName); } catch(e) {}
        }
      });
    } catch(e) {}

    // Replace or stub any mascot promise
    try {
      if (window.mascotReadyPromise && typeof window.mascotReadyPromise.then === 'function') {
        window.mascotReadyPromise = Promise.resolve({ skipped:true });
        console.info('[DEV] replaced window.mascotReadyPromise with resolved stub');
      } else {
        window.mascotReadyPromise = Promise.resolve({ skipped:true });
      }
    } catch (e) {}

    // Function to hide overlays and reveal app containers
    const hideOverlay = () => {
      try {
        const overlays = [
          '#mascot-overlay', '.mascot-overlay', '#mascot', '.mascot',
          '#intro-overlay', '.intro-overlay', '.overlay-mascot',
          '.overlay', '.modal', '.site-overlay', '.global-overlay'
        ];
        overlays.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            el.dataset._devHiddenByMascotBypass = '1';
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
            el.style.display = 'none';
            el.style.zIndex = '-1';
          });
        });

        // Restore common root/app containers
        ['#app', '#root', '.site', 'main', 'body'].forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            el.style.display = '';
            el.style.zIndex = '10000';
            el.style.minHeight = '100vh';
          });
        });

        document.documentElement.classList.add('DEV_LOCAL');
        document.documentElement.classList.remove('mascot-hidden','overlay-active','intro-active');
        document.body.classList.remove('mascot-hidden','overlay-active','intro-active');
      } catch (err) {
        console.warn('[DEV] hideOverlay failed', err);
      }
    };

    // Run as early as possible
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hideOverlay, { once: true });
    } else {
      hideOverlay();
    }

    // Retry a few times because mascot may inject overlays later
    setTimeout(hideOverlay, 150);
    setTimeout(hideOverlay, 500);
    setTimeout(hideOverlay, 1200);
    setTimeout(hideOverlay, 3000);

    // Catch mascot errors and force-resolve
    window.addEventListener('error', (ev) => {
      try {
        if ((ev && ev.filename && ev.filename.includes('mascot')) || (ev && ev.message && ev.message.toLowerCase().includes('mascot'))) {
          console.info('[DEV] caught mascot error — forcing hideOverlay');
          hideOverlay();
          window.mascotReadyPromise = Promise.resolve({ skipped:true });
        }
      } catch(e){}
    });

    // Silence unhandled promise rejections and force hide
    window.addEventListener('unhandledrejection', (ev) => {
      try {
        console.info('[DEV] unhandledrejection (dev bypass) —', ev && ev.reason);
        hideOverlay();
        window.mascotReadyPromise = Promise.resolve({ skipped:true });
      } catch(e){}
    });

  } catch (err) {
    console.error('[DEV] mascot.failsafe error:', err);
  }
})();
