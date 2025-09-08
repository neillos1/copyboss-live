(function () {
  if (!matchMedia('(max-width: 768px)').matches) return;

  function applyFix() {
    // Find the biggest visible content block (not fixed), near viewport
    const candidates = [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height) return false;
      if (cs.position === 'fixed' || cs.display === 'inline') return false;
      return r.top < innerHeight && r.bottom > 0 && r.width >= 280 && r.height >= 150;
    });

    let target = null;
    let score = -1;
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const s = r.width * Math.min(r.height, innerHeight); // rough area score
      if (s > score) { score = s; target = el; }
    }

    // Clean any previous adjustment
    document.querySelectorAll('[data-fix-shift]').forEach(el => {
      el.style.transform = '';
      el.style.width = '';
      el.removeAttribute('data-fix-shift');
    });

    if (!target) return;

    const PAD = 16; // desired left inner padding
    const r = target.getBoundingClientRect();
    const shift = Math.round(r.left - PAD); // how far we need to nudge left

    if (shift > 0) {
      // Nudge the target left and widen to avoid clipping
      target.style.transform = `translateX(${-shift}px)`;
      target.style.width = `calc(100vw + ${shift}px)`;
      target.setAttribute('data-fix-shift', shift);

      // snap page back to absolute left in case it had scrolled sideways
      try { document.scrollingElement.scrollLeft = 0; } catch {}
    }
  }

  // Run on key lifecycle points
  const rafApply = () => requestAnimationFrame(applyFix);
  addEventListener('DOMContentLoaded', applyFix, { once: true });
  addEventListener('load', () => {
    applyFix();
    setTimeout(applyFix, 120);
    setTimeout(applyFix, 500);
  }, { once: true });
  addEventListener('resize', rafApply, { passive: true });
  addEventListener('orientationchange', rafApply, { passive: true });

  // Manual trigger if needed:
  document.addEventListener('reapply-fix', applyFix);
})();

