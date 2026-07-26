# SELLER ROADMAP PROGRESS

| Phase | Name | Status | Commit Hash | Migration Created | Migration Executed | Timestamp | Next Phase |
|---|---|---|---|---|---|---|---|
| 0 | Seller Baseline Audit | Completed (audit only) | (None - read only) | No | No | (Initial) | Phase 1 |
| 1 | Seller Onboarding and Store Readiness | Completed | 5258541 | No | No | (Done) | Phase 2 |
| 2 | Seller Profile and Public Storefront | Code Complete — Browser QA Pending (Implementation and automated backend tests passed. Public/private field separation enforced, metrics verified, E2E tests added) | 9c87f2e | No | No | (Remediated) | Phase 3 |
| 3 | Seller Product Management | Remediated — search/filter/sort were already correct; duplicate/delete had real image-ownership and deletion-order defects, fixed in this remediation pass (see below) | f17c52e + remediation | No | No | (Remediated) | Phase 4 |
| 4 | Inventory, Variants, and Listing Quality | Code complete — browser E2E pending (implementation failure-safe, regression passed) | e6a55dd | No | No | (Done) | Phase 5 |
| 5 | Seller Orders and Fulfillment | Core list/filter/fulfillment flow works (predates this phase, independently verified live); this phase's own addition (order-detail drawer) calls a pre-existing, correctly seller-isolated endpoint. No dedicated regression test for the drawer itself | 7c45d33 | No | No | (Done) | Phase 6 |
| 6 | Seller Finance and Payout Visibility | Remediated — was non-functional end-to-end (missing nav tab, wrong allocation state literal, missing auth middleware, missing `checkDb`/`ServiceError` helpers, a ledger query against a non-existent relationship/column). All fixed; 27 backend + 19 browser-E2E tests now pass (see below) | 13a4ec7 + remediation | No | No | (Remediated) | Phase 7 |
| 7 | Notifications and Buyer-Seller Communication | Schema scaffold only — migration file exists, **not applied**, zero backend/frontend code references the table. Untouched by this remediation per explicit instruction | 1c1267d | Yes | No | (Not applied) | Phase 8 |
| 8 | Trust, Verification, Reviews, Returns, and Disputes | Schema scaffold only — migration file exists, **not applied**. The disputes UPDATE RLS policy has no column-level restriction (a buyer/seller could self-set `status`/`admin_notes` if ever queried outside service_role) — requires remediation before any backend is built on it. Untouched by this remediation per explicit instruction | cff07d2 | Yes | No | (Not applied — requires remediation) | Phase 9 |
| 9 | Seller Analytics and Growth Tools | Schema scaffold only — migration file exists, **not applied**. The `product_views` INSERT policy allows unrestricted anonymous inserts with no deduplication — requires remediation before any ingestion endpoint is built. Untouched by this remediation per explicit instruction | ed97127 | Yes | No | (Not applied — requires remediation) | Phase 10 |
| 10 | Seller UX, Motion, Responsive, and Accessibility | Partial — real `scope="col"`/`<caption>` accessibility additions and a debounced draft-save indicator; no dedicated motion/responsive work in this phase's own commit (that came from the separate hygiene commit) | 2231165 | No | No | (Done) | Phase 11 |
| 11 | Full Seller QA | **Pending — not completed.** The commit previously labeled "Phase 11 / full seller QA" contains only a 21-line progress-doc update, no test code. Only Phase 1 had a dedicated test before this remediation pass | (none) | No | No | (Not started) | — |

## Remediation pass (this commit)

Fixed four confirmed defects plus several additional defects discovered while fixing them:

**Profile and Storefront (Phase 2):**
- Enforced strict backend validation and separation of public vs private seller fields by stripping internal user ID before responding to storefront APIs.
- Filtered public products to guarantee only `active` status and `listing_source: 'user'`, preventing seed/draft/archived items from appearing on storefronts.
- Fixed frontend "empty storefront" copy to match the exact requirement ("Gian hàng này chưa có sản phẩm đang bán.").
- Created extensive backend integration tests and Playwright browser E2E test file for profile updates and storefront validation.

**Finance (Phase 6):**
- Added the missing "Tài chính" tab button to the Seller Dashboard's navigation array (the panel/data-loading code already existed but was unreachable).
- Replaced the impossible `state === 'escrow'` check with the real `held` state; documented exact `gross_revenue`/`platform_fees`/`escrow_amount`/`released_amount`/`refunded_amount`/`disputed_amount`/`available_balance`/`paid_out_amount`/`pending_orders` formulas in code.
- Fixed `routes/sellerFinance.js`: was missing `authenticateUser` (every request, valid token or not, returned 401 — the feature was 100% unreachable via HTTP regardless of the tab).
- Fixed `sellerFinanceService.js`: `checkDb`/`ServiceError` were imported from modules that don't export them (every call would throw `TypeError` / produce a malformed error) — replaced with the same local pattern used by `sellerListingService.js`/`sellerOrderService.js`.
- Fixed `getFinanceLedger`'s query: it embedded a non-existent `payment_allocations → order_items` relationship and selected a non-existent `payment_allocations.released_at` column (both always failed with a 500). Ledger now reports `payment_method` (real data) instead of a per-item breakdown a per-seller allocation row can't actually represent.
- Fixed the same `'escrow'` literal bug in the frontend ledger row's status badge/label.
- Tests: `backend/phase6_seller_finance_test.js` (27 assertions: 15 mocked unit tests of the calculation contract + 12 live HTTP integration tests covering auth, cross-Seller isolation, and the client-`seller_id`-override attempt) and `frontend/phase6_seller_finance_tab_e2e.py` (19 assertions, real Playwright browser E2E).

**Listing integrity (Phase 3):**
- `duplicateListing()` now deep-copies each owned Storage object into a new, listing-specific path (via the Storage client's `copy()`) instead of sharing the original's URL; external/non-owned URLs are referenced as-is, never "owned". A failure partway through (missing source file, DB error) rolls back every already-copied object and the half-created product row — no partial duplicate is ever left behind.
- `deleteDraftListing()` now deletes the database row first; Storage cleanup happens only afterward, best-effort, and only for files no other surviving `product_images` row still references (protects listings duplicated before this fix that may still share a physical file).
- Along the way, fixed two defects that meant `duplicateListing()` could never have succeeded for a real listing before this pass: a missing required `seller_name` field, and an initial `image_url`/`thumbnail` value that violated a NOT NULL constraint for a zero-image listing. Also fixed a `.catch()` chained directly on a Postgrest query builder in the rollback path (Postgrest builders aren't full Promises — the chain threw synchronously and silently skipped the rollback).
- Tests: `backend/phase3_listing_integrity_test.js` (19 assertions covering ownership, seed exclusion, cross-Seller isolation, shared-image independence in both delete directions, active-listing protection, external-URL handling, missing-file handling, and rollback-on-partial-failure).

**Known limitation:** all new/changed backend tests were run against a locally-running dev server and real (disposable, cleaned-up) Supabase rows — not against a separate CI environment, since none exists in this repo.
