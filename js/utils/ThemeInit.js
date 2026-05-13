/**
 * JamVault Theme Initializer ⚡
 * Runs in the <head> to prevent Theme Flicker (FOUC).
 */
(function () {
    const themes = ["JamVault", "natural", "galactic", "retro", "vintage", "redblack"];
    const savedTheme = localStorage.getItem('theme');
    const theme = themes.includes(savedTheme) ? savedTheme : 'JamVault';
    document.documentElement.className = theme;
})();
