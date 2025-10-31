// ✅ Live Stripe public key for CopyBoss checkout
window.STRIPE_PUBLIC_KEY = "pk_live_51RywOpBL8jJykmhXDuBGEZJkzXUZyDQbDm2VpcbCIv3JRQIk1NJf8tHlqqX7qqvmh1uJLbwqqLeF3693EluIF9Sw00BwqndFgt";

(function gateLogic() {
  try {
    console.log('🔐 Gate logic loaded');

    const STRIPE_PUBLISHABLE_KEY = window.STRIPE_PUBLIC_KEY || (typeof process !== 'undefined' && process.env && process.env.STRIPE_PUBLIC_KEY) || '';
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.warn('⚠️ Missing STRIPE public key. Set window.STRIPE_PUBLIC_KEY.');
    }

    // 1) Attach click to unlock badges
    document.addEventListener('click', async (e) => {
      const target = e.target.closest('.unlock-badge, .unlock-overlay');
      if (!target) return;
      e.preventDefault();
      console.log('Starting Stripe checkout...');

      try {
        if (!window.Stripe || !STRIPE_PUBLISHABLE_KEY) {
          console.warn('Stripe.js or public key not available. Redirecting to pricing.');
          window.location.href = '/pricing.html';
          return;
        }

        const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
        console.log('✅ Stripe initialized with live key');
        // NOTE: In production, prefer creating a Checkout Session server-side.
        // Here we use lineItems for simplicity (requires price IDs to be public and allowed).
        const { error } = await stripe.redirectToCheckout({
          lineItems: [
            { price: window.CB_PRICE_PRO || 'price_XXXXXXXX', quantity: 1 }
          ],
          mode: 'subscription',
          successUrl: window.location.origin + '/analyzer.html?success=1&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.origin + '/pricing.html?canceled=1'
        });
        if (error) console.error('Stripe redirect error:', error);
      } catch (err) {
        console.error('Stripe init error:', err);
      }
    });

    // 2) On load, verify session
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

        const params = new URLSearchParams(window.location.search);
        const sid = params.get('session_id');
        if (!sid) return;

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
      } catch (err) {
        console.error('Verification failed:', err);
      }
    });

    // 3) Apply blur on locked sections if not unlocked yet
    document.addEventListener('DOMContentLoaded', () => {
      if (localStorage.getItem('vbProUnlocked') === 'true') return;
      document.querySelectorAll('[data-pro="true"]').forEach(el => {
        el.classList.add('blurred');
      });
      console.log('🔒 Applied blur to Pro sections (not unlocked)');
    });

    console.log('✅ Analyzer gating + Stripe unlock system finalized');
  } catch (e) {
    console.error('Gate logic fatal error:', e);
  }
})();

if (document.readyState !== 'loading') {
  console.log('🎯 Forcing analyzer rebuild after Stripe key inject');
  setTimeout(() => window.dispatchEvent(new Event('forceRebuild')), 1500);
}


