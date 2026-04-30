/* ================================================================
   DARK MODE + FONTS
   ================================================================ */

window.setDarkMode = on => {
  STATE.darkMode = on;
  document.documentElement.classList.toggle('dark', STATE.darkMode);
  localCacheManager.saveSettings();
  uiManager.toggleAccountDropdown();
}

window.applyFont = (val) => {
  if (!val) val = 'DM Sans';
  if (val !== 'system-ui') {
    const id = 'font-' + val.replace(/\s+/g, '-');
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${val.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }
  document.documentElement.style.setProperty('--font-body', `"${val}", 'Segoe UI', sans-serif`);
};
window._changeFont = (val) => {
  STATE.fontFamily = val;
  localCacheManager.saveSettings();
  applyFont(val);
};

