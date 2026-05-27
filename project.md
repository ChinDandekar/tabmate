# TabMate - Agent Reference Documentation

## Purpose
TabMate is a mobile-first React Progressive Web App for splitting restaurant receipts with friends. It supports receipt image OCR, manual receipt editing, saved contacts, per-person item assignment, payment-link/message generation, paid status tracking, and local history. The app is designed to run as a static GitHub Pages deployment and as an iPhone home-screen PWA.

There is no backend. User data is stored locally in IndexedDB.

## Tech Stack
- React 19 with `react-router-dom` hash routing.
- Vite 8 for development and production builds.
- `vite-plugin-pwa` for generated service worker and web app manifest.
- `idb` for IndexedDB access.
- Tesseract.js is lazy-loaded from the unpkg CDN only when receipt OCR is used.
- Styling is plain CSS utility classes in `src/index.css`; there is no Tailwind build step.

## Quick Navigation
| Path | Description |
|------|-------------|
| `index.html` | Vite HTML entry. Includes iPhone PWA meta tags and `viewport-fit=cover`. |
| `src/main.jsx` | React entry point. Mounts `App` inside `HashRouter` and `SplitProvider`. |
| `src/App.jsx` | Global app shell, sticky safe-area-aware header, route definitions, and settings redirect logic. |
| `src/index.css` | Global theme tokens, reset styles, utility classes, responsive/mobile layout helpers. |
| `src/context/SplitContext.jsx` | In-memory state for the active split workflow. |
| `src/screens/` | Route-level screens for home, scan, edit items, people, assignment, summary, detail, and settings. |
| `src/lib/db.js` | IndexedDB key-value wrapper using `idb`. |
| `src/lib/store.js` | Persistence API for settings, contacts, saved splits, and paid status. |
| `src/lib/ocr.js` | Tesseract loader, OCR runner, and receipt text parser. |
| `src/lib/utils.js` | Currency, rounding, ID, color, phone, initials, and validation helpers. |
| `vite.config.js` | Vite config, `/tabmate/` base path, React plugin, and PWA manifest/workbox settings. |
| `public/icons/` | PWA icons used by the manifest and iPhone home-screen install flow. |
| `dist/` | Generated static build output. Commit/update this when deployment assets should change. |
| `design.md` | Product/design notes. |
| `tabmate-walkthrough.md` | Walkthrough notes for the app. |

## Routes And User Flow
Routes are hash-based so the static GitHub Pages deployment can deep-link safely.

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Redirect logic | Sends configured users to `/home`; sends first-time users to `/settings`. |
| `/home` | `HomeScreen` | Lists saved splits and starts a new split. |
| `/scan` | `ScanScreen` | Accepts receipt photo input and optionally runs OCR. |
| `/items` | `EditItemsScreen` | Edits restaurant name, receipt items, tax, tip, and totals. |
| `/people` | `PeopleScreen` | Adds participants from saved contacts or manual entry. |
| `/assign` | `AssignScreen` | Assigns each receipt item to one or more participants. |
| `/summary` | `SummaryScreen` | Shows per-person breakdowns, saves the split, and creates payment/message actions. |
| `/split/:id` | `SplitDetailScreen` | Displays saved split details and toggles paid status. |
| `/settings` | `SettingsScreen` | Stores owner payment info and saved contacts. |

## State And Persistence
- Active in-progress split data lives in `SplitProvider`.
- Persistent data lives in IndexedDB database `tabmate-db`, object store `keyval`.
- Store keys:
  - `tabmate_settings`: owner display name, Venmo handle, and Zelle contact.
  - `tabmate_contacts`: saved contacts with phone, color, and frequency count.
  - `tabmate_splits`: saved split history, including paid contact IDs.
- `store.js` is the public persistence layer. Prefer using it instead of calling `db.js` directly from screens.

## Layout Notes
- The app is mobile-first and tuned for iPhone PWA usage.
- `index.html` uses `viewport-fit=cover` and `apple-mobile-web-app-status-bar-style=black-translucent`.
- `App.jsx` owns the global shell and header. Safe-area spacing belongs at the shell/header level so the iPhone status bar/camera area does not overlap content.
- The header is sticky and wizard-aware: it shows receipt workflow steps on `/items`, `/people`, `/assign`, and `/summary`; otherwise it shows the settings button.
- Keep repeated UI controls consistent with the existing CSS utility classes in `src/index.css`.

## OCR Notes
- `src/lib/ocr.js` lazy-loads `https://unpkg.com/tesseract.js@5.1.0/dist/tesseract.min.js`.
- OCR will require network access the first time the script is loaded unless it is already cached.
- `parseReceiptText` is heuristic and regex-based. Keep parser changes small and test with realistic receipt text samples.

## Build And Run
- Install dependencies: `npm install`
- Development server: `npm run dev`
- Production build: `npm run build`
- Preview production build: `npm run preview`

Production build output is written to `dist/`. Vite is configured with `base: '/tabmate/'` for GitHub Pages-style hosting.

## Agent Modification Checklist
When making changes:
1. Read the affected screen/component and nearby CSS before editing.
2. Prefer existing utilities, store APIs, and route patterns.
3. Keep mobile and iPhone safe-area behavior in mind for layout changes.
4. Run `npm run build` after source changes.
5. If the change affects deployable assets, keep the regenerated `dist/` output.
6. Do not assume `project.md` paths from older versions; this file reflects the current React PWA structure.
