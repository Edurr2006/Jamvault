// theme.js
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const button = document.getElementById("toggleTheme");
  const themes = ["JamVault-Original", "natural", "galactic", "retro", "vintage", "redblack"];

  // Quitar cualquier clase de tema previa que se haya quedado "atascada"
  body.classList.remove(...themes);

  // Recuperar el tema guardado o usar uno por defecto
  let theme = localStorage.getItem("theme") || "JamVault-Original";
  body.classList.add(theme);

  if (button) {
    button.textContent = "Cambiar Tema (" + theme + ")";
    button.onclick = function() {
      // Asegurar que no se mezclen temas antiguos
      body.classList.remove(...themes);

      // Calcular el siguiente tema
      let index = themes.indexOf(theme);
      let next = themes[index + 1] || themes[0];

      // Aplicar el nuevo tema
      body.classList.add(next);
      button.textContent = "Cambiar Tema (" + next + ")";
      theme = next;

      // Guardar el tema actual
      localStorage.setItem("theme", theme);
    };
  }
});
