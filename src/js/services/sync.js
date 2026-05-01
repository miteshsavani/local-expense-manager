/* ================================================================
   SYNC MANAGER — incremental delta sync with lock + timeout + retry
   ================================================================ */
window.syncManager = (() => {
  let _debounceTimer = null;
  const DEBOUNCE_MS  = 2500;
  const MAX_RETRIES  = 3;

  /* Called after every local mutation */
  function onDataChanged() {
    STATE.pendingChanges = true;
    localCacheManager.saveGroups();
    localCacheManager.saveSettings();
    networkManager.updateSyncPill();
    uiManager.updatePendingBanner();
    
    // Only queue immediate auto-sync if:
    // 1. User is not guest
    // 2. Sync is enabled
    // 3. AUTO BACKUP IS DISABLED (if enabled, the scheduler handles it)
    if (!STATE.isGuest && STATE.syncEnabled && !STATE.backupEnabled) {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(syncNow, DEBOUNCE_MS);
    }
  }

  /* Main incremental sync — push dirty changes */
  async function syncNow(isManual = false) {
    if (STATE.isSyncing) { 
      if (isManual) showToast('Sync already in progress', 'info');
      return; 
    }
    if (!STATE.user || STATE.isGuest) return;
    if (!STATE.syncEnabled) { 
      if (isManual) showToast('Sync is disabled', 'warning');
      networkManager.updateSyncPill(); 
      return; 
    }

    backupScheduler.resetCountdown();
    if (!navigator.onLine) { networkManager.updateSyncPill(); return; }

    const hasDirty = STATE.groups.some(g => g.isDirty || g.deletedFlag ||
      g.transactions.some(tx => tx.isDirty || tx.deletedFlag));
    
    if (!hasDirty && !STATE.pendingChanges) {
      STATE.pendingChanges = false;
      networkManager.setSyncStatus('synced');
      return;
    }

    STATE.isSyncing  = true;
    STATE.syncRetries = STATE.syncRetries || 0;
    _setSyncBar(true);
    _hideError();
    networkManager.setSyncStatus('syncing');

    try {
      await firebaseService.pushChanges(STATE.user.uid);
      _clearDirtyFlags();
      STATE.pendingChanges = false;
      STATE.lastSyncAt     = new Date().toISOString();
      STATE.syncRetries    = 0;
      localCacheManager.saveGroups();
      uiManager.updatePendingBanner();
      
      if (isManual) showToast('Synced ✓', 'success', 2000);

    } catch(err) {
      console.error('[push error]', err);
      STATE.syncRetries++;
      if (STATE.syncRetries <= MAX_RETRIES) {
        setTimeout(syncNow, STATE.syncRetries * 5000);
      } else {
        _showError('Sync failed. Click Retry.');
        networkManager.setSyncStatus('error');
      }
    } finally {
      STATE.isSyncing = false;
      _setSyncBar(false);
      networkManager.updateSyncPill();
    }
  }

  /* Listeners */
  function startListeners() {
    if (!STATE.user || STATE.isGuest || !STATE.syncEnabled) return;
    stopListeners();

    // 1. Listen to Groups
    const unsubGroups = firebaseService.listenToGroups(STATE.user.uid, remoteGroups => {
      _resolveGroups(remoteGroups);
      renderDashboard();
    });
    STATE.listeners.push(unsubGroups);

    // 2. Initial transactions listener if group is active
    if (STATE.activeGroupId) watchGroupTransactions(STATE.activeGroupId);
  }

  function stopListeners() {
    STATE.listeners.forEach(unsub => unsub());
    STATE.listeners = [];
  }

  function watchGroupTransactions(gid) {
    // Unsubscribe from previous tx listener if any (except the group listener)
    if (STATE.listeners.length > 1) {
      STATE.listeners[1]();
      STATE.listeners.splice(1, 1);
    }

    const unsubTx = firebaseService.listenToTransactions(gid, remoteTxs => {
      _resolveTransactions(gid, remoteTxs);
      if (STATE.activeGroupId === gid) renderGroup();
    });
    STATE.listeners.push(unsubTx);

    permissionManager.watchActivePermissions(gid);
  }

  function _resolveGroups(remoteGroups) {
    const localMap = new Map(STATE.groups.map(g => [g.id, g]));
    
    remoteGroups.forEach(rg => {
      if (!localMap.has(rg.id)) {
        // New remote group
        STATE.groups.push({ ...rg, transactions: [], isDirty: false });
      } else {
        const lg = localMap.get(rg.id);
        if (!lg.isDirty || _toMs(rg.updatedAt) > _toMs(lg.updatedAt)) {
          // Update metadata only, preserve local transactions
          lg.name = rg.name;
          lg.members = rg.members;
          lg.userIds = rg.userIds;
          lg.roles = rg.roles;
          lg.shareCode = rg.shareCode;
          lg.updatedAt = rg.updatedAt;
          lg.isDirty = false;
        }
      }
    });

    // Remove groups that are no longer in remote (unless they are local-only/dirty)
    const remoteIds = new Set(remoteGroups.map(g => g.id));
    STATE.groups = STATE.groups.filter(g => remoteIds.has(g.id) || g.isDirty);
    
    localCacheManager.saveGroups();
  }

  function _resolveTransactions(gid, remoteTxs) {
    const g = STATE.groups.find(g => g.id === gid);
    if (!g) return;

    const localTxMap = new Map(g.transactions.map(t => [t.id, t]));
    
    remoteTxs.forEach(rt => {
      const isNew = !localTxMap.has(rt.id);
      const lt = localTxMap.get(rt.id);
      
      if (isNew) {
        localTxMap.set(rt.id, { ...rt, isDirty: false });
      } else {
        // Only overwrite if remote is newer and local is NOT dirty
        if (!lt.isDirty || _toMs(rt.updatedAt) > _toMs(lt.updatedAt)) {
          localTxMap.set(rt.id, { ...rt, isDirty: false });
        }
      }
    });

    // Handle remote deletions
    const remoteIds = new Set(remoteTxs.map(t => t.id));
    g.transactions = [...localTxMap.values()].filter(t => remoteIds.has(t.id) || t.isDirty);
    
    localCacheManager.saveGroups();
  }

  /* Initial load on sign-in */
  async function initialLoad() {
    if (!STATE.user || STATE.isGuest) return;
    if (!STATE.syncEnabled || !navigator.onLine) return;
    
    startListeners();
    STATE.pendingChanges = false;
  }

  /* After successful sync, clear all isDirty flags */
  function _clearDirtyFlags() {
    STATE.groups.forEach(g => {
      g.isDirty = false;
      g.transactions.forEach(tx => { tx.isDirty = false; });
    });
  }

  function _toMs(ts) {
    if (!ts) return 0;
    if (ts?.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime() || 0;
  }

  function _setSyncBar(on) {
    document.getElementById('sync-bar').classList.toggle('active', on);
  }
  function _showError(msg) {
    const bar = document.getElementById('sync-err-bar');
    const msgEl = document.getElementById('sync-err-msg');
    if (bar && msgEl) { msgEl.textContent = msg; bar.classList.remove('hidden'); }
  }
  function _hideError() {
    const bar = document.getElementById('sync-err-bar');
    if (bar) bar.classList.add('hidden');
  }

  return { onDataChanged, syncNow, initialLoad, startListeners, stopListeners, watchGroupTransactions };
})();

window.backupScheduler = (() => {
  let _tickerId = null;
  let _countdown = 0;

  function start() {
    stop();
    if (!STATE.backupEnabled || STATE.isGuest || !STATE.syncEnabled) {
      document.getElementById('sync-countdown-ui').classList.add('hidden');
      return;
    }
    resetCountdown();
    _tickerId = setInterval(_tick, 1000);
    document.getElementById('sync-countdown-ui').classList.remove('hidden');
  }

  function _tick() {
    if (_countdown > 0) {
      _countdown--;
      _updateUI();
    } else {
      if (STATE.pendingChanges && navigator.onLine && !STATE.isSyncing) {
        syncManager.syncNow();
      } else {
        resetCountdown(); // Reset if nothing to sync or offline
      }
    }
  }

  function _updateUI() {
    const el = document.getElementById('sync-countdown-ui');
    if (el) el.textContent = `Next: ${_countdown}s`;
  }

  function resetCountdown() {
    _countdown = STATE.backupInterval || 120;
    _updateUI();
  }

  function stop() { 
    if (_tickerId) { clearInterval(_tickerId); _tickerId = null; } 
    const el = document.getElementById('sync-countdown-ui');
    if (el) el.classList.add('hidden');
  }

  function restart() { stop(); start(); }

  return { start, stop, restart, resetCountdown };
})();

