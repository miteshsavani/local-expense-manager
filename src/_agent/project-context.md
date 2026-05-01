# PROJECT CONTEXT (MODULAR VANILLA JS + PWA)

## ARCHITECTURE

Project uses modular structure:

src/
  css/
    base/        → variables, globals, dark mode
    layout/      → header, mobile, layout
    components/  → reusable UI (buttons, modal, toast, tabs, etc.)
    views/       → screen-specific styles (dashboard, auth, etc.)

  js/
    core/        → bootstrap, config, state
    services/    → firebase, sync, cache, network
    managers/    → auth, ui, members, report
    views/       → render logic (dashboard, group)
    components/  → UI logic (modals, CRUD, tabs)
    utils/       → helpers (formatters, theme, import/export)

  components/html/
    splash.html
    auth.html
    main.html

---

## RENDERING MODEL

- All HTML is **pre-inlined at build time**
- index.html contains full DOM at load
- No runtime HTML fetching

- JS is bundled into a single file (app.js)
- bootstrap runs immediately after script load

IMPORTANT:
- DOM is already available at startup
- No need for async HTML injection

---

## GLOBAL ACCESS RULE

Project uses esbuild bundling (single IIFE output)

- Modules are bundled together
- No need for manual script loading
- Shared state should still be centralized

Use:
- core/state.js for shared state
- explicit imports between modules

Avoid:
- unnecessary window globals

Only expose to window if required externally (e.g. debugging)

Global state is handled via:
- core/state.js
- module imports inside bundle

window is only used for debugging if explicitly required

---

## CSS RULES

base/        → global styles only
layout/      → structure (header, responsive)
components/  → reusable UI elements
views/       → screen-specific styles only

DO NOT mix:
- layout + component styles
- view + global styles

---

## JS RULES

services/    → external systems (firebase, sync)
managers/    → business logic + orchestration
views/       → rendering logic
components/  → UI behavior
utils/       → pure helper functions

bootstrap.js:
- initializes app
- listens to auth state
- should NOT contain business logic

---

## PWA STRUCTURE

Keep:
- service-worker.js → ROOT ONLY

Move:
- manifest.json → /pwa/manifest.json
- icons → /pwa/icons/

Update paths accordingly

---

## ROUTING MAP USAGE

File:
src/_agent/routing-map.md

Purpose:
- Primary file lookup system for Antigravity
- Reduces token usage
- Prevents incorrect file edits

RULES:
- Always resolve files via routing map
- Do NOT guess paths
- Do NOT create duplicate files
- Prefer modifying existing mapped files

routing-map.md = source of truth for file locations

IMPORTANT:
- Used by AI (Antigravity)
- NOT used at runtime

## SOURCE OF TRUTH RULE

- routing-map.md = architecture + rules (primary)
- routing-map.js = runtime lookup helper (secondary)
- build system must never diverge from routing-map.md

---

## ANTIGRAVITY USAGE RULE

Always include in prompts:
→ "Use src/_agent/routing-map.md and project-context.md"

Guidelines:
- Do NOT manually specify file paths unless necessary
- Let agent resolve via routing map
- Prefer editing existing files over creating new ones
- Use "move" or "update" instead of "create" when possible

Prompt Style:
- Keep instructions short
- Focus on intent, not implementation

Good:
"Add validation to transaction creation"

Bad:
"Edit src/js/components/transactions-crud.js and add validation"


---

## BUILD AWARENESS (CRITICAL)

- HTML is inlined → no runtime templates
- CSS is globally merged → cascade matters
- JS is single bundle → no module boundaries at runtime

Implications:
- Do NOT add dynamic imports
- Do NOT assume file-level isolation
- Be careful with global side effects

Adding new files:
- JS → must be imported somewhere
- CSS → auto included
- HTML → must be added in build.js

---

## COMMON PATTERNS

UI change:
→ HTML (components/html)
→ CSS (components/views)
→ JS (components or views)

Feature logic:
→ manager + service

State change:
→ core/state.js

Theme:
→ utils/theme.js

Routing/UI switch:
→ views/router.js

Auth:
→ managers/auth.js

---
## DEBUG FLOW

UI issue:
→ check HTML → CSS → view

Interaction issue:
→ component → manager

Data issue:
→ manager → service

App startup issue:
→ app-entry → bootstrap → router

---

## BOOTSTRAP SAFETY

- Must wait for dependencies (firebaseService, etc.)
- Use safe DOM helpers
- Avoid direct element access without null check

---

## KEY PRINCIPLES

- No duplicate logic
- Minimal changes only
- Reuse existing modules
- Keep concerns separated
- Prefer moving code over rewriting

---

## WHAT NOT TO DO

- Do not assume multiple JS files at runtime
- Do not use dynamic script loading
- Do not create duplicate UI structures
- Do not bypass routing-map.md
- Do not add HTML without updating build.js

---

## GOAL

- Scalable modular architecture
- AI-friendly codebase
- Minimal token usage
- Predictable file structure

## ROUTING MAP HIERARCHY

Priority order:

1. routing-map.md → source of truth (architecture)
2. routing-map.js → lookup helper (runtime/AI speed)
3. build system → execution layer (must follow md)