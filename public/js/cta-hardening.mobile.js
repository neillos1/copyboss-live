(function () {
  const isMobile = matchMedia('(max-width: 768px)').matches;

  // Map EXACT 5 CTA texts → real page hrefs.
  // Adjust the hrefs to your actual routes if needed.
  const TEXT_TO_HREF = [
    { re: /^try analyzer$/i,         href: '/analyzer.html' },
    { re: /^generate scripts$/i,     href: '/boss/' },
    { re: /^view pricing$/i,         href: '/pricing.html' },
    { re: /^join the program$/i,     href: '/login.html' },
    { re: /^visit community hub$/i,  href: '/community.html' }
  ];

  // Helper to resolve a target href from element text or data-href
  const resolveHref = (el) => {
    const txt = (el.textContent || '').trim();
    for (const rule of TEXT_TO_HREF) if (rule.re.test(txt)) return rule.href;
    return el?.dataset?.href || null;
  };

  // Convert <button> CTAs inside the 5 cards into real <a> links
  const convertButtonsToLinks = () => {
    const candidates = document.querySelectorAll(
      'button.cta-btn, button[data-cta], .cta button, [data-cta-button]'
    );
    candidates.forEach(btn => {
      const href = resolveHref(btn);
      if (!href) return;
      const a = document.createElement('a');
      a.className = (btn.className || '') + ' cta-btn';
      a.href = href;
      a.setAttribute('data-cta', '');
      a.setAttribute('role', 'link');
      a.setAttribute('draggable', 'false');
      a.innerHTML = btn.innerHTML;
      btn.replaceWith(a);
    });
  };

  // Ensure anchors have proper hrefs and no inline onclick handlers
  const normalizeAnchors = () => {
    const anchors = document.querySelectorAll('a.cta-btn, a[data-cta], .cta a, [data-cta-link]');
    anchors.forEach(a => {
      if (!a.getAttribute('href') || /^#?$/.test(a.getAttribute('href'))) {
        const href = resolveHref(a);
        if (href) a.setAttribute('href', href);
      }
      a.removeAttribute('onclick');
    });
  };

  // Pre-nav: if the tap happens near the bottom (iOS toolbar zone),
  // scroll up a bit BEFORE we navigate to avoid swallowed taps / split layouts.
  const BOTTOM_SAFE_OFFSET = 200; // px
  const isNearBottom = () => {
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const rect = (lastTapTarget && lastTapTarget.getBoundingClientRect()) || null;
    if (!rect) return false;
    const distanceFromBottom = viewport - rect.bottom;
    return distanceFromBottom < 100; // consider "near bottom" if within 100px
  };

  let lastTapTarget = null;

  // Track the last tapped CTA to measure bottom distance
  document.addEventListener('touchstart', (e) => {
    const a = e.target.closest('a.cta-btn, a[data-cta]');
    if (a) lastTapTarget = a;
  }, { passive: true });

  // Remove overlay/interceptor layers that can swallow taps on mobile (incl. fixed bottoms)
  const killTapInterceptors = () => {
    // Existing decorative/overlay shields
    document.querySelectorAll(
      '.decorative,[data-decorative],.overlay,[data-overlay],.click-shield,[data-shield]'
    ).forEach(el => {
      if (getComputedStyle(el).display === 'none' || el.hasAttribute('aria-hidden')) return;
      el.style.pointerEvents = 'none';
    });

    // Any fixed/sticky elements hugging the bottom that aren't explicitly interactive
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      const isFixed = cs.position === 'fixed' || cs.position === 'sticky';
      if (!isFixed) return;
      const rect = el.getBoundingClientRect();
      const nearBottom = (window.innerHeight - rect.top) < 180; // element top within 180px of bottom
      if (!nearBottom) return;

      const explicitlyInteractive = el.classList.contains('cookie-banner') && el.classList.contains('is-ready');
      if (!explicitlyInteractive) el.style.pointerEvents = 'none';
    });
  };

  // Delegated tap → force navigation with small delay (after any scroll nudge)
  const delegatedTap = (e) => {
    const a = e.target.closest('a.cta-btn, a[data-cta]');
    if (!a) return;

    // If near bottom, scroll up first to escape iOS bottom chrome zone
    if (isNearBottom()) {
      window.scrollBy({ top: -BOTTOM_SAFE_OFFSET, left: 0, behavior: 'instant' });
    }

    // Give the layout a tick to settle, then navigate
    setTimeout(() => {
      window.location.assign(a.href);
    }, 40);
  };

  // Pre-click capture: scroll-to-top guard when navigating via CTAs (prevents mid-viewport weirdness)
  const preNavScrollTop = (e) => {
    const a = e.target.closest('a.cta-btn, a[data-cta]');
    if (!a) return;
    // If page is scrolled, snap to top to avoid partial overlays lingering
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (isMobile) {
    convertButtonsToLinks();
    normalizeAnchors();
    killTapInterceptors();
    document.addEventListener('touchend', delegatedTap, { passive: true });
    document.addEventListener('click', preNavScrollTop, { capture: true });

    // Cookie banner becomes eligible only after mascot finishes (or fallback)
    document.addEventListener('mascot:finished', () => {
      document.querySelectorAll('.cookie-banner').forEach(b => b.classList.add('is-ready'));
    });
    setTimeout(() => {
      if (!document.querySelector('.cookie-banner.is-ready')) {
        document.querySelectorAll('.cookie-banner').forEach(b => b.classList.add('is-ready'));
      }
    }, 3500);
  }
})();
