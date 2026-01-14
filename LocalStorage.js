// theme.js
document.addEventListener("DOMContentLoaded", () => {
  const themes = ["JamVault", "natural", "galactic", "retro", "vintage", "redblack"];
  let currentTheme = localStorage.getItem("theme") || "JamVault";

  // Global function to apply a specific theme
  window.applyTheme = function (newTheme) {
    // Apply to both HTML (for speed/CSS) and Body (for compatibility/JS)
    document.documentElement.className = newTheme;

    document.body.classList.remove(...themes);
    document.body.classList.add(newTheme);
    currentTheme = newTheme;
    localStorage.setItem("theme", newTheme);

    const button = document.getElementById("toggleTheme");
    if (button) {
      button.textContent = "Cambiar Tema (" + newTheme + ")";
    }

    // Sync other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    console.log(`Theme switched to: ${newTheme}`);
  };

  // Initial application
  window.applyTheme(currentTheme);

  const button = document.getElementById("toggleTheme");
  if (button) {
    button.onclick = function () {
      if (typeof window.showThemeModal === 'function') {
        window.showThemeModal(currentTheme, window.applyTheme);
      } else {
        // Fallback if Toast.js isn't loaded (unlikely)
        let index = themes.indexOf(currentTheme);
        let next = themes[index + 1] || themes[0];
        window.applyTheme(next);
      }
    };
  }
});
