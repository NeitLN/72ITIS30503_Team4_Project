"""Phase 7 end-to-end coverage for the real /sell listing pipeline.

Drives the actual rendered six-step wizard in a real browser against the
locally running frontend (http://localhost:3000) and backend
(http://localhost:8080) — auth gate, all six steps, validation, image
upload/remove/reorder, review accuracy, publish, double-click protection,
Product Detail correctness, and Shop/Category visibility.

Requires two env vars for a QA seller account (never hardcode credentials
here): PHASE7_QA_EMAIL, PHASE7_QA_PASSWORD. If login fails, the script
registers that account once via the existing /api/auth/register flow, then
logs in — so a fresh environment can run this without any manual setup
beyond choosing the two env var values.

Usage:
    PHASE7_QA_EMAIL=... PHASE7_QA_PASSWORD=... python phase7_sell_e2e.py
"""
import json
import os
import sys
import urllib.request
import urllib.error

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
IMG2 = os.path.join(HERE, "public", "images", "products", "nike-dunk-low-grey-fog.jpg")
LISTING_NAME = "Nike Air Max 90 Black - Lightly Worn"

results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def ensure_qa_account():
    """Login; register-then-login once if the account doesn't exist yet."""
    def post(path, payload):
        req = urllib.request.Request(
            f"{API_BASE}{path}",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            return json.loads(e.read())

    login_res = post("/api/auth/login", {"email": QA_EMAIL, "password": QA_PASSWORD})
    if login_res.get("success"):
        return
    post("/api/auth/register", {"name": "Phase7 QA Seller", "email": QA_EMAIL, "password": QA_PASSWORD})
    retry = post("/api/auth/login", {"email": QA_EMAIL, "password": QA_PASSWORD})
    if not retry.get("success"):
        print("ERROR: could not log in or register the QA seller account:", retry.get("error"))
        sys.exit(2)


def attach_console(page, sink):
    page.on("console", lambda msg: sink.append(f"{page.url} :: {msg.text[:200]}") if msg.type == "error" else None)


ensure_qa_account()

console_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- 1. Auth gate (logged out) ----------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach_console(page, console_errors)
    page.goto(f"{BASE}/sell", wait_until="load")
    expect(page.get_by_text("Đăng nhập để đăng bán")).to_be_visible(timeout=10000)
    check("Logged-out /sell shows sign-in gate", True)
    page.click("a[href*='redirect=/sell']")
    expect(page).to_have_url(f"{BASE}/login?redirect=/sell", timeout=10000)
    check("Gate 'Log in' link routes to /login?redirect=/sell", True, page.url)

    # ---------- 2. Login, land back on /sell ----------
    page.fill("#email", QA_EMAIL)
    page.fill("#password", QA_PASSWORD)
    page.click("button[type=submit]")
    expect(page).to_have_url(f"{BASE}/sell", timeout=10000)
    check("After login, redirected back to /sell", True, page.url)

    # ---------- 3. Step 1 — validation + fill ----------
    check("Step indicator shows 6 steps", page.locator("ol li").count() == 6)
    page.click("[data-testid=sell-next]")  # try to advance with empty fields
    check("Step 1 blocks advance when empty (name error shown)", page.locator("#name-error").count() > 0)
    check("Invalid field has aria-invalid", page.locator("#name[aria-invalid=true]").count() > 0)

    page.fill("#name", LISTING_NAME)
    page.fill("#description", "Personal pair, worn a handful of times indoors only. No creasing, original box included. Selling because they run slightly small for me.")
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 2")).to_be_visible(timeout=5000)
    check("Step 1 -> Step 2 advanced", True)

    # ---------- 4. Step 2 — real category/brand data ----------
    # Wait for the actual "finished loading" state (the select becomes
    # enabled once categoriesLoading/brandsLoading flips false) rather than
    # reading options immediately after the step-2 heading appears, which
    # can race ahead of the async /api/categories and /api/brands calls.
    expect(page.locator("#category_slug")).to_be_enabled(timeout=10000)
    cat_options = page.locator("#category_slug option").all_inner_texts()
    check("Category options loaded from real API (>5 options)", len(cat_options) > 5, str(len(cat_options)))
    page.select_option("#category_slug", "shoes")

    # Brand is now a free-text combobox (Phase 8.1), not a fixed <select> —
    # focusing it opens the suggestion listbox populated from /api/brands.
    expect(page.locator("#brand")).to_be_enabled(timeout=10000)
    page.click("#brand")
    brand_option_count = page.locator("#brand-listbox li[role=option]").count()
    check("Brand suggestions loaded from real API (>5 options)", brand_option_count > 5, str(brand_option_count))
    page.fill("#brand", "Nike")
    nike_option = page.locator("#brand-listbox li[role=option]").filter(has_text="Nike").first
    expect(nike_option).to_be_visible(timeout=5000)
    nike_option.click()
    expect(page.locator("#brand")).to_have_value("Nike", timeout=5000)
    check("Existing brand selected via combobox suggestion", True)
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 3")).to_be_visible(timeout=5000)
    check("Step 2 -> Step 3 advanced", True)

    # ---------- 5. Step 3 — condition/size (shoe-size relationship) ----------
    size_options = page.locator("#size option").all_inner_texts()
    check("Shoe category shows EU size options", any("EU" in o for o in size_options), str(size_options))
    page.select_option("#condition", "good")
    page.select_option("#size", "EU 42")
    page.check("#sell-lifecycle_type-not_specified")
    check("Phase 7 flow explicitly selects the backward-compatible Not Specified journey", True)
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 4")).to_be_visible(timeout=5000)
    check("Step 3 -> Step 4 advanced", True)

    # ---------- 6. Step 4 — pricing validation ----------
    page.fill("#price", "0")
    page.click("[data-testid=sell-next]")
    check("Price=0 blocked", page.locator("[aria-invalid=true]#price").count() > 0)
    page.fill("#price", "1500000")
    page.fill("#sale_price", "2000000")  # invalid: sale >= price
    page.click("[data-testid=sell-next]")
    check("Sale price >= price blocked", page.locator("[aria-invalid=true]#sale_price").count() > 0)
    page.fill("#sale_price", "1200000")
    page.fill("#stock", "0")
    page.click("[data-testid=sell-next]")
    check("Stock=0 blocked", page.locator("[aria-invalid=true]#stock").count() > 0)
    page.fill("#stock", "1")
    page.check("input[type=checkbox]")
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 5")).to_be_visible(timeout=5000)
    check("Step 4 -> Step 5 advanced", True)

    # ---------- 7. Step 5 — images ----------
    page.click("[data-testid=sell-next]")
    check("No images blocks advance", page.get_by_text("Vui lòng thêm ít nhất một ảnh").count() > 0)
    page.set_input_files("#images", [IMG1])
    expect(page.locator("li img")).to_have_count(1, timeout=5000)
    check("Image preview appears after selecting 1 file", True)
    page.set_input_files("#images", [IMG2])
    expect(page.locator("li img")).to_have_count(2, timeout=5000)
    check("Second image preview added (order preserved, 2 total)", True)
    page.click("button[aria-label='Xóa ảnh 1']")
    expect(page.locator("li img")).to_have_count(1, timeout=5000)
    check("Remove image works (back to 1)", True)
    page.set_input_files("#images", [IMG1])
    expect(page.locator("li img")).to_have_count(2, timeout=5000)
    check("Re-add image works (2 again)", True)
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 6")).to_be_visible(timeout=5000)
    check("Step 5 -> Step 6 advanced", True)

    # ---------- 8. Step 6 — review accuracy ----------
    review_text = page.locator("dl").inner_text()
    check("Review shows correct title", LISTING_NAME in review_text)
    check("Review shows correct price", "1.500.000" in review_text or "1,500,000" in review_text or "1500000" in review_text.replace(".", "").replace(",", ""))
    check("Review shows 2 photo previews", page.locator("ul img").count() >= 2)

    # ---------- 9. Double-click publish -> exactly one product ----------
    created_urls = []
    page.on("response", lambda resp: created_urls.append(resp.url) if "/api/products" in resp.url and resp.request.method == "POST" else None)

    publish_btn = page.locator("[data-testid=sell-publish]")
    publish_btn.click()
    try:
        publish_btn.click(timeout=1500)  # rapid second click — should be blocked by the disabled state
    except Exception:
        pass  # expected: the button is disabled by the time this fires
    page.wait_for_url("**/products/**", timeout=15000)
    check("Redirected to Product Detail after publish", "/products/" in page.url, page.url)
    created_slug = page.url.rstrip("/").split("/products/")[-1]
    print("Created slug:", created_slug)
    check("Only one POST /api/products fired despite double click", len(created_urls) == 1, str(len(created_urls)))

    # ---------- 10. Product Detail correctness ----------
    # Deterministic fix (was the flaky assertion): don't rely on
    # wait_for_load_state("networkidle") after a client-side router.push —
    # this Next.js dev server keeps an HMR websocket open, so "networkidle"
    # is not a reliable signal for "the new route's content has rendered."
    # Instead assert directly on the actual DOM content via Playwright's
    # auto-retrying `expect()`, which polls until it matches or times out.
    expect(page.locator("h1")).to_contain_text(LISTING_NAME, timeout=10000)
    check("Product Detail shows the listing name", True)
    check("Product Detail image(s) present", page.locator("img").count() > 0)

    img_404s = []
    page.on("response", lambda resp: img_404s.append(f"{resp.status} {resp.url}") if resp.status >= 400 and any(ext in resp.url for ext in [".jpg", ".jpeg", ".png", ".webp"]) else None)
    page.reload(wait_until="load")
    expect(page.locator("h1")).to_contain_text(LISTING_NAME, timeout=10000)
    check("No image 404s on Product Detail", len(img_404s) == 0, str(img_404s))

    ctx.close()

    # ---------- 11. Marketplace visibility ----------
    ctx2 = browser.new_context()
    page2 = ctx2.new_page()
    attach_console(page2, console_errors)
    page2.goto(f"{BASE}/shop", wait_until="load")
    expect(page2.get_by_text(LISTING_NAME).first).to_be_visible(timeout=10000)
    check("New listing appears in /shop", True)
    page2.goto(f"{BASE}/category/shoes", wait_until="load")
    expect(page2.get_by_text(LISTING_NAME).first).to_be_visible(timeout=10000)
    check("New listing appears in /category/shoes", True)
    page2.goto(f"{BASE}/", wait_until="load")
    check("Homepage renders without error", page2.locator("body").count() > 0)
    ctx2.close()

    browser.close()

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"TOTAL: {passed}/{len(results)} passed")
if console_errors:
    print(f"\nCONSOLE ERRORS ({len(console_errors)}):")
    for c in console_errors[:20]:
        print(" -", c)
else:
    print("\nNo console errors captured.")

sys.exit(0 if passed == len(results) else 1)
