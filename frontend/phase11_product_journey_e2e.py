"""Phase 11 rendered Product Journey E2E.

Runs the real six-step /sell flow and Seller Dashboard editor against the
development backend/Supabase. Credentials and service access come only from
environment variables. Every created user/product/storage object is recorded
and removed by exact ID/path in ``finally``.

Usage:
    PHASE11_WEB_BASE=http://127.0.0.1:3003 \
    PHASE11_API_BASE=http://127.0.0.1:8081 \
    SUPABASE_SERVICE_ROLE_KEY=... python phase11_product_journey_e2e.py
"""
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
WEB = os.environ.get("PHASE11_WEB_BASE", "http://127.0.0.1:3003")
API = os.environ.get("PHASE11_API_BASE", "http://127.0.0.1:8081")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
RUN = f"phase11-e2e-{int(time.time())}-{secrets.token_hex(2)}"
IMAGE = os.path.join(HERE, "public", "images", "products", "nike-air-max-90-black.jpg")
USER_IDS, PRODUCT_IDS, STORAGE_PATHS = [], [], []
results, console_errors, page_errors, http_failures = [], [], [], []

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: development Supabase URL/service configuration is unavailable.")
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


def api(method, path, payload=None, token=None):
    headers = {"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})}
    request = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers,
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
    password = f"Phase11-{secrets.token_urlsafe(12)}!"
    row = {
        "id": str(uuid.uuid4()),
        "email": f"{RUN}@stylehub.invalid",
        "full_name": "Phase 11 Product Journey QA",
        "password_hash": password_hash(password),
        "role": "seller",
    }
    rest("POST", "users", payload=row)
    USER_IDS.append(row["id"])
    status, body = api("POST", "/api/auth/login", {"email": row["email"], "password": password})
    if status != 200:
        raise RuntimeError("Could not log in dedicated Phase 11 E2E seller")
    token = body["data"]["token"]
    me_status, me_body = api("GET", "/api/auth/me", token=token)
    if me_status != 200 or not me_body.get("success"):
        raise RuntimeError("Dedicated Phase 11 HMAC token failed /api/auth/me verification")
    return {**row, "password": password, "token": token, "auth_user": me_body["data"]["user"]}


def create_legacy_product(seller):
    row = {
        "id": str(uuid.uuid4()),
        "name": f"Phase 11 Legacy Not Specified {RUN}",
        "slug": f"{RUN}-legacy",
        "price": 240000,
        "category_slug": "t-shirts",
        "brand": "Nike",
        "image_url": "/images/products/nike-sportswear-club-tee.jpg",
        "thumbnail": "/images/products/nike-sportswear-club-tee.jpg",
        "description": "Legacy listing created without sustainability data for Phase 11 E2E.",
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


def login(page, seller):
    page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
    expect(page.get_by_text(seller["full_name"], exact=True).first).to_be_visible(timeout=15000)


def attach_observers(page):
    page.on("console", lambda message: console_errors.append(f"{page.url} :: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(f"{page.url} :: {error}"))
    page.on("response", lambda response: http_failures.append((response.status, response.url)) if response.status >= 400 else None)


def open_listing_editor(page, listing_name):
    page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
    expect(page.locator("[data-testid=dashboard-tab-listings]")).to_be_visible(timeout=15000)
    page.locator("[data-testid=dashboard-tab-listings]").click()
    expect(page.locator("[data-testid=listings-search]")).to_be_visible(timeout=15000)
    page.fill("[data-testid=listings-search]", listing_name)
    expect(page.locator("[data-testid=listing-row]").first).to_be_visible(timeout=15000)
    page.locator("[data-testid=listing-action-edit]").first.click()
    expect(page.get_by_text("Chỉnh sửa sản phẩm", exact=True)).to_be_visible(timeout=15000)


def cleanup():
    if USER_IDS:
        try:
            discovered = rest(
                "GET",
                "products",
                f"select=id&seller_id=in.({','.join(USER_IDS)})&listing_source=eq.user",
            )
        except RuntimeError:
            discovered = []
        PRODUCT_IDS.extend(row["id"] for row in discovered if row.get("id"))
        PRODUCT_IDS[:] = list(dict.fromkeys(PRODUCT_IDS))
    if PRODUCT_IDS:
        encoded = ",".join(PRODUCT_IDS)
        images = rest("GET", "product_images", f"select=url&product_id=in.({encoded})")
        marker = "/storage/v1/object/public/product-images/"
        for image in images:
            url = image.get("url", "")
            if marker in url:
                STORAGE_PATHS.append(url.split(marker, 1)[1])
        rest("DELETE", "product_sustainability", f"product_id=in.({encoded})")
        rest("DELETE", "product_images", f"product_id=in.({encoded})")
        rest("DELETE", "products", f"id=in.({encoded})")
    for path in set(STORAGE_PATHS):
        request = urllib.request.Request(
            f"{SUPABASE_URL}/storage/v1/object/product-images/{urllib.parse.quote(path, safe='/')}",
            headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"},
            method="DELETE",
        )
        try:
            urllib.request.urlopen(request, timeout=30).read()
        except urllib.error.HTTPError:
            pass
    if USER_IDS:
        rest("DELETE", "users", f"id=in.({','.join(USER_IDS)})")


try:
    seller = create_user()
    legacy = create_legacy_product(seller)
    listing_name = f"Phase 11 Product Journey {RUN}"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        # Logged-out gate.
        logged_out = browser.new_context(viewport={"width": 1440, "height": 900})
        page = logged_out.new_page()
        attach_observers(page)
        page.goto(f"{WEB}/sell", wait_until="domcontentloaded")
        expect(page.get_by_text("Đăng nhập để đăng bán")).to_be_visible(timeout=15000)
        check("Logged-out /sell authentication gate", True)
        logged_out.close()

        context = browser.new_context(viewport={"width": 1440, "height": 900})
        install_auth(context, seller)
        page = context.new_page()
        attach_observers(page)
        login(page, seller)
        page.goto(f"{WEB}/sell", wait_until="domcontentloaded")
        expect(page.locator("[data-testid=sell-next]")).to_be_visible(timeout=15000)
        check("Six-step wizard remains six steps", page.locator("ol li").count() == 6)

        page.fill("#name", listing_name)
        page.fill("#description", "Tin đăng Phase 11 kiểm tra hành trình sản phẩm bằng dữ liệu thật và tiếng Việt.")
        page.locator("[data-testid=sell-next]").click()
        expect(page.get_by_text("Bước 2")).to_be_visible()
        expect(page.locator("#category_slug")).to_be_enabled(timeout=15000)
        page.select_option("#category_slug", "t-shirts")
        expect(page.locator("#brand")).to_be_enabled(timeout=15000)
        page.fill("#brand", "Nike")
        page.keyboard.press("Enter")
        page.locator("[data-testid=sell-next]").click()

        expect(page.locator("fieldset").get_by_text("Product Journey", exact=True)).to_be_visible(timeout=10000)
        check("Product Journey appears inside Condition & Size", True)
        expect(page.get_by_text("Thông tin này do bạn cung cấp và chưa được StyleHub kiểm định.")).to_be_visible()
        check("Vietnamese seller-declared explanation is visible", True)
        page.select_option("#condition", "good")
        page.select_option("#size", "M")

        page.locator("[data-testid=sell-next]").click()
        expect(page.get_by_text("Vui lòng chọn một lựa chọn, kể cả Not specified.")).to_be_visible()
        check("Required lifecycle validation is visible", True)
        check("First invalid lifecycle control receives focus", page.evaluate("document.activeElement?.id === 'sell-lifecycle_type'"))

        page.locator("#sell-lifecycle_type-upcycled").focus()
        page.keyboard.press("Space")
        expect(page.locator("#sell-upcycle_details")).to_be_visible()
        check("Keyboard lifecycle selection reveals upcycle field", page.locator("#sell-lifecycle_type-upcycled").is_checked())
        page.locator("#sell-lifecycle_type-repaired").focus()
        page.keyboard.press("Space")
        expect(page.locator("#sell-repair_history")).to_be_visible()
        expect(page.locator("#sell-upcycle_details")).to_have_count(0)
        check("Conditional repair field replaces upcycle field", True)

        page.locator("[data-testid=sell-next]").click()
        expect(page.get_by_text("Mô tả phần đã sửa ít nhất 8 ký tự.")).to_be_visible()
        check("Conditional repair description is required", page.evaluate("document.activeElement?.id === 'sell-repair_history'"))
        page.fill("#sell-material", "Cotton dệt dày")
        page.fill("#sell-repair_history", "Đã thay khóa kéo và gia cố đường may ở cổ áo.")
        page.fill("#sell-product_story", "Chiếc áo đã được giữ gìn cẩn thận tại Huế.")
        page.check("label:has-text('Tôi dự định sử dụng lại bao bì') input[type=checkbox]")
        page.locator("[data-testid=sell-next]").click()
        expect(page.get_by_text("Bước 4")).to_be_visible()

        page.locator("[data-testid=sell-back]").click()
        expect(page.locator("#sell-lifecycle_type-repaired")).to_be_checked()
        expect(page.locator("#sell-repair_history")).to_have_value("Đã thay khóa kéo và gia cố đường may ở cổ áo.")
        check("Product Journey values persist across wizard navigation", True)
        page.locator("[data-testid=sell-next]").click()

        page.fill("#price", "420000")
        page.fill("#stock", "1")
        page.locator("[data-testid=sell-next]").click()
        expect(page.get_by_text("Bước 5")).to_be_visible()
        page.set_input_files("#images", IMAGE)
        expect(page.locator("img[alt*='Ảnh sản phẩm']").first).to_be_visible(timeout=10000)
        page.locator("[data-testid=sell-next]").click()
        expect(page.get_by_text("Bước 6")).to_be_visible()
        review = page.locator("dl").inner_text()
        check("Review & Publish includes Product Journey", "Repaired" in review and "khóa kéo" in review)
        expect(page.locator("[data-testid=sell-product-journey-preview]")).to_contain_text("Repaired")
        check("Live preview contains a seller-declared Product Journey summary", True)

        page.locator("[data-testid=sell-publish]").click()
        page.wait_for_url("**/products/**", timeout=20000, wait_until="domcontentloaded")
        created_slug = page.url.split("/products/", 1)[1].split("?", 1)[0].rstrip("/")
        created = rest("GET", "products", f"select=id,slug&slug=eq.{urllib.parse.quote(created_slug)}")
        if created:
            PRODUCT_IDS.append(created[0]["id"])
        stored = rest("GET", "product_sustainability", f"select=lifecycle_type,material,repair_history,product_story,reuse_packaging,claim_source&product_id=eq.{created[0]['id']}")
        check("Listing creation stores real Supabase Product Journey data", len(stored) == 1 and stored[0]["lifecycle_type"] == "repaired" and stored[0]["claim_source"] == "seller_declared")

        open_listing_editor(page, listing_name)
        expect(page.locator("#edit-lifecycle_type-repaired")).to_be_checked()
        expect(page.locator("#edit-repair_history")).to_have_value("Đã thay khóa kéo và gia cố đường may ở cổ áo.")
        check("Seller Dashboard editor loads persisted Product Journey", True)
        page.check("#edit-lifecycle_type-upcycled")
        page.fill("#edit-upcycle_details", "Tái thiết kế tay áo thành túi nhỏ đi kèm.")
        page.fill("#edit-product_story", "Cập nhật Product Journey từ Seller Dashboard.")
        page.locator("[data-testid=seller-edit-save]").click()
        expect(page.locator("[data-testid=listing-row]").first).to_be_visible(timeout=15000)
        updated = rest("GET", "product_sustainability", f"select=lifecycle_type,upcycle_details&product_id=eq.{created[0]['id']}")
        check("Seller Dashboard saves Product Journey changes", updated[0]["lifecycle_type"] == "upcycled" and "Tái thiết kế" in updated[0]["upcycle_details"])

        # Two editors loaded from one concurrency token: first wins, second shows 409.
        page_a = context.new_page()
        page_b = context.new_page()
        attach_observers(page_a)
        attach_observers(page_b)
        open_listing_editor(page_a, listing_name)
        open_listing_editor(page_b, listing_name)
        page_a.fill("#edit-product_story", "Phiên chỉnh sửa mới nhất từ tab A.")
        page_a.locator("[data-testid=seller-edit-save]").click()
        expect(page_a.locator("[data-testid=listing-row]").first).to_be_visible(timeout=15000)
        page_b.fill("#edit-product_story", "Phiên cũ từ tab B không được ghi đè.")
        page_b.locator("[data-testid=seller-edit-save]").click()
        expect(page_b.locator("div[role=alert].border-red-300")).to_contain_text("được cập nhật ở một nơi khác", timeout=15000)
        check("Stale Product Journey conflict is visible in Vietnamese", True)
        page_a.close()
        page_b.close()

        open_listing_editor(page, legacy["name"])
        expect(page.locator("#edit-lifecycle_type-not_specified")).to_be_checked()
        check("Legacy listing safely displays Not Specified", True)

        page.set_viewport_size({"width": 390, "height": 844})
        check("Mobile dashboard editor has no document overflow", page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2"))

        mobile = context.new_page()
        attach_observers(mobile)
        mobile.set_viewport_size({"width": 375, "height": 667})
        mobile.goto(f"{WEB}/sell", wait_until="domcontentloaded")
        mobile.fill("#name", f"Mobile draft {RUN}")
        mobile.fill("#description", "Bản nháp mobile đủ dài để kiểm tra bố cục Product Journey.")
        mobile.locator("[data-testid=sell-next]").click()
        expect(mobile.locator("#category_slug")).to_be_enabled(timeout=15000)
        mobile.select_option("#category_slug", "t-shirts")
        mobile.locator("[data-testid=sell-next]").click()
        expect(mobile.locator("fieldset").get_by_text("Product Journey", exact=True)).to_be_visible(timeout=10000)
        check("Mobile Product Journey wizard has no document overflow", mobile.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2"))
        mobile.close()

        unexpected_console = [message for message in console_errors if "Failed to load resource" not in message]
        unexpected_http = [
            (status, url) for status, url in http_failures
            if status >= 500 or (status == 404 and "/products/" not in url) or (status == 409 and "/api/seller/listings/" not in url)
        ]
        check("No JavaScript errors or hydration warnings", not unexpected_console and not page_errors, "; ".join((unexpected_console + page_errors)[:3]))
        check("No unexpected 404 or 500 responses", not unexpected_http, str(unexpected_http[:3]))

        context.close()
        browser.close()

    print(f"\nPHASE11 E2E SUMMARY: {sum(results)}/{len(results)} passed")
    if not all(results):
        sys.exitCode = 1
except Exception as error:
    print(f"PHASE11 E2E ERROR: {error}")
    results.append(False)
finally:
    cleanup()
    print("Phase 11 E2E cleanup complete (recorded IDs/paths only).")

sys.exit(1 if not results or not all(results) else 0)
