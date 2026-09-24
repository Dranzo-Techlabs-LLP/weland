"""Tests for the fog over the resort, the scroll effects and the responsive layouts.

Run against a running site (dev server or the production preview):

    WELAND_URL=http://localhost:8080 python tests/test_motion.py

Chromium is started with SwiftShader so WebGL works in headless mode. Screenshots
of the flight and the layouts are saved under tests/screenshots/. The checks that
look at the rendered fog itself need Pillow (pip install pillow); without it they
are skipped.
"""

import io
import os
import sys

from playwright.sync_api import sync_playwright

try:
    from PIL import Image, ImageStat
except ImportError:  # the pixel checks are skipped
    Image = None

sys.stdout.reconfigure(errors="replace")

BASE = os.environ.get("WELAND_URL", "http://localhost:3050").rstrip("/")
OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)
WEBGL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

failures = []


def check(label, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {label}{'  ' + detail if detail else ''}")
    if not ok:
        failures.append(label)


def open_page(browser, width, height, touch=False, **kw):
    ctx = browser.new_context(viewport={"width": width, "height": height}, is_mobile=touch, has_touch=touch, **kw)
    # Note when the fog's canvas first appears, to compare with the page's load time.
    ctx.add_init_script(
        "new MutationObserver(() => { if (!window.__fogAt && document.querySelector('.mist-clouds'))"
        " window.__fogAt = performance.now(); }).observe(document, { childList: true, subtree: true });"
    )
    page = ctx.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(900)
    return page


def js(page, code):
    return page.evaluate(code)


def top_of(page, selector):
    return js(page, f"document.querySelector('{selector}').getBoundingClientRect().top + scrollY")


def overflow(page):
    return js(page, "document.documentElement.scrollWidth - document.documentElement.clientWidth")


def gallery_rows_full(page):
    """Every column of the gallery ends at the same line (no gaps, no ragged end).
    Uses layout boxes, so tiles still waiting to be revealed don't skew it."""
    return js(page, """(() => {
      const items = [...document.querySelectorAll('.gallery-item')].map(e => ({ left: e.offsetLeft, bottom: e.offsetTop + e.offsetHeight }));
      const bottom = Math.max(...items.map(i => i.bottom));
      const cols = {};
      items.forEach(i => { cols[i.left] = Math.max(cols[i.left] || 0, i.bottom); });
      const ends = Object.values(cols);
      return { columns: ends.length, full: ends.every(b => Math.abs(b - bottom) <= 1) };
    })()""")


def detail(page, box):
    """How much fine detail a screen region has: fog is smooth, the photo is not."""
    shot = page.screenshot(clip=box)
    return ImageStat.Stat(Image.open(io.BytesIO(shot)).convert("L")).stddev[0]


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=WEBGL)

    # ---------- desktop: the flight above the mist ----------
    page = open_page(browser, 1440, 900)
    check("page marks itself as JavaScript-enabled", js(page, "document.documentElement.classList.contains('js')"))
    section = js(page, "(() => { const r = document.getElementById('above-the-mist').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; })()")
    check("fog section has a scroll runway", section["h"] > 2 * 900, f"{section['h']:.0f}px tall")
    timing = js(page, "({ fog: window.__fogAt || null, loaded: performance.getEntriesByType('navigation')[0].loadEventEnd })")
    check("fog is built only after the page has loaded", timing["fog"] is None or timing["fog"] > timing["loaded"], str(timing))

    def fly_to(progress):
        page.evaluate(f"scrollTo(0, {section['top'] + (section['h'] - 900) * progress})")
        page.wait_for_timeout(2600)
        return js(page, "[...document.querySelectorAll('.mist-beat')].map(b => +getComputedStyle(b).opacity)")

    beats = fly_to(0)
    check("fog canvas is created near the section", js(page, "!!document.querySelector('.mist-clouds')"))
    try:  # the noise volume is built in slices; wait for the first frame
        page.wait_for_function("document.querySelector('.mist-stage').classList.contains('is-clouded')", timeout=20000)
    except Exception:
        pass
    check("fog draws, and the simple mist steps aside", js(page, "document.querySelector('.mist-stage').classList.contains('is-clouded')"))
    check("inside the cloud: first line showing", beats[0] > 0.9 and beats[2] < 0.1, str(beats))
    page.wait_for_timeout(1200)  # let the simple mist finish fading out
    if Image:
        inside = detail(page, {"x": 420, "y": 330, "width": 600, "height": 400})
        check("inside the cloud: the view is soft fog", inside < 14, f"detail {inside:.1f}")
    page.screenshot(path=os.path.join(OUT, "flight-start.png"))
    beats = fly_to(0.5)
    check("halfway: second line showing", beats[1] > 0.9 and beats[0] < 0.1, str(beats))
    page.screenshot(path=os.path.join(OUT, "flight-middle.png"))
    beats = fly_to(1)
    check("above the mist: last line showing", beats[2] > 0.9 and beats[1] < 0.1, str(beats))
    label = js(page, "(() => { const l = document.querySelector('.mist-label'); const r = l.querySelector('span').getBoundingClientRect(); return { o: +getComputedStyle(l).opacity, x: r.left + r.width / 2, y: r.top }; })()")
    check("resort label shows over the hilltop", label["o"] > 0.9 and 200 < label["x"] < 1240 and 100 < label["y"] < 850, str(label))
    if Image:
        resort = detail(page, {"x": label["x"] - 150, "y": label["y"] + 60, "width": 300, "height": 220})
        check("above the mist: the resort stands clear of the fog", resort > 30, f"detail {resort:.1f}")
    page.screenshot(path=os.path.join(OUT, "flight-end.png"))

    # ---------- desktop: scroll effects ----------
    page.evaluate("scrollTo(0, 0)"); page.wait_for_timeout(500)
    before = js(page, "getComputedStyle(document.querySelector('[data-hero-parallax]')).transform")
    page.evaluate("scrollTo(0, 500)"); page.wait_for_timeout(600)
    after = js(page, "getComputedStyle(document.querySelector('[data-hero-parallax]')).transform")
    check("hero photo drifts with scroll", before != after, f"{before} -> {after}")

    stay = top_of(page, ".stay-main")
    page.evaluate(f"scrollTo(0, {stay - 900 * 0.85})"); page.wait_for_timeout(1300)
    tilted = js(page, "getComputedStyle(document.querySelector('.stay-main')).transform")
    page.evaluate(f"scrollTo(0, {stay - 900 * 0.3})"); page.wait_for_timeout(1500)
    flat = js(page, "getComputedStyle(document.querySelector('.stay-main')).transform")
    check("room photo stands up from a tilt", tilted.startswith("matrix3d") and tilted != flat, tilted[:60])
    check("room photo ends flat", flat in ("none", "matrix(1, 0, 0, 1, 0, 0)") or flat.startswith("matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,"), flat[:60])

    gallery = top_of(page, ".gallery-grid")
    hidden = js(page, "[...document.querySelectorAll('.gallery-item')].filter(e => +getComputedStyle(e).opacity < 0.5).length")
    page.evaluate(f"scrollTo(0, {gallery - 400})"); page.wait_for_timeout(1800)
    shown = js(page, "[...document.querySelectorAll('.gallery-item')].slice(0, 4).every(e => +getComputedStyle(e).opacity > 0.95)")
    check("gallery tiles wait below the fold, then reveal", hidden > 0 and shown, f"{hidden} waiting")

    rows = gallery_rows_full(page)
    check("desktop: gallery rows are all full", rows["full"] and rows["columns"] == 4, str(rows))

    check("no page errors (desktop)", not page.errors, "; ".join(page.errors)[:300])
    page.context.close()

    # ---------- layouts ----------
    phone = open_page(browser, 390, 844, touch=True, device_scale_factor=2)
    check("phone: no horizontal overflow", overflow(phone) <= 0 and js(phone, "innerWidth") == 390, f"{overflow(phone)}px")
    check("phone: menu button on screen", js(phone, "document.querySelector('.nav-toggle').getBoundingClientRect().right") <= 390)
    check("phone: hero photo comes first", js(phone, "document.querySelector('.hero-media').getBoundingClientRect().top < document.querySelector('.hero-display').getBoundingClientRect().top"))
    rooms = js(phone, "(() => { const g = document.querySelector('.units-grid'); return { scroll: g.scrollWidth > g.clientWidth + 100, snap: getComputedStyle(g).scrollSnapType }; })()")
    check("phone: rooms become a swipeable row", rooms["scroll"] and "x" in rooms["snap"], str(rooms))
    check("phone: WhatsApp button is icon-only", js(phone, "document.querySelector('.wa').getBoundingClientRect().width") <= 56)
    rows = gallery_rows_full(phone)
    check("phone: gallery rows are all full", rows["full"] and rows["columns"] == 2, str(rows))
    phone.screenshot(path=os.path.join(OUT, "layout-phone.png"))
    check("no page errors (phone)", not phone.errors, "; ".join(phone.errors)[:300])
    phone.context.close()

    fold = open_page(browser, 280, 653, touch=True)
    check("280px (folded phone): no horizontal overflow", overflow(fold) <= 0 and js(fold, "innerWidth") == 280, f"{overflow(fold)}px")
    fold.context.close()

    land = open_page(browser, 844, 390, touch=True)
    cols = js(land, "getComputedStyle(document.querySelector('.hero')).gridTemplateColumns.split(' ').length")
    check("landscape phone: hero side by side", cols == 2 and overflow(land) <= 0, f"{cols} columns")
    rows = gallery_rows_full(land)
    check("landscape phone: gallery rows are all full", rows["full"] and rows["columns"] == 3, str(rows))
    land.screenshot(path=os.path.join(OUT, "layout-landscape.png"))
    land.context.close()

    tablet = open_page(browser, 1024, 768)
    nav = js(tablet, "({ links: getComputedStyle(document.querySelector('.nav-links')).display, toggle: getComputedStyle(document.querySelector('.nav-toggle')).display, cta: getComputedStyle(document.querySelector('.nav-cta')).display })")
    check("tablet: menu instead of a wrapping nav", nav["links"] == "none" and nav["toggle"] != "none" and nav["cta"] != "none", str(nav))
    tablet.context.close()

    wide = open_page(browser, 1920, 1080)
    edges = js(wide, "({ brand: document.querySelector('.nav .brand').getBoundingClientRect().left, hero: document.querySelector('.hero-display').getBoundingClientRect().left })")
    check("1920px: hero text lines up with the nav", abs(edges["brand"] - edges["hero"]) <= 2, str(edges))
    wide.context.close()

    # ---------- reduced motion ----------
    calm = open_page(browser, 1440, 900, reduced_motion="reduce")
    calm.evaluate(f"scrollTo(0, {top_of(calm, '#above-the-mist')})")
    # The photo loads lazily; on a slow server that can take a few seconds.
    try:
        calm.wait_for_function("(() => { const i = document.querySelector('.mist-photo'); return i.complete && i.naturalWidth > 0; })()", timeout=20000)
    except Exception:
        pass
    state = js(calm, """({ h: document.getElementById('above-the-mist').getBoundingClientRect().height,
        beats: [...document.querySelectorAll('.mist-beat')].every(b => +getComputedStyle(b).opacity > 0.95),
        photo: (() => { const i = document.querySelector('.mist-photo'); return i.complete && i.naturalWidth > 0; })(),
        fog: !!document.querySelector('.mist-clouds'),
        veil: +getComputedStyle(document.querySelector('.mist-veil')).opacity,
        parallax: getComputedStyle(document.querySelector('[data-hero-parallax]')).transform,
        waiting: [...document.querySelectorAll('.gallery-item, .unit')].filter(e => +getComputedStyle(e).opacity < 1).length })""")
    check("reduced motion: no scroll runway, all lines shown", state["h"] < 900 and state["beats"], f"{state['h']:.0f}px")
    check("reduced motion: the clear view, no fog", state["photo"] and not state["fog"] and state["veil"] == 0, str(state))
    check("reduced motion: nothing drifts or waits to appear", state["parallax"] == "none" and state["waiting"] == 0, str(state))
    calm.screenshot(path=os.path.join(OUT, "reduced-motion.png"))
    check("no page errors (reduced motion)", not calm.errors, "; ".join(calm.errors)[:300])
    calm.context.close()
    browser.close()

    # ---------- no WebGL ----------
    plain = p.chromium.launch(headless=True, args=["--disable-webgl", "--disable-3d-apis"])
    page = open_page(plain, 1440, 900)
    section = js(page, "(() => { const r = document.getElementById('above-the-mist').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; })()")
    page.evaluate(f"scrollTo(0, {section['top']})"); page.wait_for_timeout(1500)
    veil = js(page, "({ fog: !!document.querySelector('.mist-clouds'), veil: +getComputedStyle(document.querySelector('.mist-veil')).opacity })")
    check("without WebGL: the simple mist stands in", not veil["fog"] and veil["veil"] > 0.9, str(veil))
    page.evaluate(f"scrollTo(0, {section['top'] + section['h'] - 900})"); page.wait_for_timeout(1800)
    veil = js(page, "+getComputedStyle(document.querySelector('.mist-veil')).opacity")
    check("without WebGL: the mist clears by the end", veil < 0.05, f"opacity {veil}")
    check("no page errors (no WebGL)", not page.errors, "; ".join(page.errors)[:300])
    plain.close()

print()
if failures:
    print(f"{len(failures)} check(s) failed: {', '.join(failures)}")
    sys.exit(1)
print("All checks passed.")
