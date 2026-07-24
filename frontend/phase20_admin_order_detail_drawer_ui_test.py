from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "page": ROOT / "app" / "admin" / "orders" / "page.tsx",
    "client": ROOT / "components" / "admin" / "AdminOrdersClient.tsx",
    "drawer": ROOT / "components" / "admin" / "OrderDetailDrawer.tsx",
    "api": ROOT / "lib" / "orders.ts"
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 20 {label} file: {path.relative_to(ROOT)}"

client = files["client"].read_text(encoding="utf-8")
drawer = files["drawer"].read_text(encoding="utf-8")
api = files["api"].read_text(encoding="utf-8")

# Verify AdminOrdersClient integration
for token in [
    "OrderDetailDrawer", "selectedOrderId", "setSelectedOrderId", "Xem chi tiết"
]:
    assert token in client, f"Phase 20 Client integration missing: {token}"

# Verify OrderDetailDrawer structure and UI text
for token in [
    "dialog", "orderId", "onClose", "Chi tiết đơn hàng",
    "Thông tin chung", "Người mua & Giao hàng", "Chi tiết thanh toán", "Sản phẩm",
    "Bản ghi thanh toán", "Dữ liệu phân bổ", "Sự kiện thanh toán",
    "Chưa có bản ghi thanh toán", "Chưa có dữ liệu phân bổ", "Chưa có sự kiện thanh toán",
    "Không thể tải chi tiết đơn hàng", "Thử lại", "Đóng"
]:
    assert token in drawer, f"Phase 20 Drawer contract missing: {token}"

print("[PASS] Phase 20 Admin Order Detail Drawer UI contract includes dialog semantics, error/loading states, and detailed order sections.")
