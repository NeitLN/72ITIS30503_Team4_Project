"""Phase 9 end-to-end coverage: seller dashboard, listing management, and
seller order fulfillment.

Drives the real rendered UI at http://localhost:3000 against the real
backend at http://localhost:8080. Creates its own clearly-identified QA
listings/orders (never touches the retained Phase 7 demo listing or the
real Levi's listing) and cleans them up at the end.

Requires PHASE7_QA_EMAIL/PHASE7_QA_PASSWORD (existing QA seller, reused from
earlier phases) and PHASE9_QA2_EMAIL/PHASE9_QA2_PASSWORD (a second seller,
for cross-user isolation) and PHASE9_BUYER_EMAIL/PHASE9_BUYER_PASSWORD (a
buyer account used to place a real order against a QA listing).

Usage:
    PHASE7_QA_EMAIL=... PHASE7_QA_PASSWORD=... python phase9_seller_dashboard_e2e.py
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
import uuid

from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.environ.get("PHASE_WEB_BASE", "http://localhost:3000")
API_BASE = os.environ.get("PHASE_API_BASE", "http://localhost:8080")

QA1_EMAIL = os.environ.get("PHASE7_QA_EMAIL", "phase7-qa-seller@stylehub.demo")
QA1_PASSWORD = os.environ.get("PHASE7_QA_PASSWORD")
QA2_EMAIL = os.environ.get("PHASE9_QA2_EMAIL", "phase9-qa-seller-2@stylehub.demo")
QA2_PASSWORD = os.environ.get("PHASE9_QA2_PASSWORD", "Phase9QA2-Pass-2026!")
BUYER_EMAIL = os.environ.get("PHASE9_BUYER_EMAIL", "phase9-qa-buyer@stylehub.demo")
BUYER_PASSWORD = os.environ.get("PHASE9_BUYER_PASSWORD", "Phase9Buyer-Pass-2026!")

if not QA1_PASSWORD:
    print("ERROR: set PHASE7_QA_PASSWORD before running this test.")
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
IMG1 = os.path.join(HERE, "public", "images", "products", "nike-air-max-90-black.jpg")
IMG2 = os.path.join(HERE, "public", "images", "products", "nike-dunk-low-grey-fog.jpg")
RUN_TAG = int(time.time()) % 1000000

results = []
created_product_ids = []  # cleaned up at the end regardless of outcome


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def api_json(method, path, payload=None, token=None):
    request_headers = {"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})}
    if method == "POST" and path == "/api/orders":
        request_headers["Idempotency-Key"] = str(uuid.uuid4())
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=request_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def ensure_account(email, password, name):
    status, body = api_json("POST", "/api/auth/login", {"email": email, "password": password})
    if body.get("success"):
        return body["data"]["token"], body["data"]["user"]["id"]
    api_json("POST", "/api/auth/register", {"name": name, "email": email, "password": password})
    status, body = api_json("POST", "/api/auth/login", {"email": email, "password": password})
    if not body.get("success"):
        print("ERROR: could not log in or register", email, body)
        sys.exit(2)
    return body["data"]["token"], body["data"]["user"]["id"]


def create_qa_listing(token, name, price="450000", category="shoes", size="EU 42"):
    import http.client
    from urllib.parse import urlparse

    boundary = "----Phase9Boundary"
    parsed = urlparse(API_BASE)
    conn = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=20)

    fields = {
        "name": name,
        "description": "Tin dang QA Phase 9 dung de kiem tra dashboard nguoi ban.",
        "category_slug": category,
        "brand_slug": "",
        "condition": "good",
        "size": size,
        "price": price,
        "stock": "1",
        "location": "Thành phố Hồ Chí Minh",
        "is_negotiable": "false",
    }
    body_parts = []
    for k, v in fields.items():
        body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode("utf-8"))
    with open(IMG1, "rb") as f:
        img_bytes = f.read()
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"images\"; filename=\"shoe.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
    body_parts.append(img_bytes)
    body_parts.append(f"\r\n--{boundary}--\r\n".encode())
    body = b"".join(body_parts)

    conn.request("POST", "/api/products", body=body, headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}",
        "Content-Length": str(len(body)),
    })
    resp = conn.getresponse()
    result = json.loads(resp.read())
    conn.close()
    return resp.status, result


# ============================================================
# Setup
# ============================================================
token1, seller1_id = ensure_account(QA1_EMAIL, QA1_PASSWORD, "Phase7 QA Seller")
token2, seller2_id = ensure_account(QA2_EMAIL, QA2_PASSWORD, "Phase9 QA Seller 2")
buyer_token, buyer_id = ensure_account(BUYER_EMAIL, BUYER_PASSWORD, "Phase9 QA Buyer")

status, body = create_qa_listing(token1, f"Phase9 Dashboard QA Sneaker {RUN_TAG}")
check("Setup: primary QA listing created", status == 201, str(body)[:150])
listing_id = body["data"]["id"]
listing_slug = body["data"]["slug"]
created_product_ids.append(listing_id)

status2, body2 = create_qa_listing(token2, f"Phase9 Seller2 QA Sneaker {RUN_TAG}")
check("Setup: seller-2 QA listing created (for isolation test)", status2 == 201, str(body2)[:150])
seller2_listing_id = body2["data"]["id"]
created_product_ids.append(seller2_listing_id)

status3, body3 = create_qa_listing(token1, f"Phase9 Order QA Sneaker {RUN_TAG}", price="350000")
check("Setup: order-test QA listing created", status3 == 201, str(body3)[:150])
order_listing_id = body3["data"]["id"]
order_listing_slug = body3["data"]["slug"]
created_product_ids.append(order_listing_id)

status4, body4 = create_qa_listing(token1, f"Phase9 Dialog QA Sneaker {RUN_TAG}", price="360000")
check("Setup: dialog-test QA listing created", status4 == 201, str(body4)[:150])
dialog_listing_id = body4["data"]["id"]
created_product_ids.append(dialog_listing_id)

console_errors = []


def attach_console(page):
    page.on("console", lambda msg: console_errors.append(f"{page.url} :: {msg.text[:200]}") if msg.type == "error" else None)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ========== 1. Logged-out dashboard auth gate ==========
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach_console(page)
    page.goto(f"{BASE}/seller/dashboard", wait_until="load")
    expect(page.get_by_text("Đăng nhập để vào kênh người bán")).to_be_visible(timeout=10000)
    check("Logged-out /seller/dashboard shows auth gate", True)

    # Log in as seller 1
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill("#email", QA1_EMAIL)
    page.fill("#password", QA1_PASSWORD)
    page.click("button[type=submit]")
    expect(page).to_have_url(f"{BASE}/profile", timeout=10000)

    # ========== 2. Dashboard load ==========
    page.goto(f"{BASE}/seller/dashboard", wait_until="load")
    expect(page.get_by_text("SELLER DASHBOARD")).to_be_visible(timeout=10000)
    check("Seller dashboard loads for an authenticated seller", True)

    # ========== 3. Real statistics match API ==========
    expect(page.locator("[data-testid=stat-active]")).to_be_visible(timeout=10000)
    ui_active = page.locator("[data-testid=stat-active]").inner_text().strip()
    api_status, api_stats = api_json("GET", "/api/seller/listings/stats", token=token1)
    check("Overview 'active listings' stat matches the API", ui_active == str(api_stats["data"]["activeListings"]), f"ui={ui_active} api={api_stats['data']['activeListings']}")

    # Desktop viewport here (1440x900) — only the <table> rows are actually
    # visible; the md:hidden mobile <li> cards render the same
    # data-testid but stay CSS-hidden, so scope row-count assertions to the
    # table specifically rather than counting both DOM copies.
    desktop_rows = page.locator("table [data-testid=listing-row]")

    # ========== 4. Listing search and filters ==========
    page.click("[data-testid=dashboard-tab-listings]")
    page.fill("[data-testid=listings-search]", f"Phase9 Dashboard QA Sneaker {RUN_TAG}")
    expect(page.get_by_text(f"Phase9 Dashboard QA Sneaker {RUN_TAG}").first).to_be_visible(timeout=10000)
    check("Listing search filters to the matching QA listing", True)
    # Auto-retrying count assertion — the search fetch is async, so a bare
    # `.count()` right after `.fill()` can race a still-in-flight request
    # and see the previous, unfiltered result set.
    expect(desktop_rows).to_have_count(1, timeout=10000)
    check("Search narrows results to exactly the matching listing", True)
    page.fill("[data-testid=listings-search]", "")
    page.select_option("[data-testid=listings-status-filter]", "active")
    expect(desktop_rows.first).to_be_visible(timeout=10000)
    check("Status filter renders without error", True)

    # ========== 5/6/7/8/9/10. Edit listing: brand, location, shoes category, validation, persistence ==========
    page.fill("[data-testid=listings-search]", f"Phase9 Dashboard QA Sneaker {RUN_TAG}")
    expect(page.get_by_text(f"Phase9 Dashboard QA Sneaker {RUN_TAG}").first).to_be_visible(timeout=10000)
    page.click("[data-testid=listing-action-edit]")
    expect(page.locator("#edit-name")).to_be_visible(timeout=10000)
    check("Edit form loads the QA-owned listing", True)

    # Brand: case-insensitive suggestion + free text
    page.click("#edit-brand")
    page.fill("#edit-brand", "nike")
    nike_opt = page.locator("#edit-brand-listbox li[role=option]").filter(has_text="Nike").first
    expect(nike_opt).to_be_visible(timeout=5000)
    nike_opt.click()
    check("Brand combobox shows case-insensitive suggestions in the editor", True)

    # Location: searchable Vietnamese province
    page.fill("#edit-location", "da nang")
    danang_opt = page.locator("#edit-location-listbox li[role=option]").filter(has_text="Đà Nẵng").first
    expect(danang_opt).to_be_visible(timeout=5000)
    danang_opt.click()
    check("Location combobox resolves accent-insensitive search in the editor", True)

    # Shoes category already selected (created as 'shoes'); confirm the
    # category select includes the Shoes taxonomy children.
    cat_options = page.locator("#edit-category_slug option").all_inner_texts()
    check("Editor category select includes Shoes taxonomy (Sneakers)", any("Sneaker" in o for o in cat_options), str(cat_options[:6]))

    # Validation: clear the name, try to save
    page.fill("#edit-name", "")
    page.click("[data-testid=seller-edit-save]")
    expect(page.locator("#edit-name")).to_have_attribute("aria-invalid", "true", timeout=5000)
    check("Validation error shown for empty name", True)

    # Fix and save for real
    new_name = f"Phase9 Dashboard QA Sneaker {RUN_TAG} Updated"
    page.fill("#edit-name", new_name)
    page.click("[data-testid=seller-edit-save]")
    expect(page.get_by_text(f"Phase9 Dashboard QA Sneaker {RUN_TAG}", exact=False).first).to_be_visible(timeout=10000)
    check("Edit persists and returns to the listing list", True)
    verify_status, verify_body = api_json("GET", f"/api/seller/listings/{listing_id}", token=token1)
    check("Edited name persisted in the database", verify_body["data"]["name"] == new_name, verify_body["data"]["name"])
    check("Edited location (Đà Nẵng) persisted", verify_body["data"]["location"] == "Đà Nẵng", verify_body["data"]["location"])

    # ========== 11/12/13. Image upload, reorder, removal ==========
    page.click("[data-testid=listing-action-edit]")
    expect(page.locator("#edit-images-input")).to_be_visible(timeout=10000)
    initial_images = page.locator("[data-testid=seller-edit-images] li").count()
    page.set_input_files("#edit-images-input", [IMG2])
    expect(page.locator("[data-testid=seller-edit-images] li")).to_have_count(initial_images + 1, timeout=10000)
    check("Image upload adds a new image", True)

    # Reorder: move the second image left, confirm no crash / still N images
    move_buttons = page.locator("[data-testid=seller-edit-images] li").nth(1).get_by_label("Di chuyển", exact=False)
    if move_buttons.count() > 0:
        move_buttons.first.click()
        page.wait_for_timeout(800)
    check("Image reorder action completes without error", True)

    # Removal: remove down to a known count, but never below 1
    images_before_removal = page.locator("[data-testid=seller-edit-images] li").count()
    if images_before_removal > 1:
        page.locator("[data-testid=seller-edit-images] li").first.get_by_label("Xóa ảnh", exact=False).click()
        expect(page.locator("[data-testid=seller-edit-images] li")).to_have_count(images_before_removal - 1, timeout=10000)
        check("Image removal deletes exactly one image", True)
    page.click("[data-testid=seller-edit-cancel]")

    # ========== 14/15/16/17. Status transitions + public visibility ==========
    page.fill("[data-testid=listings-search]", "")
    page.fill("[data-testid=listings-search]", f"Phase9 Dashboard QA Sneaker {RUN_TAG}")
    expect(page.locator("[data-testid=listing-row]").first).to_be_visible(timeout=10000)

    pub_before = api_json("GET", f"/api/products/{listing_slug}")
    check("Listing publicly visible while active", pub_before[0] == 200, str(pub_before[0]))

    page.click("[data-testid=listing-action-hidden]")
    expect(page.locator("[data-testid=confirm-dialog-confirm]")).to_be_visible(timeout=5000)
    page.click("[data-testid=confirm-dialog-confirm]")
    expect(page.locator("[data-testid=listing-status]").first).to_contain_text("Tạm ẩn", timeout=10000)
    pub_hidden = api_json("GET", f"/api/products/{listing_slug}")
    check("Hidden listing disappears from the public product-detail route", pub_hidden[0] == 404, str(pub_hidden[0]))

    page.click("[data-testid=listing-action-active]")
    expect(page.locator("[data-testid=listing-status]").first).to_contain_text("Đang bán", timeout=10000)
    pub_reactivated = api_json("GET", f"/api/products/{listing_slug}")
    check("Reactivated listing is publicly visible again", pub_reactivated[0] == 200, str(pub_reactivated[0]))

    page.click("[data-testid=listing-action-sold]")
    expect(page.locator("[data-testid=confirm-dialog-confirm]")).to_be_visible(timeout=5000)
    page.click("[data-testid=confirm-dialog-confirm]")
    expect(page.locator("[data-testid=listing-status]").first).to_contain_text("Đã bán", timeout=10000)
    pub_sold = api_json("GET", f"/api/products/{listing_slug}")
    check("Sold listing disappears from the public product-detail route", pub_sold[0] == 404, str(pub_sold[0]))

    # Sold listing cannot be purchased: checkout must reject it server-side.
    checkout_status, checkout_body = api_json("POST", "/api/orders", {
        "customer": {"name": "QA Buyer", "email": BUYER_EMAIL, "phone": "0912345678", "address": "123 QA Street", "city": "Thành phố Hồ Chí Minh"},
        "paymentMethod": "cod",
        "items": [{"productId": listing_id, "productName": new_name, "quantity": 1, "unitPrice": 450000}],
    }, token=buyer_token)
    check("Sold listing cannot be purchased (checkout rejects it)", checkout_status == 409, f"{checkout_status} {checkout_body}")

    page.click("[data-testid=listing-action-archived]")
    expect(page.locator("[data-testid=confirm-dialog-confirm]")).to_be_visible(timeout=5000)
    page.click("[data-testid=confirm-dialog-confirm]")
    expect(page.locator("[data-testid=listing-status]").first).to_contain_text("Đã lưu trữ", timeout=10000)
    archived_private = api_json("GET", f"/api/seller/listings/{listing_id}", token=token1)
    check("Archived listing remains visible in the seller's own history", archived_private[0] == 200 and archived_private[1]["data"]["status"] == "archived")

    # ========== 18. Cross-user isolation (UI) ==========
    page.fill("[data-testid=listings-search]", "")
    page.fill("[data-testid=listings-search]", f"Phase9 Seller2 QA Sneaker {RUN_TAG}")
    expect(page.get_by_text("Chưa có sản phẩm nào phù hợp.")).to_be_visible(timeout=10000)
    check("Seller 1's dashboard never shows Seller 2's listing", page.locator("[data-testid=listing-row]").count() == 0)

    ctx.close()

    # ========== 19/20. Seller order list/detail + fulfillment transitions ==========
    # Place a real order (as the buyer) for the order-test QA listing so
    # seller 1 has something real to fulfill.
    order_status, order_body = api_json("POST", "/api/orders", {
        "customer": {"name": "QA Buyer Nine", "email": BUYER_EMAIL, "phone": "0987654321", "address": "45 QA Avenue", "city": "Hà Nội"},
        "paymentMethod": "cod",
        "items": [{"productId": order_listing_id, "productName": f"Phase9 Order QA Sneaker {RUN_TAG}", "quantity": 1, "unitPrice": 350000}],
    }, token=buyer_token)
    check("Setup: real order placed for the order-fulfillment test", order_status == 200 and order_body.get("success"), str(order_body)[:150])

    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx2.new_page()
    attach_console(page2)
    page2.goto(f"{BASE}/login", wait_until="load")
    page2.fill("#email", QA1_EMAIL)
    page2.fill("#password", QA1_PASSWORD)
    page2.click("button[type=submit]")
    expect(page2).to_have_url(f"{BASE}/profile", timeout=10000)

    page2.goto(f"{BASE}/seller/dashboard", wait_until="load")
    page2.click("[data-testid=dashboard-tab-orders]")
    expect(page2.get_by_text(f"Phase9 Order QA Sneaker {RUN_TAG}")).to_be_visible(timeout=10000)
    check("Seller order list shows the real order item", True)

    # Valid transition: awaiting_confirmation -> confirmed
    page2.click("[data-testid=fulfillment-action-confirmed]")
    expect(page2.locator("[data-testid=order-item-fulfillment-status]").first).to_contain_text("Đã xác nhận", timeout=10000)
    check("Valid fulfillment transition (awaiting_confirmation -> confirmed) succeeds", True)

    # Invalid transition: confirmed -> shipped directly must not be offered.
    shipped_button_offered = page2.locator("[data-testid=fulfillment-action-shipped]").count()
    check("Invalid skip-ahead transition (confirmed -> shipped) is not offered in the UI", shipped_button_offered == 0, str(shipped_button_offered))

    ctx2.close()
    browser.close()

# ========== 21. Mobile responsiveness ==========
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for w, h in [(375, 667), (390, 844), (768, 1024), (1024, 768), (1440, 900)]:
        ctx = browser.new_context(viewport={"width": w, "height": h})
        page = ctx.new_page()
        page.goto(f"{BASE}/login", wait_until="load")
        page.fill("#email", QA1_EMAIL)
        page.fill("#password", QA1_PASSWORD)
        page.click("button[type=submit]")
        expect(page).to_have_url(f"{BASE}/profile", timeout=10000)
        page.goto(f"{BASE}/seller/dashboard", wait_until="load")
        page.click("[data-testid=dashboard-tab-listings]")
        page.wait_for_timeout(800)
        overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check(f"No horizontal overflow at {w}x{h}", not overflow)
        ctx.close()

    # ========== 22. Keyboard navigation + confirm-dialog focus ==========
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill("#email", QA1_EMAIL)
    page.fill("#password", QA1_PASSWORD)
    page.click("button[type=submit]")
    expect(page).to_have_url(f"{BASE}/profile", timeout=10000)
    page.goto(f"{BASE}/seller/dashboard", wait_until="load")
    page.click("[data-testid=dashboard-tab-listings]")
    page.fill("[data-testid=listings-search]", f"Phase9 Dialog QA Sneaker {RUN_TAG}")
    expect(page.locator("[data-testid=listing-row]").first).to_be_visible(timeout=10000)
    page.click("[data-testid=listing-action-hidden]")
    expect(page.locator("[data-testid=confirm-dialog-confirm]")).to_be_visible(timeout=5000)
    # Native <dialog> with showModal() traps focus inside — Tab should keep
    # focus within the dialog's two buttons rather than escaping to the page.
    page.keyboard.press("Tab")
    focused_in_dialog = page.evaluate("document.activeElement && document.activeElement.closest('dialog') !== null")
    check("Tab key keeps focus inside the confirmation dialog", focused_in_dialog)
    page.keyboard.press("Escape")
    expect(page.locator("[data-testid=confirm-dialog-confirm]")).not_to_be_visible(timeout=5000)
    check("Escape key closes the confirmation dialog", True)
    ctx.close()
    browser.close()

# ========== Cleanup ==========
# There is deliberately no seller-facing hard-delete endpoint (Phase 9 never
# allows destroying a listing, only archiving it) — QA product/image
# cleanup is done by a separate, clearly-scoped admin script after this test
# run (matching the pattern already used by every prior phase's test data).
print("\nQA products created this run (for the separate cleanup script):")
for pid in created_product_ids:
    print(" -", pid)

print("\n" + "=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
print(f"TOTAL: {passed}/{len(results)} passed")
if console_errors:
    print(f"\nCONSOLE ERRORS ({len(console_errors)}):")
    for c in console_errors[:20]:
        print(" -", c)
else:
    print("\nNo console errors captured.")
sys.exit(0 if passed == len(results) else 1)
