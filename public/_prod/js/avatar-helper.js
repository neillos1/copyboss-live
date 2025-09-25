// Unified Avatar Helper Function
// This ensures consistent avatar rendering across all pages

/**
 * Get avatar URL with fallback to default image
 * @param {Object} user - User object with optional avatar_url
 * @returns {string} Avatar URL with cache busting
 */
function getAvatarUrl(user) {
  const defaultAvatar = '/assets/img/default-avatar.svg?v=3';
  return user?.avatar_url ? user.avatar_url : defaultAvatar;
}

/**
 * Create avatar image element with proper fallback
 * @param {Object} user - User object with optional avatar_url
 * @param {string} className - CSS classes for the image
 * @param {string} alt - Alt text for the image
 * @returns {string} HTML string for avatar image
 */
function createAvatarImg(user, className = '', alt = 'User avatar') {
  const avatarUrl = getAvatarUrl(user);
  return `<img class="avatar-img ${className}" src="${avatarUrl}" alt="${alt}" onerror="this.src='/assets/img/default-avatar.png?v=3'">`;
}

/**
 * Replace any text content or icon elements with proper avatar image
 * @param {HTMLElement} container - Container element that should contain avatar
 * @param {Object} user - User object with optional avatar_url
 * @param {string} className - CSS classes for the image
 */
function replaceAvatarContent(container, user, className = '') {
  if (!container) return;
  
  // Remove any text content that might be "?"
  if (container.textContent === '?' || container.innerText === '?') {
    container.textContent = '';
    container.innerText = '';
  }
  
  // Remove any <i> elements that might be FontAwesome icons
  const iconElements = container.querySelectorAll('i');
  iconElements.forEach(icon => {
    if (icon.textContent === '?' || icon.innerText === '?') {
      icon.remove();
    }
  });
  
  // Create and insert avatar image
  const avatarImg = document.createElement('img');
  avatarImg.className = `avatar-img ${className}`;
  avatarImg.src = getAvatarUrl(user);
  avatarImg.alt = 'User avatar';
  avatarImg.onerror = function() {
    this.src = '/assets/img/default-avatar.svg?v=3';
  };
  
  // Clear container and add image
  container.innerHTML = '';
  container.appendChild(avatarImg);
}

/**
 * Ensure all avatar elements on the page use proper image fallbacks
 */
function ensureAvatarFallbacks() {
  // Common avatar selectors
  const selectors = [
    '.avatar-btn',
    '.cb-avatar-holder',
    '.avatar-dropdown',
    '.user-profile',
    '.user-rank-sticky',
    '.leaderboard-item',
    '.user-info'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // Check if element contains "?" text
      if (element.textContent === '?' || element.innerText === '?') {
        console.log('Found "?" text in avatar element:', element);
        // Try to get user data from global state or make a request
        const user = window.currentUser || null;
        replaceAvatarContent(element, user, 'w-8 h-8 rounded-full object-cover');
      }
    });
  });
}

// Export functions for use in other scripts
window.getAvatarUrl = getAvatarUrl;
window.createAvatarImg = createAvatarImg;
window.replaceAvatarContent = replaceAvatarContent;
window.ensureAvatarFallbacks = ensureAvatarFallbacks;
