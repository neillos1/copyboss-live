// minimal mobile gap guard (idempotent, low-noise)
(() => {
  if (!matchMedia('(max-width: 768px)').matches) return;
  console.log('[gap-guard:min] active');
  const pick = () =>
    document.querySelector('.analyzer-container') ||
    document.querySelector('.report-grid, .dashboard-grid, .content-grid, .layout-grid, .wrapper, .page, .main, #main, .container') ||
    document.body;
  const apply = (el) => {
    document.documentElement.style.setProperty('overflow-x','hidden','important');
    document.body.style.setProperty('overflow-x','hidden','important');
    el.style.setProperty('margin-left','0','important');
    el.style.setProperty('padding-left','0','important');
    el.style.setProperty('left','auto','important');
    el.style.setProperty('transform','none','important');
    el.style.setProperty('max-width','100vw','important');
    try { document.scrollingElement.scrollLeft = 0; } catch {}
  };
  const target = pick();
  apply(target);
  // re-apply only on potential layout changes
  const mo = new MutationObserver(() => apply(target));
  mo.observe(document.documentElement, {attributes:true, childList:true, subtree:true});
  addEventListener('resize', () => apply(target), {passive:true});
})();
