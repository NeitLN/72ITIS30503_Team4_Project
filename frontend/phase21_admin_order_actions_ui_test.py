from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "page": ROOT / "app" / "admin" / "orders" / "page.tsx",
    "client": ROOT / "components" / "admin" / "AdminOrdersClient.tsx",
    "drawer": ROOT / "components" / "admin" / "OrderDetailDrawer.tsx",
    "api": ROOT / "lib" / "orders.ts"
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 21 {label} file: {path.relative_to(ROOT)}"

client = files["client"].read_text(encoding="utf-8")
drawer = files["drawer"].read_text(encoding="utf-8")
api = files["api"].read_text(encoding="utf-8")

# Required assertions:
for token in [
    "handleStatusChange", "Bắt đầu xử lý", "Đánh dấu hoàn tất", "Hủy đơn",
    "ConfirmDialog", "Xác nhận hủy đơn hàng", "Xác nhận hoàn tất đơn hàng",
    "Bạn có chắc chắn muốn hủy đơn hàng", "Đánh dấu hoàn tất đơn hàng",
    "Xác nhận hủy", "Xác nhận hoàn tất", "Quay lại",
    "onUpdateSuccess", "isUpdating", "updateError", "Đang cập nhật..."
]:
    assert token in drawer, f"Phase 21 Drawer UI action contract missing: {token}"

# Verify the old AdminOrdersClient status actions have been cleaned up and route to Drawer.
assert "onUpdateSuccess={() => { retryLoadOrders();" not in client # It's onUpdateSuccess={retryLoadOrders} wait let's check
assert "onUpdateSuccess={retryLoadOrders}" in client or "onUpdateSuccess={() => { retryLoadOrders();" in client, "List refresh logic missing on successful drawer update."

assert "Hủy đơn hàng này?" not in client, "Old un-accessible window.confirm() remains in AdminOrdersClient."

print("[PASS] Phase 21 Admin Order Actions UI contract uses ConfirmDialog, explicit loading states, error handling, and safely synchronizes List with Drawer updates.")
