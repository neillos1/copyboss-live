// public/js/app.js
// Minimal app entry to prevent 404 and surface any future errors clearly.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    // Hook point for future init
    console.log('[app] DOM ready. safeMode=', !!window.__SAFE_MODE__);
  });
})();
