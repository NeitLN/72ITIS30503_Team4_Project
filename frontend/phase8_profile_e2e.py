"""Phase 8 end-to-end coverage for real profiles + public seller storefronts.

Drives the actual rendered /profile and /seller/[username] pages in a real
browser against the locally running frontend (http://localhost:3000) and
backend (http://localhost:8080).

Requires PHASE7_QA_EMAIL/PHASE7_QA_PASSWORD env vars for the existing QA
seller account (reused from Phase 7 — never hardcode credentials here).

Usage:
    PHASE7_QA_EMAIL=... PHASE7_QA_PASSWORD=... python phase8_profile_e2e.py
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.environ.get("PHASE_WEB_BASE", "http://localhost:3000")
API_BASE = os.environ.get("PHASE_API_BASE", "http://localhost:8080")
QA_EMAIL = os.environ.get("PHASE7_QA_EMAIL", "phase7-qa-seller@stylehub.demo")
QA_PASSWORD = os.environ.get("PHASE7_QA_PASSWORD")
QA_LISTING_SLUG = os.environ.get("PHASE8_QA_LISTING_SLUG", "nike-air-max-90-black-lightly-worn")
if not QA_PASSWORD:
    print("ERROR: set PHASE7_QA_PASSWORD before running this test.")
    sys.exit(2)

# A stable, unique-per-run username avoids collisions across repeated runs.
RUN_USERNAME = f"phase8-qa-{int(time.time()) % 100000}"
DISPLAY_NAME = "Phase 8 QA Seller"
BIO = "Phase 8 QA account verifying real profile persistence and the public storefront."
# Phase 8.1: the location field is now a searchable Vietnamese combobox.
# Typing an unaccented alias ("Da Nang") must resolve to the canonical
# Vietnamese name ("Đà Nẵng"), which is what actually gets stored/displayed.
LOCATION_SEARCH = "Da Nang"
LOCATION_DISPLAY = "Đà Nẵng"

HERE = os.path.dirname(os.path.abspath(__file__))
AVATAR1 = os.path.join(HERE, "public", "images", "products", "nike-air-max-90-black.jpg")
AVATAR2 = os.path.join(HERE, "public", "images", "products", "adidas-samba-og.jpg")

results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def api_post(pathname, payload, token=None):
    req = urllib.request.Request(
        f"{API_BASE}{pathname}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def login():
    res = api_post("/api/auth/login", {"email": QA_EMAIL, "password": QA_PASSWORD})
    if not res.get("success"):
        print("ERROR: could not log in QA seller:", res.get("error"))
        sys.exit(2)
    return res["data"]["token"]


def get_another_real_username(exclude_username):
    """A real seed seller's username, for the username-collision test."""
    req = urllib.request.Request(f"{API_BASE}/api/sellers/minh-tran")
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    return data["data"]["username"] if data.get("success") else "minh-tran"


TOKEN = login()

console_errors = []
network_leak_findings = []
PRIVATE_MARKERS = ["password_hash", QA_EMAIL, '"role":', '"phone"', '"auth_user_id"', '"role_id"']


def attach_privacy_watch(page):
    def on_console(msg):
        if msg.type == "error":
            console_errors.append(f"{page.url} :: {msg.text[:200]}")
    page.on("console", on_console)

    def on_response(resp):
        try:
            ctype = resp.headers.get("content-type", "")
            if "application/json" in ctype and "/api/sellers/" in resp.url:
                body = resp.text()
                for marker in PRIVATE_MARKERS:
                    if marker in body:
                        network_leak_findings.append(f"{resp.url} contains {marker}")
        except Exception:
            pass
    page.on("response", on_response)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ========== 1. /profile real data flow ==========
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach_privacy_watch(page)

    # 1a. Logged-out gate
    page.goto(f"{BASE}/profile", wait_until="load")
    expect(page.get_by_text("Đăng nhập để xem hồ sơ")).to_be_visible(timeout=10000)
    check("Logged-out /profile shows sign-in gate", True)
    page.click("a[href*='redirect=/profile']")
    expect(page).to_have_url(f"{BASE}/login?redirect=/profile", timeout=10000)
    check("Gate link routes to /login?redirect=/profile", True, page.url)

    # 1b. Login, return path
    page.fill("#email", QA_EMAIL)
    page.fill("#password", QA_PASSWORD)
    page.click("button[type=submit]")
    expect(page).to_have_url(f"{BASE}/profile", timeout=10000)
    check("After login, redirected back to /profile", True)

    # 1c. Real profile data loaded (not hardcoded mock)
    expect(page.locator("h1")).not_to_have_text("Võ Việt Tiến", timeout=10000)
    check("Profile is NOT the old hardcoded mock user", True)
    expect(page.get_by_text("Tham gia từ")).to_be_visible(timeout=10000)
    check("Real profile loaded (Member since real created_at)", True)

    # 1d. Enter edit mode, validation
    page.click("[data-testid=profile-edit-toggle]")
    expect(page.locator("#profile-display_name")).to_be_visible(timeout=5000)
    check("Edit mode shows the real form", True)

    page.fill("#profile-username", "")
    page.click("[data-testid=profile-save]")
    check("Empty username blocked client-side", page.locator("#profile-username[aria-invalid=true]").count() > 0)

    # 1e. Username conflict (409) — another real seed seller's username
    taken_username = get_another_real_username(RUN_USERNAME)
    page.fill("#profile-username", taken_username)
    page.click("[data-testid=profile-save]")
    expect(page.locator("#profile-username-error")).to_be_visible(timeout=10000)
    check("Taken username shows a conflict error", "đã được sử dụng" in page.locator("#profile-username-error").inner_text().lower())

    # 1f. Successful save with a unique username
    page.fill("#profile-display_name", DISPLAY_NAME)
    page.fill("#profile-username", RUN_USERNAME)
    page.fill("#profile-bio", BIO)
    # Location is now a searchable combobox (Phase 8.1) — type an alias and
    # pick the resolved canonical Vietnamese option from the listbox.
    page.click("#profile-location")
    page.fill("#profile-location", LOCATION_SEARCH)
    location_option = page.locator("#profile-location-listbox li[role=option]").filter(has_text=LOCATION_DISPLAY).first
    expect(location_option).to_be_visible(timeout=5000)
    location_option.click()
    expect(page.locator("#profile-location")).to_have_value(LOCATION_DISPLAY, timeout=5000)
    page.click("[data-testid=profile-save]")
    expect(page.locator("h1")).to_contain_text(DISPLAY_NAME, timeout=10000)
    check("Save succeeds and exits edit mode with new display name shown", True)
    expect(page.get_by_text(f"@{RUN_USERNAME}")).to_be_visible(timeout=5000)
    check("New username shown on profile header", True)

    # 1g. Avatar upload
    page.set_input_files("#avatar-input", [AVATAR1])
    expect(page.locator("img[alt*='Ảnh đại diện']")).to_be_visible(timeout=10000)
    first_avatar_src = page.locator("img[alt*='Ảnh đại diện']").first.get_attribute("src")
    check("Avatar preview appears after upload", bool(first_avatar_src))

    # 1h. Avatar replacement
    page.set_input_files("#avatar-input", [AVATAR2])
    expect(page.locator("img[alt*='Ảnh đại diện']")).not_to_have_attribute("src", first_avatar_src, timeout=10000)
    check("Avatar replacement updates to a new object URL", True)

    # 1i. Persistence after reload
    page.reload(wait_until="load")
    expect(page.locator("h1")).to_contain_text(DISPLAY_NAME, timeout=10000)
    check("Display name persists after reload", True)
    expect(page.get_by_text(f"@{RUN_USERNAME}")).to_be_visible(timeout=10000)
    check("Username persists after reload", True)
    expect(page.get_by_text(BIO)).to_be_visible(timeout=5000)
    check("Bio persists after reload", True)
    expect(page.get_by_text(LOCATION_DISPLAY).first).to_be_visible(timeout=5000)
    check("Location persists after reload as the canonical Vietnamese name", True)

    # 1j. Link to public storefront
    storefront_link = page.locator("[data-testid=profile-view-storefront]")
    expect(storefront_link).to_have_attribute("href", f"/seller/{RUN_USERNAME}", timeout=5000)
    check("Profile links to the correct public storefront URL", True)

    ctx.close()

    # ========== 2. Public storefront ==========
    ctx2 = browser.new_context()
    page2 = ctx2.new_page()
    attach_privacy_watch(page2)

    page2.goto(f"{BASE}/seller/{RUN_USERNAME}", wait_until="load")
    expect(page2.locator("h1")).to_contain_text(DISPLAY_NAME, timeout=10000)
    check("Public storefront shows real display name", True)
    expect(page2.get_by_text(f"@{RUN_USERNAME}").first).to_be_visible(timeout=5000)
    check("Public storefront shows real username", True)
    expect(page2.get_by_text(BIO)).to_be_visible(timeout=5000)
    check("Public storefront shows real bio", True)
    check("Title format is correct", page2.title().startswith(f"{DISPLAY_NAME} (@{RUN_USERNAME})"), page2.title())

    body_text = page2.locator("body").inner_text()
    check("Honest 'no ratings yet' state shown in Vietnamese (not fabricated)", "Chưa có đánh giá" in body_text)

    # ========== 3. Known seed seller with real listings ==========
    # The Phase 7 QA account's own username was just changed to RUN_USERNAME
    # above (same account, same product) — its retained Phase 7 listing must
    # still appear under the new username.
    page2.goto(f"{BASE}/seller/{RUN_USERNAME}", wait_until="load")
    expect(page2.get_by_text("Nike Air Max 90 Black").first).to_be_visible(timeout=10000)
    check("Retained Phase 7 listing appears on the (renamed) storefront", True)

    # ========== 3b. Empty seller storefront (a real account with 0 listings) ==========
    page2.goto(f"{BASE}/seller/demo-customer", wait_until="load")
    expect(page2.get_by_text("Chưa có tin đang bán")).to_be_visible(timeout=10000)
    check("A real account with 0 listings shows the honest empty state (not fabricated products)", True)

    # ========== 4. Unknown seller -> real 404 ==========
    resp = page2.goto(f"{BASE}/seller/totally-made-up-username-xyz123", wait_until="load")
    check("Unknown seller page returns HTTP 404", resp.status == 404, str(resp.status))
    check("Unknown seller page shows a not-found state (no fabricated profile)", page2.get_by_text("Không tìm thấy trang").count() > 0 or page2.get_by_text("404").count() > 0)

    # ========== 5. Seed seller compatibility (real seed seller storefront) ==========
    page2.goto(f"{BASE}/seller/minh-tran", wait_until="load")
    expect(page2.locator("h1")).to_contain_text("Minh Tran", timeout=10000)
    check("Seed seller (Minh Tran) storefront loads with real data", True)
    expect(page2.locator("body")).to_contain_text("Tin đang bán", timeout=5000)
    check("Seed seller storefront shows real listing grid", True)

    # ========== 6. Product Detail seller link ==========
    # Product Detail's data fetch uses Next.js's `revalidate: 60` cache, so a
    # username rename made moments ago (step 1f) may take up to ~60s to
    # propagate to this server-rendered page. This is expected, pre-existing
    # caching behavior (the same tolerance already accepted for Phase 7's
    # "New Arrivals" listing) — not a bug to fix in the app. Because the page
    # is server-rendered, the already-loaded DOM cannot change without a
    # fresh navigation, so this polls with real reloads (checking actual
    # server state each time) rather than a single blind wait.
    found_link = False
    deadline = time.time() + 70
    while time.time() < deadline:
        page2.goto(f"{BASE}/products/{QA_LISTING_SLUG}", wait_until="load")
        if page2.locator(f"a[href='/seller/{RUN_USERNAME}']").count() > 0:
            found_link = True
            break
        page2.wait_for_timeout(5000)
    check("Product Detail links to the correct (renamed) seller storefront", found_link, "(within the 60s cache revalidate window)")

    ctx2.close()

    # ========== 7. Privacy: rendered HTML / page source ==========
    ctx3 = browser.new_context()
    page3 = ctx3.new_page()
    page3.goto(f"{BASE}/seller/{RUN_USERNAME}", wait_until="load")
    html = page3.content()
    html_leaks = [m for m in PRIVATE_MARKERS if m in html]
    check("No private data in rendered storefront HTML", len(html_leaks) == 0, str(html_leaks))
    ctx3.close()

    browser.close()

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"TOTAL: {passed}/{len(results)} passed")
if network_leak_findings:
    print(f"\nPRIVACY LEAK FINDINGS ({len(network_leak_findings)}):")
    for f in network_leak_findings:
        print(" -", f)
else:
    print("\nNo privacy leaks detected in network responses.")
if console_errors:
    print(f"\nCONSOLE ERRORS ({len(console_errors)}):")
    for c in console_errors[:20]:
        print(" -", c)
else:
    print("\nNo console errors captured.")

sys.exit(0 if (passed == len(results) and not network_leak_findings) else 1)
