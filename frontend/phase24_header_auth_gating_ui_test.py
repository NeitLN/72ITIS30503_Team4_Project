"""Phase 24: verify guest visitors never trigger protected header requests
(/api/conversations, /api/notifications/unread-count) and that the auth-gated
flow (register -> authenticated polling -> logout -> guest again) behaves."""
import re
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
PROTECTED_PATHS = ("/api/conversations", "/api/notifications/unread-count")
LOGIN_REQUIRED_MSG = "Vui lòng đăng nhập để tiếp tục."

failures = []


def check(label, condition, detail=""):
    mark = "PASS" if condition else "FAIL"
    print(f"[{mark}] {label}" + (f" -- {detail}" if detail and not condition else ""))
    if not condition:
        failures.append(label)


def track_requests(page):
    seen = []
    page.on("request", lambda req: seen.append(req.url))
    return seen


def track_console(page):
    msgs = []
    page.on("console", lambda msg: msgs.append(msg.text))
    return msgs


def guest_homepage_check(viewport_name, viewport):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=viewport)
        requests_seen = track_requests(page)
        console_msgs = track_console(page)

        resp = page.goto(BASE + "/", wait_until="domcontentloaded", timeout=30000)
        check(f"[{viewport_name}] GET / returns 200", resp is not None and resp.status == 200,
              f"status={resp.status if resp else None}")

        page.wait_for_timeout(2500)  # give any stray effects/polling a chance to fire

        protected_hits = [u for u in requests_seen if any(p_ in u for p_ in PROTECTED_PATHS)]
        check(f"[{viewport_name}] zero requests to protected endpoints as guest",
              len(protected_hits) == 0, f"hits={protected_hits}")

        login_errors = [m for m in console_msgs if LOGIN_REQUIRED_MSG in m]
        check(f"[{viewport_name}] zero '{LOGIN_REQUIRED_MSG}' console messages as guest",
              len(login_errors) == 0, f"messages={login_errors}")

        browser.close()


def authenticated_flow_check():
    email = f"authgate-{int(time.time())}@example.com"
    password = "TestPass123"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        # --- Register a fresh QA account ---
        page.goto(BASE + "/register", wait_until="domcontentloaded", timeout=30000)
        page.fill("#name", "Auth Gate QA")
        page.fill("#email", email)
        page.fill("#password", password)
        page.click("button[type=submit]")
        page.wait_for_timeout(2000)

        current_url = page.url
        check("registration redirects away from /register", "/register" not in current_url, current_url)

        # --- Authenticated: header polling should now succeed ---
        page.goto(BASE + "/", wait_until="domcontentloaded", timeout=30000)
        requests_seen = track_requests(page)
        console_msgs = track_console(page)
        page.wait_for_timeout(2500)

        conv_calls = [u for u in requests_seen if "/api/conversations" in u]
        notif_calls = [u for u in requests_seen if "/api/notifications/unread-count" in u]
        check("authenticated: /api/notifications/unread-count is called", len(notif_calls) > 0, f"calls={notif_calls}")
        check("authenticated: /api/conversations is called (header badge)", len(conv_calls) > 0, f"calls={conv_calls}")

        login_errors = [m for m in console_msgs if LOGIN_REQUIRED_MSG in m]
        check("authenticated: no login-required console errors", len(login_errors) == 0, f"messages={login_errors}")

        # --- Logout ---
        page.click("text=Đăng xuất")
        page.wait_for_timeout(1000)

        requests_after_logout = track_requests(page)
        console_after_logout = track_console(page)
        page.wait_for_timeout(2500)

        stray_calls = [u for u in requests_after_logout if any(p_ in u for p_ in PROTECTED_PATHS)]
        check("logout: no further protected requests fire", len(stray_calls) == 0, f"calls={stray_calls}")

        stray_errors = [m for m in console_after_logout if LOGIN_REQUIRED_MSG in m]
        check("logout: no login-required console errors after logout", len(stray_errors) == 0, f"messages={stray_errors}")

        badge_visible = page.locator('[data-testid="messages-unread-count"]').count() == 0 and \
            page.locator('[data-testid="notifications-unread-count"]').count() == 0
        check("logout: unread badges cleared/hidden", badge_visible)

        browser.close()


print("=" * 70)
print("PHASE 24: HEADER AUTH GATING — GUEST STATE (desktop)")
print("=" * 70)
guest_homepage_check("desktop", {"width": 1440, "height": 900})

print("\n" + "=" * 70)
print("PHASE 24: HEADER AUTH GATING — GUEST STATE (mobile 390x844)")
print("=" * 70)
guest_homepage_check("mobile", {"width": 390, "height": 844})

print("\n" + "=" * 70)
print("PHASE 24: HEADER AUTH GATING — AUTHENTICATED + LOGOUT FLOW")
print("=" * 70)
try:
    authenticated_flow_check()
except Exception as e:
    print(f"[FAIL] authenticated flow raised an exception: {e}")
    failures.append("authenticated flow exception")

print("\n" + "=" * 70)
if failures:
    print(f"RESULT: {len(failures)} FAILURE(S)")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("RESULT: ALL CHECKS PASSED")
