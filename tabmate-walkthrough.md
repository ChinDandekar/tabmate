# TabMate — Walkthrough

I have successfully built and verified the entire PWA check-splitting tool **TabMate** (styled as **SplitTab** to match Figma's visual specs) using clean, modular vanilla JavaScript, CSS variables, and HTML.

---

## 🎨 Visual Identity & Theme (Figma Inspired)

The visual design is directly inspired by the Figma premium workspace and features a warm light theme with a dark mode option:
- **Cream & Charcoal color palette:** A gorgeous `#F5F0E8` canvas with a `#1C1A16` primary charcoal color and a signature olive green `#4A6741` accent.
- **Boutique menu typography:** Uses `'Libre Baskerville'` serifs for titles and branding, `'DM Mono'` for pricing grids, and `'Inter'` for UI controls.
- **Modern components:** Soft rounded card corners (`0.625rem`), high-contrast participant initial badges with a deterministically chosen warm color scheme, and fluid micro-interactions.

---

## 📁 File Structure Created

The project is structured cleanly without complex bundlers or build tools, utilizing native browser ES modules:

```
tabmate/
├── index.html           # Main shell SPA markup (contains all step wizard panels)
├── css/
│   └── style.css        # Full CSS design system, Figma color tokens, responsive layouts
├── js/
│   ├── app.js           # Core router, step controllers initializer, split state manager
│   ├── store.js         # localStorage wrapper (CRUD settings, contacts list, splits history)
│   ├── utils.js         # Rounding engines, UUID generators, phone/Venmo formats, initials avatar makers
│   ├── ocr.js           # Tesseract.js lazy-loader wrapper & heuristic receipt parser
│   └── screens/
│       ├── home.js      # Recent splits history & "New Split" launch controller
│       ├── scan.js      # OCR image capture (camera environment or file picker) loader
│       ├── editItems.js # "Receipt" step: item name/price table editor, tax/tip modifiers
│       ├── people.js    # "People" step: participant selectors & "Frequent crew" chips toggles
│       ├── assign.js    # "Assign" step: tap-to-allocate items, automatic cost division
│       ├── summary.js   # "Summary" step: per-person details, prefilled iMessage deep links
│       ├── splitDetail.js # Read-only view for past check details, paid toggles, delete check records
│       └── settings.js  # Settings tab: owner's Venmo/Zelle detail logs & saved contacts CRUD
├── manifest.json        # PWA configuration for iPhone standalone installation
├── sw.js                # Cache-first offline service worker
├── icons/
│   ├── icon-192.png     # Custom generated logo off-white icon (192x192)
│   └── icon-512.png     # Custom generated logo splash icon (512x512)
└── tests/
    └── test-logic.mjs   # 61 assertions testing the non-UI backend suite
```

---

## 🧪 Logic Layer Verification

All **61 assertions** in our logic validation engine pass flawlessly. This tests:
1. **LocalStorage Store:** Verifies Settings, Contacts, Splits CRUD operations and newest-first split ordering.
2. **Penny-Perfect Calculations:** Verifies proportional tax/tip allocations and shared item cost splits, with a rounding drift fixer correcting fractions (e.g., $10 split 3 ways sums exactly to $10.00).
3. **iMessage prefilled sms: Links:** Validates E.164 phone normalization, Venmo/Zelle detail appending, and URL body encoding.
4. **Receipt Heuristics:** Validates receipt keyword detections for tax, tip, and subtotal lines.

---

## 🚀 How to Launch and Test Deployed Updates

1. **Locally:**
   - Double-click [index.html](file:///Users/chinmaydandekar/Desktop/q/random-cs-projects/tabmate/index.html) or run a simple local server to open the PWA instantly in your browser.
2. **On iPhone (PWA Installation):**
   - Push the codebase to your repository:
     ```bash
     git add .
     git commit -m "feat: complete SplitTab figma visual specs and modular controllers"
     git push
     ```
   - Enable GitHub Pages (Pages -> Source -> `main` branch -> `/root`).
   - Open your deployed URL `https://yourusername.github.io/tabmate` in Safari on iPhone.
   - Tap **Share ➜ Add to Home Screen** to install **TabMate** onto your device as a full-screen, offline-capable app!
