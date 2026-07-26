"""Phase 2 Browser E2E coverage for Seller Profile and Public Storefront.

Verifies the Phase 2 UI and data flow against the local stack.

Usage:
    python frontend/phase2_profile_storefront_e2e.py
"""
import sys
import time
import os
import tempfile
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
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})

            # --- 1. Register/Login ---
            timestamp = int(time.time())
            email = f"e2e-phase2-{timestamp}@stylehub.test"
            username = f"e2e-phase2-{timestamp}"
            display_name = "E2E Phase 2 Store"

            page.goto(f"{BASE}/register")
            page.wait_for_load_state("networkidle")
            page.fill("#name", display_name)
            page.fill("#email", email)
            page.fill("#password", "E2EPhase2!23")
            page.select_option("#role", "seller")
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(600)

            # --- 2. Edit username, bio, and location ---
            page.goto(f"{BASE}/profile")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)

            try:
                page.click('[data-testid="profile-edit-toggle"]')
            except Exception as e:
                print("Failed to click profile-edit-toggle")
                raise e
            page.wait_for_timeout(400)

            page.fill("#profile-username", username)
            page.fill("#profile-display_name", display_name)
            page.fill("#profile-bio", "Phase 2 automated storefront")
            page.fill("#profile-location", "Hà Nội")
            page.wait_for_timeout(400)
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")

            # --- 3. Save ---
            page.click('[data-testid="profile-save"]')
            page.wait_for_timeout(600)

            # --- 4. Reload profile ---
            page.reload()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)

            # --- 5. Verify persistence ---
            page.wait_for_selector(f"text={username}", timeout=5000)
            check("Profile setup persisted username", username in page.content())
            check("Profile setup persisted bio", "Phase 2 automated storefront" in page.content())

            # --- 6 & 7 & 8. Open public storefront & Verify ---
            # Wait a moment to ensure DB sync
            page.wait_for_timeout(500)
            page.goto(f"{BASE}/seller/{username}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(500)

            content = page.content()
            check("Public storefront loaded", display_name in content)
            check("Public identity (username) present", username in content)
            check("Private email absent", email not in content)
            check("Empty storefront copy is correct", "Gian hàng này chưa có sản phẩm đang bán" in content)
            check("Fake verification badge is absent", "Người bán đã xác minh" not in content)

            # --- 9. Create an active Seller listing ---
            page.goto(f"{BASE}/sell")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)
            if page.locator('[data-testid="sell-clear-draft"]').is_visible():
                page.click('[data-testid="sell-clear-draft"]')
                page.wait_for_timeout(400)

            simple_title = f"Active Product {timestamp}"
            page.fill("#name", simple_title)
            page.fill("#description", "Active product for storefront test")
            page.click('[data-testid="sell-next"]')
            page.select_option("#category_slug", "t-shirts")
            page.click('[data-testid="sell-next"]')
            page.select_option("#condition", "new_with_tags")
            page.select_option("#size", "M")
            page.click('[data-testid="sell-next"]')
            page.click('input[name="inventory_mode"][value="simple"]')
            page.fill("#price", "100000")
            page.fill("#stock", "1")
            page.click('[data-testid="sell-next"]')
            page.set_input_files("#images", temp_path)
            page.wait_for_timeout(800)
            page.click('[data-testid="sell-next"]')
            page.click('[data-testid="sell-publish"]')
            page.wait_for_url(f"**/products/*", timeout=8000)

            # Create a draft listing
            page.goto(f"{BASE}/sell")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(400)
            draft_title = f"Draft Product {timestamp}"
            page.fill("#name", draft_title)
            page.fill("#description", "Draft product")
            page.click('[data-testid="sell-next"]')
            page.wait_for_timeout(400) # Saved as draft in step 1/2

            # --- 10 & 11. Verify active appears, draft does not ---
            page.goto(f"{BASE}/seller/{username}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(800)

            content = page.content()
            check("Active listing appears on storefront", simple_title in content)
            check("Draft listing does NOT appear on storefront", draft_title not in content)

            # --- 12. Test share action ---
            try:
                page.click('button[title="Chia sẻ gian hàng"]')
                page.wait_for_timeout(300)
                check("Share button shows success state", "Đã sao chép liên kết" in page.content())
            except Exception as e:
                check("Share button exists and is clickable", False, str(e))

            # --- 13. Test 375x812 mobile layout ---
            mobile_context = browser.new_context(viewport={"width": 375, "height": 812})
            mobile_page = mobile_context.new_page()
            mobile_page.goto(f"{BASE}/seller/{username}")
            mobile_page.wait_for_load_state("networkidle")
            mobile_page.wait_for_timeout(600)

            overflow = mobile_page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            check("No horizontal overflow on mobile storefront", not overflow)

            browser.close()
    except Exception as e:
        print(f"Exception during tests: {e}")
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)

if __name__ == "__main__":
    main()
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\nPHASE 2 BROWSER E2E SUMMARY: {passed}/{total} passed")
    if passed != total:
        sys.exit(1)
