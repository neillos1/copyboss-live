// ✅ Live Stripe public key for CopyBoss checkout
window.STRIPE_PUBLIC_KEY = "pk_live_51RywOpBL8jJykmhXDuBGEZJkzXUZyDQbDm2VpcbCIv3JRQIk1NJf8tHlqqX7qqvmh1uJLbwqqLeF3693EluIF9Sw00BwqndFgt";

// Stripe Payment Link redirect function
function startCheckout(plan) {
  let url = "";
  if (plan === "pro") {
    url = "https://buy.stripe.com/3cI00idzK9vD8oacqo5os02"; // Pro £4.99/month
  } else if (plan === "2reports") {
    url = "https://buy.stripe.com/3cI6oG1R25fn5bY6205os01"; // 2 Reports £1.99
  } else if (plan === "15reports") {
    url = "https://buy.stripe.com/00w6oGany37f33Qbmk5os00"; // 15 Reports £9.99
  }

  if (url) {
    console.log("🟢 Redirecting to Stripe Payment Link for plan:", plan);
    window.location.href = url;
  } else {
    console.error("❌ Unknown plan type:", plan);
  }
}

(function gateLogic() {
  try {
    console.log('🔐 Gate logic loaded');

    // Helper: Bind unlock buttons with duplicate prevention
    function bindUnlockButtons() {
      const buttons = document.querySelectorAll('.btn-upgrade, .unlock-badge, .cb-pro-cta');
      let boundCount = 0;
      
      buttons.forEach(btn => {
        // Skip if already bound
        if (btn.dataset.bound === 'true') return;
        
        // Remove old href
        if (btn.hasAttribute('href')) {
          btn.removeAttribute('href');
        }
        if (btn.href === '#') {
          btn.href = 'javascript:void(0)';
        }
        
        // Bind click handler
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🟢 Pro unlock button clicked');
          startCheckout("pro");
        });
        
        // Mark as bound
        btn.dataset.bound = 'true';
        boundCount++;
      });
      
      if (boundCount > 0) {
        console.log(`✅ Pro unlock button ready (${boundCount} buttons bound)`);
      }
      
      return boundCount;
    }

    // 1) Initial binding on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      bindUnlockButtons();
    });

    // 2) Continuous rebinding with MutationObserver (for SPA rebuilds)
    const observer = new MutationObserver(() => {
      bindUnlockButtons();
    });
    
    // Start observing after a delay to let initial render complete
    setTimeout(() => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('👀 MutationObserver active for unlock button binding');
    }, 2000);

    // 3) Periodic rebinding as fallback (every 2 seconds for first 10 seconds)
    let rebindAttempts = 0;
    const rebindInterval = setInterval(() => {
      rebindAttempts++;
      bindUnlockButtons();
      
      // Stop after 5 attempts (10 seconds)
      if (rebindAttempts >= 5) {
        clearInterval(rebindInterval);
      }
    }, 2000);

    // 2) On load, verify session (for Payment Link returns with query params)
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        // If already unlocked locally, skip verification
        if (localStorage.getItem('vbProUnlocked') === 'true') {
          window.CB_PRO_UNLOCKED = true;
          console.log('Pro access unlocked (local cache).');
          // Remove blur/badges if present
          document.querySelectorAll('.blurred, .locked-section').forEach(el => el.classList.remove('blurred', 'locked-section'));
          document.querySelectorAll('.unlock-badge').forEach(el => el.remove());
          return;
        }

        // Check for success indicators from Payment Link return
        const params = new URLSearchParams(window.location.search);
        const upgraded = params.get('upgraded');
        const success = params.get('success');
        
        // If Payment Link returned successfully, unlock Pro
        if (upgraded === 'true' || success === '1') {
          console.log('Stripe Payment Link success detected...');
          localStorage.setItem('vbProUnlocked', 'true');
          window.CB_PRO_UNLOCKED = true;
          // Remove gating visuals
          document.querySelectorAll('[data-pro="true"]').forEach(el => {
            el.classList.remove('locked-section', 'blurred');
            const badge = el.querySelector('.unlock-badge, .unlock-overlay');
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
          });
          console.log('Pro access unlocked.');
          console.log('✅ Analyzer Pro unlocked');
        }

        // Legacy: Check for session_id (if using Checkout Sessions)
        const sid = params.get('session_id');
        if (sid) {
          const resp = await fetch('/api/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sid })
          });
          const data = await resp.json();
          if (data && data.verified) {
            console.log('Stripe session verified...');
            localStorage.setItem('vbProUnlocked', 'true');
            window.CB_PRO_UNLOCKED = true;
            // Remove gating visuals
            document.querySelectorAll('[data-pro="true"]').forEach(el => {
              el.classList.remove('locked-section', 'blurred');
              const badge = el.querySelector('.unlock-badge, .unlock-overlay');
              if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            });
            console.log('Pro access unlocked.');
            console.log('✅ Analyzer Pro unlocked');
          }
        }
      } catch (err) {
        console.error('Verification failed:', err);
      }
    });

    // 3) Apply blur on locked sections if not unlocked yet + inject unlock buttons
    document.addEventListener('DOMContentLoaded', () => {
      if (localStorage.getItem('vbProUnlocked') === 'true') return;
      
      document.querySelectorAll('[data-pro="true"]').forEach(el => {
        el.classList.add('blurred');
        
        // Inject unlock button if missing
        const existingBtn = el.querySelector('.btn-upgrade, .cb-pro-cta');
        if (!existingBtn) {
          const btn = document.createElement('button');
          btn.className = 'btn-upgrade cb-pro-cta';
          btn.textContent = 'Unlock with Pro';
          btn.style.cssText = `
            display: block;
            margin: 20px auto;
            padding: 10px 20px;
            background: linear-gradient(135deg, #6c63ff, #8e7cff);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            z-index: 10;
            position: relative;
          `;
          el.appendChild(btn);
          btn.dataset.bound = 'false'; // Will be bound by bindUnlockButtons
          console.log('💎 Injected unlock button into blurred section');
        }
      });
      
      console.log('🔒 Applied blur to Pro sections (not unlocked)');
      
      // Bind injected buttons immediately
      setTimeout(() => bindUnlockButtons(), 500);
    });

    console.log('✅ Analyzer gating + Stripe Payment Links live and functional');
  } catch (e) {
    console.error('Gate logic fatal error:', e);
  }
})();

if (document.readyState !== 'loading') {
  console.log('🎯 Forcing analyzer rebuild after Stripe key inject');
  setTimeout(() => window.dispatchEvent(new Event('forceRebuild')), 1500);
}
