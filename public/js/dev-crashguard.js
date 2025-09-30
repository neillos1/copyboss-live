(function(){
  var show = new URL(location.href).searchParams.get('debug') === '1';

  function send(msg, meta){
    try {
      fetch('/__client_error', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: msg, meta })
      }).catch(()=>{});
    } catch(_) {}
  }

  function banner(text){
    if (!show) return;
    var bar = document.createElement('div');
    bar.textContent = 'CLIENT ERROR: ' + text;
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#c00;color:#fff;padding:10px 14px;font:13px/1.4 -apple-system,Segoe UI,Roboto,Arial;border-bottom:2px solid #600';
    document.body.appendChild(bar);
  }

  window.addEventListener('error', function(e){
    var msg = e?.message || '(no message)';
    var meta = (e?.filename||'') + ':' + (e?.lineno||'');
    console.log('🚨 CLIENT ERROR (error):', msg, meta);
    send(msg, meta);
    banner(msg);
  });

  window.addEventListener('unhandledrejection', function(e){
    var msg = (e?.reason && (e.reason.message || e.reason.toString())) || '(unhandledrejection)';
    console.log('🚨 CLIENT ERROR (promise):', msg);
    send(msg, '');
    banner(msg);
  });
})();