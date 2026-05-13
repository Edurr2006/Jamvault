// theme.js
document.addEventListener("DOMContentLoaded", () => {
  const themes = ["JamVault", "natural", "galactic", "retro", "vintage", "redblack"];
  let savedTheme = localStorage.getItem("theme");
  let currentTheme = themes.includes(savedTheme) ? savedTheme : "JamVault";

  // Función global para aplicar un tema específico
  window.applyTheme = function (newTheme) {
    // Aplicar tanto a HTML (para velocidad/CSS) como a Body (para compatibilidad/JS)
    document.documentElement.className = newTheme;

    document.body.classList.remove(...themes);
    document.body.classList.add(newTheme);
    currentTheme = newTheme;
    localStorage.setItem("theme", newTheme);

    const button = document.getElementById("toggleTheme");
    if (button) {
      button.innerHTML = '<i class="fas fa-palette"></i>';
      button.title = "Cambiar Tema (" + newTheme + ")";
    }

    // Sincronizar otros componentes
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    console.log(`Theme switched to: ${newTheme}`);
  };

  // Aplicación inicial
  window.applyTheme(currentTheme);

  const button = document.getElementById("toggleTheme");
  if (button) {
    button.onclick = function () {
      if (typeof window.showThemeModal === 'function') {
        window.showThemeModal(currentTheme, window.applyTheme);
      } else {
        // Fallback si Toast.js no está cargado (poco probable)
        let index = themes.indexOf(currentTheme);
        let next = themes[index + 1] || themes[0];
        window.applyTheme(next);
      }
    };
  }
});
