import os
import sys

def check_migration():
    migration_path = "supabase/migrations/20260728010000_phase7_notifications_and_order_messages.sql"
    if not os.path.exists(migration_path):
        print("FAIL: Corrective migration file not found.")
        sys.exit(1)

    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read()

    def assert_in(text, reason):
        if text not in content:
            print(f"FAIL: {reason} - missing '{text}'")
            sys.exit(1)

    assert_in("create table if not exists public.conversations", "Conversations table")
    assert_in("create table if not exists public.messages", "Messages table")
    assert_in("create table if not exists public.message_reports", "Message reports table")
    assert_in("revoke update on public.notifications from authenticated;", "Revoke unsafe update")
    assert_in("revoke insert on public.notifications from authenticated;", "Revoke insert notifs")
    assert_in("revoke delete on public.notifications from authenticated;", "Revoke delete notifs")
    assert_in("revoke all on public.notifications from anon;", "Revoke anon notifs")
    assert_in("revoke all on public.conversations from anon, authenticated;", "Revoke conv mutations")
    assert_in("revoke all on public.messages from anon, authenticated;", "Revoke msg mutations")
    assert_in("revoke all on public.message_reports from anon, authenticated;", "Revoke report mutations")
    assert_in("action_href ~ '^/[^[[:cntrl:]]]*$' and action_href not like '//%'", "Hardened Action href safe constraint")
    assert_in("notifications_read_state_check check", "Notif read state consistency")
    assert_in("messages_read_state_check check", "Message read state consistency")
    assert_in("messages_body_length check (char_length(trim(body)) between 1 and 2000)", "Message length limit")
    assert_in("alter table public.conversations enable row level security;", "Conversations RLS")
    assert_in("alter table public.messages enable row level security;", "Messages RLS")
    assert_in("alter table public.message_reports enable row level security;", "Reports RLS")
    assert_in("grant select on public.conversations to authenticated;", "Conversations grant")
    assert_in("grant select on public.messages to authenticated;", "Messages grant")

    if "using (true)" in content.lower() or "with check (true)" in content.lower():
        print("FAIL: Permissive policy found")
        sys.exit(1)

    print("PASS: Migration security rules verified statically.")

if __name__ == "__main__":
    check_migration()