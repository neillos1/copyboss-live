// auth.js - Unified authentication system for CopyBoss with Avatar Support

// Loading overlay functions
const overlay = document.getElementById("loadingOverlay");
function showOverlay() { if (overlay) overlay.classList.remove("hidden"); }
function hideOverlay() { if (overlay) overlay.classList.add("hidden"); }

// Check if user is logged in (session-based with localStorage fallback)
async function isLoggedIn() {
  try {
    // First check if we have a token in localStorage
    const token = localStorage.getItem('videobossToken');
    if (!token) {
      return false;
    }

    // Verify token with server
    const response = await fetch('/api/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      return true;
    } else {
      // Token is invalid, clear localStorage
      localStorage.removeItem('videobossUser');
      localStorage.removeItem('videobossToken');
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    // On network error, check localStorage as fallback
    const user = localStorage.getItem('videobossUser');
    const token = localStorage.getItem('videobossToken');
    return !!(user && token);
  }
}

// Get current user data
async function getCurrentUser() {
  try {
    const token = localStorage.getItem('videobossToken');
    if (!token) {
      return null;
    }

    const response = await fetch('/api/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update localStorage with fresh user data
      localStorage.setItem('videobossUser', JSON.stringify(data.user));
      return data.user;
    }
    
    // If server request fails, try localStorage
    const userData = localStorage.getItem('videobossUser');
    if (userData) {
      return JSON.parse(userData);
    }
    
    return null;
  } catch (error) {
    console.error('Get user error:', error);
    // Fallback to localStorage
    const userData = localStorage.getItem('videobossUser');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  }
}

// Logout function
async function logout() {
  try {
    // Clear session on server
    const token = localStorage.getItem('videobossToken');
    if (token) {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.error('Server logout error:', error);
  }
  
  // Clear localStorage
  localStorage.removeItem('videobossUser');
  localStorage.removeItem('videobossToken');
  
  // Immediately update navbar to show Login/Sign Up
  await updateNavbar();
  
  // Redirect to homepage
  window.location.href = 'index.html';
}

// Update navbar based on authentication status
async function updateNavbar() {
  const navbar = document.querySelector('.navbar-nav');
  if (!navbar) return;
  
  const isUserLoggedIn = await isLoggedIn();
  
  if (isUserLoggedIn) {
    // User is logged in - show avatar dropdown
    const user = await getCurrentUser();
    const avatarUrl = user?.avatar_url || '/assets/img/default-avatar.png';
    
    navbar.innerHTML = `
      <a href="/index.html" class="text-gray-300 hover:text-white transition-colors duration-200">Home</a>
      <a href="/analyzer.html" class="text-gray-300 hover:text-white transition-colors duration-200">Analyzer</a>
      <a href="/generator.html" class="text-gray-300 hover:text-white transition-colors duration-200">Generator</a>
      <a href="/pricing.html" class="text-gray-300 hover:text-white transition-colors duration-200">Pricing</a>
      <a href="https://copy-boss.com/community/" class="text-gray-300 hover:text-white transition-colors duration-200">Community Hub</a>
      <div class="avatar-dropdown relative ml-auto">
        <button id="avatarBtn" class="avatar-btn flex items-center">
          <img src="${avatarUrl}" alt="User Avatar" class="w-8 h-8 rounded-full object-cover border-2 border-gray-600 hover:border-blue-400 transition-colors duration-200">
        </button>
        <div id="avatarDropdown" class="avatar-dropdown-menu hidden absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-xl z-50">
          <div class="py-2">
            <a href="/affiliate-dashboard.html" class="dropdown-item">
              <i class="fas fa-users mr-3"></i>Affiliate Program
            </a>
            <label for="avatarUpload" class="dropdown-item cursor-pointer">
              <i class="fas fa-camera mr-3"></i>Upload Avatar
            </label>
            <input type="file" id="avatarUpload" accept="image/*" class="hidden" onchange="uploadAvatar(this)">
            <hr class="border-gray-700 my-2">
            <a href="#" onclick="logout()" class="dropdown-item text-red-400 hover:text-red-300">
              <i class="fas fa-sign-out-alt mr-3"></i>Logout
            </a>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners for avatar dropdown
    const avatarBtn = document.getElementById('avatarBtn');
    const avatarDropdown = document.getElementById('avatarDropdown');
    
    if (avatarBtn && avatarDropdown) {
      avatarBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        avatarDropdown.classList.toggle('hidden');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!avatarBtn.contains(e.target) && !avatarDropdown.contains(e.target)) {
          avatarDropdown.classList.add('hidden');
        }
      });
    }
  } else {
    // User is not logged in - show Login and Sign Up
    navbar.innerHTML = `
      <a href="/index.html" class="text-gray-300 hover:text-white transition-colors duration-200">Home</a>
      <a href="/analyzer.html" class="text-gray-300 hover:text-white transition-colors duration-200">Analyzer</a>
      <a href="/generator.html" class="text-gray-300 hover:text-white transition-colors duration-200">Generator</a>
      <a href="/pricing.html" class="text-gray-300 hover:text-white transition-colors duration-200">Pricing</a>
      <a href="https://copy-boss.com/community/" class="text-gray-300 hover:text-white transition-colors duration-200">Community Hub</a>
      <a href="/login.html" class="text-gray-300 hover:text-white transition-colors duration-200 ml-auto">Login</a>
      <a href="/signup.html" class="text-gray-300 hover:text-white transition-colors duration-200">Sign Up</a>
    `;
  }
}

// Upload avatar function
async function uploadAvatar(input) {
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  const formData = new FormData();
  formData.append('avatar', file);
  
  try {
    const token = localStorage.getItem('videobossToken');
    const response = await fetch('/api/upload-avatar', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update avatar image in navbar
      const avatarImg = document.querySelector('.avatar-btn img');
      if (avatarImg) {
        avatarImg.src = data.avatarUrl + '?t=' + Date.now(); // Cache bust
      }
      
      // Update user data in localStorage
      const userData = localStorage.getItem('videobossUser');
      if (userData) {
        const user = JSON.parse(userData);
        user.avatar_url = data.avatarUrl;
        localStorage.setItem('videobossUser', JSON.stringify(user));
      }
      
      // Show success message
      showToast('Avatar uploaded successfully!', 'success');
    } else {
      showToast(data.error || 'Failed to upload avatar', 'error');
    }
  } catch (error) {
    console.error('Avatar upload error:', error);
    showToast('Error uploading avatar', 'error');
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-full`;
  
  if (type === 'success') {
    toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  } else if (type === 'error') {
    toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } else {
    toast.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(full)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Redirect to login if not authenticated (for protected pages)
async function requireAuth() {
  const isUserLoggedIn = await isLoggedIn();
  if (!isUserLoggedIn) {
    window.location.href = '/login.html';
  }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
  // Update navbar
  updateNavbar();
  
  // Check if we're on a protected page (analyzer.html is now always accessible)
  const protectedPages = ['affiliate-dashboard.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    requireAuth();
  }
});

// Legacy compatibility functions
function getCurrentUserLegacy() {
  return localStorage.getItem('videobossUser');
}

// Export functions for use in other scripts
window.auth = {
  isLoggedIn,
  getCurrentUser,
  logout,
  updateNavbar,
  requireAuth,
  getCurrentUserLegacy,
  uploadAvatar,
  showToast
};
