"""Smoke test for the combined site: website at /, admin at /admin, API at /api.

Run against the production build served the way the server serves it:

    npm run build:all
    npm run preview:all            # http://localhost:8080
    python tests/test_routing.py

The enquiry checks expect ENQUIRY_LOG_ONLY = true in your local
server/api/config.php, so nothing is actually mailed. Screenshots are saved
under tests/screenshots/.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

# Windows consoles default to cp1252; never let a status line crash the run.
sys.stdout.reconfigure(errors="replace")

BASE = os.environ.get("WELAND_URL", "http://localhost:8080").rstrip("/")
OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

failures = []


def check(label, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {label}{'  ' + detail if detail else ''}")
    if not ok:
        failures.append(label)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


opener = urllib.request.build_opener(NoRedirect)


def http(path, method="GET", body=None, host=None):
    """Return (status, headers, text) without following redirects."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if host:
        req.add_header("Host", host)
    try:
        with opener.open(req) as r:
            return r.status, r.headers, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read().decode("utf-8", "replace")


def location(h):
    """Redirect target as a path; Apache sends absolute URLs, the PHP preview relative ones."""
    loc = h.get("Location") or ""
    u = urllib.parse.urlsplit(loc)
    return u.path + (f"?{u.query}" if u.query else "")


# ---------- URL map ----------
s, h, t = http("/")
check("/ serves the website", s == 200 and "We Land Resort" in t, f"status={s}")
s, h, t = http("/admin")
check("/admin redirects to /admin/", s in (301, 302) and h.get("Location", "").endswith("/admin/"), f"{s} -> {h.get('Location')}")
s, h, t = http("/admin/")
check("/admin/ serves the admin app", s == 200 and "Weland · Admin" in t and "/admin/assets/" in t, f"status={s}")
s, h, t = http("/admin/bookings/KV-00001")
check("admin deep link falls back to the admin app", s == 200 and "Weland · Admin" in t, f"status={s}")
s, h, t = http("/login")
check("old /login bookmark -> /admin/login", s == 302 and location(h) == "/admin/login", f"{s} -> {h.get('Location')}")
s, h, t = http("/bookings/KV-00001")
check("old deep admin link keeps its path", s == 302 and location(h) == "/admin/bookings/KV-00001", f"{s} -> {h.get('Location')}")
s, h, t = http("/no-such-page")
check("unknown page -> website 404", s == 404 and "could not be found" in t, f"status={s}")
s, h, t = http("/api/config.php")
check("API config is not downloadable", "DB_PASS" not in t, f"status={s}")
s, h, t = http("/robots.txt")
check("robots.txt keeps /admin out of search", s == 200 and "Disallow: /admin/" in t, f"status={s}")

# ---------- production-only rules ----------
s, h, t = http("/error_log")
check("PHP error_log is not served", s == 403, f"status={s}")
s, h, t = http("/api/error_log")
check("API error_log is not served", s == 403, f"status={s}")
s, h, t = http("/?utm=x", host="www.welandresort.com")
check("www.welandresort.com -> welandresort.com", s == 301 and (h.get("Location") or "").startswith("http://welandresort.com/?utm=x"), f"{s} -> {h.get('Location')}")
s, h, t = http("/admin/bookings", host="www.welandresort.com")
check("www admin links -> welandresort.com/admin", s == 301 and (h.get("Location") or "") == "http://welandresort.com/admin/bookings", f"{s} -> {h.get('Location')}")
s, h, t = http("/.well-known/acme-challenge/probe", host="www.welandresort.com")
check("SSL checks on www are not redirected", s != 301, f"status={s}")

# ---------- API ----------
s, h, t = http("/api/me")
check("/api/me without a session -> 401 from PHP", s == 401 and "Not authenticated" in t, f"status={s}")

today = date.today()
enquiry = {
    "name": "Routing Test", "phone": "+91 98765 43210", "email": "test@example.com",
    "stay": "The dormitory", "checkIn": (today + timedelta(days=20)).isoformat(),
    "checkOut": (today + timedelta(days=22)).isoformat(), "guests": "4",
    "notes": "Automated smoke test, please ignore.", "website": "",
}
s, h, t = http("/api/enquiry", "POST", enquiry)
check("POST /api/enquiry accepts a valid enquiry", s == 200 and json.loads(t).get("ok") is True, f"{s} {t[:80]}")
s, h, t = http("/api/enquiry", "POST", {**enquiry, "email": "not-an-email"})
check("POST /api/enquiry rejects a bad email", s == 400 and "email" in t.lower(), f"{s} {t[:80]}")
s, h, t = http("/api/enquiry", "POST", {**enquiry, "checkOut": enquiry["checkIn"]})
check("POST /api/enquiry rejects check-out on check-in day", s == 400 and "after check-in" in t, f"{s} {t[:80]}")
s, h, t = http("/api/enquiry", "POST", {**enquiry, "name": "Bot\r\nBcc: victim@example.com", "website": "spam.example"})
check("honeypot submissions are dropped quietly", s == 200 and json.loads(t).get("delivered") is None, f"{s} {t[:80]}")

# ---------- in the browser ----------
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 860})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # Admin: an unauthenticated deep link lands on the login page, still under /admin
    page.goto(BASE + "/admin/bookings")
    page.wait_for_load_state("networkidle")
    check("admin guard redirects to /admin/login", page.url.endswith("/admin/login"), page.url)
    logo_ok = page.evaluate(
        "(() => { const i = document.querySelector('img[alt]'); return !!i && i.naturalWidth > 0 && i.src.includes('/admin/'); })()"
    )
    check("admin logo loads from /admin/", logo_ok)
    page.screenshot(path=os.path.join(OUT, "admin-login.png"))

    # Signing in reaches the PHP API at /api (a local run has no database, so an
    # error message from the server is the expected, correct result here).
    page.fill("#email", "someone@example.com")
    page.fill("#password", "not-a-real-password")
    with page.expect_response(lambda r: r.url.endswith("/api/login")) as resp_info:
        page.click("button[type=submit]")
    status = resp_info.value.status
    check("admin sign-in request goes to /api/login", status in (200, 401, 500), f"status={status}")
    page.wait_for_selector("form p", timeout=5000)
    check("admin shows the server's answer", page.locator("form p").inner_text().strip() != "")

    # Website: sending the enquiry opens WhatsApp and copies it to the PHP API
    # (WhatsApp is stubbed out; only the link it is opened with matters here)
    page.context.route("https://wa.me/**", lambda r: r.fulfill(status=200, body="WhatsApp (test stub)"))
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    page.fill("#enq-name", "Browser Test")
    page.fill("#enq-phone", "+91 98765 43210")
    page.fill("#enq-email", "test@example.com")
    page.select_option("#enq-stay", "A room")
    page.fill("#enq-in", enquiry["checkIn"])
    page.fill("#enq-out", enquiry["checkOut"])
    with page.expect_popup() as popup_info, page.expect_response(lambda r: r.url.endswith("/api/enquiry")) as resp_info:
        page.click("[data-testid=enquiry-form] button[type=submit]")
    check("website form copies the enquiry to /api/enquiry", resp_info.value.status == 200, f"status={resp_info.value.status}")
    check("website form opens WhatsApp to the booking number", popup_info.value.url.startswith("https://wa.me/919074424142?text="), popup_info.value.url[:60])
    popup_info.value.close()
    msg = page.locator(".form-status").inner_text()
    check("website form confirms WhatsApp opened", "WhatsApp has opened" in msg, msg)
    page.locator("#enquire").screenshot(path=os.path.join(OUT, "website-enquiry-sent.png"))

    check("no page errors", not errors, "; ".join(errors)[:300])
    browser.close()

print()
if failures:
    print(f"{len(failures)} check(s) failed: {', '.join(failures)}")
    sys.exit(1)
print("All checks passed.")
