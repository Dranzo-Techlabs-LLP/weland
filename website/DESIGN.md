# We Land Resort — design notes

## Theme: "Wine & Gild" (custom theme, artifact-theme-styler)

Taken straight from the resort's logo: a maroon badge with a gold monogram.
Colours were sampled from the logo file rather than guessed.

| Token          | Hex       | Role                                              |
|----------------|-----------|---------------------------------------------------|
| Wine           | `#5E2432` | logo maroon — dark panels, footer, primary button |
| Wine deep      | `#451A25` | button hover                                      |
| Gold           | `#E8CF96` | logo gold — accents on wine panels only           |
| Gold deep      | `#856226` | darkened gold, legible on light backgrounds       |
| Ink            | `#2A1D21` | body text (warm, derived from the wine)           |
| Shell          | `#F2ECE9` | page base — wine tinted to a few percent          |
| Paper          | `#FCF9F7` | raised surfaces, hero panel                       |
| Stone          | `#756468` | muted text, hairline rules                        |

Gold is never set on a light background: at logo strength it fails contrast,
so light-background accents use Gold deep instead. Checked ratios (WCAG):
ink/shell 13.9, stone/shell 4.8, gold/wine 7.8, paper/wine 11.3,
gold-deep/shell 4.8 — all at or above AA.

Fonts (Google): **Cormorant Garamond** 500 / italic 400 for display,
**Karla** 400 / 500 / 600 for body and UI. Cormorant is kept from the first
pass because it genuinely matches the engraved serif of the logo wordmark.

## Logo and icons

- `public/images/logo.png` — full badge, cropped to the circle with the
  surrounding white made transparent, 1024px. `logo-512.png` is the hero copy.
- `public/images/emblem.png` — the inner W monogram only, used as the small
  brand mark in the nav, mobile menu and footer, where the badge's own text
  would be too small to read.
- `src/app/icon.png`, `apple-icon.png`, `favicon.ico` — the emblem again.
  Next.js App Router picks these up automatically; no metadata code needed.

## Layout concept

Left-aligned, editorial. The hero is split 5/7: a paper panel on the left
carrying the logo badge and the display line, a full-height photo on the
right, and a reservation strip docked beneath both. That strip is the
primary CTA.

```
| (W) We Land   Stays  Conference hall  Dining  …       [Reserve a stay]  |
|------------------------------------|-----------------------------------|
|  [ logo badge ]                    |                                   |
|  A hilltop in Kakkadampoyil,       |        hero photo panel           |
|  above the mist.        (display)  |                                   |
|  short note + two buttons          |                                   |
|------------------------------------|-----------------------------------|
| Check-in [   ]  Check-out [   ]  Guests [ ]      [Check availability]  |
|------------------------------------------------------------------------|
| About — facts list + claim                                              |
| Above the mist — pinned aerial photo; scroll sinks the morning cloud    |
| Stays — rooms band (+ room-by-room grid), dormitory band                |
| Conference hall — text + facts, main photo + three details              |
| Dining · Gallery (dense 4-col) · Getting here (map + route table)       |
| Enquire — wine panel, gold accents, form pre-filled from the strip      |
| Footer                                                                   |
```

## Principles

- The logo carries the name, so the hero display line says something else.
  The name is never set three times in one screen.
- Spend boldness once: the wine display line and the gold CTA on the dark
  panel. Everything else quiet.
- No cards. Content sits in bands and lists; 1px rules appear only where
  they separate data (spec tables, route table).
- Sentence case everywhere. No all-caps labels, no eyebrows, no "→" on links.
- Motion: spent once, on "Above the mist". Scrolling starts inside a morning
  cloud and sinks it into the valley until the resort stands clear on its
  hilltop: volumetric fog (WebGL2, ray-marched) over the real aerial photo, lit
  in the photo's own blue-hour colours so the two read as one picture. Natural,
  not illustrated: no drawn clouds or models. Elsewhere motion stays small (the
  hero photo drifts, room and hall photos settle, gallery tiles reveal) and
  answers clicks (the strip scrolling to the form, the mobile menu).
- Reduced motion gets the still, clear view with all three lines; devices
  without WebGL2 get a soft CSS mist that clears the same way.

## Reviewed against the generic default

The first pass reached for cream + high-contrast serif + terracotta, and a
dark full-bleed photo hero with centred copy (which the Kakkadampoyil Villas
reference already does). That was replaced with a light, split, left-aligned
hero. This pass then re-based the whole palette on the client's own logo,
which is the brief pinning the direction down — so the warm base is earned
here rather than defaulted to, and it is a wine-tinted shell rather than the
usual `#F4F1EA` cream.
