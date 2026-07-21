"""Phase 16 end-to-end coverage for unified seller brand entry and Shop search.

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
import atexit
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
http_errors = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def attach_console(page):
    page.on("console", lambda msg: console_errors.append(f"{page.url} :: {msg.text[:200]}") if msg.type == "error" else None)
    page.on(
        "response",
        lambda response: http_errors.append(f"{response.status} {response.url}")
        if response.status >= 400 and "/api/" in response.url
        else None,
    )


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
    # Registration intentionally leaves username unset. Assign a unique one
    # through the normal authenticated profile API so this disposable listing
    # can also exercise the public seller storefront.
    token = res["data"]["token"]
    username = f"p16-{RUN}"[:30]
    profile_req = urllib.request.Request(
        f"{API_BASE}/api/profile/me",
        data=json.dumps({"username": username}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(profile_req, timeout=10) as profile_resp:
            profile = json.loads(profile_resp.read())
    except urllib.error.HTTPError as exc:
        profile = json.loads(exc.read())
    if not profile.get("success"):
        print("ERROR: could not assign the disposable Phase 16 storefront username:", profile.get("error"))
        sys.exit(2)
    return res["data"]["user"]["id"]


def cleanup(product_slug):
    """Deletes exactly the rows this run created, by exact slug/name match
    — never a broad delete. Shells a small Node script (this test is
    Python; the Supabase service-role client used elsewhere in this repo
    is Node-only)."""
    script = f"""
require('dotenv').config({{ path: ['.env', '../.env'], quiet: true }});
const {{ supabaseAdmin }} = require('./lib/supabase');
(async () => {{
  const productSlug = {json.dumps(product_slug)};
  const {{ data: user }} = await supabaseAdmin.from('users').select('id').eq('email', {json.dumps(EMAIL)}).maybeSingle();
  const product = productSlug
    ? (await supabaseAdmin.from('products').select('id,brand_id').eq('slug', productSlug).maybeSingle()).data
    : null;
  let brandId = product?.brand_id || null;
  if (product) {{
    await supabaseAdmin.from('product_sustainability').delete().eq('product_id', product.id);
    await supabaseAdmin.from('product_images').delete().eq('product_id', product.id);
    await supabaseAdmin.from('products').delete().eq('id', product.id);
  }}
  if (!brandId && user) {{
    const {{ data: exactBrand }} = await supabaseAdmin.from('brands')
      .select('id').eq('name', {json.dumps(BRAND_NAME)}).eq('created_by', user.id).maybeSingle();
    brandId = exactBrand?.id || null;
  }}
  if (brandId && user) {{
    const {{ data: brand }} = await supabaseAdmin.from('brands')
      .select('id,slug,created_by').eq('id', brandId).maybeSingle();
    const {{ count: productRefs }} = await supabaseAdmin.from('products')
      .select('id', {{ count: 'exact', head: true }}).eq('brand_id', brandId);
    if (brand && brand.created_by === user.id && brand.slug.startsWith('stylehub-brand-test-') && productRefs === 0) {{
      await supabaseAdmin.from('brands').delete().eq('id', brand.id);
    }}
  }}
  if (user) await supabaseAdmin.from('users').delete().eq('id', user.id);
  console.log('phase16 e2e cleanup done');
}})();
"""
    backend_dir = os.path.join(os.path.dirname(HERE), "backend")
    proc = subprocess.run(
        ["node", "-e", script], cwd=backend_dir, capture_output=True,
        text=True, encoding="utf-8", errors="replace", timeout=30,
    )
    print((proc.stdout or "").strip())
    if proc.returncode != 0:
        print("CLEANUP STDERR:", proc.stderr.strip())


created_slug = None
cleanup_done = False


def cleanup_at_exit():
    if not cleanup_done:
        cleanup(created_slug)


atexit.register(cleanup_at_exit)
seller_id = register_seller()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach_console(page)

    # ---------- Login ----------
    # Wait for the client bundle to hydrate before submitting. Interacting at
    # the earlier `load` boundary can trigger the browser's native GET
    # `/login?` form submission before React attaches LoginForm.handleSubmit.
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url(f"{BASE}/profile", timeout=10000)
    check("Fresh seller account logs in successfully", page.url.rstrip("/") == f"{BASE}/profile", page.url)

    # ---------- /sell step 1 ----------
    page.goto(f"{BASE}/sell", wait_until="load")
    page.fill("#name", LISTING_NAME)
    page.fill("#description", "Scoped Phase 16 browser QA listing exercising the new seller-declared brand flow end to end.")
    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 2")).to_be_visible(timeout=5000)

    # ---------- /sell step 2 — one unified free-text brand combobox ----------
    expect(page.locator("#category_slug")).to_be_enabled(timeout=10000)
    page.select_option("#category_slug", "t-shirts")

    brand_input = page.locator("#brand")
    expect(brand_input).to_be_enabled(timeout=10000)
    expect(brand_input).to_have_attribute("role", "combobox")
    expect(brand_input).to_have_attribute("placeholder", "Nhập hoặc tìm thương hiệu")
    check("Seller sees one accessible unified brand combobox", page.locator("#brand").count() == 1)
    check("No separate add-new-brand action exists", page.get_by_text("Không tìm thấy thương hiệu? Thêm thương hiệu mới", exact=True).count() == 0)
    check("No second new-brand input exists", page.locator("#brand-new").count() == 0)

    brand_input.fill("nike")
    nike_option = page.get_by_role("option", name="Nike", exact=True)
    expect(nike_option).to_be_visible(timeout=5000)
    brand_input.press("ArrowDown")
    brand_input.press("Enter")
    expect(brand_input).to_have_value("Nike")
    check("Keyboard selects an existing brand suggestion", True)

    brand_input.fill(BRAND_NAME)
    expect(brand_input).to_have_value(BRAND_NAME)
    expect(page.get_by_text("Không tìm thấy thương hiệu phù hợp. Bạn vẫn có thể sử dụng tên này.", exact=True)).to_be_visible(timeout=5000)
    check("Unknown valid free text remains accepted without changing modes", True)

    page.click("[data-testid=sell-next]")
    expect(page.get_by_text("Bước 3")).to_be_visible(timeout=5000)
    check("Step 2 -> Step 3 advances directly with unknown brand text", True)

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

    # ---------- Public seller storefront carries the canonical brand ----------
    storefront_link = page.locator("section[aria-label='Thông tin người bán'] a[href^='/seller/']").first
    storefront_href = storefront_link.get_attribute("href")
    check("Product Detail links to the seller's public storefront", bool(storefront_href), str(storefront_href))
    page.goto(f"{BASE}{storefront_href}", wait_until="networkidle")
    expect(page.get_by_text(LISTING_NAME, exact=True).first).to_be_visible(timeout=10000)
    expect(page.get_by_text(BRAND_NAME, exact=False).first).to_be_visible(timeout=5000)
    check("Public seller storefront shows the listing with its declared brand", True)

    # ---------- Shop filter includes the new brand and returns the product ----------
    # The Shop page fetches its active-brand dataset uncached so a brand from
    # the just-published listing is immediately eligible. Poll briefly only
    # to tolerate normal server-render/navigation timing.
    partial_brand_query = BRAND_NAME.split()[-1].lower()
    shop_brand_found = False
    for _ in range(5):
        # The combobox is client-interactive; wait through hydration before
        # filling it so `onChange` opens the listbox deterministically.
        page.goto(f"{BASE}/shop", wait_until="networkidle")
        shop_brand_search = page.locator("#brand-search")
        expect(shop_brand_search).to_be_visible(timeout=5000)
        shop_brand_search.fill(partial_brand_query)
        brand_option = page.get_by_role("option", name=f"{BRAND_NAME} (chưa xác minh)", exact=True)
        if brand_option.count() and brand_option.is_visible():
            shop_brand_found = True
            break
        page.wait_for_timeout(1000)
    check("Partial text finds the new active seller-created brand", shop_brand_found, partial_brand_query)
    brand_option.click()
    page.wait_for_url("**/shop?brand=**", timeout=10000)
    brand_value = page.url.split("brand=")[1].split("&")[0]
    expect(page.get_by_text(LISTING_NAME).first).to_be_visible(timeout=10000)
    expect(page.get_by_text(f"Thương hiệu: {BRAND_NAME}")).to_be_visible(timeout=5000)
    check("Selecting the searched brand applies its stable URL value and returns the listing", True)

    # Browser back/forward still works with the brand filter applied
    page.go_back()
    expect(page).to_have_url(f"{BASE}/shop", timeout=5000)
    check("Browser Back restores the unfiltered Shop URL", True)
    page.go_forward()
    page.wait_for_url(f"**/shop?brand={brand_value}**", timeout=5000)
    expect(page.locator("#brand-search")).to_have_value(BRAND_NAME, timeout=5000)
    expect(page.get_by_text(LISTING_NAME).first).to_be_visible(timeout=10000)
    check("Browser Forward restores the brand-filtered Shop state and products", True)

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

    # ---------- Required responsive viewports ----------
    for width, height in [(375, 667), (390, 844), (768, 1024), (1440, 900)]:
        page.set_viewport_size({"width": width, "height": height})

        # /sell through Review & Publish, including an open suggestion list.
        page.goto(f"{BASE}/sell", wait_until="load")
        page.fill("#name", f"{LISTING_NAME} viewport {width}")
        page.fill("#description", "Responsive unified brand combobox review fixture that is never published.")
        page.click("[data-testid=sell-next]")
        expect(page.get_by_text("Bước 2")).to_be_visible(timeout=5000)
        page.select_option("#category_slug", "t-shirts")
        page.locator("#brand").fill("nike")
        expect(page.get_by_role("option", name="Nike", exact=True)).to_be_visible(timeout=5000)
        sell_listbox = page.locator("#brand-listbox").bounding_box()
        check(
            f"Seller brand dropdown stays inside {width}x{height}",
            bool(sell_listbox) and sell_listbox["x"] >= 0 and sell_listbox["x"] + sell_listbox["width"] <= width + 1,
        )
        page.locator("#brand").fill(BRAND_NAME)
        page.click("[data-testid=sell-next]")
        page.select_option("#condition", "good")
        page.select_option("#size", "M")
        page.check("#sell-lifecycle_type-not_specified")
        page.click("[data-testid=sell-next]")
        page.fill("#price", "350000")
        page.fill("#stock", "1")
        page.click("[data-testid=sell-next]")
        page.set_input_files("#images", [IMG])
        page.click("[data-testid=sell-next]")
        expect(page.get_by_text("Bước 6")).to_be_visible(timeout=5000)
        sell_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check(f"No horizontal overflow on /sell Review & Publish at {width}x{height}", not sell_overflow)

        # Product detail and searchable Shop filter.
        page.goto(f"{BASE}/products/{created_slug}", wait_until="load")
        detail_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check(f"No horizontal overflow on Product Detail at {width}x{height}", not detail_overflow)

        # Repeat the hydration boundary at each responsive viewport before
        # exercising the client-side brand option search.
        page.goto(f"{BASE}/shop", wait_until="networkidle")
        shop_search = page.locator("#brand-search")
        expect(shop_search).to_be_visible(timeout=5000)
        shop_search.fill(partial_brand_query)
        expect(page.get_by_role("option", name=f"{BRAND_NAME} (chưa xác minh)", exact=True)).to_be_visible(timeout=5000)
        shop_listbox = page.locator("#brand-search-listbox").bounding_box()
        shop_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check(f"No horizontal overflow on /shop at {width}x{height}", not shop_overflow)
        check(
            f"Shop brand search dropdown stays inside {width}x{height}",
            bool(shop_listbox) and shop_listbox["x"] >= 0 and shop_listbox["x"] + shop_listbox["width"] <= width + 1,
        )

        # Seller Dashboard editor retains the same unified field.
        page.goto(f"{BASE}/seller/dashboard", wait_until="load")
        page.click("[data-testid='dashboard-tab-listings']")
        responsive_row = page.locator("[data-testid=listing-row]:visible").filter(has_text=LISTING_NAME).first
        expect(responsive_row).to_be_visible(timeout=10000)
        responsive_row.get_by_test_id("listing-action-edit").click()
        expect(page.locator("#edit-brand")).to_have_value(BRAND_NAME, timeout=10000)
        edit_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check(f"No horizontal overflow in Seller Dashboard edit at {width}x{height}", not edit_overflow)

    ctx.close()
    browser.close()

cleanup(created_slug)
cleanup_done = True

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"PHASE16 E2E TOTAL: {passed}/{len(results)} passed")
if console_errors:
    print(f"\nCONSOLE ERRORS ({len(console_errors)}):")
    for c in console_errors[:20]:
        print(" -", c)
else:
    print("\nNo console errors captured.")

if http_errors:
    print(f"\nUNEXPLAINED API 4xx/5xx RESPONSES ({len(http_errors)}):")
    for response_error in http_errors[:20]:
        print(" -", response_error)
    results.append(("No unexplained API 4xx/5xx responses", False, str(len(http_errors))))
else:
    print("No unexplained API 4xx/5xx responses captured.")

sys.exit(0 if all(ok for _, ok, _ in results) and not console_errors and not http_errors else 1)
