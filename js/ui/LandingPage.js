/**
 * LandingPage.js
 * Revelado al hacer scroll mediante IntersectionObserver.
 * Los elementos con la clase "reveal" se animan al entrar en el viewport
 * y se desaniman al salir.
 * También actualiza el saludo de bienvenida con el nombre del usuario logueado.
 */
(function () {
  'use strict';

  const THRESHOLD = 0.2; // El 20% de la sección visible activa la animación

  // ---------- Revelado al hacer scroll ----------

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

  // ---------- Saludo de bienvenida ----------

  function setWelcomeUsername(user) {
    const el = document.getElementById('welcome-username');
    if (!el) return;
    el.textContent = user && user.username ? user.username : 'usuario';
  }

  function initWelcome() {
    // Si Auth.js ya se resolvió antes que nosotros, window.jamvaultUser ya estará establecido
    setWelcomeUsername(window.jamvaultUser || null);

    // Escuchar cambios de estado de autenticación disparados por Auth.js
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
