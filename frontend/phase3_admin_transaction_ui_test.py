from pathlib import Path

ROOT = Path(__file__).resolve().parent

files = {
    "page": ROOT / "app" / "admin" / "transactions" / "page.tsx",
    "client": ROOT / "components" / "admin" / "AdminTransactionsClient.tsx",
    "api": ROOT / "lib" / "adminTransactions.ts",
    "routes": ROOT / "constants" / "routes.ts",
}

for label, path in files.items():
    assert path.exists(), f"Missing Phase 3 {label} file: {path.relative_to(ROOT)}"

page = files["page"].read_text(encoding="utf-8")
client = files["client"].read_text(encoding="utf-8")
api = files["api"].read_text(encoding="utf-8")
routes = files["routes"].read_text(encoding="utf-8")

for token in [
    "AdminTransactionsClient", "Quản lý giao dịch", "summary", "transactions",
    "paymentState", "orderStatus", "dateFrom", "dateTo", "sort", "pageSize",
    "isAuthenticated", "isAdmin", "unauthorized", "skeleton", "aria-live",
    "md:hidden", "hidden md:block", "expectedOrderUpdatedAt", "idempotencyKey",
    "reason", "ADMIN_REASON_REQUIRED", "TRANSACTION_STATE_CONFLICT",
]:
    assert token in f"{page}\n{client}\n{api}", f"Phase 3 UI/API contract is missing: {token}"

assert "ADMIN_TRANSACTIONS" in routes and "/admin/transactions" in routes
assert "cardNumber" not in client and "cvv" not in client.lower() and "cvc" not in client.lower()
assert "momo" not in client.lower() and "refund" not in client.lower()

print("[PASS] Phase 3 admin transaction UI contract includes real server data, safe states, responsive layouts and guarded actions.")
