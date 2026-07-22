"""Rendered Phase 2 checkout E2E with fully stubbed API responses.

No database records are created. The test proves the browser contract, request
allowlist, accessible validation/error focus, duplicate-submit guard, success
summary, responsive layout, and multi-seller cart rendering.

Usage: PHASE2_WEB_BASE=http://localhost:3000 python phase2_simulated_payment_e2e.py
"""
import json
import os
import sys

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
WEB = os.environ.get("PHASE2_WEB_BASE", "http://localhost:3000")
API = os.environ.get("NEXT_PUBLIC_API_URL", "http://localhost:8080")
checks = []
order_requests = []


def check(name, condition, detail=""):
    checks.append(bool(condition))
    print(f"[{'PASS' if condition else 'FAIL'}] {name}{' — ' + detail if detail else ''}")


user = {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Phase 2 Browser Buyer",
    "email": "phase2-browser@example.invalid",
    "role": "customer",
}
cart = [
    {
        "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "productId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "variantId": None,
        "name": "Phase 2 Seller A Tee",
        "price": 100001,
        "salePrice": None,
        "imageUrl": None,
        "size": "M",
        "condition": "good",
        "brandName": "StyleHub QA",
        "sellerHandle": "seller-a",
        "quantity": 1,
        "slug": "phase2-seller-a-tee",
    },
    {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "productId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "variantId": None,
        "name": "Phase 2 Seller B Tee",
        "price": 100002,
        "salePrice": None,
        "imageUrl": None,
        "size": "L",
        "condition": "good",
        "brandName": "StyleHub QA",
        "sellerHandle": "seller-b",
        "quantity": 1,
        "slug": "phase2-seller-b-tee",
    },
]
quote_items = [
    {
        "productId": item["productId"], "variantId": None, "productName": item["name"],
        "unitPrice": item["price"], "quantity": 1, "availableQuantity": 5,
    }
    for item in cart
]
quote = {
    "items": quote_items,
    "subtotal": 200003,
    "shipping_fee": 30000,
    "discount_amount": 0,
    "total_amount": 230003,
    "price_changes": [],
    "requires_review": False,
    "coupon": None,
}
safe_payment = {
    "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "state": "held",
    "method": "simulated_card",
    "currency": "VND",
    "gross_amount": 230003,
    "platform_fee_total": 23000,
    "seller_amount_total": 207003,
    "card_brand": "visa",
    "last_four": "4242",
    "held_at": "2026-07-23T00:00:00Z",
    "refunded_at": None,
}


def fulfill_json(route, status, body):
    route.fulfill(status=status, content_type="application/json", body=json.dumps(body, ensure_ascii=False))


def handle_api(route):
    request = route.request
    path = request.url.removeprefix(API)
    if path == "/api/auth/me":
        return fulfill_json(route, 200, {"success": True, "data": {"user": user}})
    if path == "/api/orders/preview" and request.method == "POST":
        return fulfill_json(route, 200, {"success": True, "data": quote})
    if path == "/api/orders" and request.method == "POST":
        order_requests.append(json.loads(request.post_data or "{}"))
        if len(order_requests) == 1:
            return fulfill_json(route, 409, {
                "success": False,
                "error": {"code": "SIMULATED_PAYMENT_FAILED", "message": "Thanh toán mô phỏng không thành công."},
            })
        return fulfill_json(route, 200, {
            "success": True,
            "data": {
                "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                "order_code": "SH-PHASE2-QA",
                "status": "pending",
                "payment_method": "simulated_card",
                "subtotal": 200003,
                "shipping_fee": 30000,
                "discount_amount": 0,
                "total_amount": 230003,
                "items": [],
                "payment": safe_payment,
            },
        })
    if path == "/api/orders/dddddddd-dddd-4ddd-8ddd-dddddddddddd" and request.method == "GET":
        return fulfill_json(route, 200, {
            "success": True,
            "data": {
                "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                "order_code": "SH-PHASE2-QA",
                "status": "pending",
                "payment_method": "simulated_card",
                "subtotal": 200003,
                "shipping_fee": 30000,
                "discount_amount": 0,
                "total_amount": 230003,
                "items": [
                    {"id": item["id"], "product_name": item["name"], "unit_price": item["price"], "quantity": 1, "line_total": item["price"]}
                    for item in cart
                ],
                "payment": safe_payment,
            },
        })
    return fulfill_json(route, 404, {"success": False, "error": {"message": "Not stubbed"}})


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.add_init_script(
        script=f"""
          localStorage.setItem('stylehub:auth-token', 'phase2-stub-token');
          localStorage.setItem('stylehub:auth-user', JSON.stringify({json.dumps(user)}));
          localStorage.setItem('stylehub_cart', JSON.stringify({json.dumps(cart)}));
        """
    )
    page = context.new_page()
    page.route(f"{API}/**", handle_api)
    page.goto(f"{WEB}/checkout", wait_until="networkidle")

    expect(page.get_by_text("Phase 2 Seller A Tee", exact=True)).to_be_visible()
    expect(page.get_by_text("Phase 2 Seller B Tee", exact=True)).to_be_visible()
    check("Multi-seller cart remains visible", True)
    expect(page.get_by_text("Simulated Card / Demo Card", exact=True)).to_be_visible()
    page.get_by_text("Simulated Card / Demo Card", exact=True).click()
    warning = "Simulated payment for academic demonstration only. No real card or money is processed."
    expect(page.get_by_text(warning, exact=True)).to_be_visible()
    check("Academic demo warning renders", True)

    expect(page.locator("#simulated-card-brand")).to_be_visible()
    expect(page.locator("#simulated-card-last-four")).to_be_visible()
    check("Only brand and last-four safe fields render", page.locator('[data-testid="simulated-card-fields"] input, [data-testid="simulated-card-fields"] select').count() == 2)
    check("No full-card-number field exists", page.locator('input[name*="card-number" i], input[autocomplete="cc-number"]').count() == 0)
    check("No CVV field exists", page.locator('input[name*="cvv" i], input[name*="cvc" i], input[autocomplete="cc-csc"]').count() == 0)

    page.fill("#name", "Phase Two Browser Buyer")
    page.fill("#phone", "0901234567")
    page.fill("#email", "phase2-browser@example.invalid")
    page.fill("#province", "Thành phố Hồ Chí Minh")
    page.fill("#district", "Quận 1")
    page.fill("#streetAddress", "1 Đường QA")
    page.get_by_role("button", name="Đặt hàng").click()
    expect(page.locator("#simulated-card-last-four-error")).to_be_visible()
    check("Invalid last four has accessible field validation", page.locator("#simulated-card-last-four").get_attribute("aria-invalid") == "true")

    page.fill("#simulated-card-last-four", "4242")
    page.get_by_role("button", name="Đặt hàng").click()
    error_summary = page.locator('[data-testid="checkout-error-summary"]')
    expect(error_summary).to_contain_text("Thanh toán mô phỏng không thành công.")
    check("Failed checkout retains a useful error state", True)
    check("Failed checkout moves keyboard focus to error summary", error_summary.evaluate("node => document.activeElement === node"))

    submit = page.get_by_role("button", name="Đặt hàng")
    submit.dblclick(force=True)
    page.wait_for_url("**/checkout/success?orderId=*", timeout=15000)
    check("Repeated clicks create one additional request", len(order_requests) == 2, f"requests={len(order_requests)}")
    submitted_payment = order_requests[-1].get("payment", {})
    check("Successful checkout submits only allowlisted payment data", order_requests[-1].get("paymentMethod") == "simulated_card"
          and submitted_payment == {"cardBrand": "visa", "lastFour": "4242"})
    expect(page.get_by_text("HELD", exact=False)).to_be_visible()
    expect(page.get_by_text(warning, exact=True)).to_be_visible()
    check("Safe HELD payment summary renders after checkout", True)

    page.set_viewport_size({"width": 375, "height": 667})
    check("Responsive checkout/success has no horizontal overflow", page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"))
    browser.close()

print(f"\nPHASE 2 SIMULATED PAYMENT E2E SUMMARY: {sum(checks)}/{len(checks)} passed")
if not all(checks):
    sys.exit(1)
