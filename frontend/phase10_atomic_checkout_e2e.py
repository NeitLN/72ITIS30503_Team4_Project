"""Phase 10 rendered checkout E2E against the real dev backend/Supabase.

The suite creates UUID-scoped `phase10-e2e-*` users and listings through the
service REST API, never touches existing rows, and deletes only recorded IDs.

Usage: PHASE10_WEB_BASE=http://localhost:3001 PHASE10_API_BASE=http://localhost:8081 python phase10_atomic_checkout_e2e.py
"""
import base64
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
WEB = os.environ.get("PHASE10_WEB_BASE", "http://localhost:3001")
API = os.environ.get("PHASE10_API_BASE", "http://localhost:8081")
RUN = f"phase10-e2e-{int(time.time())}-{secrets.token_hex(2)}"
USER_IDS, PRODUCT_IDS = [], []
results, console_errors, http_failures = [], [], []


def load_env(path):
    values = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                if "=" in line and not line.lstrip().startswith("#"):
                    key, value = line.strip().split("=", 1)
                    values[key] = value.strip().strip('"').strip("'")
    return values


env = {**load_env(os.path.join(HERE, "..", ".env")), **load_env(os.path.join(HERE, "..", "backend", ".env"))}
SUPABASE_URL = os.environ.get("SUPABASE_URL") or env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: development Supabase service configuration is unavailable.")
    sys.exit(2)


def check(name, condition, detail=""):
    results.append(bool(condition))
    print(f"[{'PASS' if condition else 'FAIL'}] {name}{' — ' + detail if detail else ''}")


def rest(method, table, query="", payload=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}{'?' + query if query else ''}"
    headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "application/json", "Prefer": "return=representation"}
    request = urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Supabase REST {method} {table} failed ({error.code})") from error


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


def create_user(label, role):
    password = f"Phase10-{secrets.token_urlsafe(10)}!"
    row = {"id": str(uuid.uuid4()), "email": f"{RUN}-{label}@stylehub.invalid", "full_name": f"Phase 10 E2E {label}", "password_hash": password_hash(password), "role": role}
    rest("POST", "users", payload=row)
    USER_IDS.append(row["id"])
    status, body = api("POST", "/api/auth/login", {"email": row["email"], "password": password})
    if status != 200:
        raise RuntimeError("Could not log in dedicated E2E account")
    return {
        **row,
        "password": password,
        "token": body["data"]["token"],
        "auth_user": body["data"]["user"],
    }


def create_product(seller, label, price=220000, stock=1):
    row = {
        "id": str(uuid.uuid4()), "name": f"Phase 10 E2E {label}", "slug": f"{RUN}-{label}".lower(),
        "price": price, "category_slug": "t-shirts", "brand": "Phase 10 QA", "image_url": "/images/products/adidas-trefoil-tee.jpg",
        "thumbnail": "/images/products/adidas-trefoil-tee.jpg", "description": "Dedicated Phase 10 browser test listing.",
        "stock": stock, "seller_name": seller["full_name"], "seller_id": seller["id"], "condition": "good", "size": "M",
        "location": "Thành phố Hồ Chí Minh", "is_negotiable": False, "listing_source": "user", "status": "active", "inventory_mode": "simple",
    }
    rest("POST", "products", payload=row)
    PRODUCT_IDS.append(row["id"])
    return row


def login(page, user):
    token_json = json.dumps(user["token"])
    user_json = json.dumps(user["auth_user"], ensure_ascii=False)
    page.context.add_init_script(
        script=f"localStorage.setItem('stylehub:auth-token', {token_json}); localStorage.setItem('stylehub:auth-user', JSON.stringify({user_json}));"
    )
    page.context.route(
        "**/api/auth/me",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"success": True, "data": {"user": user["auth_user"]}}, ensure_ascii=False),
        ),
    )
    page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
    expect(page).to_have_url(f"{WEB}/profile", timeout=15000)


def fill_checkout(page):
    expect(page.locator("#checkout-form")).to_be_visible(timeout=15000)
    page.fill("#name", "Phase Ten Browser Buyer")
    page.fill("#phone", "0901234567")
    page.fill("#email", "phase10-browser@example.invalid")
    page.fill("#province", "Thành phố Hồ Chí Minh")
    page.fill("#district", "Quận 1")
    page.fill("#streetAddress", "1 Đường QA")


def add_product(page, product):
    page.goto(f"{WEB}/products/{product['slug']}", wait_until="domcontentloaded")
    page.evaluate("localStorage.removeItem('stylehub_cart')")
    page.reload(wait_until="domcontentloaded")
    expect(page.get_by_role("button", name="Mua ngay")).to_be_enabled(timeout=15000)
    page.get_by_role("button", name="Mua ngay").click()
    expect(page).to_have_url(f"{WEB}/cart", timeout=10000)
    expect(page.get_by_text(product["name"], exact=True).first).to_be_visible(timeout=15000)


def cleanup():
    if not USER_IDS:
        return
    encoded_users = ",".join(USER_IDS)
    orders = rest("GET", "orders", f"select=id&user_id=in.({encoded_users})")
    order_ids = [row["id"] for row in orders]
    if order_ids:
        encoded_orders = ",".join(order_ids)
        for table in ["inventory_movements", "checkout_idempotency", "order_coupons", "order_items"]:
            rest("DELETE", table, f"order_id=in.({encoded_orders})")
        rest("DELETE", "orders", f"id=in.({encoded_orders})")
    rest("DELETE", "checkout_idempotency", f"buyer_id=in.({encoded_users})")
    if PRODUCT_IDS:
        rest("DELETE", "products", f"id=in.({','.join(PRODUCT_IDS)})")
    rest("DELETE", "users", f"id=in.({encoded_users})")


try:
    seller_a = create_user("seller-a", "seller")
    seller_b = create_user("seller-b", "seller")
    buyer = create_user("buyer", "customer")
    other_buyer = create_user("other-buyer", "customer")
    purchase = create_product(seller_a, "single-unit", 220000, 1)
    price_change = create_product(seller_a, "price-change", 260000, 1)
    unavailable = create_product(seller_a, "unavailable", 180000, 1)
    seller_b_item = create_product(seller_b, "seller-b-item", 310000, 1)
    own_item = create_product(seller_a, "self-purchase", 190000, 1)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: console_errors.append(str(error)))
        page.on("response", lambda response: http_failures.append((response.status, response.url)) if response.status >= 400 else None)
        login(page, buyer)

        add_product(page, purchase)
        page.get_by_role("button", name="Thanh toán").click()
        fill_checkout(page)
        expect(page.get_by_text("Giá và tồn kho được xác nhận trực tiếp trước khi tạo đơn.")).to_be_visible()
        check("Checkout renders authoritative-review copy", True)
        submit = page.get_by_role("button", name="Đặt hàng")
        expect(submit).to_be_enabled(timeout=15000)
        submit.dblclick(force=True)
        page.wait_for_url("**/checkout/success?orderId=*", timeout=15000, wait_until="domcontentloaded")
        check("Successful checkout redirects exactly once", "/checkout/success?orderId=" in page.url, page.url)
        expect(page.get_by_text("Đơn hàng đã được ghi nhận")).to_be_visible(timeout=15000)
        success_url = page.url
        orders = rest("GET", "order_items", f"select=id,order_id&product_id=eq.{purchase['id']}")
        check("Double-click creates exactly one order item", len(orders) == 1, f"items={len(orders)}")
        page.reload(wait_until="domcontentloaded")
        expect(page.get_by_text("Đơn hàng đã được ghi nhận")).to_be_visible(timeout=15000)
        orders_after = rest("GET", "order_items", f"select=id,order_id&product_id=eq.{purchase['id']}")
        check("Refreshing success is read-only", page.url == success_url and len(orders_after) == 1)

        page.goto(f"{WEB}/products/{purchase['slug']}", wait_until="domcontentloaded")
        expect(page.get_by_role("heading", name="Không tìm thấy trang")).to_be_visible(timeout=15000)
        check("Sold PDP becomes non-purchasable", True)
        page.goto(f"{WEB}/shop?search={urllib.parse.quote(purchase['name'])}", wait_until="domcontentloaded")
        expect(page.get_by_text(purchase["name"], exact=True)).to_have_count(0, timeout=15000)
        check("Sold listing disappears from Shop", True)

        login(page, buyer)
        page.goto(f"{WEB}/orders", wait_until="domcontentloaded")
        expect(page.get_by_role("button", name="Hủy đơn")).to_be_visible(timeout=15000)
        page.once("dialog", lambda dialog: dialog.accept())
        page.get_by_role("button", name="Hủy đơn").click()
        expect(page.get_by_text("Đã hủy").first).to_be_visible(timeout=15000)
        restored = rest("GET", "products", f"select=stock,status&id=eq.{purchase['id']}")[0]
        restocks = rest("GET", "inventory_movements", f"select=id&product_id=eq.{purchase['id']}&movement_kind=eq.restock")
        check("Buyer cancellation restores stock and active policy", restored["stock"] == 1 and restored["status"] == "active")
        check("Buyer cancellation writes one restock movement", len(restocks) == 1)

        # Price-change review preserves entered form values and requires acceptance.
        add_product(page, price_change)
        page.get_by_role("button", name="Thanh toán").click()
        fill_checkout(page)
        rest("PATCH", "products", f"id=eq.{price_change['id']}", {"price": 275000})
        page.get_by_role("button", name="Đặt hàng").click()
        expect(page.get_by_text("Giá giỏ hàng vừa thay đổi.")).to_be_visible(timeout=15000)
        check("Price change requires rendered buyer review", True)
        expect(page.locator("#streetAddress")).to_have_value("1 Đường QA")
        check("Recoverable review preserves shipping form", True)
        page.get_by_role("button", name="Chấp nhận giá mới").click()
        expect(page.get_by_role("button", name="Đặt hàng")).to_be_enabled(timeout=15000)

        # Unavailable item produces a focused Vietnamese error summary and live region.
        page.evaluate("localStorage.removeItem('stylehub_cart')")
        login(page, buyer)
        add_product(page, unavailable)
        page.get_by_role("button", name="Thanh toán").click()
        fill_checkout(page)
        rest("PATCH", "products", f"id=eq.{unavailable['id']}", {"stock": 0, "status": "sold"})
        page.reload(wait_until="domcontentloaded")
        alert = page.locator('[data-testid="checkout-error-summary"]')
        expect(alert).to_be_visible(timeout=15000)
        alert_text = alert.inner_text()
        check("Out-of-stock checkout shows safe Vietnamese feedback", "không còn" in alert_text.lower() or "hết hàng" in alert_text.lower(), alert_text)
        check("Checkout error summary receives keyboard focus", alert.evaluate("el => document.activeElement === el"), page.evaluate("document.activeElement?.outerHTML?.slice(0, 120) || ''"))
        check("Checkout error summary exposes assertive live semantics", alert.get_attribute("aria-live") == "assertive")
        expect(page.get_by_role("button", name="Xóa sản phẩm lỗi")).to_be_visible()

        # Mobile usability and horizontal overflow.
        page.set_viewport_size({"width": 375, "height": 667})
        check("Mobile checkout has no document horizontal overflow", page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"))
        page.set_viewport_size({"width": 390, "height": 844})
        check("390x844 checkout remains usable", page.get_by_role("button", name="Xóa sản phẩm lỗi").is_visible())

        # Seller dashboard sees its sold/cancelled historical item snapshot.
        seller_context = browser.new_context(viewport={"width": 768, "height": 1024})
        seller_page = seller_context.new_page()
        seller_page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        login(seller_page, seller_a)
        seller_page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
        seller_page.locator("[data-testid=dashboard-tab-orders]").click()
        expect(seller_page.get_by_text(purchase["name"], exact=True)).to_be_visible(timeout=15000)
        check("Seller Dashboard renders the seller-owned order item", True)
        seller_context.close()

        # Self-purchase reaches the trusted backend and is blocked with Vietnamese feedback.
        own_context = browser.new_context(viewport={"width": 1024, "height": 768})
        own_page = own_context.new_page()
        login(own_page, seller_a)
        add_product(own_page, own_item)
        own_page.get_by_role("button", name="Thanh toán").click()
        own_alert = own_page.get_by_role("alert").first
        expect(own_alert).to_contain_text("Không thể mua sản phẩm do chính bạn đăng bán", timeout=15000)
        check("Self-purchase is blocked in rendered checkout", True)
        check("1024x768 checkout has no horizontal overflow", own_page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"))
        own_context.close()

        # Multi-seller cart is represented as one complete buyer checkout preview.
        context2 = browser.new_context(viewport={"width": 1440, "height": 900})
        multi_page = context2.new_page()
        login(multi_page, other_buyer)
        add_product(multi_page, price_change)
        multi_page.goto(f"{WEB}/products/{seller_b_item['slug']}", wait_until="domcontentloaded")
        multi_page.get_by_role("button", name="Thêm vào giỏ hàng").click()
        login(multi_page, other_buyer)
        multi_page.goto(f"{WEB}/checkout", wait_until="domcontentloaded")
        expect(multi_page.get_by_text(price_change["name"], exact=False).first).to_be_visible(timeout=15000)
        expect(multi_page.get_by_text(seller_b_item["name"], exact=False).first).to_be_visible()
        check("Multi-seller checkout preview renders both sellers' items", True)
        check("1440x900 checkout has no horizontal overflow", multi_page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"))
        context2.close()

        script_errors = [
            message for message in console_errors
            if "Failed to load resource: the server responded with a status of 404" not in message
            and "Failed to load resource: the server responded with a status of 409" not in message
            and not (purchase["slug"] in message and "API Fetch Error [/api/products/" in message)
        ]
        unexpected_http = [(status, url) for status, url in http_failures if (status == 404 or status >= 500) and purchase["slug"] not in url]
        check("No JavaScript errors or hydration warnings", len(script_errors) == 0, "; ".join(script_errors[:3]))
        check("No unexpected HTTP 404/500 responses", len(unexpected_http) == 0, str(unexpected_http[:3]))
        browser.close()

    print(f"\nPHASE10 E2E SUMMARY: {sum(results)}/{len(results)} passed")
    if not all(results):
        sys.exitCode = 1
except Exception as error:
    print(f"PHASE10 E2E ERROR: {error}")
    results.append(False)
finally:
    cleanup()
    print("Phase 10 E2E cleanup complete (recorded UUIDs only).")

sys.exit(1 if not results or not all(results) else 0)
