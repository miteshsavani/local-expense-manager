/* ================================================================
   NETWORK MANAGER
   ================================================================ */
window.networkManager = (() => {

  function init() {
    window.addEventListener('online', () => {
      document.getElementById('offline-banner').classList.add('hidden');
      _updateSyncNowButton();
      if (!STATE.isGuest && STATE.syncEnabled) {
        showToast('Back online — syncing…', 'info', 2000);
        if (STATE.user && STATE.pendingChanges) syncManager.syncNow();
      }
      updateSyncPill();
    });
    window.addEventListener('offline', () => {
      document.getElementById('offline-banner').classList.remove('hidden');
      _updateSyncNowButton();
      showToast('Offline — changes saved locally', 'warning', 3000);
      setSyncStatus('offline');
    });
    document.getElementById('offline-banner').classList.toggle('hidden', navigator.onLine);
    _updateSyncNowButton();
    updateSyncPill();
  }

  /* Feature #2: Disable Sync Now button when offline */
  function _updateSyncNowButton() {
    const btn = document.getElementById('hdr-sync-now-btn');
    if (!btn) return;
    const isOffline = !navigator.onLine;
    btn.disabled = isOffline || !STATE.syncEnabled;
    btn.classList.toggle('disabled-offline', isOffline);
    if (isOffline) {
      btn.setAttribute('data-tip', 'Offline — cannot sync');
    } else if (!STATE.syncEnabled) {
      btn.setAttribute('data-tip', 'Sync is disabled');
    } else {
      btn.setAttribute('data-tip', 'Sync Now');
    }
  }

  function setSyncStatus(status) {
    const pill  = document.getElementById('sync-pill');
    const label = document.getElementById('sync-label');
    if (!pill || !label) return;
    const ago  = STATE.lastSyncAt ? _ago(STATE.lastSyncAt) : null;
    const map  = {
      synced:  ago ? `✓ ${ago}` : '✓ Synced',
      pending: '● Pending',
      offline: '○ Offline',
      syncing: '↻ Syncing…',
      error:   '✕ Sync error',
      local:   'Local only',
      nothing: '✓ Nothing to sync'
    };
    pill.className  = 'sync-pill ' + status;
    label.textContent = map[status] || status;
  }

  function updateSyncPill() {
    if (STATE.isGuest) return; // no pill for guest
    _updateSyncNowButton();
    _updateSyncBanners();
    if (!navigator.onLine)     return setSyncStatus('offline');
    if (!STATE.user)           return setSyncStatus('local');
    if (!STATE.syncEnabled)    return setSyncStatus('local');
    if (STATE.isSyncing)       return setSyncStatus('syncing');
    if (STATE.pendingChanges)  return setSyncStatus('pending');
    return setSyncStatus('synced');
  }

  /* Feature #4 & #5: Update sync disabled + data safety banners */
  function _updateSyncBanners() {
    const disabledBanner = document.getElementById('sync-disabled-banner');
    const safetyBanner = document.getElementById('sync-off-safety-banner');
    if (!disabledBanner || !safetyBanner) return;

    const showBanners = STATE.user && !STATE.isGuest && !STATE.syncEnabled;
    disabledBanner.classList.toggle('hidden', !showBanners);
    safetyBanner.classList.toggle('hidden', !showBanners);
  }

  function _ago(iso) {
    const s = Math.round((Date.now() - new Date(iso)) / 1000);
    if (s < 10)    return 'just now';
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    const d = Math.floor(s/86400);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  }

  return { init, setSyncStatus, updateSyncPill };
})();

