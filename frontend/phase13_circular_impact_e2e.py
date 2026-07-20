"""Phase 13 rendered circular-impact E2E with exact-ID cleanup."""
import hashlib
import json
import os
import re
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
WEB = os.environ.get("PHASE13_WEB_BASE", "http://localhost:3003")
API = os.environ.get("PHASE13_API_BASE", "http://127.0.0.1:8081")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
RUN = f"phase13-e2e-{int(time.time())}-{secrets.token_hex(2)}"
USER_IDS, PRODUCT_IDS, ORDER_IDS = [], [], []
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
    request = urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase REST {method} {table} failed ({error.code}): {body[:240]}") from error


def api(method, path, payload=None, token=None, extra_headers=None):
    headers = {"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {}), **(extra_headers or {})}
    request = urllib.request.Request(f"{API}{path}", data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
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


def create_user(label, role="seller"):
    password = f"Phase13-{secrets.token_urlsafe(12)}!"
    row = {
        "id": str(uuid.uuid4()),
        "email": f"{RUN}-{label}@stylehub.invalid",
        "full_name": f"Phase 13 {label.title()} Impact QA",
        "username": f"{RUN}-{label}"[:30],
        "password_hash": password_hash(password),
        "role": role,
    }
    rest("POST", "users", payload=row)
    USER_IDS.append(row["id"])
    status, body = api("POST", "/api/auth/login", {"email": row["email"], "password": password})
    if status != 200:
        raise RuntimeError(f"Could not log in dedicated Phase 13 {label}")
    return {**row, "token": body["data"]["token"], "auth_user": body["data"]["user"]}


def create_product(seller, label, lifecycle):
    row = {
        "id": str(uuid.uuid4()),
        "name": f"Phase 13 {label} {RUN}",
        "slug": f"{RUN}-{label}".lower(),
        "price": 350000,
        "category_slug": "t-shirts",
        "brand": "Nike",
        "image_url": "/images/products/nike-sportswear-club-tee.jpg",
        "thumbnail": "/images/products/nike-sportswear-club-tee.jpg",
        "description": "Rendered Phase 13 impact QA listing.",
        "stock": 6,
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
    rest("POST", "product_sustainability", payload={
        "product_id": row["id"],
        "lifecycle_type": lifecycle,
        "material": "Cotton",
        "repair_history": "Đã thay khóa kéo bị hỏng." if lifecycle == "repaired" else None,
        "upcycle_details": None,
        "product_story": f"Hành trình thật của {label}.",
        "reuse_packaging": True,
        "claim_source": "seller_declared",
    })
    return row


def create_completed_order(buyer, product, quantity):
    payload = {
        "customer": {
            "name": "Phase Thirteen E2E Buyer",
            "email": f"{RUN}-buyer@example.invalid",
            "phone": "0901234567",
            "address": "13 Circular Street, Quận 1",
            "city": "Thành phố Hồ Chí Minh",
        },
        "paymentMethod": "cod",
        "items": [{"productId": product["id"], "variantId": None, "quantity": quantity, "expectedUnitPrice": product["price"]}],
    }
    status, body = api("POST", "/api/orders", payload, buyer["token"], {"Idempotency-Key": str(uuid.uuid4())})
    if status != 200:
        raise RuntimeError(f"Phase 13 checkout failed: {status}")
    order_id = body["data"]["id"]
    ORDER_IDS.append(order_id)
    rest("PATCH", "order_items", f"order_id=eq.{order_id}", {"fulfillment_status": "completed"})
    return order_id


def install_auth(context, user):
    token_json = json.dumps(user["token"])
    user_json = json.dumps(user["auth_user"], ensure_ascii=False)
    context.add_init_script(script=f"localStorage.setItem('stylehub:auth-token', {token_json}); localStorage.setItem('stylehub:auth-user', JSON.stringify({user_json}));")
    context.route(
        "**/api/auth/me",
        lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "data": {"token": user["token"], "user": user["auth_user"]}}, ensure_ascii=False)),
    )


def attach_observers(page):
    page.on("console", lambda message: console_errors.append(f"{page.url} :: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(f"{page.url} :: {error}"))
    page.on("response", lambda response: http_failures.append((response.status, response.url)) if response.status >= 400 else None)


def assert_no_overflow(page, name):
    check(name, page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2"))


def cleanup():
    if ORDER_IDS:
        encoded = ",".join(ORDER_IDS)
        rest("DELETE", "inventory_movements", f"order_id=in.({encoded})")
        rest("DELETE", "checkout_idempotency", f"order_id=in.({encoded})")
        rest("DELETE", "order_coupons", f"order_id=in.({encoded})")
        rest("DELETE", "order_items", f"order_id=in.({encoded})")
        rest("DELETE", "orders", f"id=in.({encoded})")
    if USER_IDS:
        rest("DELETE", "checkout_idempotency", f"buyer_id=in.({','.join(USER_IDS)})")
    if PRODUCT_IDS:
        encoded = ",".join(PRODUCT_IDS)
        rest("DELETE", "product_sustainability", f"product_id=in.({encoded})")
        rest("DELETE", "product_images", f"product_id=in.({encoded})")
        rest("DELETE", "products", f"id=in.({encoded})")
    if USER_IDS:
        rest("DELETE", "users", f"id=in.({','.join(USER_IDS)})")


try:
    seller = create_user("seller")
    buyer = create_user("buyer", "customer")
    empty_user = create_user("empty", "customer")
    pre_loved = create_product(seller, "Pre Loved", "pre_loved")
    repaired = create_product(seller, "Repaired", "repaired")
    create_completed_order(buyer, pre_loved, 2)

    platform_status, platform_body = api("GET", "/api/sustainability/impact")
    if platform_status != 200:
        platform_body = {"data": {"metrics": {}}}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        public_context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = public_context.new_page()
        attach_observers(page)
        page.goto(WEB, wait_until="domcontentloaded")
        expect(page.locator("[data-testid=home-impact]")).to_be_visible(timeout=20000)
        check("Homepage renders Circular Impact section", True)
        for testid, key in (("metric-active-circular", "activeCircularListings"), ("metric-completed-circular", "completedCircularUnits"), ("metric-coverage", "journeyCoveragePercent")):
            expect(page.locator(f"[data-testid={testid}]")).to_contain_text(str(platform_body["data"]["metrics"].get(key, "")))
        check("Homepage metrics match the real impact API", platform_status == 200)
        expect(page.get_by_role("link", name=re.compile("methodology|phương pháp", re.I))).to_be_visible()
        expect(page.get_by_role("link", name=re.compile("circular|tuần hoàn", re.I)).first).to_be_visible()

        page.goto(f"{WEB}/sustainability", wait_until="domcontentloaded")
        expect(page.locator("[data-testid=sustainability-page]")).to_be_visible(timeout=15000)
        expect(page.get_by_role("heading", name="Wear Longer. Waste Less.", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name=re.compile("Product Journey", re.I))).to_be_visible()
        expect(page.get_by_text(re.compile("người bán tự khai", re.I)).first).to_be_visible()
        expect(page.get_by_text(re.compile("không.*ước tính.*carbon|không.*CO2", re.I)).first).to_be_visible()
        lifecycle_links = page.locator("a[href*='/shop?lifecycle=']")
        check("Sustainability page links lifecycle definitions to Shop", lifecycle_links.count() >= 5)
        expect(page.get_by_text(re.compile("SDG 12", re.I))).to_be_visible()
        expect(page.get_by_text(re.compile("SDG 8", re.I))).to_be_visible()
        check("Sustainability page contains no numeric CO2/water/waste estimate", not re.search(r"\d[\d.,]*\s*(kg\s*CO2|lít nước|kg\s*(rác|waste))", page.locator("main").inner_text(), re.I))

        page.keyboard.press("Tab")
        check("Public sustainability page supports visible keyboard focus", page.evaluate("document.activeElement !== document.body"))

        page.goto(f"{WEB}/seller/{seller['username']}", wait_until="domcontentloaded")
        public_impact = page.locator("[data-testid=public-seller-impact]")
        expect(public_impact).to_be_visible(timeout=15000)
        expect(public_impact).to_contain_text("2")
        expect(public_impact).to_contain_text(re.compile("người bán tự khai", re.I))
        check("Public seller impact exposes safe sold-unit and disclosure text", True)

        unknown_response = page.goto(f"{WEB}/seller/phase13-definitely-unknown", wait_until="domcontentloaded")
        check("Unknown seller storefront remains a real 404", unknown_response is not None and unknown_response.status == 404)
        public_context.close()

        seller_context = browser.new_context(viewport={"width": 1024, "height": 768})
        install_auth(seller_context, seller)
        seller_page = seller_context.new_page()
        attach_observers(seller_page)
        seller_page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
        profile_impact = seller_page.locator("[data-testid=profile-impact]")
        expect(profile_impact).to_be_visible(timeout=15000)
        expect(profile_impact).to_contain_text("2")
        expect(profile_impact).to_contain_text(re.compile("đã bán|bán", re.I))
        check("Authenticated profile distinguishes private selling impact", True)

        seller_page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
        dashboard_impact = seller_page.locator("[data-testid=dashboard-impact]")
        expect(dashboard_impact).to_be_visible(timeout=15000)
        expect(dashboard_impact).to_contain_text("100")
        expect(dashboard_impact).to_contain_text("2")
        check("Seller Dashboard renders compact coverage and sold-unit impact", True)
        seller_context.close()

        buyer_context = browser.new_context(viewport={"width": 768, "height": 1024})
        install_auth(buyer_context, buyer)
        buyer_page = buyer_context.new_page()
        attach_observers(buyer_page)
        buyer_page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
        buyer_impact = buyer_page.locator("[data-testid=profile-impact]")
        expect(buyer_impact).to_be_visible(timeout=15000)
        expect(buyer_impact).to_contain_text("2")
        expect(buyer_impact).to_contain_text(re.compile("đã mua|mua", re.I))
        check("Authenticated buyer profile renders purchased circular quantity", True)
        buyer_context.close()

        empty_context = browser.new_context(viewport={"width": 390, "height": 844})
        install_auth(empty_context, empty_user)
        empty_page = empty_context.new_page()
        attach_observers(empty_page)
        empty_page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
        expect(empty_page.locator("[data-testid=profile-impact-zero]")).to_be_visible(timeout=15000)
        check("Private profile has an honest zero state", True)
        empty_context.close()

        # Safe mock: only the public aggregate response is replaced to prove
        # loading-independent zero and error copy without altering database rows.
        zero_context = browser.new_context(viewport={"width": 375, "height": 667})
        zero_context.route("**/api/sustainability/impact", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "success": True,
            "data": {
                "scope": "platform", "methodologyVersion": "1.0", "generatedAt": "2026-07-21T00:00:00.000Z",
                "metrics": {"activeUserListings": 0, "activeJourneyListings": 0, "journeyCoveragePercent": 0, "activeCircularListings": 0, "completedCircularUnits": 0},
                "activeLifecycleBreakdown": {"deadstock": 0, "pre_loved": 0, "repaired": 0, "upcycled": 0},
                "completedLifecycleBreakdown": {"deadstock": 0, "pre_loved": 0, "repaired": 0, "upcycled": 0},
            },
        })))
        zero_page = zero_context.new_page()
        zero_page.goto(WEB, wait_until="domcontentloaded")
        expect(zero_page.locator("[data-testid=platform-impact-zero]")).to_be_visible(timeout=15000)
        check("Homepage public impact has an honest zero state", True)
        assert_no_overflow(zero_page, "375x667 homepage has no horizontal overflow")
        zero_context.close()

        error_context = browser.new_context(viewport={"width": 390, "height": 844})
        error_context.route("**/api/sustainability/impact", lambda route: route.fulfill(status=503, content_type="application/json", body=json.dumps({"success": False, "error": {"message": "Unavailable"}})))
        error_page = error_context.new_page()
        error_page.goto(WEB, wait_until="domcontentloaded")
        expect(error_page.locator("[data-testid=platform-impact-error]")).to_be_visible(timeout=15000)
        check("Homepage impact failure does not fail the commerce page", error_page.get_by_role("heading", name=re.compile("Shop the drop", re.I)).is_visible())
        error_context.close()

        for width, height, route in ((390, 844, "/sustainability"), (768, 1024, "/sustainability"), (1024, 768, "/"), (1440, 900, "/sustainability")):
            context = browser.new_context(viewport={"width": width, "height": height})
            responsive_page = context.new_page()
            responsive_page.goto(f"{WEB}{route}", wait_until="domcontentloaded")
            expect(responsive_page.locator("main")).to_be_visible(timeout=15000)
            assert_no_overflow(responsive_page, f"{width}x{height} {route} has no horizontal overflow")
            context.close()

        unexpected_console = [message for message in console_errors if "Failed to load resource" not in message]
        unexpected_http = [(status, url) for status, url in http_failures if status >= 500 or (status == 404 and "phase13-definitely-unknown" not in url)]
        check("No JavaScript errors or hydration warnings", not unexpected_console and not page_errors, "; ".join((unexpected_console + page_errors)[:3]))
        check("No unexpected 404 or 500 responses", not unexpected_http, str(unexpected_http[:3]))

        browser.close()

    print(f"\nPHASE13 E2E SUMMARY: {sum(results)}/{len(results)} passed")
    if not all(results):
        sys.exitCode = 1
except Exception as error:
    print(f"PHASE13 E2E ERROR: {error}")
    results.append(False)
finally:
    cleanup()
    print("Phase 13 E2E cleanup complete (recorded IDs only).")

sys.exit(1 if not results or not all(results) else 0)
