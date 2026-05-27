# Tabmate – Agent Reference Documentation

## Purpose
Tabmate is a lightweight terminal tab manager that also functions as an iPhone Progressive Web App (PWA). The repo is structured for rapid modification by tooling agents: the UI lives in `public/` and the core logic in `src/`. The app is compiled to static assets and deployed to GitHub Pages.

## Quick Navigation
| Path | Description |
|------|-------------|
| `src/app.ts` | Bootstraps the runtime, registers the service worker, and mounts the UI. |
| `src/tabManager.ts` | Main API for creating, closing, renaming, persisting tabs; emits events used by plugins. |
| `src/splitPane.ts` | Layout engine for vertical/horizontal pane splits. |
| `src/ui/` | UI components (React/Vue) and styling (`styles/`). |
| `public/index.html` | Entry HTML, includes PWA manifest and links to bundled JS. |
| `public/manifest.json` | PWA metadata for iPhone Home‑Screen installability. |
| `public/sw.js` | Service‑worker for offline caching. |
| `config/config.json` | User‑editable defaults: key bindings, theme selection, enabled plugins. |
| `plugins/` | Drop‑in extensions; each plugin can listen to `tabOpened`, `tabClosed`, etc. |
| `tests/` | Unit / integration tests (Jest/Vitest). |
| `package.json` | NPM scripts, dependencies, and build configuration. |
| `vite.config.ts` | Vite dev‑server and production build settings. |

## Build & Deploy (Agent Tasks)
- **Development**: `npm run dev` – starts Vite dev server, watches `src/` and `public/`.
- **Production Build**: `npm run build` – outputs static files to `build/`.
- **GitHub Pages Deploy**: `npm run deploy` – copies `build/` to `gh-pages` branch (requires `gh-pages` package or subtree).

## Runtime Entry Points
1. **`npm run dev`** → Vite serves `public/index.html` ➜ loads bundled `src/app.ts`.
2. **Service Worker** (`public/sw.js`) registers on load for caching.
3. **PWA Manifest** (`public/manifest.json`) enables “Add to Home Screen” on iPhone.

## Important Constants / IDs
- **PWA Start URL**: `/index.html`
- **LocalStorage Key** for persisted session: `tabmate_state`
- **Default Theme**: defined in `config/config.json` under `theme`.

## Agent Modification Checklist
When an agent needs to add a feature or fix a bug:
1. Identify the affected module (e.g., UI component ↔ `src/ui/`, tab logic ↔ `src/tabManager.ts`).
2. Update unit tests in `tests/` matching the changed files.
3. Run `npm run lint && npm run format` to keep style consistent.
4. Re‑build with `npm run build` and, if required, deploy with `npm run deploy`.

---

*Generated for internal AI agents – not intended as a contributor readme.*
