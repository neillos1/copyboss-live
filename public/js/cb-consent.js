/**
 * CopyBoss Cookie Consent System
 * GDPR-compliant cookie consent with dark glassy UI
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    cookieName: 'cb_consent_v1',
    cookieMaxAge: 31536000, // 12 months
    cookieDomain: window.location.hostname === 'localhost' ? undefined : '.copy-boss.com',
    cookiePath: '/',
    cookieSameSite: 'Lax',
    cookieSecure: window.location.protocol === 'https:',
    animationDuration: 240,
    modalAnimationDuration: 220,
    showDelayMs: 3000
  };

  // Consent state
  let consentState = {
    version: 1,
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: null
  };

  // DOM elements
  let banner = null;
  let modal = null;
  let isModalOpen = false;
  let isBannerScheduled = false;

  /**
   * Safe cookie helper with correct attributes
   */
  function safeCookie(name, value, options = {}) {
    const cookieOptions = {
      path: CONFIG.cookiePath,
      sameSite: CONFIG.cookieSameSite,
      secure: CONFIG.cookieSecure,
      maxAge: CONFIG.cookieMaxAge,
      ...options
    };

    if (CONFIG.cookieDomain) {
      cookieOptions.domain = CONFIG.cookieDomain;
    }

    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    Object.entries(cookieOptions).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        cookieString += `; ${key}=${val}`;
      }
    });

    document.cookie = cookieString;
  }

  /**
   * Read cookie value
   */
  function readCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      try {
        return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Delete cookie
   */
  function deleteCookie(name) {
    const options = {
      path: CONFIG.cookiePath,
      sameSite: CONFIG.cookieSameSite,
      secure: CONFIG.cookieSecure,
      maxAge: 0
    };

    if (CONFIG.cookieDomain) {
      options.domain = CONFIG.cookieDomain;
    }

    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    
    Object.entries(options).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        cookieString += `; ${key}=${val}`;
      }
    });

    document.cookie = cookieString;
  }

  /**
   * Check if Do Not Track is enabled
   */
  function isDoNotTrackEnabled() {
    return navigator.doNotTrack === '1' || 
           navigator.doNotTrack === 'yes' || 
           navigator.msDoNotTrack === '1' ||
           window.doNotTrack === '1';
  }

  /**
   * Load saved consent
   */
  function loadConsent() {
    const saved = readCookie(CONFIG.cookieName);
    if (saved && saved.version === 1) {
      consentState = { ...consentState, ...saved };
      return true;
    }
    return false;
  }

  /**
   * Save consent to cookie
   */
  function saveConsent() {
    consentState.timestamp = Date.now();
    safeCookie(CONFIG.cookieName, JSON.stringify(consentState));
  }

  /**
   * Call analytics hook if enabled
   */
  function enableAnalytics() {
    if (typeof window.enableAnalytics === 'function') {
      window.enableAnalytics();
    } else {
      console.log('TODO: Implement window.enableAnalytics() to load Google Analytics, Clarity, etc.');
    }
  }

  /**
   * Call marketing hook if enabled
   */
  function enableMarketing() {
    if (typeof window.enableMarketing === 'function') {
      window.enableMarketing();
    } else {
      console.log('TODO: Implement window.enableMarketing() to load Facebook Pixel, etc.');
    }
  }

  /**
   * Apply consent and call appropriate hooks
   */
  function applyConsent() {
    if (consentState.analytics) {
      enableAnalytics();
    }
    if (consentState.marketing) {
      enableMarketing();
    }
  }

  /**
   * Create banner HTML
   */
  function createBannerHTML() {
    return `
      <div class="cb-consent-banner" id="cb-consent-banner" role="banner" aria-label="Cookie consent">
        <button class="cb-consent-close" id="cb-consent-close" aria-label="Close cookie banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="cb-consent-content">
          <div class="cb-consent-text">
            <h3>Cookies on CopyBoss</h3>
            <p>We use necessary cookies to make our site work. We'd also like to use analytics and marketing cookies to improve your experience.</p>
            <div class="cb-consent-links">
              <a href="/privacy" target="_blank">Privacy Policy</a>
              <span>•</span>
              <a href="/cookies" target="_blank">Cookie Policy</a>
            </div>
          </div>
          <div class="cb-consent-actions">
            <button class="cb-consent-btn cb-consent-btn-primary" id="cb-consent-accept-all">
              Accept all
            </button>
            <button class="cb-consent-btn cb-consent-btn-secondary" id="cb-consent-reject">
              Reject non-essential
            </button>
            <button class="cb-consent-btn cb-consent-btn-ghost" id="cb-consent-customize">
              Customize
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create modal HTML
   */
  function createModalHTML() {
    return `
      <div class="cb-consent-modal" id="cb-consent-modal" role="dialog" aria-labelledby="cb-consent-modal-title" aria-hidden="true">
        <div class="cb-consent-modal-content">
          <div class="cb-consent-modal-header">
            <h2 class="cb-consent-modal-title" id="cb-consent-modal-title">Cookie Preferences</h2>
            <p class="cb-consent-modal-description">
              Choose which cookies you'd like to allow. You can change these settings at any time.
            </p>
          </div>
          <div class="cb-consent-preferences">
            <div class="cb-consent-preference">
              <div class="cb-consent-preference-info">
                <h3 class="cb-consent-preference-title">Necessary</h3>
                <p class="cb-consent-preference-description">
                  Essential cookies required for the website to function properly. These cannot be disabled.
                </p>
              </div>
              <div class="cb-consent-toggle active disabled" id="cb-consent-necessary" aria-label="Necessary cookies (always enabled)">
              </div>
            </div>
            <div class="cb-consent-preference">
              <div class="cb-consent-preference-info">
                <h3 class="cb-consent-preference-title">Analytics</h3>
                <p class="cb-consent-preference-description">
                  Help us understand how visitors interact with our website by collecting anonymous information.
                </p>
              </div>
              <div class="cb-consent-toggle" id="cb-consent-analytics" role="switch" aria-checked="false" tabindex="0">
              </div>
            </div>
            <div class="cb-consent-preference">
              <div class="cb-consent-preference-info">
                <h3 class="cb-consent-preference-title">Marketing</h3>
                <p class="cb-consent-preference-description">
                  Used to track visitors across websites to display relevant and engaging advertisements.
                </p>
              </div>
              <div class="cb-consent-toggle" id="cb-consent-marketing" role="switch" aria-checked="false" tabindex="0">
              </div>
            </div>
          </div>
          <div class="cb-consent-modal-actions">
            <button class="cb-consent-modal-btn cb-consent-modal-btn-secondary" id="cb-consent-cancel">
              Cancel
            </button>
            <button class="cb-consent-modal-btn cb-consent-modal-btn-primary" id="cb-consent-save">
              Save choices
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show banner with animation
   */
  function showBanner() {
    if (banner) {
      banner.classList.add('show');
      // Focus first actionable button for accessibility
      const firstButton = banner.querySelector('.cb-consent-btn');
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  }

  /**
   * Hide banner with slide-out animation
   */
  function hideBanner() {
    if (banner) {
      banner.classList.add('cb-consent--closing');
      banner.addEventListener('animationend', () => {
        if (banner && banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
        banner = null;
      }, { once: true });
    }
  }

  /**
   * Schedule consent banner to show after mascot or timeout
   */
  function scheduleConsentBanner() {
    if (isBannerScheduled) return;
    isBannerScheduled = true;

    function showConsentBannerNow() {
      if (banner) return; // Already showing
      
      // Create and show banner
      document.body.insertAdjacentHTML('beforeend', createBannerHTML());
      document.body.insertAdjacentHTML('beforeend', createModalHTML());

      banner = document.getElementById('cb-consent-banner');
      modal = document.getElementById('cb-consent-modal');

      initEventListeners();
      showBanner();
    }

    // Check if mascot is already done
    if (window.__cbMascotDone === true) {
      showConsentBannerNow();
      return;
    }

    // Listen for mascot finished event
    window.addEventListener('mascot:finished', showConsentBannerNow, { once: true });
    
    // Fallback timeout
    setTimeout(showConsentBannerNow, CONFIG.showDelayMs);
  }

  /**
   * Show modal with animation
   */
  function showModal() {
    if (modal) {
      isModalOpen = true;
      document.body.classList.add('cb-consent-no-scroll');
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('show');
      
      // Focus trap
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }

  /**
   * Hide modal with animation
   */
  function hideModal() {
    if (modal) {
      isModalOpen = false;
      document.body.classList.remove('cb-consent-no-scroll');
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('show');
    }
  }

  /**
   * Update toggle state
   */
  function updateToggle(toggle, isActive) {
    if (isActive) {
      toggle.classList.add('active');
      toggle.setAttribute('aria-checked', 'true');
    } else {
      toggle.classList.remove('active');
      toggle.setAttribute('aria-checked', 'false');
    }
  }

  /**
   * Update modal toggles based on current consent
   */
  function updateModalToggles() {
    const analyticsToggle = document.getElementById('cb-consent-analytics');
    const marketingToggle = document.getElementById('cb-consent-marketing');
    
    if (analyticsToggle) {
      updateToggle(analyticsToggle, consentState.analytics);
    }
    if (marketingToggle) {
      updateToggle(marketingToggle, consentState.marketing);
    }
  }

  /**
   * Handle toggle click
   */
  function handleToggleClick(toggle, type) {
    if (toggle.classList.contains('disabled')) return;
    
    const isActive = toggle.classList.contains('active');
    updateToggle(toggle, !isActive);
    consentState[type] = !isActive;
  }

  /**
   * Handle toggle keyboard
   */
  function handleToggleKeydown(event, toggle, type) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleClick(toggle, type);
    }
  }

  /**
   * Accept all cookies
   */
  function acceptAll() {
    consentState.analytics = true;
    consentState.marketing = true;
    saveConsent();
    applyConsent();
    hideBanner();
  }

  /**
   * Reject non-essential cookies
   */
  function rejectNonEssential() {
    consentState.analytics = false;
    consentState.marketing = false;
    saveConsent();
    hideBanner();
  }

  /**
   * Close banner (temporary hide)
   */
  function closeBanner() {
    hideBanner();
  }

  /**
   * Open customize modal
   */
  function openCustomize() {
    updateModalToggles();
    showModal();
  }

  /**
   * Save custom choices
   */
  function saveChoices() {
    saveConsent();
    applyConsent();
    hideModal();
    hideBanner();
  }

  /**
   * Cancel modal without saving
   */
  function cancelModal() {
    hideModal();
  }

  /**
   * Handle escape key
   */
  function handleEscape(event) {
    if (event.key === 'Escape' && isModalOpen) {
      cancelModal();
    }
  }

  /**
   * Initialize event listeners
   */
  function initEventListeners() {
    // Banner buttons
    const acceptAllBtn = document.getElementById('cb-consent-accept-all');
    const rejectBtn = document.getElementById('cb-consent-reject');
    const customizeBtn = document.getElementById('cb-consent-customize');
    const closeBtn = document.getElementById('cb-consent-close');

    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', acceptAll);
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', rejectNonEssential);
    }
    if (customizeBtn) {
      customizeBtn.addEventListener('click', openCustomize);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeBanner);
    }

    // Modal buttons
    const saveBtn = document.getElementById('cb-consent-save');
    const cancelBtn = document.getElementById('cb-consent-cancel');

    if (saveBtn) {
      saveBtn.addEventListener('click', saveChoices);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelModal);
    }

    // Toggles
    const analyticsToggle = document.getElementById('cb-consent-analytics');
    const marketingToggle = document.getElementById('cb-consent-marketing');

    if (analyticsToggle) {
      analyticsToggle.addEventListener('click', () => handleToggleClick(analyticsToggle, 'analytics'));
      analyticsToggle.addEventListener('keydown', (e) => handleToggleKeydown(e, analyticsToggle, 'analytics'));
    }
    if (marketingToggle) {
      marketingToggle.addEventListener('click', () => handleToggleClick(marketingToggle, 'marketing'));
      marketingToggle.addEventListener('keydown', (e) => handleToggleKeydown(e, marketingToggle, 'marketing'));
    }

    // Modal backdrop click
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          cancelModal();
        }
      });
    }

    // Escape key
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Initialize consent system
   */
  function init() {
    // Check if consent already exists
    if (loadConsent()) {
      // Apply existing consent
      applyConsent();
      return;
    }

    // Check Do Not Track
    if (isDoNotTrackEnabled()) {
      consentState.analytics = false;
      consentState.marketing = false;
    }

    // Schedule banner to show after mascot or timeout
    scheduleConsentBanner();
  }

  /**
   * Public API
   */
  window.openCookieSettings = function() {
    if (!banner && !modal) {
      // Recreate if not exists
      document.body.insertAdjacentHTML('beforeend', createBannerHTML());
      document.body.insertAdjacentHTML('beforeend', createModalHTML());
      banner = document.getElementById('cb-consent-banner');
      modal = document.getElementById('cb-consent-modal');
      initEventListeners();
    }
    
    if (modal) {
      updateModalToggles();
      showModal();
    }
  };

  window.getConsentState = function() {
    return { ...consentState };
  };

  window.resetConsent = function() {
    deleteCookie(CONFIG.cookieName);
    location.reload();
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
