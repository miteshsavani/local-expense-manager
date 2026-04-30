/* ================================================================
   APPLICATION STATE
   ================================================================ */
 window.STATE = {
  user:           null,
  isGuest:        false,   // true = guest login mode
  syncEnabled:    true,    // user-controlled sync toggle
  groups:         [],
  activeGroupId:  null,
  darkMode:       false,
  fontFamily:     'DM Sans',
  activeTab:      'transactions',
  lastSyncAt:     null,
  pendingChanges: false,
  backupEnabled:  false,
  backupInterval: 120,
  isSyncing:      false,
  syncRetries:    0,
  listeners:      []       // Track active Firestore onSnapshot unsub functions
};

