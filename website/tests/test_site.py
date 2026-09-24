"""Smoke test for the We Land Resort site.

Run with the dev server already up on port 3050:
    npm run dev -- --port 3050
    python tests/test_site.py

Checks that the page renders, that the "Check availability" CTA scrolls to the
enquiry form and pre-fills it, that the enquiry form submits through the API,
and that the mobile layout has no horizontal overflow. Screenshots are saved
under tests/screenshots/.
"""

import os
import sys
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WELAND_URL", "http://localhost:3050")
OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

failures = []


def check(label, ok, detail=""):
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {label}{'  ' + detail if detail else ''}")
    if not ok:
        failures.append(label)


def shot(page, name, full=False):
    if full:
        # A full-page capture resizes the viewport, and lazily-decoded images can
        # come back blank. Force them eager and wait for decode before capturing.
        page.evaluate(
            "async () => { const imgs = [...document.images];"
            " imgs.forEach(i => { i.loading = 'eager'; i.decoding = 'sync'; });"
            " await Promise.all(imgs.map(i => i.decode().catch(() => {}))); }"
        )
        page.wait_for_timeout(600)
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=full)
    print(f"       saved {os.path.relpath(path)}")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- desktop ----------
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors = []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)  # let the hero load animation finish

    check("page title", "We Land Resort" in page.title(), page.title())
    check("hero headline present", "Kakkadampoyil" in page.locator("h1.hero-display").inner_text())
    logo_ok = page.evaluate("(() => { const i = document.querySelector('.hero-logo'); return !!i && i.naturalWidth > 0; })()")
    check("hero logo loaded", logo_ok)
    check("brand emblem in nav and footer", page.locator("img.brand-mark").count() >= 2)
    icons = page.evaluate(
        "[...document.querySelectorAll('link[rel~=\"icon\"], link[rel=\"apple-touch-icon\"]')].map(l => l.getAttribute('href'))"
    )
    check("favicon links emitted", len(icons) >= 2, ", ".join(icons))
    for sid in ["above-the-mist", "stays", "conference", "gallery", "location", "enquire"]:
        check(f"section #{sid} rendered", page.locator(f"#{sid}").count() == 1)
    check("two stay types listed (rooms, dormitory)", page.locator("article.stay").count() == 2)
    check("six rooms listed", page.locator(".unit").count() == 6)
    check("conference hall facts rendered", page.locator(".conference-fact").count() == 6)
    # Scroll through the page so lazy-loaded photos are requested, then wait for all of them.
    page.evaluate(
        "async () => { const h = document.documentElement.scrollHeight;"
        " for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } }"
    )
    page.wait_for_function(
        "() => [...document.querySelectorAll('img[src^=\"/images/\"]')].every(i => i.complete)", timeout=20000
    )
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(400)
    photos = page.evaluate(
        "(() => { const imgs = [...document.querySelectorAll('img[src^=\"/images/\"]')];"
        " return { total: imgs.length, broken: imgs.filter(i => i.naturalWidth === 0).map(i => i.getAttribute('src')) }; })()"
    )
    check("resort photos placed", photos["total"] >= 30, f"{photos['total']} <img> tags")
    check("every photo file loaded", not photos["broken"], ", ".join(photos["broken"]))
    hero_loaded = page.evaluate("(() => { const i = document.querySelector('.hero-media img'); return !!i && i.naturalWidth > 0; })()")
    check("hero photo loaded", hero_loaded)
    check("map embed present", page.locator(".map iframe").count() == 1)

    # ---------- contact details, times and location ----------
    contact = page.evaluate("""(() => ({
      tel: [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')))],
      wa: [...new Set([...document.querySelectorAll('a[href*="wa.me"]')].map(a => a.getAttribute('href').split('?')[0]))],
      maps: [...document.querySelectorAll('a[href*="maps"]')].map(a => a.getAttribute('href')),
      embed: document.querySelector('.map iframe').getAttribute('src'),
      facts: document.querySelector('.about-facts').innerText,
      footer: document.querySelector('.footer-small').innerText,
      waGreen: getComputedStyle(document.querySelector('.wa .wa-icon')).backgroundColor,
    }))()""")
    check("booking number is the call link", contact["tel"] == ["tel:+919074424142"], str(contact["tel"]))
    check("WhatsApp links go to the booking number", contact["wa"] == ["https://wa.me/919074424142"], str(contact["wa"]))
    check("booking number shown in the enquiry section", "+91 90744 24142" in page.locator(".contact-list").inner_text())
    check("WhatsApp button in WhatsApp green", contact["waGreen"] == "rgb(37, 211, 102)", contact["waGreen"])
    check("Google Maps link is the resort's listing", contact["maps"] == ["https://maps.app.goo.gl/sK3fXUWg9pns3AEaA"], str(contact["maps"]))
    check("map pins the resort", "Weland+Kakkadampoyil+Resort" in contact["embed"], contact["embed"][:90])
    check("address from the listing", "Foggy Mountain, Park Road" in page.locator(".address").inner_text())
    check("check-in 3 pm, check-out 12 noon (facts and footer)",
          all("3:00 pm" in t and "12:00 noon" in t for t in (contact["facts"], contact["footer"])), contact["footer"][-45:])
    check("no dining section or link", page.locator("#dining").count() == 0 and page.locator('a[href="#dining"]').count() == 0)
    check("gallery: 13 photos, the new aerial featured",
          page.locator(".gallery-item").count() == 13
          and page.locator('.gallery-item.is-feature img[src="/images/resort-dusk-mist.jpg"]').count() == 1
          and page.locator('.gallery-item img[src="/images/deck-dinner-sunset.jpg"]').count() == 1)
    srcs = page.evaluate("[...document.querySelectorAll('.gallery-item img')].map(i => i.getAttribute('src'))")
    check("gallery: no photo shown twice", len(srcs) == len(set(srcs)), f"{len(srcs)} tiles, {len(set(srcs))} different")
    # next/font self-hosts under hashed family names (e.g. __Cormorant_Garamond_ab12cd),
    # so look through the loaded FontFace entries rather than document.fonts.check().
    fonts_ok = page.evaluate(
        "(() => { const fams = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);"
        " return fams.some(f => /Cormorant/i.test(f)) && fams.some(f => /Karla/i.test(f)); })()"
    )
    check("web fonts loaded (Cormorant Garamond, Karla)", fonts_ok)
    shot(page, "desktop-hero.png")
    shot(page, "desktop-full.png", full=True)

    # ---------- CTA: Check availability → enquiry form ----------
    check_in = (date.today() + timedelta(days=14)).isoformat()
    check_out = (date.today() + timedelta(days=17)).isoformat()
    page.fill("#strip-in", check_in)
    page.fill("#strip-out", check_out)
    page.select_option("#strip-guests", "3")
    page.click("[data-testid=check-availability]")
    page.wait_for_timeout(1400)  # smooth scroll + focus delay

    enquire_top = page.evaluate("document.getElementById('enquire').getBoundingClientRect().top")
    check("CTA scrolled to the enquiry section", -40 <= enquire_top <= 200, f"top={enquire_top:.0f}px")
    check("CTA pre-filled check-in", page.input_value("#enq-in") == check_in, page.input_value("#enq-in"))
    check("CTA pre-filled check-out", page.input_value("#enq-out") == check_out, page.input_value("#enq-out"))
    check("CTA pre-filled guests", page.input_value("#enq-guests") == "3", page.input_value("#enq-guests"))
    check("CTA moved focus to the name field", page.evaluate("document.activeElement && document.activeElement.id") == "enq-name")
    shot(page, "cta-after-click.png")

    # ---------- enquiry form submits through /api/enquiry ----------
    page.fill("#enq-name", "Test Guest")
    page.fill("#enq-phone", "+91 98765 43210")
    page.fill("#enq-email", "test@example.com")
    page.select_option("#enq-stay", "The dormitory")
    page.fill("#enq-notes", "Automated smoke test, please ignore.")
    with page.expect_response(lambda r: "/api/enquiry" in r.url) as resp_info:
        page.click("[data-testid=enquiry-form] button[type=submit]")
    resp = resp_info.value
    check("API /api/enquiry responded 200", resp.status == 200, f"status={resp.status}")
    page.wait_for_selector(".form-status", timeout=5000)
    status_text = page.locator(".form-status").inner_text()
    check("form shows confirmation", status_text.startswith("Enquiry sent"), status_text)
    shot(page, "form-sent.png")

    # ---------- nav "Reserve a stay" CTA ----------
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(300)
    page.click(".nav .nav-cta")
    # Wait for the outcome itself: the smooth scroll to the form can pause briefly
    # as it passes the fog section (headless Chromium draws WebGL on the CPU).
    try:
        page.wait_for_function(
            "() => Math.abs(document.getElementById('enquire').getBoundingClientRect().top) < 200", timeout=10000
        )
    except Exception:
        pass
    top2 = page.evaluate("document.getElementById('enquire').getBoundingClientRect().top")
    check("nav 'Reserve a stay' scrolls to enquiry", -40 <= top2 <= 200, f"top={top2:.0f}px")

    check("no console errors on desktop", not console_errors, "; ".join(console_errors)[:300])
    page.close()

    # ---------- mobile ----------
    m = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m.goto(BASE)
    m.wait_for_load_state("networkidle")
    m.wait_for_timeout(1200)
    # Compare with clientWidth, not innerWidth: when something is too wide, a mobile
    # browser widens the whole layout (innerWidth grows too) and the overflow hides.
    overflow = m.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    layout = m.evaluate("window.innerWidth")
    check("mobile has no horizontal overflow", overflow <= 0 and layout == 390, f"overflow={overflow}px, layout={layout}px")
    toggle_right = m.evaluate("document.querySelector('.nav-toggle').getBoundingClientRect().right")
    check("mobile menu button is on screen", toggle_right <= 390, f"right edge at {toggle_right:.0f}px")
    shot(m, "mobile-hero.png")
    shot(m, "mobile-full.png", full=True)
    m.click("button[aria-label='Open menu']")
    m.wait_for_timeout(500)
    check("mobile menu opens", m.locator(".menu").is_visible())
    shot(m, "mobile-menu.png")
    m.click("button[aria-label='Close menu']")
    m.wait_for_timeout(300)
    check("mobile menu closes", m.locator(".menu").count() == 0)
    m.close()

    browser.close()

print()
if failures:
    print(f"{len(failures)} check(s) failed: {', '.join(failures)}")
    sys.exit(1)
print("All checks passed.")
