"""Phase 8.1 end-to-end coverage for the free-text brand combobox and the
Vietnam location selector on /sell.

Drives the actual rendered wizard in a real browser against the locally
running frontend (http://localhost:3000) and backend (http://localhost:8080),
plus a few direct API calls (via Playwright's APIRequestContext) to prove the
backend independently rejects malicious input even when it bypasses the
frontend combobox entirely.

Requires PHASE7_QA_EMAIL/PHASE7_QA_PASSWORD env vars for the existing QA
seller account (reused from Phase 7 — never hardcode credentials here).

Usage:
    PHASE7_QA_EMAIL=... PHASE7_QA_PASSWORD=... python phase8_1_brand_location_e2e.py
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.environ.get("PHASE_WEB_BASE", "http://localhost:3000")
API_BASE = os.environ.get("PHASE_API_BASE", "http://localhost:8080")
QA_EMAIL = os.environ.get("PHASE7_QA_EMAIL", "phase7-qa-seller@stylehub.demo")
QA_PASSWORD = os.environ.get("PHASE7_QA_PASSWORD")
if not QA_PASSWORD:
    print("ERROR: set PHASE7_QA_PASSWORD (and optionally PHASE7_QA_EMAIL) before running this test.")
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
IMG1 = os.path.join(HERE, "public", "images", "products", "nike-air-max-90-black.jpg")
RUN_TAG = int(time.time()) % 1000000

VN_34_PROVINCES = [
    'Hà Nội', 'Huế', 'Lai Châu', 'Điện Biên', 'Sơn La', 'Lạng Sơn', 'Cao Bằng',
    'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh', 'Hưng Yên',
    'Hải Phòng', 'Ninh Bình', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh',
    'Quảng Trị', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Đắk Lắk', 'Khánh Hòa',
    'Lâm Đồng', 'Đồng Nai', 'Tây Ninh', 'Thành phố Hồ Chí Minh', 'Đồng Tháp',
    'Vĩnh Long', 'An Giang', 'Cần Thơ', 'Cà Mau',
]

results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def ensure_qa_account():
    import urllib.request
    import urllib.error

    def post(path, payload):
        req = urllib.request.Request(
            f"{API_BASE}{path}", data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            return json.loads(e.read())

    login_res = post("/api/auth/login", {"email": QA_EMAIL, "password": QA_PASSWORD})
    if login_res.get("success"):
        return login_res["data"]["token"]
    post("/api/auth/register", {"name": "Phase7 QA Seller", "email": QA_EMAIL, "password": QA_PASSWORD})
    retry = post("/api/auth/login", {"email": QA_EMAIL, "password": QA_PASSWORD})
    if not retry.get("success"):
        print("ERROR: could not log in or register the QA seller account:", retry.get("error"))
        sys.exit(2)
    return retry["data"]["token"]


TOKEN = ensure_qa_account()


def base_listing_fields(name, brand_value=None, location="Thành phố Hồ Chí Minh"):
    fields = {
        "name": name,
        "description": "Ao thun QA phase 8.1 - dung de kiem tra thuong hieu va tinh thanh.",
        "category_slug": "shoes",
        "condition": "good",
        "size": "EU 42",
        "price": "500000",
        "stock": "1",
        "location": location,
        "is_negotiable": "false",
    }
    if brand_value is not None:
        fields["brand_slug"] = brand_value
    return fields


def api_create_listing(api_ctx, fields, expect_status=None):
    with open(IMG1, "rb") as f:
        img_bytes = f.read()
    multipart = {**fields, "images": {"name": "shoe.jpg", "mimeType": "image/jpeg", "buffer": img_bytes}}
    resp = api_ctx.post(
        f"{API_BASE}/api/products",
        headers={"Authorization": f"Bearer {TOKEN}"},
        multipart=multipart,
    )
    body = resp.json()
    if expect_status is not None:
        check(f"Direct API responds {expect_status} as expected", resp.status == expect_status, f"got {resp.status}: {body}")
    return resp, body


with sync_playwright() as p:
    api_ctx = p.request.new_context()
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # ---------- Login (browser) ----------
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill("#email", QA_EMAIL)
    page.fill("#password", QA_PASSWORD)
    page.click("button[type=submit]")
    expect(page).to_have_url(f"{BASE}/profile", timeout=10000)
    check("Logged in for combobox UI tests", True)

    page.goto(f"{BASE}/sell", wait_until="load")
    page.fill("#name", "QA Combobox Coverage Item")
    page.fill("#description", "Mo ta du dai de qua buoc 1 trong bai kiem tra Phase 8.1.")
    page.click("[data-testid=sell-next]")
    expect(page.locator("#category_slug")).to_be_enabled(timeout=10000)
    page.select_option("#category_slug", "shoes")

    # ========== BRAND COMBOBOX ==========
    # 1. Case-insensitive existing-brand search: lowercase "nike" must surface "Nike".
    page.click("#brand")
    page.fill("#brand", "nike")
    nike_opt = page.locator("#brand-listbox li[role=option]").filter(has_text="Nike").first
    expect(nike_opt).to_be_visible(timeout=5000)
    check("Case-insensitive brand search: 'nike' surfaces 'Nike'", True)

    # 2. Unbranded option always present and labelled in Vietnamese.
    page.fill("#brand", "")
    page.click("#brand")
    unbranded_opt = page.locator("#brand-listbox li[role=option]").filter(has_text="Không có thương hiệu").first
    expect(unbranded_opt).to_be_visible(timeout=5000)
    check("'Không có thương hiệu' option present in brand suggestions", True)

    # 3. Reject script-like / HTML input at the UI layer too (typed as free text,
    #    but the ultimate authority is the backend check further below).
    page.fill("#brand", "<script>alert(1)</script>")
    check("Combobox accepts free text for further server-side validation (no crash)", page.locator("#brand").input_value() != "")

    page.fill("#brand", "")
    page.click("body")

    ctx.close()

    # ========== BRAND DEDUPE (via direct create + list check) ==========
    unique_brand = f"QA Denim Co {RUN_TAG}"
    unique_brand_upper = f"  qa denim co {RUN_TAG}  ".upper()

    _, bodyA = api_create_listing(api_ctx, base_listing_fields(f"QA Brand Dedupe A {RUN_TAG}", unique_brand), expect_status=201)
    _, bodyB = api_create_listing(api_ctx, base_listing_fields(f"QA Brand Dedupe B {RUN_TAG}", unique_brand_upper), expect_status=201)
    check("New legitimate brand accepted and listing created (A)", bodyA.get("success") is True)
    check("Recapitalized/whitespace variant of the same brand accepted (B)", bodyB.get("success") is True)

    slug_a = bodyA["data"]["slug"]
    slug_b = bodyB["data"]["slug"]
    prod_a = api_ctx.get(f"{API_BASE}/api/products/{slug_a}").json()["data"]
    prod_b = api_ctx.get(f"{API_BASE}/api/products/{slug_b}").json()["data"]
    check(
        "No duplicate brand created on repeated capitalization (A and B resolve to the same brand slug)",
        prod_a.get("brand", {}).get("slug") == prod_b.get("brand", {}).get("slug") and prod_a.get("brand") is not None,
        f"A={prod_a.get('brand')} B={prod_b.get('brand')}",
    )

    brands_resp = api_ctx.get(f"{API_BASE}/api/brands").json()
    matching = [b for b in brands_resp.get("data", []) if b["name"].strip().lower() == unique_brand.strip().lower()]
    check("Exactly one brand row exists for the new brand name (case-insensitive)", len(matching) == 1, str(matching))

    # ========== BRAND: unbranded listing ==========
    _, body_unbranded = api_create_listing(api_ctx, base_listing_fields(f"QA Unbranded {RUN_TAG}", ""), expect_status=201)
    prod_unbranded = api_ctx.get(f"{API_BASE}/api/products/{body_unbranded['data']['slug']}").json()["data"]
    check("Unbranded listing created with no brand attached", prod_unbranded.get("brand") is None)

    # ========== BRAND: backend rejects invalid input even bypassing the UI ==========
    api_create_listing(api_ctx, base_listing_fields(f"QA Bad Brand Ctrl {RUN_TAG}", "Nike\x07\x08"), expect_status=422)
    api_create_listing(api_ctx, base_listing_fields(f"QA Bad Brand Long {RUN_TAG}", "A" * 61), expect_status=422)
    api_create_listing(api_ctx, base_listing_fields(f"QA Bad Brand HTML {RUN_TAG}", "<script>alert(1)</script>"), expect_status=422)

    # ========== LOCATION: canonical persistence ==========
    _, body_loc = api_create_listing(api_ctx, base_listing_fields(f"QA Location Canonical {RUN_TAG}", "", location="Đà Nẵng"), expect_status=201)
    prod_loc = api_ctx.get(f"{API_BASE}/api/products/{body_loc['data']['slug']}").json()["data"]
    check("New listing stores the exact canonical Vietnamese province name", prod_loc.get("location") == "Đà Nẵng", str(prod_loc.get("location")))

    # ========== LOCATION: backend rejects an unknown/invalid location ==========
    api_create_listing(api_ctx, base_listing_fields(f"QA Bad Location {RUN_TAG}", "", location="Atlantis"), expect_status=422)
    check("Backend rejects a location outside the canonical 34 + legacy alias list", True)

    # ========== LOCATION COMBOBOX (browser UI) ==========
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx2.new_page()
    page2.goto(f"{BASE}/login", wait_until="load")
    page2.fill("#email", QA_EMAIL)
    page2.fill("#password", QA_PASSWORD)
    page2.click("button[type=submit]")
    expect(page2).to_have_url(f"{BASE}/profile", timeout=10000)

    page2.goto(f"{BASE}/sell", wait_until="load")
    page2.fill("#name", "QA Location Coverage Item")
    page2.fill("#description", "Mo ta du dai de qua buoc 1 trong bai kiem tra Phase 8.1 dia diem.")
    page2.click("[data-testid=sell-next]")
    expect(page2.locator("#category_slug")).to_be_enabled(timeout=10000)
    page2.select_option("#category_slug", "shoes")
    page2.click("[data-testid=sell-next]")
    expect(page2.locator("#condition")).to_be_visible(timeout=5000)
    page2.select_option("#condition", "good")
    page2.select_option("#size", "EU 42")
    page2.click("[data-testid=sell-next]")
    expect(page2.locator("#sell-lifecycle_type-not_specified")).to_be_visible(timeout=5000)
    page2.check("#sell-lifecycle_type-not_specified")
    page2.click("[data-testid=sell-next]")
    expect(page2.locator("#location")).to_be_visible(timeout=5000)

    # All 34 provinces available on an empty query.
    page2.fill("#location", "")
    page2.click("#location")
    all_opts = page2.locator("#location-listbox li[role=option]").all_inner_texts()
    check("Location combobox lists exactly the 34 canonical provinces", len(all_opts) == 34 and set(all_opts) == set(VN_34_PROVINCES), f"count={len(all_opts)}")

    # Accent-insensitive search.
    page2.fill("#location", "da nang")
    expect(page2.locator("#location-listbox li[role=option]").filter(has_text="Đà Nẵng").first).to_be_visible(timeout=5000)
    check("Unaccented 'da nang' search surfaces 'Đà Nẵng'", True)

    # HCM aliases.
    for alias in ["hcm", "tphcm", "sai gon"]:
        page2.fill("#location", "")
        page2.fill("#location", alias)
        opt = page2.locator("#location-listbox li[role=option]").filter(has_text="Thành phố Hồ Chí Minh").first
        expect(opt).to_be_visible(timeout=5000)
    check("Aliases 'hcm' / 'tphcm' / 'sai gon' all surface 'Thành phố Hồ Chí Minh'", True)

    # No-result state.
    page2.fill("#location", "")
    page2.fill("#location", "zzzzz-not-a-place")
    expect(page2.get_by_text("Không tìm thấy tỉnh/thành phố phù hợp.")).to_be_visible(timeout=5000)
    check("No-result state shows the Vietnamese empty message", True)

    # Keyboard navigation: ArrowDown highlights an option, Enter commits it.
    page2.fill("#location", "")
    page2.click("#location")
    page2.keyboard.press("ArrowDown")
    page2.keyboard.press("ArrowDown")
    active_id = page2.locator("#location").get_attribute("aria-activedescendant")
    check("ArrowDown sets aria-activedescendant on the combobox", bool(active_id))
    active_text = page2.locator(f"#{active_id}").inner_text() if active_id else None
    page2.keyboard.press("Enter")
    expect(page2.locator("#location")).to_have_value(active_text or "", timeout=5000)
    check("Enter commits the keyboard-highlighted option", True, active_text)

    # Blur without a matching option reverts to the last committed value
    # (allowFreeText=false — an unmatched typed value must not stick).
    prior_value = page2.locator("#location").input_value()
    page2.fill("#location", "not a real province at all")
    page2.click("#price")  # blur the location field (still on step 4)
    page2.wait_for_timeout(300)
    check("Unmatched free text reverts to the last valid location on blur", page2.locator("#location").input_value() == prior_value)

    ctx2.close()
    browser.close()

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"TOTAL: {passed}/{len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
