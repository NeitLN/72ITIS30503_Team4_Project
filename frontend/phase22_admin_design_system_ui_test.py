from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "shell": ROOT / "components" / "admin" / "ui" / "AdminPageShell.tsx",
    "header": ROOT / "components" / "admin" / "ui" / "AdminPageHeader.tsx",
    "metric": ROOT / "components" / "admin" / "ui" / "AdminMetricCard.tsx",
    "status": ROOT / "components" / "admin" / "ui" / "AdminStatusBadge.tsx",
    "empty": ROOT / "components" / "admin" / "ui" / "AdminEmptyState.tsx",
    "error": ROOT / "components" / "admin" / "ui" / "AdminErrorState.tsx",
    "overview": ROOT / "components" / "admin" / "AdminOverviewClient.tsx",
    "transactions": ROOT / "components" / "admin" / "AdminTransactionsClient.tsx",
    "orders": ROOT / "components" / "admin" / "AdminOrdersClient.tsx"
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 22 {label} file: {path.relative_to(ROOT)}"

shell = files["shell"].read_text(encoding="utf-8")
header = files["header"].read_text(encoding="utf-8")
metric = files["metric"].read_text(encoding="utf-8")
status = files["status"].read_text(encoding="utf-8")
empty = files["empty"].read_text(encoding="utf-8")
error = files["error"].read_text(encoding="utf-8")
overview = files["overview"].read_text(encoding="utf-8")
transactions = files["transactions"].read_text(encoding="utf-8")
orders = files["orders"].read_text(encoding="utf-8")

# 1-7 check if components are defined
assert "AdminPageShell" in shell
assert "AdminPageHeader" in header
assert "AdminMetricCard" in metric
assert "AdminStatusBadge" in status
assert "AdminEmptyState" in empty
assert "AdminErrorState" in error

# 8-10 check usage
for client in [overview, transactions, orders]:
    assert "AdminPageShell" in client
    assert "AdminPageHeader" in client
    assert "AdminMetricCard" in client
    assert "AdminStatusBadge" in client

# semantic labels
assert "Tổng người dùng" in overview
assert "Sản phẩm đang bán" in overview
assert "Tiền đang tạm giữ" in transactions
assert "Tổng đơn đối soát" in transactions

# orders controls
assert "Tìm kiếm đơn hàng" in orders
assert "Trạng thái đơn hàng" in orders
assert "Trang trước" in orders
assert "Trang sau" in orders
assert "OrderDetailDrawer" in orders

# One H1 per page
for client in [overview, transactions, orders]:
    assert client.count("<AdminPageHeader") == 1
    assert "<h1>" not in client # Handled by AdminPageHeader

# No sidebar
for client in [overview, transactions, orders]:
    assert "Sidebar" not in client

print("[PASS] Phase 22 Admin Design System UI contract correctly centralizes styles and preserves functionality.")
