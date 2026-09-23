# We Land Resort — website

The public site at **`/`**. Next.js 16 (App Router) · React 19 · plain CSS with
the "Wine & Gild" theme built from the resort's logo (see `DESIGN.md`).

It is exported as static HTML (`output: "export"`), so production needs no Node
process: `npm run build:all` in the repo root puts it at the root of `dist/`,
beside the admin app (`/admin`) and the PHP API (`/api`). See the root README
for the URL map and deployment.

Sections: split hero with booking strip → about → stays (six rooms, dormitory)
→ conference hall → a day here → dining → gallery → getting here → enquiry
form → footer, plus a WhatsApp link.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3050
```

The enquiry form posts to `/api/enquiry`, which the Next dev server doesn't
have. To try the form in dev, set `NEXT_PUBLIC_API_BASE` in `.env.local` (see
`.env.local.example`), or run the whole site with `npm run build:all` and
`npm run preview:all` from the repo root.

## Test

Playwright smoke test (page renders, "Check availability" pre-fills and scrolls
to the form, the form submits through the API, mobile has no overflow).
Screenshots land in `tests/screenshots/`.

```bash
pip install playwright && python -m playwright install chromium   # once
WELAND_URL=http://localhost:8080 python tests/test_site.py        # against preview:all
```

## Content and photos

Everything editable is in `src/lib/content.ts`. Photos are pre-sized web copies
(max 2,400px, JPEG q80) under `public/images/`, made from the originals in
`Downloads/WE LAND IMAGES/`:

| Source folder | Used for |
|---------------|----------|
| `GEN`  | hero (sky deck at sunset), about (aerial), dining (deck table), gallery (11 photos) |
| `A1`–`A6` | "The Rooms" band and the room-by-room grid (one photo per room) |
| `DOM`  | "The Dormitory" band (bunks, exterior, deck at dusk, washrooms) |
| `HALL` | conference hall (wide shot, stage wall, carrom/seating, washrooms) |

The logo badge, the W-monogram emblem and the favicons (`src/app/icon.png`,
`apple-icon.png`, `favicon.ico`) were generated from the resort's logo.

Still marked **PLACEHOLDER** in `content.ts`: phone, WhatsApp number, email,
the resort's own Google Maps link and pin, all rates, the dormitory bed count,
the hall seat count and projector availability. The room-by-room notes were
written from the photos and should be checked by the resort.

## Enquiry email

Handled by the PHP API (`server/api/index.php`, route `POST /api/enquiry`) and
configured in the server's `api/config.php`. See the root README.
