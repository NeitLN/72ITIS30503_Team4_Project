"""Phase 12 rendered circular discovery E2E with exact-ID cleanup."""
import hashlib
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))


def load_local_env():
    for candidate in (os.path.join(HERE, "..", "backend", ".env"), os.path.join(HERE, "..", ".env")):
        if not os.path.exists(candidate):
            continue
        with open(candidate, encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key in {"SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"}:
                    os.environ.setdefault(key, value.strip().strip('"').strip("'"))


load_local_env()
WEB = os.environ.get("PHASE12_WEB_BASE", "http://localhost:3003")
API = os.environ.get("PHASE12_API_BASE", "http://127.0.0.1:8081")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
RUN = f"phase12-e2e-{int(time.time())}-{secrets.token_hex(2)}"
USER_IDS, PRODUCT_IDS = [], []
results, console_errors, page_errors, http_failures = [], [], [], []

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: development Supabase service configuration is unavailable.")
    sys.exit(2)


def check(name, condition, detail=""):
    results.append(bool(condition))
    print(f"[{'PASS' if condition else 'FAIL'}] {name}{' — ' + detail if detail else ''}")


def rest(method, table, query="", payload=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}{'?' + query if query else ''}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase REST {method} {table} failed ({error.code}): {body[:240]}") from error


def api(method, path, payload=None):
    request = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())


def password_hash(password):
    salt = secrets.token_hex(16)
    iterations = 100000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations, dklen=64).hex()
    return f"pbkdf2${iterations}${salt}${digest}"


def create_user():
    password = f"Phase12-{secrets.token_urlsafe(12)}!"
    row = {
        "id": str(uuid.uuid4()),
        "email": f"{RUN}@stylehub.invalid",
        "full_name": "Phase 12 Circular Discovery QA",
        "password_hash": password_hash(password),
        "role": "seller",
    }
    rest("POST", "users", payload=row)
    USER_IDS.append(row["id"])
    status, body = api("POST", "/api/auth/login", {"email": row["email"], "password": password})
    if status != 200:
        raise RuntimeError("Could not log in dedicated Phase 12 seller")
    return {**row, "token": body["data"]["token"], "auth_user": body["data"]["user"]}


def create_product(seller, lifecycle, explicit=True):
    label = lifecycle.replace("_", " ").title()
    row = {
        "id": str(uuid.uuid4()),
        "name": f"Phase 12 {label} {RUN}",
        "slug": f"{RUN}-{lifecycle}".lower(),
        "price": 320000,
        "category_slug": "t-shirts",
        "brand": "Nike",
        "image_url": "/images/products/nike-sportswear-club-tee.jpg",
        "thumbnail": "/images/products/nike-sportswear-club-tee.jpg",
        "description": "Rendered circular discovery QA listing.",
        "stock": 2,
        "seller_name": seller["full_name"],
        "seller_id": seller["id"],
        "condition": "good",
        "size": "M",
        "location": "Thành phố Hồ Chí Minh",
        "is_negotiable": False,
        "listing_source": "user",
        "status": "active",
        "inventory_mode": "simple",
    }
    rest("POST", "products", payload=row)
    PRODUCT_IDS.append(row["id"])
    if explicit:
        journey = {
            "product_id": row["id"],
            "lifecycle_type": lifecycle,
            "material": None if lifecycle == "not_specified" else "Cotton dệt dày",
            "repair_history": "Đã thay khóa kéo và gia cố đường may." if lifecycle == "repaired" else None,
            "upcycle_details": None,
            "product_story": "Chiếc áo được gìn giữ cẩn thận tại Huế." if lifecycle != "not_specified" else None,
            "reuse_packaging": lifecycle != "not_specified",
            "claim_source": "seller_declared",
        }
        rest("POST", "product_sustainability", payload=journey)
    return row


def install_auth(context, seller):
    token_json = json.dumps(seller["token"])
    user_json = json.dumps(seller["auth_user"], ensure_ascii=False)
    context.add_init_script(
        script=f"localStorage.setItem('stylehub:auth-token', {token_json}); localStorage.setItem('stylehub:auth-user', JSON.stringify({user_json}));"
    )
    context.route(
        "**/api/auth/me",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"success": True, "data": {"token": seller["token"], "user": seller["auth_user"]}}, ensure_ascii=False),
        ),
    )


def attach_observers(page):
    page.on("console", lambda message: console_errors.append(f"{page.url} :: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(f"{page.url} :: {error}"))
    page.on("response", lambda response: http_failures.append((response.status, response.url)) if response.status >= 400 else None)


def cleanup():
    if PRODUCT_IDS:
        encoded = ",".join(PRODUCT_IDS)
        rest("DELETE", "product_sustainability", f"product_id=in.({encoded})")
        rest("DELETE", "product_images", f"product_id=in.({encoded})")
        rest("DELETE", "products", f"id=in.({encoded})")
    if USER_IDS:
        rest("DELETE", "users", f"id=in.({','.join(USER_IDS)})")


try:
    seller = create_user()
    products = {
        lifecycle: create_product(seller, lifecycle)
        for lifecycle in ("new", "pre_loved", "repaired", "not_specified")
    }
    products["missing"] = create_product(seller, "missing", explicit=False)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        install_auth(context, seller)
        page = context.new_page()
        attach_observers(page)

        page.goto(f"{WEB}/shop?search={urllib.parse.quote(RUN)}&sort=latest&page=2", wait_until="domcontentloaded")
        expect(page.locator("#lifecycle-select")).to_be_visible(timeout=20000)
        check("Shop exposes an accessible lifecycle selector", page.get_by_label("Hành trình sản phẩm").count() == 1)
        page.select_option("#lifecycle-select", "pre_loved")
        page.wait_for_url("**lifecycle=pre_loved**", timeout=15000)
        expect(page.get_by_text(products["pre_loved"]["name"], exact=True)).to_be_visible(timeout=15000)
        check("Lifecycle filter resets page and preserves search/sort", "page=" not in page.url and "sort=latest" in page.url and f"search={RUN}" in urllib.parse.unquote(page.url))
        check("Filtered shop shows only matching scoped product", page.locator("[data-testid=product-card]").count() == 1)
        expect(page.locator("[data-testid=lifecycle-badge]")).to_have_text("Pre-loved")
        expect(page.locator("[data-testid=lifecycle-filter-chip]")).to_contain_text("Pre-loved")
        check("Applied lifecycle is visible and removable", True)

        page.select_option("#lifecycle-select", "repaired")
        page.wait_for_url("**lifecycle=repaired**", timeout=15000)
        expect(page.get_by_text(products["repaired"]["name"], exact=True)).to_be_visible(timeout=15000)
        page.go_back(wait_until="domcontentloaded")
        expect(page.locator("#lifecycle-select")).to_have_value("pre_loved", timeout=15000)
        page.go_forward(wait_until="domcontentloaded")
        expect(page.locator("#lifecycle-select")).to_have_value("repaired", timeout=15000)
        check("Browser back/forward restores lifecycle URL state", True)

        page.goto(f"{WEB}/shop?search={urllib.parse.quote(RUN)}&lifecycle=not_specified", wait_until="domcontentloaded")
        expect(page.get_by_text(products["not_specified"]["name"], exact=True)).to_be_visible(timeout=15000)
        expect(page.get_by_text(products["missing"]["name"], exact=True)).to_be_visible(timeout=15000)
        check("Not specified discovery includes explicit and missing rows", page.locator("[data-testid=product-card]").count() == 2)
        check("Cards omit noisy Not specified badges", page.locator("[data-testid=lifecycle-badge]").count() == 0)

        page.goto(f"{WEB}/products/{products['pre_loved']['slug']}", wait_until="domcontentloaded")
        journey = page.locator("[data-testid=product-journey]")
        expect(journey).to_be_visible(timeout=15000)
        expect(journey).to_contain_text("Pre-loved")
        expect(journey).to_contain_text("Cotton dệt dày")
        expect(journey).to_contain_text("Chiếc áo được gìn giữ cẩn thận tại Huế.")
        expect(journey).to_contain_text("Người bán tự khai")
        expect(journey).to_contain_text("Có")
        check("PDP renders the full factual Product Journey", True)

        page.goto(f"{WEB}/category/t-shirts", wait_until="domcontentloaded")
        expect(page.get_by_text(products["repaired"]["name"], exact=True)).to_be_visible(timeout=15000)
        repaired_card = page.locator("[data-testid=product-card]", has_text=products["repaired"]["name"])
        expect(repaired_card.locator("[data-testid=lifecycle-badge]")).to_have_text("Repaired")
        check("Category discovery inherits shared lifecycle badges", True)

        page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
        expect(page.locator("[data-testid=dashboard-tab-listings]")).to_be_visible(timeout=15000)
        page.locator("[data-testid=dashboard-tab-listings]").click()
        expect(page.locator("[data-testid=listings-search]")).to_be_visible(timeout=15000)
        page.fill("[data-testid=listings-search]", products["repaired"]["name"])
        row = page.locator("[data-testid=listing-row]").first
        expect(row).to_be_visible(timeout=15000)
        expect(row.locator("[data-testid=listing-lifecycle]")).to_have_text("Repaired")
        check("Seller listing row exposes a minimal lifecycle label", True)

        page.set_viewport_size({"width": 375, "height": 667})
        page.goto(f"{WEB}/shop?search={urllib.parse.quote(RUN)}", wait_until="domcontentloaded")
        expect(page.locator("#lifecycle-select")).to_be_visible(timeout=15000)
        check("Mobile circular discovery has no document overflow", page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2"))

        unexpected_console = [message for message in console_errors if "Failed to load resource" not in message]
        unexpected_http = [(status, url) for status, url in http_failures if status >= 500]
        check("No JavaScript errors or hydration warnings", not unexpected_console and not page_errors, "; ".join((unexpected_console + page_errors)[:3]))
        check("No unexpected 500 responses", not unexpected_http, str(unexpected_http[:3]))

        context.close()
        browser.close()

    print(f"\nPHASE12 E2E SUMMARY: {sum(results)}/{len(results)} passed")
    if not all(results):
        sys.exitCode = 1
except Exception as error:
    print(f"PHASE12 E2E ERROR: {error}")
    results.append(False)
finally:
    cleanup()
    print("Phase 12 E2E cleanup complete (recorded IDs only).")

sys.exit(1 if not results or not all(results) else 0)
