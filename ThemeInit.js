/**
 * JamVault Theme Initializer ⚡
 * Runs in the <head> to prevent Theme Flicker (FOUC).
 */
(function () {
    const theme = localStorage.getItem('theme') || 'JamVault';
    document.documentElement.className = theme;
})();
