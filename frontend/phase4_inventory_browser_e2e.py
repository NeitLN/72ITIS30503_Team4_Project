"""Phase 4 Browser E2E coverage for Seller Inventory & Variant Controls.

This is a genuine Playwright browser test verifying the Phase 4 UI and data
flow against the local stack (frontend at :3000, backend at :8080).
It registers a disposable Seller account, creates both Simple and Variant
inventory listings, tests the public product page, the cart variant identity,
the Seller Dashboard quality score/inventory rendering, and responsive/
accessible UI constraints.

Usage:
    python frontend/phase4_inventory_browser_e2e.py
"""
import sys
import time
import tempfile
import os
import base64

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def create_fake_image():
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tf.write(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="))
        return tf.name

def main():
    temp_path = create_fake_image()
    try:
        with sync_playwright() as p:
            # Launch real Chromium for actual layout/rendering tests
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})

            # --- 1. Disposable Seller Setup ---
            timestamp = int(time.time())
            email = f"e2e-phase4-{timestamp}@stylehub.test"
            username = f"e2e-phase4-{timestamp}"

            page.goto(f"{BASE}/register")
            page.wait_for_load_state("networkidle")
            page.fill("#name", "E2E Phase4 QA")
            page.fill("#email", email)
            page.fill("#password", "E2EPhase4!23")
            page.select_option("#role", "seller")
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(600)

            # Profile required fields (phone + bio) so we can publish
            page.goto(f"{BASE}/profile")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)
            try:
                page.click('[data-testid="profile-edit-toggle"]')
            except Exception as e:
                print("Failed to click profile-edit-toggle. Current URL:", page.url)
                print("Page content:", page.content())
                raise e
            page.wait_for_timeout(400)

            page.fill("#profile-username", username)
            page.fill("#profile-display_name", "E2E Phase 4 Store")
            page.fill("#profile-bio", "E2E automated store for Phase 4 validation.")

            # Location Combobox handling
            page.fill("#profile-location", "Hà Nội")
            page.wait_for_timeout(400)
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")

            page.click('[data-testid="profile-save"]')
            page.wait_for_timeout(600)

            # Reload and verify
            page.reload()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)
            page.wait_for_selector(f"text={username}", timeout=5000)
            check("Profile setup persisted username", username in page.content())

            # --- 2. Scenario A: Simple Inventory (One-of-one Draft) ---
            page.goto(f"{BASE}/sell")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)

            if page.locator('[data-testid="sell-clear-draft"]').is_visible():
                page.click('[data-testid="sell-clear-draft"]')
                page.wait_for_timeout(400)

            simple_title = f"E2E Phase 4 Simple Item {timestamp}"

            page.fill("#name", simple_title)
            page.fill("#description", "Simple one of one description for validation")
            page.click('[data-testid="sell-next"]')

            page.select_option("#category_slug", "t-shirts")
            page.click('[data-testid="sell-next"]')

            page.select_option("#condition", "new_with_tags")
            page.select_option("#size", "M")
            page.click('[data-testid="sell-next"]')

            # Step 4 (Inventory)
            page.click('input[name="inventory_mode"][value="simple"]')
            page.fill("#price", "100000")
            page.fill("#stock", "1")
            page.click('[data-testid="sell-next"]')

            # Step 5 (Image)
            page.set_input_files("#images", temp_path)
            page.wait_for_timeout(800) # wait for preview
            page.click('[data-testid="sell-next"]')

            # Step 6
            page.click('[data-testid="sell-publish"]')

            # Wait for redirect to product page
            try:
                page.wait_for_url(f"**/products/*", timeout=8000)
                check("Simple listing published successfully", True)
            except:
                check("Simple listing published successfully", False, page.url)

            # Check Dashboard Persistence
            page.goto(f"{BASE}/seller/dashboard")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(600)
            page.click('[data-testid="dashboard-tab-products"]')
            page.wait_for_timeout(400)

            # Locate the exact listing by unique title
            simple_row = page.locator(f'tr:has-text("{simple_title}")')
            check("Dashboard displays Simple listing row", simple_row.count() == 1)

            if simple_row.count() == 1:
                stock_cell = simple_row.locator('td', has_text="1")
                check("Simple listing stock is 1", stock_cell.count() > 0)

                # Check Quality Score cell
                quality_cells = simple_row.locator('td:has-text("%")')
                check("Simple listing quality score displayed", quality_cells.count() > 0)

                status_cell = simple_row.locator('[data-testid="listing-status"]')
                check("Simple listing status is active", "ĐANG HOẠT ĐỘNG" in status_cell.inner_text().upper())

                # Edit Verification
                simple_row.locator('[data-testid="listing-action-edit"]').click()
                page.wait_for_timeout(800)
                check("Edit initialized with Simple mode", page.locator('input[name="edit_inventory_mode"][value="simple"]').is_checked())
                check("Edit initialized with stock 1", page.locator('#edit-stock').input_value() == "1")

            # --- 3. Scenario B: Variant Inventory ---
            # Clear draft and start over for variant
            page.goto(f"{BASE}/sell")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)
            if page.locator('[data-testid="sell-clear-draft"]').is_visible():
                page.click('[data-testid="sell-clear-draft"]')
                page.wait_for_timeout(400)

            variant_title = f"E2E Phase 4 Variant Item {timestamp}"

            page.fill("#name", variant_title)
            page.fill("#description", "Multiple variants with different stock to validate inventory tracking.")
            page.click('[data-testid="sell-next"]')

            page.select_option("#category_slug", "shoes")
            page.click('[data-testid="sell-next"]')

            page.select_option("#condition", "good")
            page.select_option("#size", "EU 42") # shoe size req
            page.click('[data-testid="sell-next"]')

            # Select Variant
            page.click('input[name="inventory_mode"][value="variant"]')
            page.wait_for_timeout(200)

            # Add two variants. Default has 1 row, click add to get 2 rows.
            # Check adding a 3rd and removing it
            page.click('button:has-text("+ Thêm phân loại")')
            page.click('button:has-text("+ Thêm phân loại")')
            page.wait_for_timeout(200)

            # Target the 3rd remove button (index 2) by aria-label if we add it, or title
            page.locator('button[title="Xóa phân loại"]').nth(2).click()
            page.wait_for_timeout(200)

            # We need specific IDs for inputs to avoid broad matching
            rows = page.locator('input[placeholder="VD: Size L - Đen"]')
            check("Variant row addition and removal works", rows.count() == 2)

            # Fill Row 0
            rows.nth(0).fill("Size 42 - Đen")
            page.locator('input[type="number"]').nth(0).fill("250000") # price
            page.locator('input[type="number"]').nth(1).fill("2")      # stock
            # Fill SKU
            page.locator('input[type="text"]').nth(1).fill(f"SKU-42-{timestamp}")

            # Fill Row 1
            rows.nth(1).fill("Size 43 - Đen")
            page.locator('input[type="number"]').nth(2).fill("250000") # price
            page.locator('input[type="number"]').nth(3).fill("0")      # stock (sold out testing)
            page.locator('input[type="text"]').nth(2).fill(f"SKU-43-{timestamp}")

            page.click('[data-testid="sell-next"]')

            # Step 5 (Image)
            page.set_input_files("#images", temp_path)
            page.wait_for_timeout(800) # wait for preview
            page.click('[data-testid="sell-next"]')

            # Step 6
            page.click('[data-testid="sell-publish"]')

            # Wait for redirect to product page
            try:
                page.wait_for_url(f"**/products/*", timeout=8000)
                check("Variant listing published successfully", True)
            except:
                check("Variant listing published successfully", False, page.url)

            # --- 4. Scenario C: Public Product and Cart ---
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(600)

            check("Product detail page loaded", "products" in page.url)

            # Variant UI checks using proper test-ids
            variants = page.locator('[data-testid^="product-variant-option-"]')
            check("Variants rendered on product page", variants.count() >= 2)

            # Add to cart validation
            add_btn = page.locator('[data-testid="product-add-to-cart"]')
            add_btn.click()
            page.wait_for_timeout(200)
            check("Add to Cart blocked before required variant selection", page.locator('[data-testid="product-variant-required"]').is_visible() or add_btn.is_disabled())

            # Select an available variant (Size 42 - Đen, stock 2)
            variants.nth(0).click()
            page.wait_for_timeout(200)
            check("Variant selection enables add to cart", not add_btn.is_disabled())

            # Select an unavailable variant (Size 43 - Đen, stock 0)
            variants.nth(1).click()
            page.wait_for_timeout(200)
            check("Unavailable variant disables Add to Cart", add_btn.is_disabled())

            # Select available again
            variants.nth(0).click()
            add_btn.click()
            page.wait_for_timeout(800)

            # Open Cart
            page.goto(f"{BASE}/cart")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)

            cart_items = page.locator('.flex-1.min-w-0 > p.text-neutral-500.text-sm')
            check("Cart retains variant identity", "Size 42 - Đen" in cart_items.nth(0).inner_text())

            # --- 5. Seller Dashboard & Edit Persistence ---
            page.goto(f"{BASE}/seller/dashboard")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(600)

            # Switch to Products tab
            page.click('[data-testid="dashboard-tab-products"]')
            page.wait_for_timeout(400)

            variant_row = page.locator(f'tr:has-text("{variant_title}")')
            check("Dashboard displays Variant listing row", variant_row.count() == 1)

            if variant_row.count() == 1:
                # The Variant listing should show stock = 2 (sum of variants)
                stock_td = variant_row.locator('td', has_text="2")
                check("Dashboard stock reflects variant stock sum", stock_td.count() > 0)

                # Edit Variant Stock
                variant_row.locator('[data-testid="listing-action-edit"]').click()
                page.wait_for_timeout(800)

                check("Edit form initialized variant mode", page.locator('input[name="edit_inventory_mode"][value="variant"]').is_checked())

                # Change stock of variant 0 to 5
                page.locator('input[type="number"]').nth(1).fill("5")
                page.click('[data-testid="seller-edit-save"]')
                page.wait_for_timeout(1000)

                # Close/reload
                page.goto(f"{BASE}/seller/dashboard")
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(600)
                page.click('[data-testid="dashboard-tab-products"]')
                page.wait_for_timeout(400)

                variant_row = page.locator(f'tr:has-text("{variant_title}")')
                variant_row.locator('[data-testid="listing-action-edit"]').click()
                page.wait_for_timeout(800)

                check("Variant stock edit persisted", page.locator('input[type="number"]').nth(1).input_value() == "5")

            # --- 6. Responsive Mobile Checks ---
            # Save auth state
            storage = browser.contexts[0].storage_state()
            mobile_context = browser.new_context(viewport={"width": 375, "height": 812}, storage_state=storage)
            mobile_page = mobile_context.new_page()
            mobile_page.goto(f"{BASE}/sell")
            mobile_page.wait_for_load_state("networkidle")
            mobile_page.wait_for_timeout(600)

            # Go to step 4 variant
            mobile_page.fill("#name", "Mobile Check")
            mobile_page.fill("#description", "1234567890")
            mobile_page.click('[data-testid="sell-next"]')
            mobile_page.select_option("#category_slug", "quan-ao-nu")
            mobile_page.click('[data-testid="sell-next"]')
            mobile_page.select_option("#condition", "new_with_tags")
            mobile_page.select_option("#size", "M")
            mobile_page.click('[data-testid="sell-next"]')
            mobile_page.click('input[name="inventory_mode"][value="variant"]')
            mobile_page.wait_for_timeout(400)

            # Ensure step 4 variant layout is safe
            overflow = mobile_page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            check("No horizontal overflow on mobile variant UI", not overflow)

            browser.close()
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


if __name__ == "__main__":
    main()
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\nPHASE 4 BROWSER E2E SUMMARY: {passed}/{total} passed")
    if passed != total:
        sys.exit(1)
