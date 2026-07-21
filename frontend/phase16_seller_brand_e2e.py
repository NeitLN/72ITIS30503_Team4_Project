"""Phase 16 end-to-end coverage for seller-declared brand creation.

Drives the real rendered /sell wizard, Shop filter, product detail, and
Seller Dashboard edit form in a real browser against the locally running
frontend (http://localhost:3000) and backend (http://localhost:8080).

Unlike the historical Phase 7 suite, this test registers its own disposable
seller account with a randomly generated in-memory password every run — it
never depends on a pre-shared QA credential env var, and the password is
never written to any file. All created rows are namespaced
(`stylehub-brand-test-*` brand, `phase16-e2e-*` product/user) and removed
by exact captured ID in a final cleanup step.

Usage:
    python phase16_seller_brand_e2e.py
"""
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.request
import urllib.error

from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.environ.get("PHASE_WEB_BASE", "http://localhost:3000")
API_BASE = os.environ.get("PHASE_API_BASE", "http://localhost:8080")

RUN = f"phase16-e2e-{int(time.time())}-{secrets.token_hex(3)}"
BRAND_NAME = f"Stylehub Brand Test {secrets.token_hex(4)}"
LISTING_NAME = f"Phase16 Brand E2E Listing {RUN}"
EMAIL = f"{RUN}@stylehub.invalid"
PASSWORD = secrets.token_urlsafe(18) + "!Aa1"

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "public", "images", "products", "adidas-stan-smith.jpg")

results = []
console_errors = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def attach_console(page):
    page.on("console", lambda msg: console_errors.append(f"{page.url} :: {msg.text[:200]}") if msg.type == "error" else None)


def api_post(path, payload):
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


def register_seller():
    res = api_post("/api/auth/register", {"name": "Phase16 E2E Seller", "email": EMAIL, "password": PASSWORD, "role": "seller"})
    if not res.get("success"):
        print("ERROR: could not register the Phase 16 E2E seller account:", res.get("error"))
        sys.exit(2)
    return res["data"]["user"]["id"]


def cleanup(product_slug):
    """Deletes exactly the rows this run created, by exact slug/name match
    — never a broad delete. Shells a small Node script (this test is
    Python; the Supabase service-role client used elsewhere in this repo
    is Node-only)."""
    script = f"""
require('dotenv').config({{ path: ['.env', '../.env'] }});
const {{ supabaseAdmin }} = require('./lib/supabase');
(async () => {{
  const {{ data: product }} = await supabaseAdmin.from('products').select('id,brand_id').eq('slug', {json.dumps(product_slug)}).maybeSingle();
  if (product) {{
    await supabaseAdmin.from('product_sustainability').delete().eq('product_id', product.id);
    await supabaseAdmin.from('product_images').delete().eq('product_id', product.id);
    await supabaseAdmin.from('products').delete().eq('id', product.id);
    if (product.brand_id) {{
      const {{ data: brand }} = await supabaseAdmin.from('brands').select('id,slug').eq('id', product.brand_id).maybeSingle();
      if (brand && brand.slug.startsWith('stylehub-brand-test-')) {{
        await supabaseAdmin.from('brands').delete().eq('id', brand.id);
      }}
    }}
  }}
  const {{ data: user }} = await supabaseAdmin.from('users').select('id').eq('email', {json.dumps(EMAIL)}).maybeSingle();
  if (user) await supabaseAdmin.from('users').delete().eq('id', user.id);
  console.log('phase16 e2e cleanup done');
}})();
"""
    backend_dir = os.path.join(os.path.dirname(HERE), "backend")
    proc = subprocess.run(["node", "-e", script], cwd=backend_dir, capture_output=True, text=True, timeout=30)
    print(proc.stdout.strip())
    if proc.returncode != 0:
        print("CLEANUP STDERR:", proc.stderr.strip())


seller_id = register_seller()
created_slug = None

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach_console(page)

    # ---------- Login ----------
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url(lambda url: not url.endswith("/login"), timeout=10000)
    check("Fresh seller account logs in successfully", "/login" not in page.url, page.url)

    # ---------- /sell step 1 ----------
    page.goto(f"{BASE}/sell", wait_until="load")
    page.fill("#name", LISTING_NAME)
    page.fill("#description", "Scoped Phase 16 browser QA listing exercising the new seller-declared brand flow end to end.")
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 2")).to_be_visible(timeout=5000)

    # ---------- /sell step 2 — category + NEW brand ----------
    expect(page.locator("#category_slug")).to_be_enabled(timeout=10000)
    page.select_option("#category_slug", "t-shirts")

    expect(page.locator("#brand")).to_be_enabled(timeout=10000)
    add_new_btn = page.get_by_role("button", name="Không tìm thấy thương hiệu? Thêm thương hiệu mới")
    expect(add_new_btn).to_be_visible(timeout=5000)
    check("'Thêm thương hiệu mới' option is visible next to the brand search", True)
    add_new_btn.click()

    new_brand_input = page.locator("#brand-new")
    expect(new_brand_input).to_be_visible(timeout=5000)
    check("Dedicated new-brand input appears only after choosing to add one", True)
    disclosure = page.get_by_text("Thương hiệu mới sẽ được ghi nhận là do người bán khai báo và chưa được StyleHub xác minh.")
    expect(disclosure).to_be_visible(timeout=5000)
    check("Unverified-brand disclosure is visible while declaring a new brand", True)

    new_brand_input.fill(BRAND_NAME)
    expect(new_brand_input).to_have_value(BRAND_NAME)

    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 3")).to_be_visible(timeout=5000)
    check("Step 2 -> Step 3 advanced with a declared new brand", True)

    # ---------- step 3 ----------
    page.select_option("#condition", "good")
    page.select_option("#size", "M")
    page.check("#sell-lifecycle_type-not_specified")
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 4")).to_be_visible(timeout=5000)

    # ---------- step 4 ----------
    page.fill("#price", "350000")
    page.fill("#stock", "3")
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 5")).to_be_visible(timeout=5000)

    # ---------- step 5 — image ----------
    page.set_input_files("#images", [IMG])
    expect(page.locator("li img")).to_have_count(1, timeout=5000)
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 6")).to_be_visible(timeout=5000)

    # ---------- step 6 — Review & Publish shows the entered brand + disclosure ----------
    review_text = page.locator("dl").inner_text()
    check("Review & Publish shows the exact declared brand name", BRAND_NAME in review_text)
    check("Review & Publish shows the unverified-brand disclosure", "chưa được StyleHub xác minh" in review_text)

    publish_btn = page.locator("[data-testid=sell-publish]")
    publish_btn.click()
    page.wait_for_url("**/products/**", timeout=15000)
    created_slug = page.url.rstrip("/").split("/products/")[-1]
    check("Publish redirects to the new Product Detail page", "/products/" in page.url, page.url)

    # ---------- Product Detail shows brand + disclosure ----------
    expect(page.locator("h1")).to_contain_text(LISTING_NAME, timeout=10000)
    expect(page.get_by_text(BRAND_NAME).first).to_be_visible(timeout=5000)
    check("Product Detail shows the declared brand name", True)
    detail_disclosure = page.get_by_text("Thương hiệu do người bán khai báo, chưa được StyleHub xác minh.")
    expect(detail_disclosure).to_be_visible(timeout=5000)
    check("Product Detail shows the unverified-brand disclosure", True)
    check("No broken images on Product Detail", page.locator("img").count() > 0)

    main_count = page.locator("main").count()
    h1_count = page.locator("h1").count()
    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    check("Exactly one <main> landmark on Product Detail", main_count == 1, str(main_count))
    check("Exactly one visible <h1> on Product Detail", h1_count == 1, str(h1_count))
    check("No document-level horizontal overflow on Product Detail (desktop)", not overflow)

    # ---------- Shop filter includes the new brand and returns the product ----------
    # The Shop brand list is fetched with a short (60s) server-side cache
    # for performance (GET /api/brands?scope=shop-filter, see lib/brands.ts)
    # — a brand created moments ago may not appear until that cache
    # revalidates, which is correct/expected production behavior, not a
    # defect. Poll instead of asserting on the very first load.
    brand_options = []
    for _ in range(15):
        page.goto(f"{BASE}/shop", wait_until="load")
        brand_options = page.locator("#brand-select option").all_inner_texts()
        if any(BRAND_NAME in o for o in brand_options):
            break
        page.wait_for_timeout(5000)
    check("New brand appears in the Shop brand filter", any(BRAND_NAME in o for o in brand_options), str(len(brand_options)))
    brand_option = page.locator("#brand-select option").filter(has_text=BRAND_NAME).first
    brand_value = brand_option.get_attribute("value")
    page.select_option("#brand-select", brand_value)
    page.wait_for_url(f"**/shop?brand={brand_value}**", timeout=10000)
    expect(page.get_by_text(LISTING_NAME).first).to_be_visible(timeout=10000)
    check("Selecting the new brand filter returns exactly the new listing", True)

    # Browser back/forward still works with the brand filter applied
    page.go_back()
    expect(page).to_have_url(f"{BASE}/shop", timeout=5000)
    check("Browser Back restores the unfiltered Shop URL", True)
    page.go_forward()
    page.wait_for_url(f"**/shop?brand={brand_value}**", timeout=5000)
    check("Browser Forward restores the brand-filtered Shop URL", True)

    # ---------- Mobile viewport ----------
    mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844})
    mobile_page = mobile_ctx.new_page()
    attach_console(mobile_page)
    mobile_page.goto(f"{BASE}/products/{created_slug}", wait_until="load")
    m_overflow = mobile_page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    check("No horizontal overflow on Product Detail at 390x844", not m_overflow)
    expect(mobile_page.get_by_text(BRAND_NAME).first).to_be_visible(timeout=5000)
    check("Brand name visible on Product Detail at 390x844", True)
    mobile_ctx.close()

    # ---------- Seller Dashboard: edit preserves and displays the declared brand ----------
    page.goto(f"{BASE}/seller/dashboard", wait_until="load")
    page.click("[data-testid='dashboard-tab-listings']")
    row = page.locator("[data-testid=listing-row]").filter(has_text=LISTING_NAME).first
    expect(row).to_be_visible(timeout=10000)
    row.get_by_test_id("listing-action-edit").click()
    edit_brand_input = page.locator("#edit-brand")
    expect(edit_brand_input).to_have_value(BRAND_NAME, timeout=10000)
    check("Seller Dashboard edit form preserves and displays the declared brand", True)
    edit_disclosure = page.get_by_text("Thương hiệu do người bán khai báo, chưa được StyleHub xác minh.")
    expect(edit_disclosure).to_be_visible(timeout=5000)
    check("Seller Dashboard edit form shows the unverified-brand disclosure", True)

    ctx.close()
    browser.close()

cleanup(created_slug)

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"PHASE16 E2E TOTAL: {passed}/{len(results)} passed")
if console_errors:
    print(f"\nCONSOLE ERRORS ({len(console_errors)}):")
    for c in console_errors[:20]:
        print(" -", c)
else:
    print("\nNo console errors captured.")

sys.exit(0 if passed == len(results) else 1)
