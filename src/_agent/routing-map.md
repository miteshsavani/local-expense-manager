# UI FILE ROUTING MAP (AGENT MEMORY)

---

## BUILD PIPELINE (CRITICAL)

### HTML
- All HTML is **inlined into index.html**
- Source:
  - splash → src/components/html/splash.html
  - auth → src/components/html/auth.html
  - inbox → src/components/html/inbox.html
  - main → src/components/html/main.html
  - admin → src/components/html/admin.html
  - status → src/components/html/status.html
  - dropdown → src/components/html/dropdown.html

- Special rule:
  - inbox is injected into main.html:
    #view-inbox-container → replaced with inbox.html

- Final output:
  → dist/index.html (single HTML file)

⚠️ If new HTML file is added:
→ MUST be included in build.js (otherwise it won't render)

- Composition:
  - inbox.html is injected into main.html
    (#view-inbox-container → replaced)

- All HTML becomes a single DOM

⚠️ DO NOT:
- assume page navigation
- use full HTML documents

✔ Use partial fragments only

---

### CSS
- All CSS files under src/css/** are:
  → recursively merged
  → minified using clean-css
  → injected into <style> tag

- Final output:
  → inline CSS inside index.html

⚠️ Do NOT assume CSS is loaded per file
⚠️ Order = filesystem traversal (important for overrides)

---

### JS
- Entry → src/js/app-entry.js
- Bundled using esbuild
- Format → IIFE (no modules at runtime)
- Tree shaking → disabled

- Output:
  → dist/app.js

⚠️ All JS becomes ONE file
⚠️ No dynamic imports
⚠️ No module boundaries at runtime

---

### PWA
- pwa/ → copied to dist/pwa
- service-worker.js → copied to dist/


---

## APP EXECUTION FLOW

1. index.html loads
2. Inline CSS applied (global styles)
3. app.js loaded (single bundle)
4. Entry → src/js/app-entry.js
5. bootstrap → initializes app
6. router → controls view switching
7. views update DOM (show/hide)
⚠️ No new DOM is fetched after load


## JS ENTRY
- app entry (esbuild entry point) → src/js/app-entry.js
  - initializes app
  - loads bootstrap + router
  - starting point of execution

---

## KNOWN CONSTRAINTS

- No code splitting
- No lazy loading
- Entire app loads at once
- DOM already contains all views

Implication:
→ Prefer show/hide instead of re-rendering HTML



---

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
- inbox → src/js/managers/inbox.js
- permissions → src/js/managers/permissions.js

---

### VIEWS
- router → src/js/views/router.js
- dashboard render → src/js/views/dashboard.js
- group view → src/js/views/group.js
- admin view → src/js/views/admin.js

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
- admin modal → src/js/components/admin-modal.js
- members detail modal → src/js/components/members-detail-modal.js
- permission modal - src/js/components/permission-modal.js

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
- inbox UI → src/components/html/inbox.html
- main app shell → src/components/html/main.html
- admin panel → src/components/html/admin.html
- status UI → src/components/html/status.html
- dropdown UI → src/components/html/dropdown.html

---

## SOURCE OF TRUTH RULE

- routing-map.md defines architecture
- routing-map.js is runtime helper
- build system must match both

---

## AGENT RULES (CRITICAL)

### File Selection Priority
1. views/ → UI screens
2. components/ → UI behavior
3. managers/ → business logic
4. services/ → data/sync
5. utils/ → helpers

### Architecture Rules (IMPORTANT)
- App is NOT multi-page
- DOM is pre-rendered
- Views are shown/hidden (not created)

✔ Prefer:
- toggling visibility
- updating existing DOM

❌ Avoid:
- re-rendering full HTML
- injecting large HTML blocks
- duplicating UI structures

### JS Rules
- All code runs in ONE bundle (IIFE)
- No runtime module system
- No dynamic imports

### CSS Rules
- Global cascade (all CSS merged)
- Be careful with overrides


---

## BUILD-AWARE RULES

- Adding new HTML file?
  → MUST update build.js

- Adding new CSS file?
  → auto included (no change needed)

- Adding new JS file?
  → must be imported somewhere in dependency chain

- Modifying DOM structure?
  → check if HTML is injected or standalone

- Debugging UI issue?
  → remember CSS is globally merged

---

## CHANGE IMPACT RULES (IMPORTANT)

- Changing HTML structure?
  → check build injection (main + inbox)

- Adding new UI?
  → prefer existing views/components

- Adding new feature?
  → start from view → then manager → then service

- Fixing bug?
  → trace: view → component → manager → service

- Large UI change?
  → DO NOT duplicate layout, reuse existing containers

---

## DEV SYSTEM

- build-chokidar.js → watches src changes
- ws → triggers browser reload
- express → serves dist folder

---

## RUNTIME MODEL

- Single bundled JS file (app.js)
- No runtime module loader
- No script ordering dependency
- Browser loads static dist/ output