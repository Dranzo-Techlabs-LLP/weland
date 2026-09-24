# We Land Resort — website

The public site at **`/`**. Next.js 16 (App Router) · React 19 · plain CSS with
the "Wine & Gild" theme built from the resort's logo (see `DESIGN.md`).

It is exported as static HTML (`output: "export"`), so production needs no Node
process: `npm run build:all` in the repo root puts it at the root of `dist/`,
beside the admin app (`/admin`) and the PHP API (`/api`). See the root README
for the URL map and deployment.

Sections: split hero with booking strip → about → above the mist → stays (six
rooms, dormitory) → conference hall → gallery → getting here → enquiry form →
footer, plus a WhatsApp button.

"Above the mist" is the one big motion moment. As you scroll, the morning cloud
over the aerial photo sinks into the valley and the resort comes up through it.
The fog is ray-marched in WebGL2 (`src/components/mist/`). There's no 3D library,
and it only draws while the section is on screen. Scroll effects use GSAP
ScrollTrigger. With reduced motion you get the still photo; without WebGL2 a
CSS mist does the same job.

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
to the form, the form submits through the API, mobile has no overflow), and a
motion test (the fog covers the view at the start and clears off the resort by
the end, scroll effects, phone/tablet/wide layouts, reduced motion, no WebGL).
Screenshots land in `tests/screenshots/`.

```bash
pip install playwright pillow && python -m playwright install chromium   # once
WELAND_URL=http://localhost:8080 python tests/test_site.py        # against preview:all
WELAND_URL=http://localhost:8080 python tests/test_motion.py
```

## Content and photos

Everything editable is in `src/lib/content.ts`. Photos are pre-sized web copies
(max 2,400px, JPEG q80) under `public/images/`, made from the originals in
`Downloads/WE LAND IMAGES/`:

| Source folder | Used for |
|---------------|----------|
| `GEN`  | hero (sky deck at sunset), above the mist (aerial), gallery (12 photos, incl. the deck table and the building by day) |
| `A1`–`A6` | "The Rooms" band and the room-by-room grid (one photo per room) |
| `DOM`  | "The Dormitory" band (bunks, exterior, deck at dusk, washrooms) |
| `HALL` | conference hall (wide shot, stage wall, carrom/seating, washrooms) |

The logo badge, the W-monogram emblem and the favicons (`src/app/icon.png`,
`apple-icon.png`, `favicon.ico`) were generated from the resort's logo.

The featured gallery photo (`resort-dusk-mist.jpg`, the resort from the air at
dusk) was supplied separately.

Contact details in `content.ts`: bookings and WhatsApp on +91 90744 24142,
check-in 3:00 pm, check-out 12:00 noon, and the address, map and "Open in
Google Maps" link from the resort's Google Maps listing.

The "Getting here" distances are measured from the map pin and the times are
estimates for the hill road: worth confirming with the resort.

Still marked **PLACEHOLDER** in `content.ts`: email, all rates, the dormitory bed count,
the hall seat count and projector availability. The room-by-room notes were
written from the photos and should be checked by the resort.

## Enquiry email

Handled by the PHP API (`server/api/index.php`, route `POST /api/enquiry`) and
configured in the server's `api/config.php`. See the root README.
