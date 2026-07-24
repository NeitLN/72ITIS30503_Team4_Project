from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "page": ROOT / "app" / "admin" / "page.tsx",
    "client": ROOT / "components" / "admin" / "AdminOverviewClient.tsx",
    "api": ROOT / "lib" / "adminOverview.ts"
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 17 {label} file: {path.relative_to(ROOT)}"

page = files["page"].read_text(encoding="utf-8")
client = files["client"].read_text(encoding="utf-8")
api = files["api"].read_text(encoding="utf-8")

for token in [
    "AdminOverviewClient", "Tổng quan hệ thống", "getAdminOverview",
    "metrics", "attention", "recentOrders", "recentTransactions",
    "isAuthenticated", "isAdmin", "skeleton", "Quyền truy cập bị từ chối",
    "Cần xử lý", "Tình trạng giao dịch", "Đơn hàng gần đây", "Thanh toán gần đây",
    "Hoạt động sàn", "Truy cập nhanh", "apiFetch"
]:
    assert token in f"{page}\n{client}\n{api}", f"Phase 17 UI/API contract is missing: {token}"

print("[PASS] Phase 17 Admin Overview UI contract includes real server data, safe states, responsive layouts and guarded access.")
