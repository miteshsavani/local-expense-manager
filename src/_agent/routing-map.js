window.ROUTING_MAP = {
  "css": {
    "base": {
      "variables": "src/css/base/variables.css",
      "globals": "src/css/base/globals.css",
      "darkMode": "src/css/base/dark-mode.css"
    },
    "layout": {
      "main": "src/css/layout/main.css",
      "header": "src/css/layout/header.css",
      "mobile": "src/css/layout/mobile.css"
    },
    "components": {
      "buttons": "src/css/components/buttons.css",
      "cards": "src/css/components/cards.css",
      "inputs": "src/css/components/inputs.css",
      "modal": "src/css/components/modal.css",
      "toast": "src/css/components/toast.css",
      "badge": "src/css/components/badge.css",
      "tabs": "src/css/components/tabs.css",
      "memberChips": "src/css/components/member-chips.css",
      "avatar": "src/css/components/avatar.css"
    },
    "views": {
      "admin": "src/css/views/admin.css",
      "analytics": "src/css/views/analytics.css",
      "inbox": "src/css/views/inbox.css",
      "syncIndicators": "src/css/sync-indicators.css",
      "auth": "src/css/views/auth.css",
      "dashboard": "src/css/views/dashboard.css",
      "transactions": "src/css/views/transactions.css",
      "balances": "src/css/views/balances.css",
      "settings": "src/css/views/settings.css",
      "syncStatus": "src/css/views/sync-status.css",
      "mainView": "src/css/views/main.css",
      "featureFlags": "src/css/views/feature-flags.css",
      "guest": "src/css/views/guest.css",
      "loading": "src/css/views/loading.css",
      "overlays": "src/css/views/ui-overlays.css"
    }
  },

  "js": {
    "core": {
      "config": "src/js/core/config.js",
      "state": "src/js/core/state.js",
      "bootstrap": "src/js/core/bootstrap.js"
    },
    "services": {
      "cache": "src/js/services/cache.js",
      "firebase": "src/js/services/firebase.js",
      "sync": "src/js/services/sync.js",
      "network": "src/js/services/network.js"
    },
    "managers": {
      "auth": "src/js/managers/auth.js",
      "ui": "src/js/managers/ui.js",
      "members": "src/js/managers/members.js",
      "report": "src/js/managers/report.js",
      "inbox": "src/js/managers/inbox.js",
      "permissions": "src/js/managers/permissions.js"
    },
    "views": {
      "router": "src/js/views/router.js",
      "dashboard": "src/js/views/dashboard.js",
      "group": "src/js/views/group.js",
      "admin": "src/js/views/admin.js"
    },
    "components": {
      "groupsCrud": "src/js/components/groups-crud.js",
      "transactionsCrud": "src/js/components/transactions-crud.js",
      "toast": "src/js/components/toast.js",
      "modal": "src/js/components/modal.js",
      "tabs": "src/js/components/tabs.js",
      "groupModal": "src/js/components/group-modal.js",
      "membersModal": "src/js/components/members-modal.js",
      "transactionModal": "src/js/components/transaction-modal.js",
      "settingsModal": "src/js/components/settings-modal.js",
      "adminModal": "src/js/components/admin-modal.js",
      "membersDetailModal": "src/js/components/members-detail-modal.js",
      "permissionModal": "src/js/components/permission-modal.js",
    },
    "utils": {
      "formatters": "src/js/utils/formatters.js",
      "chipHelpers": "src/js/utils/chip-helpers.js",
      "importExport": "src/js/utils/import-export.js",
      "reportDownload": "src/js/utils/report-download.js",
      "theme": "src/js/utils/theme.js",
      "authHelpers": "src/js/utils/auth-helpers.js"
    }
  },

  "html": {
    "splash": "src/components/html/splash.html",
    "auth": "src/components/html/auth.html",
    "main": "src/components/html/main.html",
    "admin": "src/components/html/admin.html",
    "dropdown": "src/components/html/dropdown.html",
    "inbox": "src/components/html/inbox.html",
    "status": "src/components/html/status.html"
  },

  "entry": {
    "app": {
      "path": "src/js/app-entry.js",
      "description": "Application bootstrap entry point"
    }
  }
};