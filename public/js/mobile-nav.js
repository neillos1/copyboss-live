(function(){
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  // Check authentication state (reuse auth.js logic)
  async function checkAuthState() {
    try {
      const token = localStorage.getItem('videobossToken');
      if (!token) return false;

      const response = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Auth check error:', error);
      const user = localStorage.getItem('videobossUser');
      const token = localStorage.getItem('videobossToken');
      return !!(user && token);
    }
  }

  // Get current user data
  async function getCurrentUser() {
    try {
      const token = localStorage.getItem('videobossToken');
      if (!token) return null;

      const response = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('videobossUser', JSON.stringify(data.user));
        return data.user;
      }
      
      const userData = localStorage.getItem('videobossUser');
      if (userData) {
        return JSON.parse(userData);
      }
      
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      const userData = localStorage.getItem('videobossUser');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    }
  }

  function selectFirst(selectors){
    for (const s of selectors){
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  // Try to find the REAL desktop upload input so we reuse the exact pipeline
  function findDesktopFileInput(){
    const selectors = [
      '#upload-input', '.upload-input', 'input[type="file"][name*="video"]',
      'input[type="file"][accept*="video"]'
    ];
    for (const s of selectors){
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  // Reuse existing overlay if present; else create our fallback
  function getOrCreateOverlay(){
    const existing = document.querySelector('.analysis-overlay, #analysis-overlay, [data-overlay="analyzing"]');
    if (existing) return { el: existing, show(){ existing.style.display='flex'; }, hide(){ existing.style.display='none'; } };

    // Build fallback
    // ✅ Skip main overlay by id to avoid conflicts
    let el = document.querySelector('.cb-analyzing-overlay:not(#cb-analyzing-overlay)');
    if (!el){
      el = document.createElement('div');
      el.className = 'cb-analyzing-overlay';
      el.innerHTML = '<div class="cb-analyzing-box"><div class="cb-spinner"></div><div>Analyzing…</div></div>';
      document.body.appendChild(el);
    }
    return { el, show(){ el.classList.add('show'); }, hide(){ el.classList.remove('show'); } };
  }

  // Run the actual analysis if a global function exists; otherwise rely on the input change handlers
  async function invokeAnalysisIfAvailable(file){
    const fns = ['handleUpload','uploadAndAnalyze','startAnalysis','runAnalysis'];
    for (const name of fns){
      if (typeof window[name] === 'function'){
        const maybePromise = window[name](file);
        if (maybePromise && typeof maybePromise.then === 'function'){
          await maybePromise;
        }
        return true;
      }
    }
    return false; // fall back to native change handlers
  }

  function initButtons(){
    const uploadBtn = document.getElementById('cb-upload-btn');
    if (!uploadBtn) return;

    const desktopInput = findDesktopFileInput();
    const fallbackInput = document.getElementById('cb-upload-input');
    const overlay = getOrCreateOverlay();

    // Wire the click: prefer the desktop input (so we use identical pipeline)
    uploadBtn.addEventListener('click', () => {
      const targetInput = desktopInput || fallbackInput;
      if (targetInput && targetInput.click) targetInput.click();
    });

    // When a file is chosen, show overlay and trigger pipeline
    function onFileChosen(file){
      if (!file) return;
      overlay.show();
      // Try direct function first (if desktop relies solely on input listeners, this still works because change has already fired)
      invokeAnalysisIfAvailable(file).finally(() => {
        // If your app dispatches a completion event, you can also hide overlay there.
        // As a safety, hide after 15s if nothing closes it (avoid stuck overlay).
        setTimeout(() => overlay.hide(), 15000);
      });
    }

    // Hook both inputs
    [desktopInput, fallbackInput].forEach(inp => {
      if (!inp) return;
      // Avoid double-adding
      if (inp.dataset.cbHooked) return;
      inp.dataset.cbHooked = '1';

      inp.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        onFileChosen(file);
      });
    });

    // If your desktop code emits custom events when analysis starts/ends, reflect them:
    document.addEventListener('analysis:start', () => overlay.show(), { passive:true });
    document.addEventListener('analysis:done',  () => overlay.hide(), { passive:true });
    document.addEventListener('cb:analysis:start', () => overlay.show(), { passive:true });
    document.addEventListener('cb:analysis:end',   () => overlay.hide(), { passive:true });
  }

  async function buildDrawer(){
    const container = document.getElementById('cb-drawer-list');
    if (!container) return;

    // Check authentication state
    const isUserLoggedIn = await checkAuthState();
    
    // Check if we're on specific pages
    const isLeaderboardPage = location.pathname.includes('leaderboard') || 
                             document.title.toLowerCase().includes('leaderboard');
    const isHomePage = location.pathname === '/' || 
                      location.pathname.includes('index') || 
                      (document.title.toLowerCase().includes('copyboss') && !location.pathname.includes('analyzer') && !location.pathname.includes('affiliate'));
    const isAnalyzerPage = location.pathname.includes('analyzer');
    const isAffiliatePage = location.pathname.includes('affiliate');

    // Map to desktop selectors (proxy targets) and/or routes
    let groups;
    
    if (isLeaderboardPage) {
      // Simplified menu for leaderboard page
      groups = [
        {
          title: 'Pages',
          items: [
            { label:'Home',      icon:'🏠', href:'/' },
            { label:'Analyzer',  icon:'📊', href:'/analyzer' }
          ]
        },
        {
          title: 'Community',
          items: [
            { label:'Community Hub', icon:'👥', href:'https://community.copy-boss.com/', proxy:['.btn-community','a[href*="community"]'] }
          ]
        },
        {
          title: 'Account',
          items: isUserLoggedIn ? [
            { label:'Pricing', icon:'💳', href:'/pricing', proxy:['.btn-pricing','a[href*="pricing"]'] },
            { label:'Join Waitlist', icon:'👥', href:'mailto:hello@copy-boss.com?subject=CopyBoss Affiliate Waitlist' },
            { label:'Logout', icon:'🚪', href:'#', action:'logout' }
          ] : [
            { label:'Pricing', icon:'💳', href:'/pricing', proxy:['.btn-pricing','a[href*="pricing"]'] },
            { label:'Login / Sign Up', icon:'🔑', href:'/login', proxy:['.btn-auth','a[href*="login"]','a[href*="signup"]'] }
          ]
        }
      ];
    } else if (isHomePage) {
      // Simplified menu for homepage
      groups = [
        {
          title: 'Pages',
          items: [
            { label:'Home',      icon:'🏠', href:'/' },
            { label:'Analyzer',  icon:'📊', href:'/analyzer' },
            { label:'Pricing',   icon:'💳', href:'/pricing' },
            { label:'Community Hub', icon:'👥', href:'https://community.copy-boss.com/' }
          ]
        },
        {
          title: 'Account',
          items: isUserLoggedIn ? [
            { label:'Join Waitlist', icon:'👥', href:'mailto:hello@copy-boss.com?subject=CopyBoss Affiliate Waitlist' },
            { label:'Logout', icon:'🚪', href:'#', action:'logout' }
          ] : [
            { label:'Login', icon:'🔑', href:'login.html' },
            { label:'Sign Up', icon:'📝', href:'signup.html' }
          ]
        },
        {
          title: 'Support',
          items: [
            { label:'Report Issue', icon:'🐛', href:'#', proxy:['#reportIssueBtn'] },
            { label:'Join Waitlist', icon:'💸', href:'mailto:hello@copy-boss.com?subject=CopyBoss Affiliate Waitlist' }
          ]
        }
      ];
    } else if (isAffiliatePage) {
      // Simplified menu for affiliate page (same as homepage)
      groups = [
        {
          title: 'Pages',
          items: [
            { label:'Home',      icon:'🏠', href:'/' },
            { label:'Analyzer',  icon:'📊', href:'/analyzer' },
            { label:'Pricing',   icon:'💳', href:'/pricing' },
            { label:'Community Hub', icon:'👥', href:'https://community.copy-boss.com/' }
          ]
        },
        {
          title: 'Account',
          items: isUserLoggedIn ? [
            { label:'Join Waitlist', icon:'👥', href:'mailto:hello@copy-boss.com?subject=CopyBoss Affiliate Waitlist' },
            { label:'Logout', icon:'🚪', href:'#', action:'logout' }
          ] : [
            { label:'Login', icon:'🔑', href:'login.html' },
            { label:'Sign Up', icon:'📝', href:'signup.html' }
          ]
        },
        {
          title: 'Support',
          items: [
            { label:'Report Issue', icon:'🐛', href:'#', proxy:['#reportIssueBtn'] },
            { label:'Join Waitlist', icon:'💸', href:'mailto:hello@copy-boss.com?subject=CopyBoss Affiliate Waitlist' }
          ]
        }
      ];
    } else {
      // Full menu for other pages
      groups = [
        {
          title: 'Pages',
          items: [
            { label:'Home',      icon:'🏠', href:'/' },
            { label:'Analyzer',  icon:'📊', href:'/analyzer' },
            { label:'Pricing',   icon:'💳', href:'/pricing' }
          ]
        },
        {
          title: 'Reports',
          items: [
            { label:'Analyzer History', icon:'🗂️', href:'/history', proxy:['.btn-history','a[href*="history"]','[data-target="analyzer-history"]'] },
            { label:'Download Results', icon:'⬇️',  pro:true, proxy:['.btn-download','a[href*="download"]'] },
            { label:'Share Report',     icon:'📤',  pro:true, proxy:['.btn-share','a[href*="share"]'] }
          ]
        },
        {
          title: 'Tools',
          items: [
            { label:'Settings', icon:'⚙️', href:'/settings', proxy:['.btn-settings','a[href*="settings"]'] },
            { label:'Insights', icon:'🧠', href:'/insights', proxy:['.btn-insights','a[href*="insights"]'] },
            { label:'AI Tips',  icon:'💡', href:'/tips',     proxy:['.btn-ai-tips','a[href*="tips"]'] }
          ]
        },
        {
          title: 'Community',
          items: [
            { label:'Community Hub', icon:'👥', href:'https://community.copy-boss.com/', proxy:['.btn-community','a[href*="community"]'] },
            { label:'Top 10 This Week', icon:'🏆', href: isAnalyzerPage ? '#' : '/top-10', proxy:['.leaderboard-link','a[href*="top-10"]'] }
          ]
        },
        {
          title: 'Purchases',
          items: [
            { label:'Upgrade to Pro', icon:'⭐', href:'#', proxy:['a[onclick*="redirectToStripeCheckout(\'pro\')"]','button[onclick*="redirectToStripeCheckout(\'pro\')"]'] },
            { label:'Buy 2 Reports',  icon:'🛒', href:'#', proxy:['a[onclick*="redirectToStripeCheckout(\'2reports\')"]','button[onclick*="redirectToStripeCheckout(\'2reports\')"]'] },
            { label:'Buy 15 Reports', icon:'🛍️', href:'#', proxy:['a[onclick*="redirectToStripeCheckout(\'15reports\')"]','button[onclick*="redirectToStripeCheckout(\'15reports\')"]'] },
            { label:'Pricing',        icon:'💳', href:'/pricing', proxy:['.btn-pricing','a[href*="pricing"]'] }
          ]
        },
        {
          title: 'Account',
          items: isUserLoggedIn ? [
            { label:'Join Waitlist', icon:'👥', href:'mailto:hello@copy-boss.com?subject=CopyBoss Affiliate Waitlist' },
            { label:'Logout', icon:'🚪', href:'#', action:'logout' }
          ] : [
            { label:'Login / Sign Up', icon:'🔑', href:'/login', proxy:['.btn-auth','a[href*="login"]','a[href*="signup"]'] }
          ]
        }
      ];
    }

    // Helpers
    const path = (location.pathname||'').toLowerCase();
    const isActive = (pats) => !pats ? false : (Array.isArray(pats) ? pats : [pats]).some(p => path.includes(p));

    function makeSection(title){
      const wrap = document.createElement('div'); wrap.className='cb-drawer-section';
      const h = document.createElement('div'); h.className='cb-drawer-title'; h.textContent=title;
      const ul = document.createElement('ul'); ul.className='cb-section-list';
      wrap.appendChild(h); wrap.appendChild(ul);
      return {wrap, ul};
    }

    function itemNode(item){
      const a = document.createElement('a');
      a.className = 'cb-item';
      a.setAttribute('href', item.href || '#');
      // store proxy selectors for wiring later
      if (item.proxy) a.dataset.proxy = item.proxy.join('||');
      
      // Add direct onclick handlers for Stripe checkout buttons
      if (item.label === 'Upgrade to Pro') {
        a.setAttribute('aria-label', 'Upgrade to Pro for £4.99/month');
        a.setAttribute('role', 'button');
        a.onclick = function(e) {
          e.preventDefault();
          if (typeof redirectToStripeCheckout === 'function') {
            redirectToStripeCheckout('pro');
          }
        };
      } else if (item.label === 'Buy 2 Reports') {
        a.setAttribute('aria-label', 'Buy 2 Reports for £1.99');
        a.setAttribute('role', 'button');
        a.onclick = function(e) {
          e.preventDefault();
          if (typeof redirectToStripeCheckout === 'function') {
            redirectToStripeCheckout('2reports');
          }
        };
      } else if (item.label === 'Buy 15 Reports') {
        a.setAttribute('aria-label', 'Buy 15 Reports for £9.99');
        a.setAttribute('role', 'button');
        a.onclick = function(e) {
          e.preventDefault();
          if (typeof redirectToStripeCheckout === 'function') {
            redirectToStripeCheckout('15reports');
          }
        };
      }
      
      // Add tabindex for keyboard navigation on all Stripe buttons
      if (item.label === 'Upgrade to Pro' || item.label === 'Buy 2 Reports' || item.label === 'Buy 15 Reports') {
        a.setAttribute('tabindex', '0');
      }
      
      // icon + label
      const ico = document.createElement('span'); ico.className='cb-ico'; ico.textContent=item.icon || '•';
      const lab = document.createElement('span'); lab.className='cb-label'; lab.textContent=item.label;
      a.appendChild(ico); a.appendChild(lab);
      // active state (simple heuristic)
      if (item.href && isActive(item.href)) a.classList.add('active');
      return a;
    }

    container.innerHTML = '';

    groups.forEach(group => {
      const sec = makeSection(group.title);
      group.items.forEach(it => {
        const li = document.createElement('li');
        const node = itemNode(it);
        li.appendChild(node);

        if (it.pro){
          li.classList.add('cb-pro');
          const pill = document.createElement('span');
          pill.className='cb-pro-pill'; pill.textContent='PRO';
          li.appendChild(pill);
        }

        // keep href for wiring
        if (it.href) li.dataset.href = it.href;
        if (it.proxy) li.dataset.proxy = it.proxy.join('||');

        sec.ul.appendChild(li);
      });
      container.appendChild(sec.wrap);
    });

    // Leaderboard preview (if present on page)
    const lbSrc = document.querySelector('.leaderboard,#leaderboard,[data-widget="leaderboard"]');
    const lbDest = document.getElementById('cb-drawer-leaderboard');
    if (lbSrc && lbDest){
      lbDest.innerHTML=''; lbDest.appendChild(lbSrc.cloneNode(true));
    }
  }

  // Helper: normalize text for matching
  function cbNorm(s){ return (s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

  // Helper: try multiple selectors
  function cbPick(selectors){
    if (!selectors) return null;
    const arr = Array.isArray(selectors) ? selectors : selectors.split('||');
    for (const s of arr){ const el = document.querySelector(s.trim()); if (el) return el; }
    return null;
  }

  // Helper: search by visible link/button text (prefers sidebar)
  function cbFindByText(label){
    const txt = cbNorm(label);
    const scopes = [
      document.querySelector('.sidebar'),
      document.querySelector('nav'),
      document.body
    ].filter(Boolean);

    for (const scope of scopes){
      const nodes = scope.querySelectorAll('a,button,[role="button"]');
      for (const n of nodes){
        // combine aria-label and text
        const t = cbNorm(n.getAttribute('aria-label') || n.textContent || '');
        if (t.includes(txt)) return n;
      }
    }
    return null;
  }

  // Helper: robust resolver for a given menu label
  function cbResolveTarget(label, proxyStr){
    // 1) explicit proxies first
    const explicit = cbPick(proxyStr);
    if (explicit) return explicit;

    // 2) special-case strong selectors for the three items
    const L = cbNorm(label);
    if (L.includes('settings')){
      const el = cbPick([
        '.btn-settings','a[href*="settings"]','[data-nav="settings"]',
        'button[aria-label="Settings"]','#settings-link','#nav-settings'
      ]) || cbFindByText('Settings');
      if (el) return el;
    }
    if (L.includes('insights')){
      const el = cbPick([
        '.btn-insights','a[href*="insights"]','[data-nav="insights"]',
        '#insights-link','#nav-insights'
      ]) || cbFindByText('Insights');
      if (el) return el;
    }
    if (L.includes('ai tips') || L === 'tips' || L.includes('tips')){
      const el = cbPick([
        '.btn-ai-tips','a[href*="ai-tips"]','a[href*="/tips"]',
        '[data-nav*="tips"]','#ai-tips-link','#nav-tips'
      ]) || cbFindByText('AI Tips') || cbFindByText('Tips');
      if (el) return el;
    }

    // 3) generic text fallback for anything else
    return cbFindByText(label);
  }

  function cbCap(s){ s = (s||'').trim(); return s ? s[0].toUpperCase()+s.slice(1) : s; }

  // Try to click the real sidebar control for a given section name
  function cbGoSection(name){
    const n = cbNorm(name);                // e.g., "settings", "insights", "ai tips"
    const cap = cbCap(n.replace(/\s+/g,'-').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()).replace(/-/g,''));
    const sidebar = document.querySelector('.sidebar') || document;

    // Strong selector candidates
    const sels = [
      `.btn-${n}`, `.menu-${n}`, `.nav-${n}`,
      `[data-nav="${n}"]`, `[data-section="${n}"]`, `[data-target="${n}"]`,
      `a[href*="#${n}"]`, `a[href*="${n}"]`,
      `#${n}`, `#nav-${n}`, `#sidebar-${n}`,
      `button[aria-label*="${n}"], a[aria-label*="${n}"]`
    ];

    // 1) Explicit selectors
    let el = cbPick(sels);
    // 2) Text match inside sidebar/nav/body
    if (!el){
      el = cbFindByText(name) || cbFindByText(n.replace('ai ','') ); // e.g., "AI Tips" → "Tips"
    }

    if (el){
      el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      return true;
    }

    // 3) Try common global functions
    const maybe = [
      `open${cap}`, `show${cap}`, `go${cap}`, `navigateTo${cap}`,
      'navigateTo', 'openPanel', 'showPanel'
    ];
    for (const fn of maybe){
      if (typeof window[fn] === 'function'){
        try {
          if (fn === 'navigateTo' || fn === 'openPanel' || fn === 'showPanel'){
            window[fn](n);
          } else {
            window[fn]();
          }
          return true;
        } catch(e){}
      }
    }

    // 4) Hash fallback (never full route navigation)
    try {
      const hash = '#'+n.replace(/\s+/g,'-');
      if (location.hash !== hash){
        location.hash = hash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    } catch(e){}

    return false;
  }

  function wireDrawerActions(){
    const list = document.getElementById('cb-drawer-list');
    if (!list) return;

    function proxyClick(selectors){
      if (!selectors) return false;
      const arr = selectors.split('||').map(s => s.trim()).filter(Boolean);
      for (const s of arr){
        const el = document.querySelector(s);
        if (el){
          // Prefer native click so existing handlers run
          el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
          if (el.tagName === 'A' && el.href){
            // If it's a pure link, navigate (for robustness)
            window.location.href = el.href;
          }
          return true;
        }
      }
      return false;
    }

    function closeDrawerNow(){
      if (window.cbCloseDrawer) return window.cbCloseDrawer();
      const drawer = document.getElementById('cb-drawer');
      if (!drawer) return;
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
      const burger=document.getElementById('cb-burger');
      if (burger){ burger.classList.remove('open'); burger.setAttribute('aria-expanded','false'); burger.setAttribute('aria-label','Open menu'); }
      const closeBtn=document.getElementById('cb-close'); if (closeBtn) closeBtn.style.display='none';
    }

    list.addEventListener('click', (e) => {
      const a = e.target.closest('.cb-item');
      if (!a) return;

      const li = a.closest('li');
      const labelRaw = a.querySelector('.cb-label')?.textContent || a.textContent;
      const label = cbNorm(labelRaw);

      // PRO gate
      if (li && li.classList.contains('cb-pro') && !document.body.classList.contains('is-pro')){
        e.preventDefault();
        closeDrawerNow();
        const up = document.querySelector('.btn-upgrade, a[href*="upgrade"]');
        if (up && up.click) up.click(); else window.location.href = '/pricing';
        return;
      }

      // Handle logout action
      if (label.includes('logout')) {
        e.preventDefault();
        closeDrawerNow();
        // Use auth.js logout function if available
        if (typeof window.auth?.logout === 'function') {
          window.auth.logout();
        } else if (typeof logout === 'function') {
          logout();
        } else {
          // Fallback logout
          localStorage.removeItem('videobossUser');
          localStorage.removeItem('videobossToken');
          window.location.href = 'index.html';
        }
        return;
      }

      // STRICT handling for these four: never navigate to routes
      if (label.includes('settings') || label.includes('insights') || label.includes('ai tips') || label === 'tips' || label.includes('analyzer history')){
        e.preventDefault();
        if (label.includes('analyzer history')) {
          // Trigger the desktop analyzer history function
          const historyBtn = document.querySelector('[data-target="analyzer-history"]');
          if (historyBtn) {
            historyBtn.click();
          }
        } else {
          const ok = cbGoSection(label.includes('ai tips') || label === 'tips' ? 'AI Tips' :
                                 label.includes('insights') ? 'Insights' : 'Settings');
        }
        closeDrawerNow();
        return;
      }

      // Everyone else: try proxy first, else safe navigate
      const proxy = li?.dataset.proxy || a.dataset.proxy;
      const href  = li?.dataset.href  || a.getAttribute('href');

      // Try proxy-click (fires desktop handlers)
      if (proxy && cbPick(proxy)){
        e.preventDefault();
        const targetEl = cbPick(proxy);
        if (targetEl) {
          targetEl.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
        }
        closeDrawerNow();
        return;
      }

      // Fallback navigation for normal pages (Home/Analyzer/etc.)
      if (href && href !== '#'){
        e.preventDefault();
        closeDrawerNow();
        // Use location.assign to avoid SPA 404s on typed routes; prefer absolute links present in DOM:
        const domLink = document.querySelector(`a[href="${href}"]`);
        if (domLink && domLink.href){ window.location.href = domLink.href; }
        else { window.location.assign(href); }
      }
    }, { passive:false });
  }

  function setBurgerState(isOpen){
    const burger = document.getElementById('cb-burger');
    if (!burger) return;
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    burger.setAttribute('aria-expanded', String(isOpen));
  }

  function initBurger(){
    const burger = document.getElementById('cb-burger');
    const drawer = document.getElementById('cb-drawer');
    const backdrop = document.getElementById('cb-backdrop');
    const closeBtn = document.getElementById('cb-close');
    if (!burger || !drawer || !backdrop) return;
    
    function openDrawer(){
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden','false');
      backdrop.hidden = false;
      setTimeout(() => backdrop.classList.add('visible'), 10);
      document.body.style.overflow = 'hidden';
      setBurgerState && setBurgerState(true);
      // ensure the close button is accessible
      if (closeBtn) closeBtn.style.display = 'block';
      console.log('[mobile] Drawer opened');
    }
    
    function closeDrawer(){
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
      backdrop.classList.remove('visible');
      setTimeout(() => backdrop.hidden = true, 250);
      document.body.style.overflow = '';
      setBurgerState && setBurgerState(false);
      if (closeBtn) closeBtn.style.display = 'none';
      console.log('[mobile] Drawer closed');
    }
    
    burger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = drawer.classList.contains('open');
      console.log('[mobile] Burger clicked, drawer is:', isOpen ? 'open' : 'closed');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });
    
    // Close drawer when clicking outside
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) {
        closeDrawer();
      }
    });
    
    // Close drawer when clicking backdrop
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeDrawer();
      }
    });
    
    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
      if (drawer.classList.contains('open') && !drawer.contains(e.target) && !burger.contains(e.target)) {
        closeDrawer();
      }
    });
    
    if (closeBtn){
      closeBtn.addEventListener('click', closeDrawer);
    }

  // Expose drawer functions globally so other code can close the drawer
  window.cbOpenDrawer  = openDrawer;
  window.cbCloseDrawer = closeDrawer;
  
  // Expose mobile navbar update function globally
  window.updateMobileNavbar = updateMobileNavbar;
  }

  function hideDuplicateHeadersOnMobile(){
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const keep = document.getElementById('cb-header');
    const candidates = Array.from(document.querySelectorAll('header, .site-header, .topnav, .navbar, .main-header'));
    candidates.forEach(el => { if (keep && el !== keep) el.style.display = 'none'; });
  }

  // Update mobile navbar with avatar when logged in
  async function updateMobileNavbar() {
    if (!isMobile()) return;
    
    // Skip mobile navbar updates for analyzer page - it has its own clean layout
    if (document.body.dataset.page === 'analyzer') {
      return;
    }
    
    const isUserLoggedIn = await checkAuthState();
    const mobileHeader = document.getElementById('cb-header');
    if (!mobileHeader) return;
    
    const actionsDiv = mobileHeader.querySelector('.cb-actions');
    if (!actionsDiv) return;
    
    if (isUserLoggedIn) {
      // User is logged in - show avatar
      const user = await getCurrentUser();
      const avatarUrl = user?.avatar_url || '/assets/img/default-avatar.svg?v=3';
      
      // Remove existing auth buttons
      const existingAuth = actionsDiv.querySelector('.cb-auth-buttons');
      if (existingAuth) existingAuth.remove();
      
      // Add avatar holder
      const avatarHolder = document.createElement('div');
      avatarHolder.className = 'cb-avatar-holder';
      avatarHolder.innerHTML = `
        <img src="${avatarUrl}" alt="User Avatar" class="cb-avatar-img" style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.2);
        " onerror="this.src='/assets/img/default-avatar.svg?v=3'">
      `;
      
      // Insert avatar before burger button
      const burger = actionsDiv.querySelector('.cb-burger');
      if (burger) {
        actionsDiv.insertBefore(avatarHolder, burger);
      } else {
        actionsDiv.appendChild(avatarHolder);
      }
    } else {
      // User is not logged in - show auth buttons
      const existingAvatar = actionsDiv.querySelector('.cb-avatar-holder');
      if (existingAvatar) existingAvatar.remove();
      
      // Add auth buttons
      const authButtons = document.createElement('div');
      authButtons.className = 'cb-auth-buttons';
      authButtons.innerHTML = `
        <a href="login.html" class="cb-auth-link" style="
          color: #d1d5db;
          text-decoration: none;
          font-size: 14px;
          margin-right: 12px;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
        ">Login</a>
        <a href="signup.html" class="cb-auth-link" id="mobile-signup-link" style="
          color: #d1d5db;
          text-decoration: none;
          font-size: 14px;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
        ">Sign Up</a>
      `;
      
      // Insert auth buttons before burger button
      const burger = actionsDiv.querySelector('.cb-burger');
      if (burger) {
        actionsDiv.insertBefore(authButtons, burger);
      } else {
        actionsDiv.appendChild(authButtons);
      }
      
      // Update signup link with affiliate intent if present
      const mobileSignupLink = document.getElementById('mobile-signup-link');
      if (mobileSignupLink) {
        const urlParams = new URLSearchParams(window.location.search);
        const intent = urlParams.get('intent');
        const redirect = urlParams.get('redirect');
        
        if (intent === 'affiliate' || redirect) {
          let signupUrl = 'signup.html?';
          if (redirect) {
            signupUrl += 'redirect=' + encodeURIComponent(redirect);
          }
          if (intent === 'affiliate') {
            if (redirect) signupUrl += '&';
            signupUrl += 'intent=affiliate';
          }
          mobileSignupLink.href = signupUrl;
          console.log('Updated mobile signup link to:', signupUrl);
        }
      }
    }
  }

  function init(){
    if (!isMobile()) return;
    
    // Guard: Do NOT hide #cb-header on mobile for analyzer page
    if (document.body.dataset.page === 'analyzer') {
      // Do NOT hide #cb-header on mobile for analyzer
      console.log('Analyzer page detected - skipping hideDuplicateHeadersOnMobile');
    } else {
      hideDuplicateHeadersOnMobile?.();
    }
    
    buildDrawer();
    wireDrawerActions();   // <— add this
    initBurger();
    initButtons();
    updateMobileNavbar(); // Add mobile navbar update
  }

  let rid;
  window.addEventListener('resize', () => {
    window.clearTimeout(rid);
    rid = window.setTimeout(() => {
      if (isMobile() && !document.body.dataset.cbMobileInit){
        init();
        document.body.dataset.cbMobileInit = '1';
      }
    }, 150);
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (isMobile()){
      init();
      document.body.dataset.cbMobileInit = '1';
    }
  });
})();

//// --- CB: Insights wiring v2 (surgical, idempotent) --- ////
(function(){
  const NS='__cbInsightsV2';
  if (window[NS]) return; window[NS]=true;

  // OPTIONAL: If you know the exact desktop selector, set it here for a guaranteed click.
  // Example: window.CB_INSIGHTS_SELECTOR = '#insights-link';
  // (You can set this in your main app script as well.)
  const userSel = window.CB_INSIGHTS_SELECTOR;

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  function visible(el){
    if (!el) return false;
    const s = getComputedStyle(el);
    return s && s.display!=='none' && s.visibility!=='hidden' && s.opacity!=='0';
  }

  function strongClick(el){
    if (!el) return false;
    try { if (typeof el.click==='function') el.click(); } catch(_){}
    const types=['pointerdown','mousedown','touchstart','mouseup','pointerup','touchend','click'];
    for(const t of types){ try{ el.dispatchEvent(new Event(t,{bubbles:true,cancelable:true})); }catch(_){} }
    // bubble to ancestors in case handlers are higher up
    let p=el;
    for(let i=0;i<3 && p; i++){
      try{ p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }catch(_){}
      p=p.parentElement;
    }
    return true;
  }

  function findInsights(){
    if (userSel){
      const ue = document.querySelector(userSel);
      if (ue && visible(ue)) return ue;
    }
    const selectors = [
      '.btn-insights','#insights-link','#nav-insights',
      '[data-nav="insights"]','[data-modal="insights"]','[data-section="insights"]','[data-target*="insight"]',
      'a[href="#insights"]','a[href*="#insights"]','a[href*="insight"]',
      '[id*="insight"]','[class*="insight"]'
    ];
    for (const s of selectors){
      const el = document.querySelector(s);
      if (el && visible(el)) return el;
    }
    // text-based match (sidebar > nav > body)
    const scopes=[document.querySelector('.sidebar'), document.querySelector('nav'), document.body].filter(Boolean);
    for (const scope of scopes){
      const nodes = scope.querySelectorAll('a,button,[role="button"],li,div');
      for (const n of nodes){
        const txt = (n.getAttribute('aria-label') || n.textContent || '').trim().toLowerCase();
        if (txt === 'insights' || txt.includes('insight')) return n;
      }
    }
    return null;
  }

  function openInsights(){
    // 1) Click the real desktop trigger if present
    const el = findInsights();
    if (el){
      strongClick(el);
      const href = el.getAttribute && el.getAttribute('href');
      if (href && href.startsWith('#') && location.hash !== href){
        location.hash = href;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    }
    // 2) Try common global functions used on desktop
    const fns = [
      () => (typeof window.openInsights==='function'  && window.openInsights()),
      () => (typeof window.showInsights==='function'  && window.showInsights()),
      () => (typeof window.openPanel==='function'     && window.openPanel('insights')),
      () => (typeof window.navigateTo==='function'    && window.navigateTo('insights')),
    ];
    for (const call of fns){ try { if (call()) return true; } catch(_){} }

    // 3) Open a known modal element directly
    const modal = document.querySelector('#insights-modal, .modal-insights, [data-modal-id="insights"]');
    if (modal){
      modal.classList.add('open','show','visible','is-active');
      modal.style.display='block';
      return true;
    }

    // 4) Hash-only fallback (no full route that would 404)
    try{
      if (location.hash !== '#insights'){
        location.hash = '#insights';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    }catch(_){}
    return false;
  }

  function closeDrawer(){
    const drawer=document.getElementById('cb-drawer');
    if(!drawer) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    const burger=document.getElementById('cb-burger');
    if (burger){ burger.classList.remove('open'); burger.setAttribute('aria-expanded','false'); burger.setAttribute('aria-label','Open menu'); }
    const x=document.getElementById('cb-close'); if (x) x.style.display='none';
  }

  function neutralizeInsightsLinks(){
    const drawer=document.getElementById('cb-drawer');
    if (!drawer) return;
    const items = drawer.querySelectorAll('.cb-item, a, button, [role="button"]');
    items.forEach(a=>{
      const label = (a.querySelector('.cb-label')?.textContent || a.textContent || '').trim().toLowerCase();
      if (label.includes('insights') || (a.getAttribute && (a.getAttribute('href')||'').toLowerCase().includes('insights'))){
        a.removeAttribute && a.removeAttribute('href');  // kill route nav
        a.setAttribute && a.setAttribute('role','button');
        a.style && (a.style.cursor='pointer');
      }
    });
  }

  function wireOnce(){
    if (!isMobile()) return;
    const drawer=document.getElementById('cb-drawer');
    if (!drawer) return;

    neutralizeInsightsLinks();

    // Capture-phase listener to beat default link navigation
    const handler = function(e){
      const node = e.target.closest('#cb-drawer .cb-item, #cb-drawer a, #cb-drawer button, #cb-drawer [role="button"]');
      if (!node) return;
      const label = (node.querySelector('.cb-label')?.textContent || node.textContent || '').trim().toLowerCase();
      if (!label.includes('insights')) return;

      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      e.stopPropagation();

      openInsights();
      closeDrawer();
    };

    if (!drawer.__cbInsightsV2Bound){
      drawer.addEventListener('click', handler, { capture:true }); // not passive
      drawer.__cbInsightsV2Bound = true;
    }
  }

  // DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireOnce);
  else wireOnce();

  // Re-wire on burger open (in case drawer content is rebuilt)
  const burger=document.getElementById('cb-burger');
  if (burger) burger.addEventListener('click', ()=> setTimeout(wireOnce, 0));

  // Watch for rebuilds of the drawer list
  const list=document.getElementById('cb-drawer-list');
  if (list && window.MutationObserver){
    const mo=new MutationObserver(wireOnce);
    mo.observe(list,{childList:true,subtree:true});
  }
})();
//// --- end Insights wiring v2 --- ////

//// --- CB: Settings wiring v2 (surgical, idempotent) --- ////
(function(){
  const NS='__cbSettingsV2';
  if (window[NS]) return; window[NS]=true;

  // OPTIONAL: If you know the exact desktop selector, set it here for guaranteed click:
  //   window.CB_SETTINGS_SELECTOR = '#settings-link';
  const userSel = window.CB_SETTINGS_SELECTOR;

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  function visible(el){
    if (!el) return false;
    const s = getComputedStyle(el);
    return s && s.display!=='none' && s.visibility!=='hidden' && s.opacity!=='0';
  }

  function strongClick(el){
    if (!el) return false;
    try { if (typeof el.click==='function') el.click(); } catch(_){}
    const types=['pointerdown','mousedown','touchstart','mouseup','pointerup','touchend','click'];
    for(const t of types){ try{ el.dispatchEvent(new Event(t,{bubbles:true,cancelable:true})); }catch(_){} }
    let p=el;
    for(let i=0;i<3 && p; i++){
      try{ p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }catch(_){}
      p=p.parentElement;
    }
    return true;
  }

  function findSettings(){
    if (userSel){
      const ue = document.querySelector(userSel);
      if (ue && visible(ue)) return ue;
    }
    const selectors = [
      '.btn-settings', '#settings-link', '#nav-settings',
      '[data-nav="settings"]', '[data-modal="settings"]', '[data-section="settings"]', '[data-target*="setting"]',
      'a[href="#settings"]', 'a[href*="#settings"]',
      '[id*="setting"]', '[class*="setting"]'
    ];
    for (const s of selectors){
      const el = document.querySelector(s);
      if (el && visible(el)) return el;
    }
    const scopes=[document.querySelector('.sidebar'), document.querySelector('nav'), document.body].filter(Boolean);
    for (const scope of scopes){
      const nodes = scope.querySelectorAll('a,button,[role="button"],li,div');
      for (const n of nodes){
        const txt = (n.getAttribute('aria-label') || n.textContent || '').trim().toLowerCase();
        if (txt === 'settings' || txt.includes('setting')) return n;
      }
    }
    return null;
  }

  function openSettings(){
    // 1) Proxy-click real desktop trigger
    const el = findSettings();
    if (el){
      strongClick(el);
      const href = el.getAttribute && el.getAttribute('href');
      if (href && href.startsWith('#') && location.hash !== href){
        location.hash = href;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    }
    // 2) Common desktop globals
    const fns = [
      () => (typeof window.openSettings==='function'  && window.openSettings()),
      () => (typeof window.showSettings==='function'  && window.showSettings()),
      () => (typeof window.openPanel==='function'     && window.openPanel('settings')),
      () => (typeof window.navigateTo==='function'    && window.navigateTo('settings')),
    ];
    for (const call of fns){ try { if (call()) return true; } catch(_){} }

    // 3) Direct modal open
    const modal = document.querySelector('#settings-modal, .modal-settings, [data-modal-id="settings"]');
    if (modal){
      modal.classList.add('open','show','visible','is-active');
      modal.style.display='block';
      return true;
    }

    // 4) Hash-only fallback (no route)
    try{
      if (location.hash !== '#settings'){
        location.hash = '#settings';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    }catch(_){}
    return false;
  }

  function closeDrawer(){
    const drawer=document.getElementById('cb-drawer');
    if(!drawer) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    const burger=document.getElementById('cb-burger');
    if (burger){ burger.classList.remove('open'); burger.setAttribute('aria-expanded','false'); burger.setAttribute('aria-label','Open menu'); }
    const x=document.getElementById('cb-close'); if (x) x.style.display='none';
  }

  function neutralizeSettingsLinks(){
    const drawer=document.getElementById('cb-drawer');
    if (!drawer) return;
    const items = drawer.querySelectorAll('.cb-item, a, button, [role="button"]');
    items.forEach(a=>{
      const label = (a.querySelector('.cb-label')?.textContent || a.textContent || '').trim().toLowerCase();
      if (label.includes('settings') || (a.getAttribute && (a.getAttribute('href')||'').toLowerCase().includes('settings'))){
        a.removeAttribute && a.removeAttribute('href');  // prevent route nav
        a.setAttribute && a.setAttribute('role','button');
        a.style && (a.style.cursor='pointer');
      }
    });
  }

  function wireOnce(){
    if (!isMobile()) return;
    const drawer=document.getElementById('cb-drawer');
    if (!drawer) return;

    neutralizeSettingsLinks();

    const handler = function(e){
      const node = e.target.closest('#cb-drawer .cb-item, #cb-drawer a, #cb-drawer button, #cb-drawer [role="button"]');
      if (!node) return;
      const label = (node.querySelector('.cb-label')?.textContent || node.textContent || '').trim().toLowerCase();
      if (!label.includes('settings')) return;

      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      e.stopPropagation();

      openSettings();
      closeDrawer();
    };

    if (!drawer.__cbSettingsV2Bound){
      drawer.addEventListener('click', handler, { capture:true }); // capture-phase to beat default nav
      drawer.__cbSettingsV2Bound = true;
    }
  }

  // DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireOnce);
  else wireOnce();

  // Re-wire on burger open (in case drawer content is rebuilt)
  const burger=document.getElementById('cb-burger');
  if (burger) burger.addEventListener('click', ()=> setTimeout(wireOnce, 0));

  // Watch for rebuilds of the drawer list
  const list=document.getElementById('cb-drawer-list');
  if (list && window.MutationObserver){
    const mo=new MutationObserver(wireOnce);
    mo.observe(list,{childList:true,subtree:true});
  }
})();
//// --- end Settings wiring v2 --- ////

//// --- CB: Leaderboard wiring v2 (surgical, idempotent) --- ////
(function(){
  const NS='__cbLeaderboardV2';
  if (window[NS]) return; window[NS]=true;

  // OPTIONAL: set an exact desktop trigger for a guaranteed click, e.g.:
  //   window.CB_LEADERBOARD_SELECTOR = '#leaderboard-link';
  const userSel = window.CB_LEADERBOARD_SELECTOR;

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  function visible(el){
    if (!el) return false;
    const s = getComputedStyle(el);
    return s && s.display!=='none' && s.visibility!=='hidden' && s.opacity!=='0';
  }

  function strongClick(el){
    if (!el) return false;
    try { if (typeof el.click==='function') el.click(); } catch(_){}
    const types=['pointerdown','mousedown','touchstart','mouseup','pointerup','touchend','click'];
    for (const t of types){ try { el.dispatchEvent(new Event(t,{bubbles:true,cancelable:true})); } catch(_){} }
    let p=el;
    for(let i=0;i<3 && p; i++){
      try{ p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }catch(_){}
      p=p.parentElement;
    }
    return true;
  }

  function findLeaderboard(){
    if (userSel){
      const ue = document.querySelector(userSel);
      if (ue && visible(ue)) return ue;
    }
    const selectors = [
      '.leaderboard-link', '#leaderboard-link', '#nav-leaderboard',
      '[data-nav="leaderboard"]','[data-section="leaderboard"]','[data-target*="leaderboard"]',
      'a[href*="leaderboard"]','a[href*="top-10"]','a[href*="top10"]',
      '#leaderboard','.leaderboard','[data-widget="leaderboard"]'
    ];
    for (const s of selectors){
      const el = document.querySelector(s);
      if (el && visible(el)) return el;
    }
    // text match in sensible scopes
    const scopes=[document.querySelector('.sidebar'), document.querySelector('nav'), document.body].filter(Boolean);
    for (const scope of scopes){
      const nodes=scope.querySelectorAll('a,button,[role="button"],li,div');
      for (const n of nodes){
        const txt=(n.getAttribute('aria-label')||n.textContent||'').trim().toLowerCase();
        if (txt.includes('top 10') || txt.includes('top ten') || txt.includes('leaderboard')) return n;
      }
    }
    return null;
  }

  function openLeaderboard(){
    // 1) Click the real desktop trigger if present
    const el = findLeaderboard();
    if (el){
      strongClick(el);
      const href = el.getAttribute && el.getAttribute('href');
      if (href && href.startsWith('#') && location.hash !== href){
        location.hash = href;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    }

    // 2) Try common globals used by desktop
    const fns = [
      () => (typeof window.openLeaderboard==='function'  && window.openLeaderboard()),
      () => (typeof window.showLeaderboard==='function'  && window.showLeaderboard()),
      () => (typeof window.openPanel==='function'       && window.openPanel('leaderboard')),
      () => (typeof window.navigateTo==='function'      && (window.navigateTo('leaderboard') || window.navigateTo('top-10'))),
    ];
    for (const call of fns){ try { if (call()) return true; } catch(_){} }

    // 3) Directly reveal a leaderboard section if it exists
    const sec = document.querySelector('#leaderboard, .leaderboard, [data-widget="leaderboard"]');
    if (sec){
      sec.classList.add('open','show','visible','is-active');
      if (!sec.style.display) sec.style.display='block';
      try { sec.scrollIntoView({behavior:'smooth',block:'start'}); } catch(_){}
      return true;
    }

    // 4) Hash-only fallback (no full route)
    try{
      const fallback = document.querySelector('a[href*="#top-10"], a[href="#leaderboard"]') ? '#top-10' : '#leaderboard';
      if (location.hash !== fallback){
        location.hash = fallback;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return true;
    }catch(_){}
    return false;
  }

  function closeDrawer(){
    const drawer=document.getElementById('cb-drawer');
    if(!drawer) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    const burger=document.getElementById('cb-burger');
    if (burger){ burger.classList.remove('open'); burger.setAttribute('aria-expanded','false'); burger.setAttribute('aria-label','Open menu'); }
    const x=document.getElementById('cb-close'); if (x) x.style.display='none';
  }

  function neutralizeLeaderboardLinks(){
    const drawer=document.getElementById('cb-drawer');
    if (!drawer) return;
    const items = drawer.querySelectorAll('.cb-item, a, button, [role="button"]');
    items.forEach(a=>{
      const label=(a.querySelector('.cb-label')?.textContent || a.textContent || '').trim().toLowerCase();
      const href =(a.getAttribute && (a.getAttribute('href')||'').toLowerCase()) || '';
      if (label.includes('top 10') || label.includes('top ten') || label.includes('leaderboard') || href.includes('top-10') || href.includes('leaderboard')){
        a.removeAttribute && a.removeAttribute('href'); // prevent 404 routes
        a.setAttribute && a.setAttribute('role','button');
        a.setAttribute && a.setAttribute('data-action','leaderboard');
        a.style && (a.style.cursor='pointer');
        a.style && (a.style.textDecoration='none');
      }
    });
  }

  function wireOnce(){
    if (!isMobile()) return;
    const drawer=document.getElementById('cb-drawer');
    if (!drawer) return;

    neutralizeLeaderboardLinks();

    const handler = function(e){
      const node = e.target.closest('#cb-drawer .cb-item, #cb-drawer a, #cb-drawer button, #cb-drawer [role="button"]');
      if (!node) return;
      const label=(node.querySelector('.cb-label')?.textContent || node.textContent || '').trim().toLowerCase();
      const isLB = label.includes('top 10') || label.includes('top ten') || label.includes('leaderboard') || node.getAttribute('data-action') === 'leaderboard';
      if (!isLB) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

      // Try to open leaderboard
      const success = openLeaderboard();
      if (success) {
        closeDrawer();
      } else {
        console.log('Leaderboard not found or failed to open');
      }
    };

    if (!drawer.__cbLeaderboardV2Bound){
      drawer.addEventListener('click', handler, { capture:true }); // capture-phase
      drawer.__cbLeaderboardV2Bound = true;
    }
  }

  // DOM ready + rewire on open + observe rebuilds
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireOnce);
  else wireOnce();

  const burger=document.getElementById('cb-burger');
  if (burger) burger.addEventListener('click', ()=> setTimeout(wireOnce, 0));

  const list=document.getElementById('cb-drawer-list');
  if (list && window.MutationObserver){
    const mo=new MutationObserver(wireOnce);
    mo.observe(list,{childList:true,subtree:true});
  }
})();
//// --- end Leaderboard wiring v2 --- ////

////////////////////  CB padlock tagger (mobile-only, idempotent)  ////////////////////
(function(){
  if (window.__CB_lockTagger) return; window.__CB_lockTagger = true;

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  function tagPadlocks(){
    if (!isMobile()) return;
    const root = document.getElementById('cb-gauges');
    if (!root) return;

    const cards = Array.from(root.children); // assumes six direct children
    const lockedIdx = [0,1,4,5]; // visual positions 1,2,5,6

    lockedIdx.forEach(i => {
      const card = cards[i];
      if (!card) return;

      // mark card so CSS can position within it
      card.classList.add('locked-card');

      // already tagged?
      let lock = card.querySelector('.m-lock');
      if (!lock){
        // best-effort find the padlock image (never the chains)
        lock = card.querySelector('img[alt*="lock" i], img[class*="lock" i], img[src*="lock" i]');
        if (lock && /chain/i.test(lock.getAttribute('src')||'')) lock = null;
        if (!lock){
          // fallback: last img in the card that is not a chain
          const imgs = Array.from(card.querySelectorAll('img')).filter(img => !/chain/i.test(img.getAttribute('src')||''));
          lock = imgs[imgs.length - 1] || null;
        }
        if (lock) lock.classList.add('m-lock');
      }
    });
  }

  const go = () => { try{ tagPadlocks(); }catch(e){} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  window.addEventListener('resize', () => { if (isMobile()) go(); });

  // If gauges re-render, observe and re-tag
  const root = document.getElementById('cb-gauges');
  if (root && window.MutationObserver){
    const mo = new MutationObserver(go);
    mo.observe(root, { childList:true, subtree:true });
  }
})();
///////////////////////////////////////////////////////////////////////////////////////
