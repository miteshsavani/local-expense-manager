module.exports = {
  env: {
    browser: true,
    es2021: true
  },

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"   // ✅ FIX HERE
  },

  globals: {
    window: "readonly",
    document: "readonly",
    console: "readonly",

    // your globals
    STATE: "readonly",
    Groups: "readonly",
    Utils: "readonly",
    firebaseService: "readonly",
    syncManager: "readonly",
    memberManager: "readonly",
    showToast: "readonly",
    renderDashboard: "readonly",
    openModal: "readonly",
    closeModal: "readonly",
    renderChips: "readonly",
    adminManager: "readonly",
    openConfirm: "readonly",
    permissionManager: "readonly",
    renderGroup: "readonly",
    _escKey: "readonly",
    _timeAgo: "readonly",
    authManager: "readonly",
    openSettingsModal: "readonly",
    localCacheManager: "readonly",
    backupScheduler: "readonly",
    renderBalances: "readonly",
    renderSettle: "readonly",
    renderAnalytics: "readonly",
    renderTransactions: "readonly",
    _splitMode: "readonly",
    _customManualState: "readonly",
    _renderParticipants: "readonly",
    _refreshSplitPreview: "readonly",
    _autoAdjustCustomSplit: "readonly",
    Transactions: "readonly",
    uiManager: "readonly",
    networkManager: "readonly",
    inboxManager: "readonly",
    firebase: "readonly",
    FIREBASE_CONFIG: "readonly",
    showDashboard: "readonly",
    showGroup: "readonly",
    openAddTransactionModal: "readonly",
    openDirectMessageModal: "readonly",
    renderGroupCard: "readonly",
    renderSummaryCards: "readonly",
    reportManager: "readonly",
    confirmLeaveGroup: "readonly",
    showView: "readonly",
    applyFont: "readonly",
    openCreateGroupModal: "readonly",
    openEditGroupModal: "readonly",
    openManageMembersModal: "readonly",
    closeAddSubMemberModal: "readonly"
  },

  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-console": "off",
    "no-var": "error",
    "prefer-const": "error",
    "eqeqeq": "error"
  },

  ignorePatterns: [
    "dist/",
    "node_modules/",
    "src/_agent/"
  ]
};