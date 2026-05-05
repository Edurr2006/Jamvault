/**
 * LandingPage.js
 * Scroll-reveal using IntersectionObserver.
 * Elements with class "reveal" animate in when entering the viewport
 * and animate back out when leaving.
 * Also updates the welcome greeting with the logged-in username.
 */
(function () {
  'use strict';

  const THRESHOLD = 0.2; // 20% of section visible triggers animation

  // ---------- Scroll reveal ----------

  function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add('visible');
            el.classList.remove('hidden');
          } else {
            if (el.classList.contains('visible')) {
              el.classList.remove('visible');
              el.classList.add('hidden');
            }
          }
        });
      },
      {
        threshold: THRESHOLD,
        rootMargin: '0px 0px -120px 0px',
      }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // ---------- Welcome greeting ----------

  function setWelcomeUsername(user) {
    const el = document.getElementById('welcome-username');
    if (!el) return;
    el.textContent = user && user.username ? user.username : 'usuario';
  }

  function initWelcome() {
    // If Auth.js already resolved before us, window.jamvaultUser is set
    setWelcomeUsername(window.jamvaultUser || null);

    // Listen for auth state changes fired by Auth.js
    window.addEventListener('jamvault:auth_changed', (e) => {
      setWelcomeUsername(e.detail);
    });
  }

  // ---------- Bootstrap ----------

  function init() {
    initReveal();
    initWelcome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
