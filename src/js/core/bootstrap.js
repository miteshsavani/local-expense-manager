/**
 * Lightweight routing helper for dev + agents
 * Usage:
 *   resolveFile("css", "views", "transactions")
 */

/*import routingMap from "../../_agent/routing-map.json" assert { type: "json" };

export function resolveFile(type, category, key) {
  try {
    return routingMap[type][category][key];
  } catch (e) {
    console.warn("Routing not found:", { type, category, key });
    return null;
  }
}*/

/**
 * Example usage:
 * resolveFile("js", "managers", "auth")
 * → src/js/managers/auth.js
 */



/* ================================================================
   APP BOOTSTRAP
   ================================================================ */
window.bootstrap = (function init(){

  function $(id) {
    return document.getElementById(id);
  }

  function safeHide(id) {
    const el = $(id);
    if (el) el.classList.add('hidden');
  }

  function safeShow(id) {
    const el = $(id);
    if (el) el.classList.remove('hidden');
  }

  // ----------------------------
  // WAIT UTILITY
  // ----------------------------
  function waitFor(conditionFn, timeout = 30000, interval = 100) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (conditionFn()) {
          clearInterval(timer);
          resolve(true);
        }

        if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject("Timeout waiting for dependency");
        }
      }, interval);
    });
  }

  // ----------------------------
  // UI INITIAL STATE
  // ----------------------------
  safeHide('auth-screen');
  safeHide('main-app');

  // ----------------------------
  // WAIT FOR FIREBASE SERVICE
  // ----------------------------
  waitFor(() => firebaseService, 30000)
    .then(() => {

      firebaseService.init();

      let authResolved = false;

      firebaseService.onAuthChange(user => {

        const splash = $('splash-screen');

        if (!authResolved) {
          authResolved = true;

          setTimeout(() => {
            if (splash) {
              splash.classList.add('fade-out');
              setTimeout(() => splash.remove(), 350);
            }
          }, 100);
        }

        if (user) {
          STATE.user = user;
          uiManager.onUserSignedIn(user);
          safeHide('auth-screen');
          safeShow('main-app');
        } else {
          if (STATE.isGuest) return;
          uiManager.onUserSignedOut();
          safeShow('auth-screen');
          safeHide('main-app');
        }
      });

    })
    .catch(err => {
      console.error("❌ firebaseService failed to load:", err);
    });

  // ----------------------------
  // KEYBOARD EVENTS (safe)
  // ----------------------------
  function bindKeys() {

    const email = $('signin-email');
    const pass = $('signin-password');
    const pass2 = $('reg-password2');

    if (pass) {
      pass.addEventListener('keydown', e => {
        if (e.key === 'Enter') authManager.signIn();
      });
    }

    if (email) {
      email.addEventListener('keydown', e => {
        if (e.key === 'Enter' && pass) pass.focus();
      });
    }

    if (pass2) {
      pass2.addEventListener('keydown', e => {
        if (e.key === 'Enter') authManager.register();
      });
    }
  }

  bindKeys();

})();