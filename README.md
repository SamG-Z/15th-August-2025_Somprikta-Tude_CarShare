# CartShare

A collaborative, real-time group shopping cart. Create a room, share the code with your roommates or group, and everyone adds, removes and adjusts items on one shared list — with a live activity log and a printable receipt at the end.

Built for the CartShare internship/course project brief.

## Live demo

_Add your deployed URL here once published (see steps below), e.g._
`https://samg-z.github.io/15th-August-2025_Somprikta-Tude_CarShare/`

## Run it locally

No build step, no dependencies, no server required.

1. Download or clone this repository.
2. Open `index.html` directly in your browser (double-click it, or right-click → Open with → your browser).
3. To test the "multiple people in one room" flow, open the same `index.html` in **two separate browser tabs** (or two windows), log in with a different name in each, and join the same room code in both.

That's it — the app runs entirely client-side.

## Features implemented

- **Login** — enter a name and mobile number to identify yourself for the session (`js/app.js`, stored in `sessionStorage` so each tab can act as a different person).
- **Create / Join a room** — a room gets a random 6-character code; anyone with the code can join the same shared cart.
- **Shared cart** — add items with quantity and price, increment/decrement quantity, remove items. All changes are stored in `localStorage` under the room's code.
- **Real-time sync across tabs** — a `storage` event listener re-renders the cart the moment another tab (i.e. another "user") changes it, with a periodic refresh as a safety net.
- **Activity log** — a running feed of who added, removed or joined, with relative timestamps.
- **Free-delivery progress bar** — tracks the cart subtotal against a $75 free-delivery threshold.
- **Responsive design** — CSS Grid/Flexbox layout that adapts from mobile to desktop (see `css/style.css`).
- **Printable receipt** — the "Print receipt" button opens the browser print dialog with a clean, non-UI receipt layout (CSS `@media print` rules).

## Project structure

```
cartshare/
├── index.html        # markup for login, room, and cart screens
├── css/
│   └── style.css      # all styling, responsive rules, print rules
├── js/
│   └── app.js          # app logic: state, rendering, room sync
├── assets/
│   └── favicon.svg     # cart emoji favicon
└── README.md
```

## How data & "real-time" sync work

There's no backend — the brief calls for browser storage and tab-to-tab sync, not a server:

- `localStorage` holds each room's cart, member list and activity log, keyed by room code.
- `sessionStorage` holds the current tab's logged-in identity, so opening several tabs and logging into each as a different person simulates several shoppers in the same room.
- The `storage` event fires in every other open tab whenever `localStorage` changes, which is what makes the cart update live without a page refresh.

## Notes

- Free-delivery threshold is set to $75 in `js/app.js` (`THRESHOLD` constant) — change it there if needed.
- No external services or API keys are required.
