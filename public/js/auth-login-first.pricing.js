(function(){
  // Heuristic "is logged in" — adjust later if you have a real flag.
  function isLoggedIn(){
    try {
      if (document.documentElement.hasAttribute('data-user')) return true;
      if (window.CB && CB.user && CB.user.id) return true;
      if (document.cookie && /cb_uid=/.test(document.cookie)) return true;
    } catch(e){}
    // Fallback: if we still show a "Login" link in the navbar, assume logged out
    var hasLoginLink = !!document.querySelector('a[href*="login"], a:contains("Login")');
    return !hasLoginLink ? true : false;
  }

  function toLogin(plan){
    var ret = encodeURIComponent(location.pathname + location.search);
    var url = '/login.html?return=' + ret + (plan ? ('&plan='+encodeURIComponent(plan)) : '');
    location.href = url;
  }

  // Attach to the three plan buttons (use your existing button IDs/classes if present)
  var map = [
    { sel: 'a[href*="buy.stripe.com"][href*="3cI6oG1R25fn5bY6205os01"]', plan: 'ppr' },      // 2 Reports
    { sel: 'a[href*="buy.stripe.com"][href*="3cI00idzK9vD8oacqo5os02"]', plan: 'creator' }, // Creator+
    { sel: 'a[href*="buy.stripe.com"][href*="00w6oGany37f33Qbmk5os00"]', plan: 'bundle' }   // 15 Bundle
  ];

  map.forEach(function(item){
    document.querySelectorAll(item.sel).forEach(function(btn){
      btn.addEventListener('click', function(e){
        if (!isLoggedIn()){
          e.preventDefault();
          toLogin(item.plan);
        }
      }, { capture:true });
    });
  });
})();
