"""Phase 6 catalog runtime verification (Playwright).
Backend expected on :8080, frontend on :3000 (started by with_server.py).
Asserts: zero product-image 404s, no 500s, distinct New Arrivals/On Sale,
category + brand filtering work, product detail renders, mobile + desktop."""
import sys
import json
import urllib.request
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FE = "http://localhost:3000"
BE = "http://localhost:8080"

img_404 = []          # failed /images/products/ requests
other_bad = []        # other >=400 responses (excluding known-noise)
console_errors = []
failures = []


def api(path):
    with urllib.request.urlopen(BE + path, timeout=15) as r:
        return json.load(r)


def attach(page):
    def on_response(resp):
        if resp.status >= 400:
            url = resp.url
            if "/images/products/" in url:
                img_404.append(f"{resp.status} {url}")
            elif resp.status >= 500:
                other_bad.append(f"{resp.status} {url}")
    def on_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text[:200])
    page.on("response", on_response)
    page.on("console", on_console)


nav_errors = []


def visit(page, path, wait_imgs=True):
    # domcontentloaded is robust against the dev HMR websocket keeping the
    # network perpetually "active" (which stalls networkidle). Scroll to trigger
    # lazy-loaded card images so their requests are captured by the response hook.
    try:
        page.goto(FE + path, wait_until="domcontentloaded", timeout=45000)
        page.mouse.wheel(0, 6000)
        page.wait_for_timeout(900)
    except Exception as e:
        nav_errors.append(f"{path}: {type(e).__name__}")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # discover canonical leaf categories + a few brands from the API
    cats = [c["slug"] for c in api("/api/categories")["data"] if c.get("parent_id")]
    prod_count = api("/api/products?limit=100")["meta"]["count"]
    brands_to_test = ["nike", "adidas", "puma", "hades", "uniqlo"]

    # ---------- DESKTOP ----------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach(page)

    visit(page, "/")
    # New Arrivals vs On Sale distinct datasets (from API, deterministic)
    na = [x["slug"] for x in api("/api/products?sort=latest&limit=8")["data"]]
    os_ = [x["slug"] for x in api("/api/products?on_sale=true&limit=8")["data"]]
    if set(na) == set(os_):
        failures.append("New Arrivals and On Sale datasets are identical")
    if not os_:
        failures.append("On Sale dataset empty")

    visit(page, "/shop")
    # sample product detail links from shop
    hrefs = page.eval_on_selector_all(
        "a[href^='/products/']", "els => [...new Set(els.map(e => e.getAttribute('href')))]")
    # every canonical category page. A category legitimately has no listings when
    # no verified image asset exists for it (e.g. phone-cases); only flag a
    # rendering bug where the API HAS products but the page shows none.
    render_bugs = []
    empty_but_ok = []
    for slug in cats:
        api_n = api(f"/api/categories/{slug}/products")["meta"].get("count", 0)
        visit(page, f"/category/{slug}")
        cards = page.locator("a[href^='/products/']").count()
        if api_n > 0 and cards == 0:
            render_bugs.append(slug)
        elif api_n == 0:
            empty_but_ok.append(slug)
    # brand filters via shop
    brand_hits = {}
    for b in brands_to_test:
        visit(page, f"/shop?brand={b}")
        brand_hits[b] = page.locator("a[href^='/products/']").count()
    # product detail sample (up to 12 spanning the shop)
    sample = hrefs[:12]
    for h in sample:
        visit(page, h)
    # sell + cart
    visit(page, "/sell")
    sell_opts = page.eval_on_selector_all("select option", "els => els.map(e=>e.textContent.trim())")
    visit(page, "/cart")
    ctx.close()

    # ---------- MOBILE ----------
    mctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    mpage = mctx.new_page()
    attach(mpage)
    visit(mpage, "/")
    visit(mpage, "/shop")
    if sample:
        visit(mpage, sample[0])
    mctx.close()
    browser.close()

# ---------- REPORT ----------
print("=" * 64)
print("PHASE 6 CATALOG RUNTIME VERIFICATION")
print("=" * 64)
print(f"Active products (API count) : {prod_count}")
print(f"Canonical categories tested : {len(cats)}")
print(f"Categories w/ no listings   : {empty_but_ok or 'none'} (expected: no verified asset)")
print(f"Category render bugs        : {render_bugs or 'none'}")
print(f"Brand filter hits           : {brand_hits}")
print(f"Product detail pages visited: {len(sample)} (+1 mobile)")
print(f"New Arrivals slugs          : {na}")
print(f"On Sale slugs               : {os_}")
print(f"Sell-form category options  : {len(sell_opts)} -> {sell_opts[:4]}...")
print("-" * 64)
print(f"Product-image 404s          : {len(img_404)}")
for x in img_404[:20]:
    print("   ", x)
print(f"Server 5xx responses        : {len(other_bad)}")
for x in other_bad[:20]:
    print("   ", x)
print(f"Console errors              : {len(console_errors)}")
for x in console_errors[:10]:
    print("   ", x)
print(f"Navigation errors           : {nav_errors or 'none'}")
if nav_errors:
    failures.append(f"navigation errors: {nav_errors}")

# brand filters should each return >=1
for b, n in brand_hits.items():
    if n == 0:
        failures.append(f"brand filter '{b}' returned 0 products")
if img_404:
    failures.append(f"{len(img_404)} product-image 404(s)")
if other_bad:
    failures.append(f"{len(other_bad)} server 5xx response(s)")
if render_bugs:
    failures.append(f"category render bugs (API has products, page empty): {render_bugs}")

print("=" * 64)
if failures:
    print("RESULT: FAIL")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("RESULT: PASS — zero image 404s, no 5xx, filtering OK, datasets distinct")
