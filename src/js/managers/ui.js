/* ================================================================
   UI MANAGER
   ================================================================ */
window.uiManager = (() => {

  /* Helper to reveal the main app and hide splash/auth */
  function _showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('waiting-screen')?.classList.add('hidden');
    document.getElementById('rejected-screen')?.classList.add('hidden');
    // Remove splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => splash.remove(), 400); }
  }

  function _showWaitingScreen(status, reason = '') {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('waiting-screen')?.classList.add('hidden');
    document.getElementById('rejected-screen')?.classList.add('hidden');
    
    if (status === 'pending') {
      document.getElementById('waiting-screen')?.classList.remove('hidden');
    } else if (status === 'rejected' || status === 'suspended') {
      const screen = document.getElementById('rejected-screen');
      if (screen) {
        screen.classList.remove('hidden');
        document.getElementById('rejection-status').textContent = status === 'suspended' ? 'Account Suspended' : 'Account Rejected';
        document.getElementById('rejection-msg').textContent = reason || (status === 'suspended' ? 'Your access has been revoked.' : 'Your registration request was not accepted.');
      }
    }
    
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => splash.remove(), 400); }
  }

  function _showLoadingDashboard() {
    // Show loading overlay
    document.getElementById('loading-screen')?.classList.remove('hidden');
  }

  function _hideLoadingDashboard() {
    // Hide loading overlay
    document.getElementById('loading-screen')?.classList.add('hidden');
  }

  function onUserSignedIn(user) {
    // Clear listeners from previous session if any
    if (window._profileUnsub) { window._profileUnsub(); window._profileUnsub = null; }
    _showLoadingDashboard();

    const db = firebase.firestore();
    window._profileUnsub = db.collection('users').doc(user.uid).onSnapshot(doc => {
      if (!doc.exists) {
        _showWaitingScreen('pending');
        return;
      }
      const profile = doc.data();
      
      // Detect changes to show toast and refresh UI
      const oldStatus = STATE.userProfile?.status;
      const oldLimits = JSON.stringify(STATE.userProfile?.limits);
      const oldPerms  = JSON.stringify(STATE.userProfile?.permissions);
      
      STATE.userProfile = profile;
      
      if (oldStatus && (oldStatus !== profile.status || oldLimits !== JSON.stringify(profile.limits) || oldPerms !== JSON.stringify(profile.permissions))) {
        showToast('Account permissions updated by admin', 'success');
        if (document.querySelector('.modal-title')?.textContent.includes('Settings')) {
          openSettingsModal(); // Refresh open modal
        }
      }
      
      if (profile.status === 'approved' || profile.role === 'admin') {
        _initializeFullApp(user, profile);
      } else {
        _hideLoadingDashboard();
        _showWaitingScreen(profile.status, profile.rejectionReason);
      }
    }, err => {
      console.error('Profile listener error:', err);
      _hideLoadingDashboard();
      _showWaitingScreen('pending');
    });
  }

  function _initializeFullApp(user, profile) {
    if (profile.role === 'admin') {
      _initializeAdminApp(user);
      return;
    }
    // Clear state BEFORE showing app to prevent flash of previous user's data
    STATE.groups = [];
    STATE.activeGroupId = null;
    STATE.userPermissions = {};
    _showApp();
    localCacheManager.loadSettings();
    STATE.groups = localCacheManager.loadGroups();
    if (STATE.darkMode) document.documentElement.classList.add('dark');
    
    // Admin Button
    const adminBtn = document.getElementById('hdr-admin-btn');
    if (adminBtn) adminBtn.classList.toggle('hidden', profile.role !== 'admin');

    const init = (user.displayName || user.email || '?').slice(0,2).toUpperCase();
    const el = document.getElementById('user-avatar');
    el.textContent = init;
    el.className = 'user-avatar' + (profile.role === 'admin' ? ' admin' : '');
    el.title = (user.displayName || user.email) + (profile.role === 'admin' ? ' (Admin)' : '');
    
    // Hide guest-only UI
    document.getElementById('guest-banner').classList.add('hidden');
    // Show sync UI
    document.getElementById('hdr-sync-area').classList.remove('hidden');
    document.getElementById('sync-ui-area').style.display = '';
    document.getElementById('sync-pill').style.display = '';
    document.getElementById('pending-banner').classList.add('hidden');
    document.getElementById('sync-err-bar').classList.add('hidden');
    // Hide guest logout
    document.getElementById('guest-logout-btn').classList.add('hidden');

    // Show sync toggle
    _updateSyncToggleBar();
    if (localCacheManager.isBannerDismissed()) document.getElementById('safety-banner').classList.add('hidden');
    document.getElementById('dashboard-subtitle').textContent =
      `Welcome back, ${user.displayName || user.email.split('@')[0]}`;
    renderDashboard();
    networkManager.init();
    inboxManager.init();
    backupScheduler.start();
    // Feature #3: Load syncEnabled from Firebase, then initial sync
    uiManager.loadSyncEnabledFromFirebase().then(() => {
      syncManager.initialLoad().then(() => {
        renderDashboard();
        // Hide loading overlay after sync initialization
        _hideLoadingDashboard();
      });
    });
  }

  function _initializeAdminApp(user) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    
    // Remove splash
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => splash.remove(), 400); }

    // Init admin avatar
    const init = (user.displayName || user.email || '?').slice(0,2).toUpperCase();
    const el = document.getElementById('admin-user-avatar');
    if (el) {
      el.textContent = init;
      el.title = (user.displayName || user.email) + ' (Admin)';
    }

    // Load admin data
    adminManager.refreshUsers();
    _hideLoadingDashboard();
  }

  function onGuestSignedIn() {
    STATE.isGuest = true;
    STATE.syncEnabled = false;
    _showApp();
    // Apply saved appearance settings for guest
    if (STATE.darkMode) document.documentElement.classList.add('dark');
    // Show guest avatar
    const el = document.getElementById('user-avatar');
    el.textContent = '👤';
    el.className = 'user-avatar guest';
    el.title = 'Guest (not signed in)';
    // Show guest banner
    document.getElementById('guest-banner').classList.remove('hidden');
    // Show/Hide header sync area
    document.getElementById('hdr-sync-area').classList.add('hidden');
    document.getElementById('sync-pill').style.display = 'none';
    document.getElementById('sync-ui-area').style.display = 'none';
    document.getElementById('pending-banner').classList.add('hidden');
    document.getElementById('sync-err-bar').classList.add('hidden');
    // Show guest logout
    document.getElementById('guest-logout-btn').classList.remove('hidden');

    document.getElementById('dashboard-subtitle').textContent = 'Guest mode — data is local only';
    renderDashboard();
    // No networkManager.init() — guest doesn't need it
  }

  function onUserSignedOut() {
    backupScheduler.stop();
    if (syncManager.stopListeners) syncManager.stopListeners();
    if (window._profileUnsub) { window._profileUnsub(); window._profileUnsub = null; }
    // IMPORTANT: Clear state immediately before showing auth,
    // so there's zero chance of previous data flashing
    STATE.user = null;
    STATE.isGuest = false;
    STATE.groups = [];
    STATE.lastSyncAt = null;
    STATE.pendingChanges = false;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('admin-panel')?.classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('waiting-screen')?.classList.add('hidden');
    document.getElementById('rejected-screen')?.classList.add('hidden');
    // Remove splash if still visible (shouldn't happen, but safe)
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
    authManager.showSignIn();
    ['signin-email','signin-password','reg-name','reg-email','reg-password','reg-password2']
      .forEach(id => { const e = document.getElementById(id); if(e) e.value = ''; });
    
    // Reset auth buttons
    const signinBtn = document.getElementById('signin-btn');
    if (signinBtn) { signinBtn.disabled = false; signinBtn.textContent = 'Sign In'; }
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) { registerBtn.disabled = false; registerBtn.textContent = 'Create Account'; }
  }

  function dismissSafetyBanner() {
    document.getElementById('safety-banner').classList.add('hidden');
    localCacheManager.dismissBanner();
  }

  /* Show auth screen from guest mode */
  function showAuthFromGuest() {
    STATE.isGuest = false;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    authManager.showSignIn();
  }

  /* User-controlled sync master toggle (dashboard) */
  /* Feature #3: Persist syncEnabled to Firebase user profile */
  function setSyncEnabled(on) {
    if (on && STATE.userProfile && !STATE.userProfile.permissions?.canUseCloudSync) {
      showToast('Cloud Sync is restricted for your account. Contact Admin.', 'error');
      document.getElementById('hdr-sync-toggle').checked = false;
      return;
    }
    STATE.syncEnabled = on;
    localCacheManager.saveSettings();
    _updateSyncToggleBar();
    networkManager.updateSyncPill();
    if (on && STATE.pendingChanges && navigator.onLine) {
      syncManager.syncNow();
    }
    // Feature #3: Persist to Firebase
    _persistSyncEnabledToFirebase(on);
    showToast(on ? 'Sync enabled' : 'Sync paused — working offline', on ? 'success' : 'warning', 2000);
  }

  /* Feature #3: Save syncEnabled to Firebase user profile */
  function _persistSyncEnabledToFirebase(enabled) {
    if (!STATE.user || STATE.isGuest) return;
    try {
      const db = firebase.firestore();
      db.collection('users').doc(STATE.user.uid).set(
        { syncEnabled: enabled, syncUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      ).catch(e => console.warn('Failed to persist syncEnabled to Firebase:', e));
    } catch(e) { console.warn('Firebase syncEnabled persist error:', e); }
  }

  /* Feature #3: Load syncEnabled from Firebase user profile on sign-in */
  async function loadSyncEnabledFromFirebase() {
    if (!STATE.user || STATE.isGuest) return;
    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(STATE.user.uid).get();
      if (doc.exists && doc.data().syncEnabled !== undefined) {
        const remoteSyncEnabled = doc.data().syncEnabled;
        STATE.syncEnabled = remoteSyncEnabled;
        localCacheManager.saveSettings();
        _updateSyncToggleBar();
        networkManager.updateSyncPill();
      }
    } catch(e) { console.warn('Failed to load syncEnabled from Firebase:', e); }
  }

  function _updateSyncToggleBar() {
    const toggle = document.getElementById('hdr-sync-toggle');
    const syncBtn = document.getElementById('hdr-sync-now-btn');
    if (STATE.isGuest) { 
      document.getElementById('hdr-sync-area').classList.add('hidden');
      if (syncBtn) syncBtn.classList.add('hidden');
      return; 
    }
    document.getElementById('hdr-sync-area').classList.remove('hidden');
    if (syncBtn) {
      syncBtn.classList.remove('hidden');
      syncBtn.disabled = !STATE.syncEnabled || !navigator.onLine;
    }
    if (toggle) toggle.checked = STATE.syncEnabled;
    
    // Resume/Stop scheduler based on syncEnabled
    if (STATE.syncEnabled) backupScheduler.start();
    else backupScheduler.stop();
  }

  /* Update the pending-sync banner with count of dirty items */
  function updatePendingBanner() {
    // Never show for guest
    if (STATE.isGuest) return;
    const banner = document.getElementById('pending-banner');
    const msgEl  = document.getElementById('pending-banner-msg');
    if (!banner || !msgEl) return;
    
    let dirtyCount = 0;
    STATE.groups.forEach(g => {
      let groupHasDirtyTx = false;
      g.transactions.forEach(tx => { 
        if (tx.isDirty || tx.deletedFlag) {
          dirtyCount++; 
          groupHasDirtyTx = true;
        }
      });
      
      // Count the group only if it's marked for deletion, 
      // or if it's dirty but NOT solely because of its transactions 
      // (e.g. name or members changed).
      // Since we don't have a 'metadataOnlyDirty' flag, we check if 
      // the group is dirty and either has no dirty tx or is deleted.
      if (g.deletedFlag || (g.isDirty && !groupHasDirtyTx)) {
        dirtyCount++;
      }
    });

    // Show banner if there are unsynced changes
    if (dirtyCount > 0 && STATE.user) {
      if (!STATE.syncEnabled) {
          msgEl.textContent = `${dirtyCount} pending change${dirtyCount > 1 ? 's' : ''} (saved locally) — enable sync to save to server`;
      } else {
          msgEl.textContent = `${dirtyCount} pending change${dirtyCount > 1 ? 's' : ''} — tap to sync`;
      }
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  function showGuestWarning() {
    let timeLeft = 5;
    openModal(`<div class="modal" style="max-width:420px; text-align:center">
      <div style="font-size:48px; margin-bottom:16px">⚠️</div>
      <div class="modal-title" style="margin-bottom:12px">Local Data Warning</div>
      <p class="text-sm text-muted" style="line-height:1.6; margin-bottom:24px">
        Your data will be <strong>stored locally in this browser only</strong>. 
        It might be lost if you clear your browser history or close this private window.
      </p>
      <div class="modal-footer" style="justify-content:center">
        <button id="guest-understand-btn" class="btn btn-primary" disabled style="min-width:180px">
          I understood (${timeLeft}s)
        </button>
      </div>
    </div>`);
    
    const btn = document.getElementById('guest-understand-btn');
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        btn.textContent = `I understood (${timeLeft}s)`;
      } else {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'I understood';
        btn.onclick = () => {
          closeModal();
          uiManager.onGuestSignedIn();
        };
      }
    }, 1000);
  }

  function dismissBanner(bannerId) {
    const banner = document.getElementById(bannerId);
    banner.classList.add('hidden');
  }

  function toggleAccountDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('account-dropdown');
    if (!dd) return;
    const isHidden = dd.classList.contains('hidden');
    
    if (isHidden) {
      _updateDropdownContent();
      dd.classList.remove('hidden');
      window.addEventListener('click', _closeDropdownOnOutsideClick, { capture: true, once: true });
    } else {
      dd.classList.add('hidden');
    }
  }

  function _updateDropdownContent() {
    const user = STATE.user;
    const nameEl = document.getElementById('dropdown-user-name');
    const emailEl = document.getElementById('dropdown-user-email');
    if (!nameEl || !emailEl) return;
    
    if (STATE.isGuest) {
      nameEl.textContent = 'Guest User';
      emailEl.textContent = 'Local Mode';
    } else if (user) {
      nameEl.textContent = user.displayName || 'User';
      emailEl.textContent = user.email || '';
    }
    
    // Theme checks
    const cDark = document.getElementById('check-dark');
    const cLight = document.getElementById('check-light');
    if (cDark) cDark.classList.toggle('active', STATE.darkMode);
    if (cLight) cLight.classList.toggle('active', !STATE.darkMode);

    // Hide theme/settings for admin
    const isAdmin = STATE.userProfile?.role === 'admin';
    document.querySelectorAll('.dropdown-item').forEach(item => {
      const isSignOut = item.onclick?.toString().includes('signOut');
      if (isAdmin && !isSignOut) {
        item.style.display = 'none';
        // Also hide preceding divider if any
        if (item.previousElementSibling?.classList.contains('dropdown-divider')) {
          item.previousElementSibling.style.display = 'none';
        }
      } else {
        item.style.display = '';
        if (item.previousElementSibling?.classList.contains('dropdown-divider')) {
          item.previousElementSibling.style.display = '';
        }
      }
    });
  }

  function _closeDropdownOnOutsideClick(e) {
    const dd = document.getElementById('account-dropdown');
    const avatar = document.getElementById('user-avatar');
    const adminAvatar = document.getElementById('admin-user-avatar');
    if (dd && !dd.contains(e.target) && !avatar?.contains(e.target) && !adminAvatar?.contains(e.target)) {
      dd.classList.add('hidden');
    } else if (dd && !dd.classList.contains('hidden')) {
      window.addEventListener('click', _closeDropdownOnOutsideClick, { capture: true, once: true });
    }
  }

  return {
    onUserSignedIn, onGuestSignedIn, onUserSignedOut,
    dismissSafetyBanner, updatePendingBanner,
    showAuthFromGuest, setSyncEnabled, showGuestWarning,
    loadSyncEnabledFromFirebase, dismissBanner,
    toggleAccountDropdown
  };
})()

