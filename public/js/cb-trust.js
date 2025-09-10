/**
 * CopyBoss Trust Footer & ICO Modal
 * Professional trust elements with accessibility features
 */

(function() {
  'use strict';

  // ICO Modal functionality
  function initICOModal() {
    const modal = document.getElementById('cb-ico-modal');
    const closeBtn = document.getElementById('cb-ico-modal-close');
    const backdrop = modal;

    if (!modal) return;

    // Show modal
    window.openICOModal = function() {
      modal.classList.add('show');
      document.body.classList.add('cb-trust-no-scroll');
      
      // Focus trap
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    // Hide modal
    function hideModal() {
      modal.classList.remove('show');
      document.body.classList.remove('cb-trust-no-scroll');
    }

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', hideModal);
    }

    // Backdrop click
    if (backdrop) {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          hideModal();
        }
      });
    }

    // Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('show')) {
        hideModal();
      }
    });

    // Focus trap
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initICOModal);
  } else {
    initICOModal();
  }

})();
