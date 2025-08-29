// Shared Countdown Timer Component
class CountdownTimer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.interval = null;
    this.init();
  }

  init() {
    if (!this.container) {
      console.error(`Countdown container with ID '${this.containerId}' not found`);
      return;
    }
    
    this.updateCountdown();
    this.interval = setInterval(() => this.updateCountdown(), 1000);
  }

  getNextSundayMidnight() {
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  }

  updateCountdown() {
    const now = new Date();
    const nextReset = this.getNextSundayMidnight();
    const timeLeft = nextReset - now;

    if (timeLeft <= 0) {
      // Reset just happened, show 0 time
      this.container.innerHTML = '<span class="countdown-timer">⏳ Next reset in: 0d 0h 0m 0s</span>';
      return;
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    this.container.innerHTML = `
      <span class="countdown-timer">
        ⏳ Next reset in: 
        <span class="countdown-digit">${days}d</span> 
        <span class="countdown-digit">${hours.toString().padStart(2, '0')}h</span> 
        <span class="countdown-digit">${minutes.toString().padStart(2, '0')}m</span> 
        <span class="countdown-digit">${seconds.toString().padStart(2, '0')}s</span>
      </span>
    `;

    // Add pulse animation to seconds digit when it changes
    const secondsDigit = this.container.querySelector('.countdown-digit:last-child');
    if (secondsDigit) {
      secondsDigit.style.animation = 'none';
      setTimeout(() => {
        secondsDigit.style.animation = 'pulse 0.5s ease-in-out';
      }, 10);
    }
  }

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Auto-initialize countdown timers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize countdown for sidebar
  if (document.getElementById('sidebar-countdown')) {
    window.sidebarCountdown = new CountdownTimer('sidebar-countdown');
  }
  
  // Initialize countdown for leaderboard page
  if (document.getElementById('leaderboard-countdown')) {
    window.leaderboardCountdown = new CountdownTimer('leaderboard-countdown');
  }
});

// Export for manual initialization
window.CountdownTimer = CountdownTimer;
