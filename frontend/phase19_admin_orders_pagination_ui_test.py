from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "page": ROOT / "app" / "admin" / "orders" / "page.tsx",
    "client": ROOT / "components" / "admin" / "AdminOrdersClient.tsx",
    "api": ROOT / "lib" / "orders.ts"
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 19 {label} file: {path.relative_to(ROOT)}"

page = files["page"].read_text(encoding="utf-8")
client = files["client"].read_text(encoding="utf-8")
api = files["api"].read_text(encoding="utf-8")

# Required assertions:
# 1. Page state exists.
# 2. Page-size state exists.
# ...
for token in [
    "page", "pageSize", "urlState", "router.push", "router.replace",
    "totalItems", "totalPages", "hasPreviousPage", "hasNextPage",
    "Trang trước", "Trang sau", "Số dòng:",
    "Hiển thị", "Không có đơn hàng để hiển thị", "10", "20", "50",
]:
    assert token in f"{page}\n{client}\n{api}", f"Phase 19 UI/API contract is missing: {token}"

# Verify URL driven state reset is present instead of setPage(1)
assert "page: 1" in client, "Phase 19 UI/API contract is missing page reset to 1 on filter/size changes"

print("[PASS] Phase 19 Admin Orders Pagination UI contract includes URL-driven state, controls, result summary, and page reset logic.")
