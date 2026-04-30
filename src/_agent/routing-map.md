# UI FILE ROUTING MAP (AGENT MEMORY)

## CSS ROUTING

### BASE
- variables, theme tokens → src/css/base/variables.css
- reset, html/body global → src/css/base/globals.css
- dark mode → src/css/base/dark-mode.css

---

### LAYOUT
- main layout structure → src/css/layout/main.css
- header UI → src/css/layout/header.css
- mobile responsive fixes → src/css/layout/mobile.css

---

### COMPONENTS
- buttons → src/css/components/buttons.css
- cards → src/css/components/cards.css
- inputs → src/css/components/inputs.css
- modal system → src/css/components/modal.css
- toast notifications → src/css/components/toast.css
- badges → src/css/components/badge.css
- tabs → src/css/components/tabs.css
- member chips UI → src/css/components/member-chips.css
- avatar UI → src/css/components/avatar.css

---

### VIEWS
- auth screen → src/css/views/auth.css
- dashboard/group UI → src/css/views/dashboard.css
- transactions UI → src/css/views/transactions.css
- balances/settlement → src/css/views/balances.css
- analytics → src/css/views/analytics.css
- settings → src/css/views/settings.css
- sync/status UI → src/css/views/sync-status.css
- view switch system (.view active) → src/css/views/main.css
- feature flags / split modes / dirty state → src/css/views/feature-flags.css
- guest banner → src/css/views/guest.css
- loading/splash overlays → src/css/views/loading.css
- UI overlays/tooltips → src/css/views/ui-overlays.css

---

## JS ROUTING

### CORE
- app config → src/js/core/config.js
- app state → src/js/core/state.js
- bootstrap/init → src/js/core/bootstrap.js

---

### SERVICES
- cache → src/js/services/cache.js
- firebase → src/js/services/firebase.js
- sync engine → src/js/services/sync.js
- network → src/js/services/network.js

---

### MANAGERS
- auth → src/js/managers/auth.js
- UI controller → src/js/managers/ui.js
- members → src/js/managers/members.js
- reports → src/js/managers/report.js

---

### VIEWS
- router → src/js/views/router.js
- dashboard render → src/js/views/dashboard.js
- group view → src/js/views/group.js

---

### COMPONENT LOGIC
- groups CRUD → src/js/components/groups-crud.js
- transactions CRUD → src/js/components/transactions-crud.js
- toast → src/js/components/toast.js
- modal system → src/js/components/modal.js
- tabs → src/js/components/tabs.js
- group modal → src/js/components/group-modal.js
- members modal → src/js/components/members-modal.js
- transaction modal → src/js/components/transaction-modal.js
- settings modal → src/js/components/settings-modal.js

---

### UTILS
- formatters → src/js/utils/formatters.js
- chip helpers → src/js/utils/chip-helpers.js
- import/export → src/js/utils/import-export.js
- report download → src/js/utils/report-download.js
- theme helpers → src/js/utils/theme.js
- auth helpers → src/js/utils/auth-helpers.js

---

## HTML ROUTING

- splash screen → src/components/html/splash.html
- auth screen → src/components/html/auth.html
- main app shell → src/components/html/main.html

---

## AGENT RULE (IMPORTANT)

If request is ambiguous:
1. Prefer `views/` first
2. Then `components/`
3. Then `services/`
4. Then `utils/`

If UI-related → CSS first  
If behavior-related → JS first