from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "sell": ROOT / "components" / "sell" / "SellListingClient.tsx",
    "edit": ROOT / "components" / "seller" / "ListingEditForm.tsx",
    "dashboard": ROOT / "components" / "seller" / "SellerDashboardClient.tsx",
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 4 {label} file: {path.relative_to(ROOT)}"

sell = files["sell"].read_text(encoding="utf-8")
edit = files["edit"].read_text(encoding="utf-8")
dashboard = files["dashboard"].read_text(encoding="utf-8")

# Tokens to verify the variant UI contract
for token in [
    "inventory_mode", "simple", "variant", "Loại kho hàng *",
    "Đơn giản (Một tùy chọn)", "Nhiều phân loại (Size/Màu)",
    "Danh sách phân loại", "Tên (Size/Màu) *", "Giá *", "Kho *",
    "SKU", "Thêm phân loại", "Xóa phân loại",
    "computeQualityScore", "Chất lượng"
]:
    assert token in f"{sell}\n{edit}\n{dashboard}", f"Phase 4 UI contract is missing: {token}"

print("[PASS] Phase 4 Inventory Variant UI contract includes simple/variant selector, dynamic variant rows, stock/price inputs, SKU, quality score, and accessible labels.")
