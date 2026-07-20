"""Phase 14 sustainability QA and presentation-evidence E2E.

The suite uses runtime-registered users, real Supabase rows, the production
impact APIs, the real six-step sell flow, and exact-ID cleanup. It never mocks
impact values. Stable JPEG evidence is overwritten on each run.
"""
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
ROOT = os.path.dirname(HERE)


def load_local_env():
    for candidate in (os.path.join(ROOT, "backend", ".env"), os.path.join(ROOT, ".env")):
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
WEB = os.environ.get("PHASE14_WEB_BASE", "http://127.0.0.1:3000")
API = os.environ.get("PHASE14_API_BASE", "http://127.0.0.1:8080")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
RUN = f"phase14-e2e-{int(time.time())}-{secrets.token_hex(2)}"
IMAGE = os.path.join(HERE, "public", "images", "products", "nike-air-max-90-black.jpg")
EVIDENCE = os.path.join(ROOT, "docs", "evidence", "phase14")
USER_IDS, PRODUCT_IDS, ORDER_IDS, STORAGE_PATHS = [], [], [], []
results, notes, console_errors, page_errors, http_failures = [], [], [], [], []

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: development Supabase URL/service configuration is unavailable.")
    sys.exit(2)


def check(name, condition, detail=""):
    results.append(bool(condition))
    print(f"[{'PASS' if condition else 'FAIL'}] {name}{' — ' + detail if detail else ''}")


def note(name, detail):
    notes.append((name, detail))
    print(f"[NOTE] {name} — {detail}")


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
        raise RuntimeError(f"Supabase REST {method} {table} failed ({error.code}): {body[:300]}") from error


def api(method, path, payload=None, token=None, extra_headers=None):
    headers = {
        "Content-Type": "application/json",
        **({"Authorization": f"Bearer {token}"} if token else {}),
        **(extra_headers or {}),
    }
    request = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, json.loads(raw) if raw else None


def register_user(label, role="seller"):
    password = f"P14-{secrets.token_urlsafe(18)}!"
    email = f"{RUN}-{label}@stylehub.invalid"
    status, body = api("POST", "/api/auth/register", {
        "name": f"Phase 14 {label.title()} Evidence",
        "email": email,
        "password": password,
        "role": role,
    })
    if status != 200:
        raise RuntimeError(f"Could not register {label}: {status} {body}")
    token = body["data"]["token"]
    user_id = body["data"]["user"]["id"]
    USER_IDS.append(user_id)
    username = f"p14-{label}-{secrets.token_hex(2)}"[:30]
    profile_status, _ = api("PATCH", "/api/profile/me", {
        "display_name": f"Phase 14 {label.title()} Evidence",
        "username": username,
        "bio": "Tài khoản kiểm thử hành trình thời trang tuần hoàn.",
        "location": "Thành phố Hồ Chí Minh",
    }, token)
    me_status, me_body = api("GET", "/api/auth/me", token=token)
    if profile_status != 200 or me_status != 200:
        raise RuntimeError(f"Could not prepare {label} profile")
    return {
        "id": user_id,
        "email": email,
        "username": username,
        "token": token,
        "auth_user": me_body["data"]["user"],
    }


def create_product(seller, label, lifecycle=None):
    row = {
        "id": str(uuid.uuid4()),
        "name": f"Phase 14 {label}",
        "slug": f"{RUN}-{label}".lower().replace(" ", "-"),
        "price": 420000,
        "category_slug": "t-shirts",
        "brand": "Nike",
        "image_url": "/images/products/nike-sportswear-club-tee.jpg",
        "thumbnail": "/images/products/nike-sportswear-club-tee.jpg",
        "description": "Sản phẩm kiểm thử có dữ liệu Product Journey thật và được dọn theo ID.",
        "stock": 10,
        "seller_name": seller["auth_user"].get("full_name") or seller["email"],
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
    if lifecycle:
        rest("POST", "product_sustainability", payload={
            "product_id": row["id"],
            "lifecycle_type": lifecycle,
            "material": "Cotton dệt dày",
            "repair_history": "Đã thay khóa kéo và gia cố đường may." if lifecycle == "repaired" else None,
            "upcycle_details": "Tái thiết kế từ áo sơ mi đã qua sử dụng." if lifecycle == "upcycled" else None,
            "product_story": "Chiếc áo được gìn giữ cẩn thận tại Huế.",
            "reuse_packaging": True,
            "claim_source": "seller_declared",
        })
    return row


def create_completed_order(buyer, seller, product, quantity=2):
    status, body = api("POST", "/api/orders", {
        "customer": {
            "name": "Phase Fourteen Evidence Buyer",
            "email": f"{RUN}-delivery@stylehub.invalid",
            "phone": "0901234567",
            "address": "14 Circular QA Street, Quận 1",
            "city": "Thành phố Hồ Chí Minh",
        },
        "paymentMethod": "cod",
        "items": [{
            "productId": product["id"],
            "variantId": None,
            "quantity": quantity,
            "expectedUnitPrice": product["price"],
        }],
    }, buyer["token"], {"Idempotency-Key": str(uuid.uuid4())})
    if status != 200:
        raise RuntimeError(f"Phase 14 evidence checkout failed: {status} {body}")
    order_id = body["data"]["id"]
    ORDER_IDS.append(order_id)
    items = rest("GET", "order_items", f"select=id&order_id=eq.{order_id}")
    for next_status in ("confirmed", "preparing", "shipped", "completed"):
        for item in items:
            transition_status, transition_body = api(
                "PATCH",
                f"/api/seller/orders/items/{item['id']}/fulfillment",
                {"status": next_status},
                seller["token"],
            )
            if transition_status != 200:
                raise RuntimeError(f"Could not transition evidence order to {next_status}: {transition_body}")
    return order_id


def install_auth(context, user):
    token_json = json.dumps(user["token"])
    user_json = json.dumps(user["auth_user"], ensure_ascii=False)
    context.add_init_script(
        script=f"localStorage.setItem('stylehub:auth-token', {token_json}); localStorage.setItem('stylehub:auth-user', JSON.stringify({user_json}));"
    )


def attach_observers(page):
    page.on("console", lambda message: console_errors.append(f"{page.url} :: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(f"{page.url} :: {error}"))
    page.on("response", lambda response: http_failures.append((response.status, response.url)) if response.status >= 400 else None)


def no_overflow(page):
    return page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2")


def evidence(locator_or_page, filename, full_page=False):
    os.makedirs(EVIDENCE, exist_ok=True)
    locator_or_page.screenshot(
        path=os.path.join(EVIDENCE, filename),
        type="jpeg",
        quality=82,
        **({"full_page": True} if full_page else {}),
    )


def open_listing_editor(page, listing_name):
    page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
    expect(page.locator("[data-testid=dashboard-tab-listings]")).to_be_visible(timeout=20000)
    page.locator("[data-testid=dashboard-tab-listings]").click()
    expect(page.locator("[data-testid=listings-search]")).to_be_visible(timeout=15000)
    page.fill("[data-testid=listings-search]", listing_name)
    expect(page.locator("[data-testid=listing-row]").first).to_be_visible(timeout=15000)
    page.locator("[data-testid=listing-action-edit]").first.click()
    expect(page.get_by_text("Chỉnh sửa sản phẩm", exact=True)).to_be_visible(timeout=15000)


def cleanup():
    if USER_IDS:
        discovered = rest("GET", "products", f"select=id&seller_id=in.({','.join(USER_IDS)})&listing_source=eq.user")
        PRODUCT_IDS.extend(row["id"] for row in discovered if row.get("id"))
        PRODUCT_IDS[:] = list(dict.fromkeys(PRODUCT_IDS))
    if ORDER_IDS:
        encoded = ",".join(dict.fromkeys(ORDER_IDS))
        rest("DELETE", "inventory_movements", f"order_id=in.({encoded})")
        rest("DELETE", "checkout_idempotency", f"order_id=in.({encoded})")
        rest("DELETE", "order_coupons", f"order_id=in.({encoded})")
        rest("DELETE", "order_items", f"order_id=in.({encoded})")
        rest("DELETE", "orders", f"id=in.({encoded})")
    if USER_IDS:
        rest("DELETE", "checkout_idempotency", f"buyer_id=in.({','.join(dict.fromkeys(USER_IDS))})")
    if PRODUCT_IDS:
        encoded = ",".join(dict.fromkeys(PRODUCT_IDS))
        images = rest("GET", "product_images", f"select=url&product_id=in.({encoded})")
        marker = "/storage/v1/object/public/product-images/"
        for image in images:
            url = image.get("url", "")
            if marker in url:
                STORAGE_PATHS.append(url.split(marker, 1)[1])
        rest("DELETE", "product_sustainability", f"product_id=in.({encoded})")
        rest("DELETE", "product_images", f"product_id=in.({encoded})")
        rest("DELETE", "products", f"id=in.({encoded})")
    for storage_path in set(STORAGE_PATHS):
        request = urllib.request.Request(
            f"{SUPABASE_URL}/storage/v1/object/product-images/{urllib.parse.quote(storage_path, safe='/')}",
            headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"},
            method="DELETE",
        )
        try:
            urllib.request.urlopen(request, timeout=30).read()
        except urllib.error.HTTPError:
            pass
    if USER_IDS:
        rest("DELETE", "users", f"id=in.({','.join(dict.fromkeys(USER_IDS))})")


try:
    seller = register_user("seller")
    buyer = register_user("buyer", "customer")
    circular = create_product(seller, "Circular Evidence Jacket", "pre_loved")
    legacy = create_product(seller, "Legacy Compatibility Tee")
    create_completed_order(buyer, seller, circular, 2)

    impact_status, impact_body = api("GET", "/api/sustainability/impact")
    public_status, public_body = api("GET", f"/api/sellers/{seller['username']}/impact")
    check("Real platform impact API is available", impact_status == 200)
    check("Real public seller impact API is available", public_status == 200)
    public_serialized = json.dumps(public_body, ensure_ascii=False)
    check("Public impact payload omits private commerce fields", not re.search(r"email|phone|address|buyer|order|total_amount|circularUnitsPurchased", public_serialized, re.I))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        public_context = browser.new_context(viewport={"width": 1440, "height": 900})
        public_page = public_context.new_page()
        attach_observers(public_page)
        public_page.goto(WEB, wait_until="domcontentloaded")
        home_impact = public_page.locator("[data-testid=home-impact]")
        try:
            expect(home_impact).to_be_visible(timeout=20000)
        except AssertionError:
            loading_count = public_page.get_by_label("Đang tải dữ liệu tác động").count()
            error_count = public_page.locator("[data-testid=platform-impact-error]").count()
            resources = public_page.evaluate(
                "performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('sustainability/impact'))"
            )
            raise RuntimeError(
                f"Homepage impact state missing: loading={loading_count}, error={error_count}, resources={resources}, "
                f"console={console_errors[-3:]}, http={http_failures[-3:]}"
            )
        metrics = impact_body["data"]["metrics"]
        for testid, key in (
            ("metric-active-circular", "activeCircularListings"),
            ("metric-completed-circular", "completedCircularUnits"),
            ("metric-coverage", "journeyCoveragePercent"),
        ):
            expect(home_impact.locator(f"[data-testid={testid}]")).to_contain_text(str(metrics[key]))
        check("Homepage metrics match the live impact API", True)
        check("Homepage has a single impact ledger", public_page.locator("[data-testid=home-impact]").count() == 1)
        evidence(home_impact, "01-home-circular-impact-desktop.jpg")

        public_page.goto(f"{WEB}/sustainability", wait_until="domcontentloaded")
        sustainability = public_page.locator("[data-testid=sustainability-page]")
        expect(sustainability).to_be_visible(timeout=15000)
        expect(public_page.get_by_role("heading", name="Wear Longer. Waste Less.", exact=True)).to_be_visible()
        expect(public_page.get_by_text(re.compile("người bán tự khai", re.I)).first).to_be_visible()
        expect(public_page.get_by_text(re.compile("SDG 12", re.I))).to_be_visible()
        expect(public_page.get_by_text(re.compile("SDG 8", re.I))).to_be_visible()
        expect(public_page.locator("[data-testid=sustainability-impact]")).to_be_visible(timeout=15000)
        check("Methodology contains no invented CO2, water, or waste estimate", not re.search(
            r"\d[\d.,]*\s*(kg\s*CO2|lít nước|kg\s*(rác|waste))",
            public_page.locator("main").inner_text(),
            re.I,
        ))
        check("Lifecycle definitions link to real Shop filters", public_page.locator("a[href*='/shop?lifecycle=']").count() >= 5)
        evidence(public_page, "02-sustainability-methodology-desktop.jpg")

        shop_url = f"{WEB}/shop?search={urllib.parse.quote('Phase 14 Circular Evidence Jacket')}&lifecycle=pre_loved"
        public_page.goto(shop_url, wait_until="domcontentloaded")
        expect(public_page.locator("#lifecycle-select")).to_have_value("pre_loved", timeout=15000)
        expect(public_page.get_by_text(circular["name"], exact=True)).to_be_visible(timeout=15000)
        expect(public_page.locator("[data-testid=lifecycle-filter-chip]")).to_contain_text("Pre-loved")
        check("Circular discovery state is URL-addressable", "lifecycle=pre_loved" in public_page.url)
        check(
            "Accessible lifecycle filter has one programmatic label",
            public_page.locator("label[for=lifecycle-select]").count() == 1
            and public_page.get_by_label("Hành trình sản phẩm", exact=True).count() == 1,
        )
        evidence(public_page, "03-shop-circular-filter-desktop.jpg")

        public_page.goto(f"{WEB}/shop?lifecycle=pre_loved", wait_until="domcontentloaded")
        expect(public_page.locator("#lifecycle-select")).to_have_value("pre_loved", timeout=15000)
        public_page.select_option("#lifecycle-select", "not_specified")
        public_page.wait_for_url("**lifecycle=not_specified**", timeout=15000)
        expect(public_page.get_by_text(legacy["name"], exact=True)).to_be_visible(timeout=15000)
        public_page.go_back(wait_until="domcontentloaded")
        expect(public_page.locator("#lifecycle-select")).to_have_value("pre_loved", timeout=15000)
        public_page.go_forward(wait_until="domcontentloaded")
        expect(public_page.locator("#lifecycle-select")).to_have_value("not_specified", timeout=15000)
        check("Browser back and forward restore lifecycle filter state", True)

        public_page.goto(f"{WEB}/products/{circular['slug']}", wait_until="domcontentloaded")
        journey = public_page.locator("[data-testid=product-journey]")
        expect(journey).to_be_visible(timeout=15000)
        expect(journey).to_contain_text("Pre-loved")
        expect(journey).to_contain_text("Cotton dệt dày")
        expect(journey).to_contain_text("Chiếc áo được gìn giữ cẩn thận tại Huế.")
        expect(journey).to_contain_text("Người bán tự khai")
        check("PDP presents factual Product Journey details", True)
        evidence(journey, "04-product-journey-desktop.jpg")

        public_page.goto(f"{WEB}/products/{legacy['slug']}", wait_until="domcontentloaded")
        legacy_journey = public_page.locator("[data-testid=product-journey]")
        expect(legacy_journey).to_be_visible(timeout=15000)
        expect(legacy_journey.locator("[data-testid=product-journey-lifecycle]")).to_have_text("Not specified")
        expect(legacy_journey).to_contain_text("Người bán chưa cung cấp thêm thông tin")
        check("Legacy PDP renders an honest Not specified fallback", True)

        public_page.goto(f"{WEB}/category/t-shirts", wait_until="domcontentloaded")
        category_card = public_page.locator("[data-testid=product-card]", has_text=circular["name"])
        expect(category_card).to_be_visible(timeout=15000)
        expect(category_card.locator("[data-testid=lifecycle-badge]")).to_have_text("Pre-loved")
        check("Category cards inherit lifecycle badges", True)

        public_page.goto(f"{WEB}/seller/{seller['username']}", wait_until="domcontentloaded")
        seller_impact = public_page.locator("[data-testid=public-seller-impact]")
        expect(seller_impact).to_be_visible(timeout=15000)
        expect(seller_impact).to_contain_text("2")
        expect(seller_impact).to_contain_text(re.compile("No purchase history or customer information is public", re.I))
        check("Public storefront shows seller-level impact and privacy disclosure", True)
        evidence(seller_impact, "05-public-seller-impact-desktop.jpg")

        public_page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
        expect(public_page.get_by_role("heading", name="Đăng nhập để xem hồ sơ")).to_be_visible(timeout=15000)
        public_page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
        expect(public_page.locator("[data-testid=dashboard-login-link]")).to_be_visible(timeout=15000)
        check("Logged-out users see explicit gates on private impact routes", True)

        public_page.goto(WEB, wait_until="domcontentloaded")
        expect(public_page.locator("[data-testid=home-impact]")).to_be_visible(timeout=15000)
        check("Client navigation does not duplicate or stale the impact ledger", public_page.locator("[data-testid=home-impact]").count() == 1)
        public_page.keyboard.press("Tab")
        check("Public pages expose keyboard focus", public_page.evaluate("document.activeElement !== document.body"))
        public_context.close()

        seller_context = browser.new_context(viewport={"width": 1440, "height": 900})
        install_auth(seller_context, seller)
        seller_page = seller_context.new_page()
        attach_observers(seller_page)
        seller_page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
        profile_impact = seller_page.locator("[data-testid=profile-impact]")
        expect(profile_impact).to_be_visible(timeout=20000)
        expect(profile_impact).to_contain_text("2")
        check("Private profile distinguishes completed sales", profile_impact.get_by_text(re.compile("Đã bán", re.I)).count() == 1)
        evidence(profile_impact, "06-private-profile-impact-desktop.jpg")

        seller_page.goto(f"{WEB}/seller/dashboard", wait_until="domcontentloaded")
        dashboard_impact = seller_page.locator("[data-testid=dashboard-impact]")
        expect(dashboard_impact).to_be_visible(timeout=20000)
        expect(dashboard_impact).to_contain_text("2")
        check("Seller dashboard renders private impact", True)
        evidence(dashboard_impact, "07-seller-dashboard-impact-desktop.jpg")

        seller_page.locator("[data-testid=dashboard-tab-listings]").click()
        expect(seller_page.locator("[data-testid=listings-search]")).to_be_visible(timeout=15000)
        seller_page.fill("[data-testid=listings-search]", legacy["name"])
        legacy_row = seller_page.locator("[data-testid=listing-row]").first
        expect(legacy_row).to_be_visible(timeout=15000)
        expect(legacy_row.locator("[data-testid=listing-lifecycle]")).to_have_text("Not specified")
        check("Legacy listing remains safe in Seller Dashboard", True)

        listing_name = "Phase 14 Wizard Evidence Listing"
        seller_page.goto(f"{WEB}/sell", wait_until="domcontentloaded")
        expect(seller_page.locator("[data-testid=sell-next]")).to_be_visible(timeout=20000)
        check("Sell flow remains a six-step wizard", seller_page.locator("ol li").count() == 6)
        seller_page.fill("#name", listing_name)
        seller_page.fill("#description", "Tin đăng kiểm thử Phase 14 với Product Journey thật và nội dung tiếng Việt.")
        seller_page.locator("[data-testid=sell-next]").click()
        expect(seller_page.locator("#category_slug")).to_be_enabled(timeout=15000)
        seller_page.select_option("#category_slug", "t-shirts")
        expect(seller_page.locator("#brand")).to_be_enabled(timeout=15000)
        seller_page.fill("#brand", "Nike")
        seller_page.keyboard.press("Enter")
        seller_page.locator("[data-testid=sell-next]").click()
        expect(seller_page.get_by_text("Product Journey", exact=True).first).to_be_visible(timeout=10000)
        seller_page.select_option("#condition", "good")
        seller_page.select_option("#size", "M")
        seller_page.locator("[data-testid=sell-next]").click()
        expect(seller_page.get_by_text("Vui lòng chọn một lựa chọn, kể cả Not specified.")).to_be_visible()
        check("Required lifecycle error is visible and focused", seller_page.evaluate("document.activeElement?.id === 'sell-lifecycle_type'"))
        seller_page.locator("#sell-lifecycle_type-repaired").focus()
        seller_page.keyboard.press("Space")
        expect(seller_page.locator("#sell-repair_history")).to_be_visible()
        seller_page.fill("#sell-material", "Cotton dệt dày")
        seller_page.fill("#sell-repair_history", "Đã thay khóa kéo và gia cố đường may ở cổ áo.")
        seller_page.fill("#sell-product_story", "Chiếc áo được gìn giữ cẩn thận tại Huế.")
        seller_page.check("label:has-text('Tôi dự định sử dụng lại bao bì') input[type=checkbox]")
        check("Keyboard lifecycle selection reveals its conditional field", seller_page.locator("#sell-lifecycle_type-repaired").is_checked())
        journey_fieldset = seller_page.locator("fieldset").filter(has_text="Product Journey")
        seller_page.set_viewport_size({"width": 1440, "height": 1200})
        journey_fieldset.evaluate(
            "element => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 120 })"
        )
        evidence(seller_page, "08-sell-product-journey-desktop.jpg")
        seller_page.set_viewport_size({"width": 1440, "height": 900})
        seller_page.locator("[data-testid=sell-next]").click()
        seller_page.fill("#price", "430000")
        seller_page.fill("#stock", "2")
        seller_page.locator("[data-testid=sell-next]").click()
        seller_page.set_input_files("#images", IMAGE)
        expect(seller_page.locator("img[alt*='Ảnh sản phẩm']").first).to_be_visible(timeout=10000)
        seller_page.locator("[data-testid=sell-next]").click()
        preview = seller_page.locator("[data-testid=sell-product-journey-preview]")
        expect(preview).to_contain_text("Repaired")
        review_text = seller_page.locator("dl").inner_text()
        check("Review step includes the declared Product Journey", "Repaired" in review_text and "khóa kéo" in review_text)
        evidence(preview, "09-sell-review-journey-desktop.jpg")
        seller_page.locator("[data-testid=sell-publish]").click()
        seller_page.wait_for_url("**/products/**", timeout=25000, wait_until="domcontentloaded")
        created_slug = seller_page.url.split("/products/", 1)[1].split("?", 1)[0].rstrip("/")
        created = rest("GET", "products", f"select=id,slug&slug=eq.{urllib.parse.quote(created_slug)}")
        if not created:
            raise RuntimeError("Published Phase 14 wizard listing was not found")
        PRODUCT_IDS.append(created[0]["id"])
        stored = rest("GET", "product_sustainability", f"select=lifecycle_type,claim_source&product_id=eq.{created[0]['id']}")
        check("Sell wizard persists a real seller-declared journey", stored == [{"lifecycle_type": "repaired", "claim_source": "seller_declared"}])

        open_listing_editor(seller_page, listing_name)
        expect(seller_page.locator("#edit-lifecycle_type-repaired")).to_be_checked()
        seller_page.check("#edit-lifecycle_type-upcycled")
        seller_page.fill("#edit-upcycle_details", "Tái thiết kế tay áo thành túi nhỏ đi kèm.")
        seller_page.locator("[data-testid=seller-edit-save]").click()
        expect(seller_page.locator("[data-testid=listing-row]").first).to_be_visible(timeout=15000)
        updated = rest("GET", "product_sustainability", f"select=lifecycle_type&product_id=eq.{created[0]['id']}")
        check("Seller Dashboard persists a Product Journey edit", updated == [{"lifecycle_type": "upcycled"}])
        evidence(seller_page.locator("[data-testid=listing-row]").first, "10-seller-dashboard-journey-desktop.jpg")

        check("Authenticated pages contain polite status announcements", seller_page.locator("[aria-live=polite]").count() >= 1)
        seller_context.close()

        buyer_context = browser.new_context(viewport={"width": 1024, "height": 768})
        install_auth(buyer_context, buyer)
        buyer_page = buyer_context.new_page()
        attach_observers(buyer_page)
        buyer_page.goto(f"{WEB}/profile", wait_until="domcontentloaded")
        buyer_impact = buyer_page.locator("[data-testid=profile-impact]")
        expect(buyer_impact).to_be_visible(timeout=20000)
        expect(buyer_impact).to_contain_text("2")
        check("Buyer profile attributes only completed purchased quantity", buyer_impact.get_by_text(re.compile("Đã mua", re.I)).count() == 1)
        buyer_context.close()

        responsive_routes = [
            "/",
            "/shop",
            "/shop?lifecycle=pre_loved",
            f"/products/{circular['slug']}",
            f"/products/{legacy['slug']}",
            "/sustainability",
            "/profile",
            "/seller/dashboard",
            "/sell",
            f"/seller/{seller['username']}",
        ]
        for width, height in ((375, 667), (390, 844), (768, 1024), (1024, 768), (1440, 900)):
            context = browser.new_context(viewport={"width": width, "height": height})
            install_auth(context, seller)
            page = context.new_page()
            attach_observers(page)
            viewport_failures = []
            for route in responsive_routes:
                response = page.goto(f"{WEB}{route}", wait_until="domcontentloaded")
                main_landmarks = page.locator("main")
                expect(main_landmarks.first).to_be_visible(timeout=20000)
                expect(page.locator("main h1").first).to_be_visible(timeout=20000)
                route_status = response.status if response is not None else None
                main_count = main_landmarks.count()
                fits = no_overflow(page)
                heading_count = page.locator("main h1").count()
                if response is None or route_status >= 400 or main_count != 1 or heading_count != 1 or not fits:
                    viewport_failures.append(
                        f"{route}: status={route_status}, main={main_count}, h1={heading_count}, noOverflow={fits}"
                    )
            check(
                f"Core sustainability routes fit {width}x{height}",
                not viewport_failures,
                "; ".join(viewport_failures),
            )
            if width == 390:
                page.goto(f"{WEB}/sustainability", wait_until="domcontentloaded")
                expect(page.locator("[data-testid=sustainability-impact]")).to_be_visible(timeout=15000)
                evidence(page, "11-sustainability-mobile-390.jpg")
                tawk_frames = page.locator("iframe[src*='tawk.to'], iframe[title*='chat' i]")
                if tawk_frames.count():
                    check("Configured Tawk widget stays within the mobile viewport", no_overflow(page))
                    note("Tawk open-state smoke", "Closed widget rendered; cross-origin open-state automation is not safely addressable.")
                else:
                    note("Tawk overlap smoke", "Widget is not configured in this QA runtime; no iframe was rendered.")
            context.close()

        unexpected_console = [message for message in console_errors if "Failed to load resource" not in message]
        unexpected_http = [(status, url) for status, url in http_failures if status >= 500]
        check("No JavaScript errors or hydration warnings", not unexpected_console and not page_errors, "; ".join((unexpected_console + page_errors)[:3]))
        check("No unexpected 500 responses", not unexpected_http, str(unexpected_http[:3]))
        browser.close()

    check("No Phase 14 product has negative stock", len(rest("GET", "products", f"select=id&seller_id=in.({','.join(USER_IDS)})&stock=lt.0")) == 0)
except Exception as error:
    print(f"PHASE14 E2E ERROR: {error}")
    results.append(False)
finally:
    try:
        cleanup()
        remaining_users = rest("GET", "users", f"select=id&id=in.({','.join(USER_IDS)})") if USER_IDS else []
        remaining_products = rest("GET", "products", f"select=id&id=in.({','.join(PRODUCT_IDS)})") if PRODUCT_IDS else []
        remaining_orders = rest("GET", "orders", f"select=id&id=in.({','.join(ORDER_IDS)})") if ORDER_IDS else []
        check("Exact Phase 14 browser fixtures are removed", not remaining_users and not remaining_products and not remaining_orders)
        seed_rows = rest("GET", "products", "select=id&listing_source=eq.seed")
        check("Seed catalog remains exactly 148 products", len(seed_rows) == 148)
    except Exception as cleanup_error:
        print(f"PHASE14 E2E CLEANUP ERROR: {cleanup_error}")
        results.append(False)

print(f"\nPHASE14 E2E SUMMARY: {sum(results)}/{len(results)} passed; {len(notes)} note(s)")
print("Phase 14 E2E cleanup complete (recorded IDs/paths only).")
sys.exit(1 if not results or not all(results) else 0)
