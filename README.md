# Weland

A property & short-stay management **admin dashboard** — a single-page web app for managing
villas, homestays and resorts. Built with React, Vite, TypeScript, Tailwind CSS and React Router,
running entirely on seeded mock data (no backend required for v1).

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL (default **http://localhost:5173**).

## Signing in

The app opens on a login screen. Two demo accounts are seeded (one-click sign-in
buttons are on the login page):

| Role | Email | Password | Sees |
| --- | --- | --- | --- |
| **Super Admin** | `admin@weland.co` | `admin123` | Everything — all 5 properties + Accounting, Reports, Users, Roles |
| **Owner** | `owner@weland.co` | `owner123` | Only their property (Coral Sands Resort) — admin-only pages are hidden and blocked |

Sign out with the **Logout** button (top-right); it clears the session and returns to
the login screen. Sessions persist across refresh via `localStorage`.

Other scripts:

```bash
npm run build     # type-check (tsc -b) + production build to /dist
npm run preview   # serve the production build locally
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
