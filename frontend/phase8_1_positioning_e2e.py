"""Phase 8.1 correction coverage: broad C2C marketplace positioning.

Verifies StyleHub's own marketing/nav/metadata copy no longer implies the
platform is local-brand-only, streetwear-only, Hà Nội/Sài Gòn-only, an
archive-only shop, or a retailer that owns its own inventory — while
confirming the protected English editorial anchors from the earlier hybrid-
language correction are still present, and that real product/seller/brand/
location data is untouched (this pass only ever edits StyleHub's own copy).

Usage:
    python phase8_1_positioning_e2e.py
"""
import json
import sys
import urllib.request

from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
API_BASE = "http://localhost:8080"

OLD_ANNOUNCEMENT = "PRE-LOVED · LOCAL BRANDS · STREETWEAR · PEER TO PEER"
NEW_ANNOUNCEMENT_FRAGMENTS = ["buy", "sell", "rewear", "new & pre-loved", "everyday fashion", "c2c community"]

# Restrictive claims that must never appear in StyleHub's OWN copy (lower-cased
# substrings). Real product/brand/seller data is exempt by construction —
# these checks only ever run against layout/nav/metadata/editorial text.
RESTRICTIVE_MARKERS = [
    "local brand-only", "streetwear-only", "only local brands", "only streetwear",
    "hà nội và sài gòn", "hanoi and saigon only", "chỉ dành cho", "chỉ bán hàng nội địa",
]

results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def api(path):
    with urllib.request.urlopen(f"{API_BASE}{path}", timeout=15) as r:
        return json.load(r)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # ========== 1 & 2. Announcement bar ==========
    page.goto(f"{BASE}/", wait_until="load")
    header_text = page.locator("header").inner_text()
    check("Old restrictive announcement string is gone", OLD_ANNOUNCEMENT not in header_text.upper(), header_text[:120])
    header_lower = header_text.lower()
    missing = [f for f in NEW_ANNOUNCEMENT_FRAGMENTS if f not in header_lower]
    check("New C2C announcement string is present (all fragments)", not missing, str(missing))

    # ========== 9. Announcement bar responsive (no overflow) ==========
    for w, h in [(375, 667), (390, 844), (768, 1024), (1024, 768), (1440, 900)]:
        page.set_viewport_size({"width": w, "height": h})
        overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check(f"No horizontal overflow at {w}x{h}", not overflow)
    page.set_viewport_size({"width": 1440, "height": 900})

    # ========== 10. Reduced motion ==========
    ctx_rm = browser.new_context(reduced_motion="reduce")
    page_rm = ctx_rm.new_page()
    page_rm.goto(f"{BASE}/", wait_until="load")
    rm_text = page_rm.locator("header").inner_text()
    check("Announcement text is readable with prefers-reduced-motion: reduce", len(rm_text) > 0 and "buy" in rm_text.lower())
    ctx_rm.close()

    # ========== 3 & 4 & 5. Root metadata / positioning ==========
    description = page.locator('meta[name="description"]').get_attribute("content") or ""
    check("Root meta description mentions C2C marketplace concept", "c2c" in description.lower())
    check("Root meta description does not say only local brands", "địa phương" not in description.lower() or "duy nhất" not in description.lower())
    check(
        "Root meta description does not restrict to streetwear/archive only",
        not any(w in description.lower() for w in ["streetwear, sneaker, đồ archive", "chỉ streetwear"]),
        description,
    )

    # The homepage overrides plain `description` at the page level while
    # `openGraph.description` still falls back to the root layout's
    # DEFAULT_DESCRIPTION — two independently-set fields by Next.js's
    # metadata layering, not expected to be byte-identical. Check both
    # reflect the broadened C2C positioning rather than requiring equality.
    og_description = page.locator('meta[property="og:description"]').get_attribute("content") or ""
    check("OG description also reflects the broadened C2C positioning", "c2c" in og_description.lower(), og_description)

    json_ld = page.locator('script[type="application/ld+json"]').first.inner_text()
    ld_data = json.loads(json_ld)
    check("JSON-LD @type is WebSite, not a Store/Retailer type", ld_data.get("@type") == "WebSite", ld_data.get("@type"))
    check("JSON-LD description matches the broadened positioning", "c2c" in ld_data.get("description", "").lower())

    # ========== Body-text sweep across key pages: no restrictive framing ==========
    for path in ["/", "/about", "/shop", "/sell", "/cart", "/wishlist"]:
        page.goto(f"{BASE}{path}", wait_until="load")
        body = page.locator("body").inner_text().lower()
        hits = [m for m in RESTRICTIVE_MARKERS if m in body]
        check(f"{path}: no restrictive positioning marker found", not hits, str(hits))

    # ========== 7. English editorial anchors still present ==========
    page.goto(f"{BASE}/", wait_until="load")
    home_lower = page.locator("body").inner_text().lower()
    check("Homepage still shows 'Shop the drop.'", "shop the drop" in home_lower)
    check("Homepage still shows 'Sell the archive.'", "sell the archive" in home_lower)
    page.goto(f"{BASE}/about", wait_until="load")
    check("About page still shows 'HOW THE MARKETPLACE WORKS'", "how the marketplace works" in page.locator("body").inner_text().lower())
    page.goto(f"{BASE}/sell", wait_until="load")
    sell_lower = page.locator("body").inner_text().lower()
    check("Sell page still shows 'Seller Hub'", "seller hub" in sell_lower)
    check("Sell page still shows 'List your archive. Find its next owner.'", "list your archive" in sell_lower)

    # ========== 8. Vietnamese transactional content still natural ==========
    page.goto(f"{BASE}/cart", wait_until="load")
    expect(page.locator("body")).not_to_contain_text("Đang tải", timeout=10000)
    cart_lower = page.locator("body").inner_text().lower()
    check("Empty cart still shows a Vietnamese empty state", "trống" in cart_lower or "chưa có" in cart_lower)

    ctx.close()

    # ========== Seller fallback terminology ==========
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx2.new_page()
    page2.goto(f"{BASE}/shop", wait_until="load")
    shop_body = page2.locator("body").inner_text()
    check("No leftover 'Independent seller' fallback text visible", "Independent seller" not in shop_body and "Người bán độc lập" not in shop_body)
    ctx2.close()

    browser.close()

# ========== 6. Real data untouched (spot-check via API) ==========
seed_seller = api("/api/sellers/minh-tran")
check("Real seed seller (Minh Tran) profile still resolves", seed_seller.get("success") is True and seed_seller["data"]["username"] == "minh-tran")
products = api("/api/products?limit=1")
check("Products API still returns data (catalog untouched)", products.get("success") is True and len(products.get("data", [])) > 0)

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"TOTAL: {passed}/{len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
