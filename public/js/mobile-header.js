(() => {
  const isMobile = () => matchMedia('(max-width:768px)').matches;

  window.addEventListener('load', () => {
    if (!isMobile()) return;

    // Upload button – trigger existing file input or navigate fallback
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput =
      document.querySelector('#videoUpload, input[type="file"][name*="video"], input[type="file"][id*="upload"]');

    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (fileInput) fileInput.click();
        else window.location.href = '/upload';
      });
    }

    // Analyze button – keep whatever the page already uses
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn && typeof window.startAnalyze === 'function') {
      analyzeBtn.addEventListener('click', (e) => { e.preventDefault(); window.startAnalyze(); });
    }

    // Drawer
    const burger = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');

    function openDrawer() {
      if (!drawer || !backdrop) return;
      drawer.setAttribute('aria-hidden', 'false');
      backdrop.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      if (!drawer || !backdrop) return;
      drawer.setAttribute('aria-hidden', 'true');
      backdrop.hidden = true;
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    burger && burger.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
    backdrop && backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  });
})();
