/* ================================================================
   LOCAL CACHE MANAGER
   All LocalStorage I/O. Scoped per user.
   ================================================================ */
const localCacheManager = (() => {
  // Scope localStorage per user; guests use 'guest' namespace
  const K = s => `se_${STATE.isGuest ? 'guest' : (STATE.user?.uid||'anon')}_${s}`;

  function saveGroups() {
    try { localStorage.setItem(K('groups'), JSON.stringify(STATE.groups)); }
    catch(e) { showToast('Storage full — cannot save locally', 'error'); }
  }

  function loadGroups() {
    try {
      const r = localStorage.getItem(K('groups'));
      return r ? JSON.parse(r) : [];
    } catch { return []; }
  }

  function saveSettings() {
    try {
      localStorage.setItem(K('settings'), JSON.stringify({
        darkMode: STATE.darkMode, fontFamily: STATE.fontFamily,
        backupEnabled: STATE.backupEnabled, backupInterval: STATE.backupInterval,
        lastSyncAt: STATE.lastSyncAt, syncEnabled: STATE.syncEnabled
      }));
    } catch {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(K('settings'));
      if (!raw) { if (window.applyFont) window.applyFont('DM Sans'); return; }
      const s = JSON.parse(raw);
      STATE.darkMode       = s.darkMode       ?? false;
      STATE.fontFamily     = s.fontFamily     ?? 'DM Sans';
      STATE.backupEnabled  = s.backupEnabled  ?? false;
      STATE.backupInterval = s.backupInterval ?? 120;
      STATE.lastSyncAt     = s.lastSyncAt     ?? null;
      STATE.syncEnabled    = s.syncEnabled    ?? true;
      if (window.applyFont) window.applyFont(STATE.fontFamily);
    } catch {}
  }

  function isBannerDismissed() {
    try { return localStorage.getItem('se_safety_dismissed') === '1'; } catch { return false; }
  }
  function dismissBanner() {
    try { localStorage.setItem('se_safety_dismissed', '1'); } catch {} }

  return { saveGroups, loadGroups, saveSettings, loadSettings, isBannerDismissed, dismissBanner };
})();

