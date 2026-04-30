/* ================================================================
   AUTH MANAGER
   ================================================================ */
const authManager = (() => {
  function showSignIn() {
    document.getElementById('auth-signin').classList.remove('hidden');
    document.getElementById('auth-register').classList.add('hidden');
    _clrErrs();
  }
  function showRegister() {
    document.getElementById('auth-signin').classList.add('hidden');
    document.getElementById('auth-register').classList.remove('hidden');
    _clrErrs();
  }
  function _clrErrs() {
    document.querySelectorAll('.auth-error').forEach(e => { e.textContent = ''; e.classList.remove('show'); });
  }
  function _err(id, msg) { const e = document.getElementById(id); e.textContent = msg; e.classList.add('show'); }
  function _friendly(code) {
    return {
      'auth/user-not-found': 'No account with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/email-already-in-use': 'Email already registered. Sign in instead.',
      'auth/weak-password': 'Password is too weak.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/network-request-failed': 'Network error.',
      'auth/invalid-credential': 'Invalid email or password.'
    }[code] || 'An error occurred. Please try again.';
  }
  async function signIn() {
    const email = document.getElementById('signin-email').value.trim();
    const pw    = document.getElementById('signin-password').value;
    if (!email || !pw) { _err('signin-error', 'Please fill in all fields'); return; }
    const btn = document.getElementById('signin-btn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try { await firebaseService.signIn(email, pw); }
    catch(e) { _err('signin-error', _friendly(e.code)); btn.disabled = false; btn.textContent = 'Sign In'; }
  }
  async function register() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pw    = document.getElementById('reg-password').value;
    const pw2   = document.getElementById('reg-password2').value;
    if (!name || !email || !pw || !pw2) { _err('register-error', 'Fill in all fields'); return; }
    if (pw.length < 8) { _err('register-error', 'Password must be ≥8 characters'); return; }
    if (pw !== pw2)    { _err('register-error', 'Passwords do not match'); return; }
    const btn = document.getElementById('register-btn');
    btn.disabled = true; btn.textContent = 'Creating…';
    try { await firebaseService.register(email, pw, name); }
    catch(e) { _err('register-error', _friendly(e.code)); btn.disabled = false; btn.textContent = 'Create Account'; }
  }
  async function signOut() { await firebaseService.signOut(); }

  /* Guest login — no Firebase, local-only */
  async function continueAsGuest() {
    const storedPw = localStorage.getItem('se_guest_password');
    
    if (!storedPw) {
      // First time guest login - ask to set password
      _promptSetGuestPassword();
    } else {
      // Subsequent login - ask for password
      _promptGuestLogin(storedPw);
    }
  }

  function _promptSetGuestPassword() {
    openModal(`<div class="modal" style="max-width:380px">
      <div class="modal-header"><div class="modal-title">Set Guest Password</div></div>
      <p class="text-sm text-muted" style="margin-bottom:16px">Secure your local data. This password will be required next time you use this browser.</p>
      <div class="form-group">
        <label>New Password</label>
        <div class="input-password-wrap">
          <input class="input" id="guest-new-pw" type="password" placeholder="Min 4 characters" autofocus>
          <button class="pw-toggle" onclick="togglePw('guest-new-pw',this)" tabindex="-1">👁</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="authManager.saveGuestPassword()">Set Password & Continue</button>
      </div>
    </div>`);
    document.getElementById('guest-new-pw').addEventListener('keydown', e => { if(e.key==='Enter') authManager.saveGuestPassword(); });
  }

  function saveGuestPassword() {
    const pw = document.getElementById('guest-new-pw').value;
    if (pw.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }
    localStorage.setItem('se_guest_password', pw);
    closeModal();
    _startGuestSession(true); // true = first time
  }

  function _promptGuestLogin(correctPw) {
    openModal(`<div class="modal" style="max-width:380px">
      <div class="modal-header"><div class="modal-title">Guest Login</div></div>
      <div class="form-group">
        <label>Guest Password</label>
        <div class="input-password-wrap">
          <input class="input" id="guest-login-pw" type="password" placeholder="••••" autofocus>
          <button class="pw-toggle" onclick="togglePw('guest-login-pw',this)" tabindex="-1">👁</button>
        </div>
      </div>
      <div id="guest-login-err" class="auth-error"></div>
      <div class="modal-footer" style="flex-direction:column; gap:12px; align-items:stretch">
        <button class="btn btn-primary btn-full" onclick="authManager.verifyGuestPassword('${correctPw}')">Unlock</button>
        <div style="text-align:center"><a href="#" onclick="authManager.promptForgotPasswordGuest()" style="font-size:12px; color:var(--accent)">Forgot password?</a></div>
      </div>
    </div>`);
    document.getElementById('guest-login-pw').addEventListener('keydown', e => { if(e.key==='Enter') authManager.verifyGuestPassword(correctPw); });
  }

  function verifyGuestPassword(correctPw) {
    const input = document.getElementById('guest-login-pw').value;
    if (input === correctPw) {
      closeModal();
      _startGuestSession(false);
    } else {
      const err = document.getElementById('guest-login-err');
      err.textContent = 'Incorrect password';
      err.classList.add('show');
    }
  }

  function promptForgotPasswordGuest() {
    openConfirm('Clear All Data?', 
      'If you forgot your guest password, the only way to regain access is to <span class="confirm-hl">clear all your local data</span>. This cannot be undone.', 
      () => {
        localStorage.removeItem('se_guest_password');
        localStorage.removeItem('se_guest_groups');
        localStorage.removeItem('se_guest_settings');
        // Clear all keys starting with se_guest_
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key.startsWith('se_guest_')) localStorage.removeItem(key);
        }
        showToast('All guest data cleared', 'info');
        location.reload();
      }
    );
  }

  function _startGuestSession(isFirstTime) {
    STATE.isGuest = true;
    STATE.user    = null;
    STATE.groups  = [];
    STATE.pendingChanges = false;
    
    // Load existing guest data
    const K = s => `se_guest_${s}`;
    try {
      const raw = localStorage.getItem(K('groups'));
      STATE.groups = raw ? JSON.parse(raw) : [];
      const sraw = localStorage.getItem(K('settings'));
      if (sraw) {
        const s = JSON.parse(sraw);
        STATE.darkMode    = s.darkMode   ?? false;
        STATE.fontFamily  = s.fontFamily ?? 'DM Sans';
        if (window.applyFont) window.applyFont(STATE.fontFamily);
        if (STATE.darkMode) document.documentElement.classList.add('dark');
      }
    } catch { STATE.groups = []; }
    
    if (isFirstTime) {
      uiManager.showGuestWarning();
    } else {
      uiManager.onGuestSignedIn();
    }
  }

  function clearGuestSession() {
    openConfirm('Logout Guest Session?', 'This will return you to the login screen. Your data remains safe on this device.', () => {
      STATE.isGuest = false;
      location.reload();
    });
  }

  return { showSignIn, showRegister, signIn, register, signOut, continueAsGuest, saveGuestPassword, verifyGuestPassword, promptForgotPasswordGuest, clearGuestSession };
})();

