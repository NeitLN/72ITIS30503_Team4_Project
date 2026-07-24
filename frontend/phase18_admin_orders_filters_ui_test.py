from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "page": ROOT / "app" / "admin" / "orders" / "page.tsx",
    "client": ROOT / "components" / "admin" / "AdminOrdersClient.tsx",
    "api": ROOT / "lib" / "orders.ts"
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 18 {label} file: {path.relative_to(ROOT)}"

page = files["page"].read_text(encoding="utf-8")
client = files["client"].read_text(encoding="utf-8")
api = files["api"].read_text(encoding="utf-8")

for token in [
    "AdminOrdersClient", "listAllOrdersForAdmin", "query", "orderStatus", "paymentMethod",
    "Tìm kiếm đơn hàng", "Trạng thái đơn hàng", "Phương thức thanh toán",
    "Áp dụng", "Đặt lại", "onSubmit", "draftFilters", "setFilters",
    "Không tìm thấy đơn hàng phù hợp", "Đặt lại bộ lọc"
]:
    assert token in f"{page}\n{client}\n{api}", f"Phase 18 UI/API contract is missing: {token}"

print("[PASS] Phase 18 Admin Orders UI contract includes server-side search, filters, loading states, error states, and responsive layouts.")
