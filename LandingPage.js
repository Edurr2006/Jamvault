/**
 * LandingPage.js
 * Scroll-reveal using IntersectionObserver.
 * Elements with class "reveal" animate in when entering the viewport
 * and animate back out when leaving.
 */
(function () {
  'use strict';

  const THRESHOLD = 0.2; // 20% of section visible triggers animation

  function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            // Element entering viewport — show it
            el.classList.add('visible');
            el.classList.remove('hidden');
          } else {
            // Element leaving viewport — hide it for re-animation on scroll back
            if (el.classList.contains('visible')) {
              el.classList.remove('visible');
              el.classList.add('hidden');
            }
          }
        });
      },
      {
        threshold: THRESHOLD,
        rootMargin: '0px 0px -120px 0px', // must scroll section 120px into view before firing
      }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();
