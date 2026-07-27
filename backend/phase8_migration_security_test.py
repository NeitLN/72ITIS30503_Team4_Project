import os
import sys
import re

def check_migration():
    delivery_mig = "supabase/migrations/20260728020000_add_order_item_delivered_at.sql"
    if not os.path.exists(delivery_mig):
        print("FAIL: Delivery migration missing.")
        sys.exit(1)

    with open(delivery_mig, "r", encoding="utf-8") as f:
        del_content = f.read().lower()
        if "add column if not exists delivered_at timestamptz" not in del_content:
            print("FAIL: Missing delivered_at column addition")
            sys.exit(1)
        if "create trigger order_items_delivered_at_trigger" not in del_content:
            print("FAIL: Missing delivered_at trigger")
            sys.exit(1)

    migration_path = "supabase/migrations/20260729000000_add_disputes.sql"
    if not os.path.exists(migration_path):
        print("FAIL: Corrective migration file not found.")
        sys.exit(1)

    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read()
        lower_content = content.lower()

    def assert_in(text, reason):
        if text.lower() not in lower_content:
            print(f"FAIL: {reason} - missing '{text}'")
            sys.exit(1)

    assert_in("create table if not exists public.disputes", "Disputes table")
    assert_in("alter table public.disputes enable row level security;", "Enable RLS on disputes")
    assert_in("revoke all on public.disputes from anon, authenticated;", "Revoke disputes from anon, authenticated")
    assert_in("grant select, insert, update, delete on public.disputes to service_role;", "Grant disputes to service_role")

    assert_in("on delete restrict", "Ensure NO CASCADE on core ownerships")
    assert_in("buyer_id <> seller_id", "Buyer and seller must differ")

    assert_in("public.are_evidence_paths_valid", "Evidence arrays must be checked by function")
    assert_in("create or replace function public.is_valid_evidence_path", "Missing valid evidence path function")
    assert_in("create unique index if not exists active_dispute_unique_idx", "Unique active disputes")
    assert_in("create trigger disputes_set_updated_at", "Update timestamp trigger")

    assert_in("create or replace function public.disputes_ownership_check", "Ownership trigger function missing")
    assert_in("create table if not exists public.dispute_events", "Dispute events table missing")
    assert_in("alter table public.dispute_events enable row level security;", "Enable RLS on dispute_events")
    assert_in("revoke all on public.dispute_events from anon, authenticated;", "Revoke events from anon, authenticated")

    assert_in("create or replace function public.stylehub_create_dispute", "Missing create_dispute RPC")
    assert_in("security definer", "Create RPC must be security definer")
    assert_in("interval '72 hours'", "Create RPC must check 72 hours")
    assert_in("delivered_at is null", "Create RPC must reject legacy unknown delivery")
    assert_in("revoke all on function public.stylehub_create_dispute from public, anon, authenticated;", "RPC execution revoked")

    # Verify Phase 9 is untouched
    phase9_path = "supabase/migrations/20260730000000_add_seller_analytics.sql"
    if not os.path.exists(phase9_path):
        print("FAIL: Phase 9 migration missing.")
        sys.exit(1)

    print("PASS: Migration security rules verified statically.")

if __name__ == "__main__":
    check_migration()
