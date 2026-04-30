/* ================================================================
   SYNC MANAGER — incremental delta sync with lock + timeout + retry
   ================================================================ */
window.syncManager = (() => {
  let _debounceTimer = null;
  let _syncTimeout   = null;
  const DEBOUNCE_MS  = 2500;
  const TIMEOUT_MS   = 20000;
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

  /* Main incremental sync — push dirty, pull changed */
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

    // Always reset countdown at the start of a sync attempt
    backupScheduler.resetCountdown();
    if (!navigator.onLine) { networkManager.updateSyncPill(); return; }

    // Check if there is anything to sync
    const hasDirty = STATE.groups.some(g => g.isDirty || g.deletedFlag ||
      g.transactions.some(tx => tx.isDirty || tx.deletedFlag));
    if (!hasDirty && !STATE.pendingChanges) {
      // Nothing to push — still pull to stay current
      STATE.pendingChanges = false;
      networkManager.setSyncStatus('synced');
      return;
    }

    STATE.isSyncing  = true;
    STATE.syncRetries = STATE.syncRetries || 0;
    _setSyncBar(true);
    _hideError();
    networkManager.setSyncStatus('syncing');

    const timeoutPromise = new Promise((_, rej) => {
      _syncTimeout = setTimeout(() => rej(new Error('SYNC_TIMEOUT')), TIMEOUT_MS);
    });

    try {
      await Promise.race([_doSync(), timeoutPromise]);
      clearTimeout(_syncTimeout);

      // Success — clear dirty flags
      _clearDirtyFlags();
      STATE.pendingChanges = false;
      STATE.lastSyncAt     = new Date().toISOString();
      STATE.syncRetries    = 0;
      localCacheManager.saveGroups();
      localCacheManager.saveSettings();
      uiManager.updatePendingBanner();
      
      // Re-render UI to remove localized sync badges
      if (typeof renderDashboard === 'function' && document.getElementById('view-dashboard')?.classList.contains('active')) renderDashboard();
      if (typeof renderGroup === 'function' && STATE.activeGroupId) renderGroup();
      
      showToast('Synced ✓', 'success', 2000);

    } catch(err) {
      clearTimeout(_syncTimeout);
      console.error('[sync error]', err);
      STATE.syncRetries++;

      if (STATE.syncRetries <= MAX_RETRIES) {
        const delay = STATE.syncRetries * 5000;
        _showError(`Sync failed (attempt ${STATE.syncRetries}/${MAX_RETRIES}) — retrying in ${delay/1000}s`);
        networkManager.setSyncStatus('error');
        setTimeout(syncNow, delay);
      } else {
        STATE.syncRetries = 0;
        _showError('Sync failed after 3 attempts. Data is safe locally. Click Retry.');
        networkManager.setSyncStatus('error');
      }
    } finally {
      STATE.isSyncing = false;
      _setSyncBar(false);
      networkManager.updateSyncPill();
    }
  }

  async function _doSync() {
    const uid = STATE.user.uid;

    // 1. PUSH dirty local changes first
    await firebaseService.pushChanges(uid);

    // 2. PULL changes from server since last sync
    const changed = await firebaseService.pullChanges(uid, STATE.lastSyncAt);

    // 3. Merge pulled changes into local state
    resolveConflicts(changed);

    // 4. Remove locally-deleted groups from state array (they've been pushed)
    STATE.groups = STATE.groups.filter(g => !g.deletedFlag);
  }

  /* Merge remote changes into local state */
  function resolveConflicts(remoteGroups) {
    const localMap = new Map(STATE.groups.map(g => [g.id, g]));

    for (const rg of remoteGroups) {
      if (!localMap.has(rg.id)) {
        // Brand new group from remote
        const { _changedTransactions, ...meta } = rg;
        STATE.groups.push({
          ...meta,
          transactions: (_changedTransactions||[]).filter(t => !t.deletedFlag),
          isDirty: false
        });
      } else {
        const lg = localMap.get(rg.id);

        // Resolve group metadata: last updatedAt wins
        const rTs = _toMs(rg.updatedAt);
        const lTs = _toMs(lg.updatedAt);
        if (rTs > lTs) {
          lg.name    = rg.name;
          lg.members = rg.members;
          lg.updatedAt = rg.updatedAt;
          lg.isDirty = false;
        }

        // Merge transactions
        const localTxMap = new Map(lg.transactions.map(t => [t.id, t]));
        for (const rt of (rg._changedTransactions||[])) {
          if (rt.deletedFlag) {
            // Remote deletion — remove locally unless local is newer
            const lt = localTxMap.get(rt.id);
            if (!lt || _toMs(rt.updatedAt) >= _toMs(lt.updatedAt)) {
              localTxMap.delete(rt.id);
            }
          } else if (!localTxMap.has(rt.id)) {
            localTxMap.set(rt.id, { ...rt, isDirty: false });
          } else {
            const lt = localTxMap.get(rt.id);
            if (_toMs(rt.updatedAt) > _toMs(lt.updatedAt) && !lt.isDirty) {
              localTxMap.set(rt.id, { ...rt, isDirty: false });
            }
          }
        }
        lg.transactions = [...localTxMap.values()]
          .filter(t => !t.deletedFlag)
          .sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
      }
    }
  }

  /* Initial load on sign-in — full pull if no lastSyncAt */
  async function initialLoad() {
    if (!STATE.user || STATE.isGuest) return;
    if (!STATE.syncEnabled || !navigator.onLine) return;
    if (STATE.isSyncing) return;

    STATE.isSyncing = true;
    _setSyncBar(true);
    networkManager.setSyncStatus('syncing');

    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('SYNC_TIMEOUT')), TIMEOUT_MS));

    try {
      await Promise.race([
        (async () => {
          let groups;
          if (!STATE.lastSyncAt) {
            // First ever load — full pull
            groups = await firebaseService.pullAllData(STATE.user.uid);
            STATE.groups = groups;
          } else {
            // Delta pull
            const changed = await firebaseService.pullChanges(STATE.user.uid, STATE.lastSyncAt);
            resolveConflicts(changed);
          }
          STATE.lastSyncAt = new Date().toISOString();
          STATE.pendingChanges = false;
          localCacheManager.saveGroups();
          localCacheManager.saveSettings();
        })(),
        timeout
      ]);
    } finally {
      STATE.isSyncing = false;
      _setSyncBar(false);
      networkManager.updateSyncPill();
    }
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

  return { onDataChanged, syncNow, initialLoad, resolveConflicts };
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

