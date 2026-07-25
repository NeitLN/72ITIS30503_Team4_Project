"""Phase 6 remediation — real browser E2E coverage for the Seller Dashboard
Finance tab.

This is a genuine Playwright browser test (not a static source/token check):
it registers a disposable seller account through the real UI, navigates the
real rendered Seller Dashboard against the real backend, and asserts on the
live DOM. Requires the frontend dev server at http://localhost:3000 and the
backend at http://localhost:8080 to be running; no external credentials
required — the test creates and does not need to clean up its own account
(registration has no destructive side effect on other data).

Usage:
    python phase6_seller_finance_tab_e2e.py
"""
import sys
import time

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        email = f"phase6.finance.tab.{int(time.time())}@stylehub.test"
        page.goto(f"{BASE}/register")
        page.wait_for_load_state("networkidle")
        page.fill("#name", "Phase6 Finance Tab QA")
        page.fill("#email", email)
        page.fill("#password", "Phase6Finance!23")
        page.select_option("#role", "seller")
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(600)

        page.goto(f"{BASE}/seller/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)

        # 1. Finance appears in navigation, existing tabs remain
        # (compared case-insensitively: the buttons render as visual
        # UPPERCASE via CSS text-transform, which is what .all_inner_texts()
        # reflects — the underlying JSX/DOM text is normal-case.)
        tab_labels = [t.lower() for t in page.locator("[role='tab']").all_inner_texts()]
        check("Existing 'Tổng quan' tab remains", "tổng quan" in tab_labels)
        check("Existing 'Sản phẩm' tab remains", "sản phẩm" in tab_labels)
        check("Existing 'Đơn bán' tab remains", "đơn bán" in tab_labels)
        check("Finance tab ('Tài chính') appears in navigation", "tài chính" in tab_labels)

        # Accessible tab/button semantics
        tablist = page.locator("[role='tablist']")
        check("Tab container uses role=tablist", tablist.count() == 1)
        finance_tab = page.locator('[data-testid="dashboard-tab-finance"]')
        check("Finance tab exists with a stable data-testid", finance_tab.count() == 1)
        check("Finance tab is a real <button> element (keyboard-focusable by default)", finance_tab.evaluate("el => el.tagName") == "BUTTON")
        check("Finance tab is not selected before being clicked", finance_tab.get_attribute("aria-selected") == "false")

        # 2/3. Finance content is reachable, correct tab value used
        finance_tab.click()
        page.wait_for_timeout(600)
        check("Finance tab becomes aria-selected=true after click", finance_tab.get_attribute("aria-selected") == "true")
        overview_tab = page.locator('[data-testid="dashboard-tab-overview"]')
        check("Overview tab becomes aria-selected=false (no dual-active state)", overview_tab.get_attribute("aria-selected") == "false")

        finance_panel = page.locator('[data-testid="dashboard-finance"]')
        check("Finance panel becomes visible/reachable after selecting the tab", finance_panel.is_visible())
        check("Exactly one finance panel is rendered (no duplicate panel)", page.locator('[data-testid="dashboard-finance"]').count() == 1)

        # No crash / no error banner for a fresh seller with zero allocations
        page.wait_for_timeout(800)
        error_banner = page.locator('[data-testid="dashboard-finance"] [role="alert"]')
        check("Finance panel shows no error for a fresh seller (zero allocations)", error_banner.count() == 0)
        check("Finance available-balance stat renders", page.locator('[data-testid="finance-available"]').count() == 1)
        check("Finance escrow stat renders", page.locator('[data-testid="finance-escrow"]').count() == 1)

        # Switching back to another tab still works (no request storm / no duplicate finance panel left behind)
        overview_tab.click()
        page.wait_for_timeout(400)
        check("Switching back to Overview hides the finance panel", page.locator('[data-testid="dashboard-finance"]').count() == 0)
        check("Overview panel is reachable again", page.locator('[data-testid="dashboard-overview"]').is_visible())

        # Keyboard accessibility: tab can be activated via keyboard
        finance_tab.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(400)
        check("Finance tab activates via keyboard Enter", finance_tab.get_attribute("aria-selected") == "true")

        # Mobile safety: no horizontal overflow with the extra tab present
        mobile_page = browser.new_context(viewport={"width": 375, "height": 812}).new_page()
        mobile_page.goto(f"{BASE}/seller/dashboard")
        mobile_page.wait_for_load_state("networkidle")
        mobile_page.wait_for_timeout(600)
        overflow = mobile_page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        check("No horizontal overflow at 375px with 4 tabs present", not overflow)

        browser.close()


if __name__ == "__main__":
    main()
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\nPHASE6 FINANCE TAB E2E SUMMARY: {passed}/{total} passed")
    if passed != total:
        sys.exit(1)
