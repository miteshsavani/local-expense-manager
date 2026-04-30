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

- index.html loads HTML via fetch (dynamic injection)
- Then loads scripts sequentially
- bootstrap.js runs AFTER DOM is injected

IMPORTANT:
- Never assume DOM exists before bootstrap
- Always use safe DOM access (null checks)

---

## SCRIPT LOADING RULE

Scripts must load in order:

1. routing-map.js (optional helper)
2. all services/managers/utils
3. bootstrap.js (LAST)

Use sequential loader (await loadScript) to avoid race conditions

---

## GLOBAL ACCESS RULE

Since project is vanilla JS (no bundler):

All shared modules must attach to window:

window.firebaseService
window.authManager
window.uiManager
window.STATE

If not attached → bootstrap cannot access them

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
- Helps AI locate correct files
- Reduces token usage
- Avoids wrong edits

IMPORTANT:
- Used by AI (Antigravity)
- NOT used at runtime

---

## ANTIGRAVITY USAGE RULE

Always include:

"Use src/_agent/routing-map.md"

Guidelines:
- Do NOT specify file paths manually
- Let agent resolve via routing map
- Use "move" instead of "create" when refactoring
- Keep prompts short and intent-based

---

## COMMON PATTERNS

UI change:
→ HTML (components/html)
→ CSS (layout/components/views)

Logic change:
→ managers/ or services/

Theme:
→ utils/theme.js

Auth:
→ managers/auth.js

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

- Do not rely on window.ROUTING_MAP for AI
- Do not mix unrelated CSS
- Do not load bootstrap before DOM
- Do not assume globals exist without attaching to window

---

## GOAL

- Scalable modular architecture
- AI-friendly codebase
- Minimal token usage
- Predictable file structure