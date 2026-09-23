# Weland

Everything for **We Land Resort, Kakkadampoyil** on one domain:

| URL | What | Source | Built with |
| --- | --- | --- | --- |
| `/` | Public website | `website/` | Next.js, exported as static HTML |
| `/admin` | Property admin dashboard | `src/`, `public/` | React, Vite, Tailwind, React Router |
| `/api` | Backend for both | `server/api/` | PHP + MySQL |

On the server, all three sit in `public_html` and are routed by `.htaccess` files
(`deploy/.htaccess` at the root, plus one each in `admin/` and `api/`). No Node
process is needed in production.

## How the URLs fit together

- The **website** owns the root. Its enquiry form posts to `POST /api/enquiry`,
  which emails the resort (see *Enquiry email* below).
- The **admin** lives under `/admin`: `vite.config.ts` sets `base: '/admin/'` and
  the router takes its basename from that, so every admin page and asset stays
  under `/admin` (`/admin/login`, `/admin/bookings/…`).
- The **API** stays at `/api`, shared by both.
- The admin used to live at the root, so old bookmarks such as `/login` or
  `/bookings/KV-00012` redirect to the same page under `/admin`.

## Getting started

```bash
npm install                  # admin app, in the repo root
cd website && npm install    # website, inside its own folder
```

(Don't use `npm install --prefix website` from the root: with no package name,
npm installs the root folder itself into the website as a dependency.)

| Command | What it runs |
| --- | --- |
| `npm run dev` | Admin at **http://localhost:5173/admin/** |
| `npm run dev:site` | Website at **http://localhost:3050** |
| `npm run build:all` | Builds both and assembles **`dist/`**, laid out exactly like `public_html` |
| `npm run release` | `build:all`, then zips `dist/` for cPanel into `release/` |
| `npm run preview:all` | Serves `dist/` at **http://localhost:8080** with the production routing (needs `php` on your PATH, e.g. XAMPP) |

In dev, point either app at a running API with `VITE_API_BASE` (admin) or
`NEXT_PUBLIC_API_BASE` (website) in a `.env.local` — for example the live one,
`https://welandresort.com/api`. `preview:all` uses the API in `server/api/`
with your local `server/api/config.php`.

Smoke tests (Playwright for Python; run `preview:all` first):

```bash
python tests/test_routing.py                                   # URL map, API, admin + website together
WELAND_URL=http://localhost:8080 python website/tests/test_site.py   # the website in depth
```

## Deploying (cPanel)

`npm run release` builds everything and writes
`release/welandresort-deploy-YYYYMMDD-HHMM.zip`: upload it to `public_html`,
extract it, delete the zip. **[DEPLOY.md](DEPLOY.md)** has the full steps for
welandresort.com, including the one-time switch from the old admin-only site,
the enquiry email settings and a rollback.

The zip never contains `api/config.php` (the database password, which stays
on the server) or `api/install.php` (the one-time installer, which can wipe the
database). Staff sign in at **https://welandresort.com/admin**.

### Enquiry email

`POST /api/enquiry` needs no session. It validates the form, drops submissions
that fill the hidden honeypot field, and sends a plain-text email with PHP
`mail()`, with the guest's address as Reply-To. Guests only see "Enquiry sent"
if the mail was handed to the server; if `ENQUIRY_TO_EMAIL` is missing or
`mail()` fails, they're asked to call or WhatsApp, and the enquiry is written to
the PHP error log so it isn't lost. For local work, set
`const ENQUIRY_LOG_ONLY = true;` in your local `config.php` to log instead of
mailing.

---

# Admin app

## Signing in

The app opens on a login screen. Two demo accounts are seeded (one-click sign-in
buttons are on the login page):

| Role | Email | Password | Sees |
| --- | --- | --- | --- |
| **Super Admin** | `admin@weland.co` | `admin123` | Everything — all 5 properties + Accounting, Reports, Users, Roles |
| **Owner** | `owner@weland.co` | `owner123` | Only their property (Coral Sands Resort) — admin-only pages are hidden and blocked |

Sign out with the **Logout** button (top-right); it clears the session and returns to
the login screen. Sessions persist across refresh via `localStorage`.

Admin-only scripts:

```bash
npm run build     # type-check (tsc -b) + production build to dist/admin
npm run preview   # serve the admin build alone at http://localhost:4173/admin/
npm run lint      # tsc --noEmit type-check
```

## Features

Twelve fully wired pages, all reading from a single shared mock-data module:

| Page | What it shows |
| --- | --- |
| **Dashboard** | 6 stat tiles, recent bookings & latest enquiries |
| **Properties** | Table with gradient thumbnails, type, location, owner, nightly-from, status |
| **Rooms** | Room types per property with capacity, rate and status |
| **Bookings** | Filter chips (All / Pending / Confirmed / Checked In / Completed / Cancelled) + table |
| **Calendar** | Month grid with per-day occupancy blocks, colour-coded by property |
| **Enquiries** | Filterable list with status badges and reply / call actions |
| **Expenses** | Operating-cost log with a running total |
| **Accounting** | Revenue / Expenses / Net tiles, by-property table, monthly-trend bars |
| **Invoices** | Billing records with status badges and download action |
| **Reports** | Bookings-over-time bar chart + revenue-by-property bars |
| **Users** | Team members with roles and account status |
| **Roles** | Super Admin / Manager / Staff with permission summaries |

Every page uses INR (₹) currency with Indian digit grouping, is fully responsive, and the sidebar
collapses to a hamburger drawer on mobile.

## Project structure

```
src/
├── components/
│   ├── ui/            # Reusable primitives: Card, Badge, Button, Table, StatTile, …
│   ├── Layout.tsx     # App shell (sidebar + topbar + responsive drawer)
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── navItems.ts    # Nav config (routes, labels, icons)
├── data/
│   └── mockData.ts    # All seed data (properties, bookings, expenses, …)
├── lib/
│   ├── format.ts      # INR + date formatting helpers
│   ├── selectors.ts   # Derived aggregations (stats, accounting rows, …)
│   └── status.ts      # Status → badge-tone maps
├── pages/             # One component per route
├── types.ts           # Domain types
└── index.css          # Tailwind v4 theme tokens (Weland palette)
```

## Theme

The Weland palette is defined once as Tailwind v4 `@theme` tokens in `src/index.css`:
cool-grey canvas, terracotta accent (`#E0623D`), ink-slate nav (`#20262E`), soft-tinted status
badges, Space Grotesk headings and Inter body text.
