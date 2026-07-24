from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "url_helper": ROOT / "lib" / "adminOrdersUrlState.ts",
    "orders_client": ROOT / "components" / "admin" / "AdminOrdersClient.tsx",
    "page": ROOT / "app" / "admin" / "orders" / "page.tsx",
    "drawer": ROOT / "components" / "admin" / "OrderDetailDrawer.tsx",
    "confirm": ROOT / "components" / "seller" / "ConfirmDialog.tsx",
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 23 {label} file: {path.relative_to(ROOT)}"

url_helper = files["url_helper"].read_text(encoding="utf-8")
orders_client = files["orders_client"].read_text(encoding="utf-8")
page = files["page"].read_text(encoding="utf-8")
drawer = files["drawer"].read_text(encoding="utf-8")
confirm = files["confirm"].read_text(encoding="utf-8")

# 1-17 URL State
for token in [
    "AdminOrdersUrlState", "parseAdminOrdersSearchParams", "serializeAdminOrdersSearchParams",
    "query", "orderStatus", "paymentMethod", "page", "pageSize",
    "URLSearchParams"
]:
    assert token in url_helper, f"Missing URL state token: {token}"

# URL integration
assert "useSearchParams" in orders_client, "Missing useSearchParams in AdminOrdersClient"
assert "router.push" in orders_client or "router.replace" in orders_client, "Missing URL router updates"
assert "Suspense" in page, "Missing Suspense boundary in Orders page"

# 18-28 Race protection
assert "AbortController" in orders_client, "Missing AbortController in AdminOrdersClient list fetch"
assert "listAbortController.current.abort()" in orders_client, "Missing list request abortion"
assert "AbortController" in drawer, "Missing AbortController in OrderDetailDrawer"
assert "fetchAbortController.current.abort()" in drawer, "Missing drawer request abortion"

# 29-50 Accessibility
assert "role=\"dialog\"" in confirm or "<dialog" in confirm, "Missing dialog semantics in ConfirmDialog"
assert "aria-labelledby" in confirm or "aria-label" in confirm or "<h" in confirm, "Missing accessible title in ConfirmDialog"
assert "role=\"alert\"" in (files["orders_client"].parent / "ui" / "AdminErrorState.tsx").read_text(encoding="utf-8"), "Missing role=alert in AdminErrorState"

print("[PASS] Phase 23 Admin URL State, Race Protection, and Accessibility UI contract satisfied.")
