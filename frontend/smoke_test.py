"""Smoke test: navigate every StyleHub route, verify it loads without errors,
capture a screenshot and any console/page errors."""
import re
import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
OUT = os.path.join(os.path.dirname(__file__), "smoke_shots")
os.makedirs(OUT, exist_ok=True)

# Static routes to smoke test
STATIC_ROUTES = [
    "/", "/shop", "/cart", "/wishlist", "/checkout", "/checkout/success",
    "/profile", "/orders", "/sell", "/login", "/register",
    "/admin/orders", "/about", "/contact",
    "/delivery-terms", "/privacy-policy",
]

results = []


def visit(page, path):
    console_errors = []
    page_errors = []

    def on_console(msg):
        if msg.type in ("error", "warning"):
            console_errors.append(f"[{msg.type}] {msg.text}")

    def on_pageerror(exc):
        page_errors.append(str(exc))

    failed_req = []

    def on_response(resp):
        if resp.status >= 400:
            failed_req.append(f"{resp.status} {resp.url}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("response", on_response)

    status = None
    ok = True
    try:
        # domcontentloaded (not networkidle) — the Next dev HMR websocket keeps the
        # network perpetually active, which would stall networkidle indefinitely.
        resp = page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
        status = resp.status if resp else None
        page.mouse.wheel(0, 5000)
        page.wait_for_timeout(900)
    except Exception as e:
        ok = False
        page_errors.append(f"NAV ERROR: {e}")

    # screenshot
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", path.strip("/")) or "home"
    shot = os.path.join(OUT, f"{slug}.png")
    try:
        page.screenshot(path=shot, full_page=True)
    except Exception as e:
        page_errors.append(f"SHOT ERROR: {e}")

    # detect Next.js error overlay / obvious failure text
    title = page.title()
    body = ""
    try:
        body = page.locator("body").inner_text(timeout=3000)[:400]
    except Exception:
        pass
    has_error_overlay = ("Unhandled Runtime Error" in body or
                         "Application error" in body or
                         "This page could not be found" in body)

    page.remove_listener("console", on_console)
    page.remove_listener("pageerror", on_pageerror)
    page.remove_listener("response", on_response)

    results.append({
        "path": path, "status": status, "ok": ok and not has_error_overlay,
        "title": title, "console": console_errors, "errors": page_errors,
        "notfound": "could not be found" in body,
        "failed_req": failed_req,
    })
    return page


def discover_slugs(page):
    """Scrape real product/category/seller slugs from home + shop pages."""
    slugs = {"products": None, "category": None, "seller": None}
    for path in ["/", "/shop", "/products/adidas-samba-og"]:
        try:
            page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(600)
        except Exception:
            continue
        hrefs = page.eval_on_selector_all(
            "a[href]", "els => els.map(e => e.getAttribute('href'))")
        for h in hrefs:
            if not h:
                continue
            for kind in slugs:
                if slugs[kind] is None:
                    m = re.match(rf"^/{kind}/([^/?#]+)$", h)
                    if m:
                        slugs[kind] = h
        if all(slugs.values()):
            break
    return slugs


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    for r in STATIC_ROUTES:
        visit(page, r)

    slugs = discover_slugs(page)
    print("Discovered dynamic slugs:", slugs)
    for kind, href in slugs.items():
        if href:
            visit(page, href)
        else:
            results.append({"path": f"/{kind}/<none-found>", "status": None,
                            "ok": None, "title": "", "console": [],
                            "errors": ["No slug link found to test this route"],
                            "notfound": False})

    browser.close()

# Report
print("\n" + "=" * 70)
print("SMOKE TEST REPORT")
print("=" * 70)
passed = failed = warned = 0
for r in results:
    if r["ok"] is None:
        mark = "SKIP"
    elif r["ok"] and r["status"] and r["status"] < 400:
        mark = "PASS"
        passed += 1
    else:
        mark = "FAIL"
        failed += 1
    line = f"[{mark}] {r['path']:<28} HTTP={r['status']}  title={r['title'][:40]!r}"
    print(line)
    if r["notfound"]:
        print("        -> 404 / page not found content")
    for e in r["errors"]:
        print(f"        ERROR: {e}")
    for fr in r.get("failed_req", [])[:8]:
        print(f"        404-RES: {fr[:160]}")
    if r["console"]:
        warned += 1
        for c in r["console"][:3]:
            print(f"        {c[:160]}")

print("=" * 70)
print(f"TOTAL: {passed} passed, {failed} failed, {warned} pages with console warnings/errors")
print(f"Screenshots in: {OUT}")

# Unique missing resources across all pages
missing = set()
for r in results:
    for fr in r.get("failed_req", []):
        missing.add(fr)
if missing:
    print("\n" + "-" * 70)
    print(f"UNIQUE MISSING RESOURCES ({len(missing)}):")
    for m in sorted(missing):
        print(f"  {m}")
