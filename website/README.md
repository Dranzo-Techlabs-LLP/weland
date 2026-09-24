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

Sending the enquiry form opens WhatsApp with the guest's details written out,
addressed to the booking number; the guest presses send there. It also posts a
copy to `/api/enquiry`, which the Next dev server doesn't have (the copy is
simply dropped in dev). To try that part, set `NEXT_PUBLIC_API_BASE` in
`.env.local` (see `.env.local.example`), or run the whole site with
`npm run build:all` and `npm run preview:all` from the repo root.

Every photo (gallery, rooms, dormitory, hall) opens full screen as a slideshow
of its group, with `yet-another-react-lightbox` as on the Kakkadampoyil Villas
site. The gallery shows each photo whole, in justified rows that run edge to
edge (`src/components/GalleryRows.tsx`).

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
| `GEN`  | hero (sky deck at sunset), above the mist (aerial), and the gallery: every GEN photo, shown whole |
| `A1`–`A6` | "The Rooms" band and the room-by-room grid (one photo per room) |
| `DOM`  | "The Dormitory" band (bunks, exterior, deck at dusk, washrooms) |
| `HALL` | conference hall (wide shot, stage wall, carrom/seating, washrooms) |

The logo badge, the W-monogram emblem and the favicons (`src/app/icon.png`,
`apple-icon.png`, `favicon.ico`) were generated from the resort's logo.

The featured gallery photo (`resort-dusk-mist.jpg`, the resort from the air at
dusk) was supplied separately.

Contact details in `content.ts`: bookings and WhatsApp on +91 90744 24142,
email welandresort0072@gmail.com, Instagram @weland.resort, check-in 3:00 pm,
check-out 12:00 noon, and the address, map and "Open in Google Maps" link from
the resort's Google Maps listing. Rooms are A1-A4, B1 and B2 (as in the admin),
all non-AC; the dormitory is air-conditioned, with 16 bunk beds.

The "Getting here" distances are measured from the map pin and the times are
estimates for the hill road: worth confirming with the resort.

Still marked **PLACEHOLDER** in `content.ts`: all rates, the hall seat count and
projector availability. The room-by-room notes were
written from the photos and should be checked by the resort.

## Enquiries

Guests send them on WhatsApp (see above). The copy that reaches the PHP API
(`server/api/index.php`, route `POST /api/enquiry`) is emailed to
`ENQUIRY_TO_EMAIL` in the server's `api/config.php` when that is set (e.g. to
welandresort0072@gmail.com), and otherwise written to the API's error log.
See the root README.
