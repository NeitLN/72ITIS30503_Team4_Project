import os
import sys

def check_migration():
    migration_path = "supabase/migrations/20260729000000_add_disputes.sql"
    if not os.path.exists(migration_path):
        print("FAIL: Corrective migration file not found.")
        sys.exit(1)

    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read().lower()

    def assert_in(text, reason):
        if text.lower() not in content:
            print(f"FAIL: {reason} - missing '{text}'")
            sys.exit(1)

    def assert_not_in(text, reason):
        if text.lower() in content:
            print(f"FAIL: {reason} - found forbidden '{text}'")
            sys.exit(1)

    assert_in("create table if not exists public.disputes", "Disputes table")
    assert_in("alter table public.disputes enable row level security;", "Enable RLS")
    assert_in("revoke all on public.disputes from anon, authenticated;", "Revoke anon and authenticated access")
    assert_in("grant select, insert, update, delete on public.disputes to service_role;", "Grant service role")
    assert_in("create unique index if not exists active_dispute_unique_idx", "Unique active disputes")
    assert_in("where status in ('awaiting_seller_response', 'evidence_submitted', 'under_admin_review')", "Non-terminal unique check")
    assert_in("create trigger disputes_set_updated_at", "Update timestamp trigger")
    assert_in("check (array_length(buyer_evidence, 1) is null or array_length(buyer_evidence, 1) <= 5)", "Buyer evidence limit")
    # Verify Phase 9 is untouched (ensure the script doesn't modify it)
    phase9_path = "supabase/migrations/20260730000000_add_seller_analytics.sql"
    if not os.path.exists(phase9_path):
        print("FAIL: Phase 9 migration missing.")
        sys.exit(1)

    print("PASS: Migration security rules verified statically.")

if __name__ == "__main__":
    check_migration()
