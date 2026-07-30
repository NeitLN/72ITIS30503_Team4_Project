import os
import sys

def check():
    mig_path = "supabase/migrations/20260729010000_add_dispute_evidence_append_rpc.sql"
    if not os.path.exists(mig_path):
        print("FAIL: Dispute evidence append RPC migration missing.")
        sys.exit(1)

    with open(mig_path, "r", encoding="utf-8") as f:
        lower_content = f.read().lower()

    def assert_in(text, reason):
        if text.lower() not in lower_content:
            print(f"FAIL: {reason} - missing '{text}'")
            sys.exit(1)

    assert_in("create or replace function public.stylehub_append_dispute_evidence", "Missing append-evidence RPC")
    assert_in("security definer", "Append RPC must be security definer")
    assert_in("set search_path = public", "Append RPC must set a fixed search_path")
    assert_in("revoke all on function public.stylehub_append_dispute_evidence from public, anon, authenticated;", "RPC execution not fully revoked")
    assert_in("grant execute on function public.stylehub_append_dispute_evidence to service_role;", "RPC not granted to service_role")
    assert_in("p_actor_role not in ('buyer', 'seller')", "Append RPC must validate actor role")

    # Service-layer static checks
    service_path = "backend/services/disputeEvidenceService.js"
    if not os.path.exists(service_path):
        print("FAIL: disputeEvidenceService.js missing.")
        sys.exit(1)
    with open(service_path, "r", encoding="utf-8") as f:
        svc = f.read()

    def assert_svc(text, reason):
        if text not in svc:
            print(f"FAIL: {reason} - missing '{text}'")
            sys.exit(1)

    assert_svc("BUCKET = 'dispute-evidence'", "Evidence service must target the private dispute-evidence bucket")
    assert_svc("MAX_FILES = 5", "Evidence service must cap files at 5 per participant")
    assert_svc("MAX_BYTES = 5 * 1024 * 1024", "Evidence service must cap file size at 5MB")
    assert_svc("createSignedUrl", "Evidence service must use signed URLs for reads, never public URLs")
    if "getPublicUrl" in svc:
        print("FAIL: Evidence service must never call getPublicUrl on the private bucket")
        sys.exit(1)
    assert_svc(".remove(uploadedPaths)", "Evidence service must roll back uploaded objects on failure")
    assert_svc("resolveRole(dispute, userId)", "Evidence service must derive participant role server-side from the DB row")
    assert_svc("TERMINAL_STATUSES.has(dispute.status)", "Evidence service must reject evidence uploads on terminal disputes")

    bucket_script = "backend/scripts/setupDisputeEvidenceBucket.js"
    if not os.path.exists(bucket_script):
        print("FAIL: setupDisputeEvidenceBucket.js missing.")
        sys.exit(1)
    with open(bucket_script, "r", encoding="utf-8") as f:
        script = f.read()
    if "public: false" not in script:
        print("FAIL: dispute-evidence bucket must be created with public: false")
        sys.exit(1)

    print("PASS: Phase 8.2 dispute evidence storage security rules verified statically.")

if __name__ == "__main__":
    check()
