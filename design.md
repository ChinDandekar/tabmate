# TabMate — Personal Tool Spec

**Version:** 0.2 (Personal Use)
**Last Updated:** May 2026
**Status:** Pre-Development

---

## 1. What This Is

A personal web app saved to your iPhone home screen. No App Store, no accounts, no backend required. You open it like an app, split the bill, and it opens iMessage pre-filled for each person. Everything runs in the browser.

---

## 2. Core User Flow

```
1. Open TabMate (home screen icon) → Tap "New Split"
2. Take photo of receipt OR upload from camera roll
3. OCR parses line items, prices, tax, tip
4. Add people from your phone (name + number saved in app)
5. Tap items → assign to each person
6. Set tip split method (proportional or even)
7. Review each person's total
8. Tap a person → iMessage opens pre-written with their amount + your Venmo/Zelle
9. Hit send. Repeat for each person.
10. Done.
```

---

## 3. Tech Stack (Simple, Personal)

| Need | Solution |
|---|---|
| App shell | PWA (Progressive Web App) — runs in Safari, saved to home screen |
| Receipt OCR | Tesseract.js (runs in-browser, no server needed) |
| Camera access | Browser `<input capture="environment">` |
| Contacts | In-app saved list (localStorage) — iOS Safari blocks native Contacts API for PWAs |
| Storage | localStorage (your phone only, persists between sessions) |
| SMS pre-fill | `sms:+1XXXXXXXXXX&body=...` URL scheme → opens iMessage |
| Hosting | GitHub Pages (free) — push code, app updates instantly at `yourusername.github.io/tabmate` |
| Code | Plain HTML + JavaScript — no frameworks needed |

---

## 4. Features

### 4.1 Receipt Scanning
- Tap to open camera or pick from camera roll
- Tesseract.js reads the receipt and extracts line items + prices
- Editable table: fix any OCR errors, rename items, delete rows, add rows manually
- Tax and tip auto-detected or manually entered

### 4.2 People
- Saved contacts stored in the app (name + phone number) — one-time setup
- iPhone Contacts API not available in Safari PWAs; no native contacts access
- Add new person inline during a split in under 10 seconds (name + phone, that's it)
- "Frequent crew" sorted by how often they appear in splits — your regulars float to the top automatically
- Edit or delete saved people from Settings

### 4.3 Item Assignment
- Tap an item → tap a person to assign
- Multi-person item splitting (shared appetizer, bottle of wine, etc.)
- Color-coded avatars per person
- Running total shown per person as you assign

### 4.4 Tip & Tax
- Proportional (default) or even split
- Adjust tip % or dollar amount
- You (the payer) are excluded from owing anything

### 4.5 Auto-Text via iMessage
Tapping a person opens iMessage pre-filled:

> Hey Sarah! From dinner tonight 🍽️
> Salmon sashimi – $22.00
> House sake – $14.00
> Your share: $36.00 + $4.50 tip + $3.10 tax = **$43.60**
>
> Venmo: @yourhandle
> Zelle: 415-555-0101
>
> Thanks! 🙏

- Uses the `sms:` URL scheme — native iMessage opens with message pre-written
- You just hit Send
- One tap per person

### 4.6 Your Payment Info
- Stored once in Settings: Venmo handle, Zelle phone/email
- Appended to every message automatically

### 4.7 Split History
- Past splits saved in localStorage
- See date, restaurant name, total, who was there
- Tap to see breakdown (read-only)
- Manually mark people as paid

---

## 5. Out of Scope (Personal Tool)

- Android support (Safari PWA is fine for your own iPhone)
- Any backend or server
- Real payment integration
- Push notifications
- Multi-user / shared access
- App Store submission

---

## 6. Screens

1. **Home** — recent splits + "New Split" button
2. **Scan Receipt** — camera / upload
3. **Edit Items** — review/fix OCR output
4. **Add People** — pick from saved or add new
5. **Assign Items** — tap-to-tag interface
6. **Tip & Tax** — totals review, adjust tip
7. **Send** — per-person summary, tap to open iMessage
8. **Settings** — your Venmo/Zelle, display name

---

## 7. Data (localStorage)

```json
{
  "settings": {
    "venmo": "@yourhandle",
    "zelle": "415-555-0101",
    "name": "Your Name"
  },
  "contacts": [
    { "id": "1", "name": "Sarah", "phone": "+14155550101", "splitCount": 7 }
  ],
  "splits": [
    {
      "id": "abc123",
      "date": "2026-05-26",
      "restaurant": "Nobu",
      "total": 187.50,
      "people": ["Sarah", "Mike", "Jess"],
      "paid": ["Sarah"]
    }
  ]
}
```

---

## 8. Build Order

| Step | What |
|---|---|
| 1 | Settings screen (Venmo/Zelle) + localStorage |
| 2 | Saved contacts list + add/edit |
| 3 | Manual item entry + assignment UI |
| 4 | iMessage pre-fill + send flow |
| 5 | Receipt OCR (camera → Tesseract.js) |
| 6 | Split history |
| 7 | PWA manifest + home screen icon |

Start with Step 3–4 so the core loop works even before OCR is wired up.

---

## 9. Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| In-app contacts instead of native iPhone Contacts | Safari PWAs cannot access the iOS Contacts API. Native access requires a $99/yr Apple Developer account + Xcode. In-app saved list is the right tradeoff for a personal tool — one-time setup, same 10–15 people 90% of the time. |
| PWA over TestFlight/native | TestFlight requires the same $99 Apple Developer account as the App Store. PWA is free, buildable in an afternoon, and covers all core needs. |
| iMessage via `sms:` URL scheme | PWAs cannot send messages silently. `sms:` opens Messages pre-written; user taps Send. ~3 taps per person is acceptable for a personal tool. |
| GitHub Pages for hosting | Free, zero infrastructure, instant updates on push. URL format: `yourusername.github.io/tabmate`. Adding to iPhone home screen via Safari Share → "Add to Home Screen" gives full-screen PWA experience. |

---

## 10. Dev Setup & Deployment

### Toolchain
- **Editor:** VS Code (free, mac/windows/linux)
- **Version control:** Git + GitHub (free)
- **Hosting:** GitHub Pages (free, automatic)
- **Local testing:** Open `index.html` directly in Chrome or Safari — no local server needed for basic dev

### One-Time GitHub Pages Setup
1. Create a free account at github.com
2. Create a new repository named `tabmate`
3. Push your code files (`index.html`, `manifest.json`, etc.)
4. Go to repo Settings → Pages → set Source to `main` branch → Save
5. GitHub gives you a URL: `https://yourusername.github.io/tabmate`
6. Open that URL in Safari on your iPhone → tap Share → "Add to Home Screen"
7. TabMate icon now lives on your home screen like a native app

### Deploying Updates
```
git add .
git commit -m "what you changed"
git push
# App updates live within ~30 seconds
```

### File Structure
```
tabmate/
├── index.html        # Main app shell + all UI
├── manifest.json     # PWA config (name, icon, colors)
├── icon.png          # Home screen icon (512x512)
└── app.js            # All logic (can inline in HTML to start)
```

---

## 11. Open Questions

1. **OCR quality** — Tesseract.js works well on clean receipts but struggles with crumpled/dark ones. Manual entry is the fallback; worth building that first.
2. **iMessage scheme on iOS** — `sms:` pre-filled body needs `&body=` URL encoding. Needs testing on your specific iOS version.