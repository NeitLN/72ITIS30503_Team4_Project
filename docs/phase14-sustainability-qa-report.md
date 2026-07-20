# Phase 14 Sustainability QA Report

## Outcome

Phase 14 verifies the Phase 11–13 sustainability implementation with durable backend and rendered-browser suites, real development-database fixtures, and curated presentation evidence. The final Phase 14 backend suite passed **63/63** checks. The finalized Phase 14 Playwright suite passed **38/38** checks in **three consecutive production-server runs**.

Three reproducible P2 defects were fixed: malformed packaging input was silently coerced, `/sell` and `/profile` duplicated the root `main` landmark, and the Shop filter toolbar overflowed at 1024×768. No P0 or P1 defect was found. No new environmental estimate, score, certification, or marketplace feature was added.

## Git baseline and protected work

- Branch: `main`
- Phase 13 baseline: `b309e4377dfd86e63554e883ed5acd573e4895ad` (`feat: add circular impact and sustainability uvp`)
- Initial status: `## main...origin/main [ahead 4]`
- Pre-existing untracked paths: `.impeccable/`, `AGENTS.md`
- The protected paths above and all `.env*`, credentials, and `.claude/` content were left untouched and are excluded from the Phase 14 commit.
- No branch, pull, rebase, reset, amend, rewrite, push, or production-data operation was performed.

## Tested environment

| Item | Verified value |
|---|---:|
| Node.js | 24.12.0 |
| npm | 11.6.2 |
| Python | 3.11.9 |
| Next.js | 16.2.9 |
| Python Playwright | 1.61.0 |
| Browser | Headless Chromium supplied by Playwright |
| Database | Linked development Supabase project |
| Application runtime | Express on `127.0.0.1:8080`; built Next production server on `127.0.0.1:3000` |

The `npx playwright --version` registry/cache path was not usable in the restricted runtime, so availability was verified through the installed Python Playwright package. The browser suites themselves then proved that Chromium was installed and runnable.

## Database and migrations

`npx supabase migration list` showed exact local/remote parity for every migration through `20260723000000_lock_down_order_items.sql`. Sustainability storage and checkout integrity come from:

- `20260722010000_product_sustainability_foundation.sql`
- `20260722020000_atomic_checkout_sustainability_snapshots.sql`
- `20260723000000_lock_down_order_items.sql`

`npx supabase db lint --linked --level warning --fail-on error` exited 0 with no schema errors. It reported one existing extra warning: `public.stylehub_restock_order_item` declares `v_variant_status` but never reads it.

## Phase 14 suites

### Backend/security/calculation

Command (with the backend running):

```text
node backend/phase14_sustainability_qa_test.js
```

Result: **63/63 passed**. Coverage includes:

- lifecycle, Unicode, markup/script/control-character, size, and packaging validation;
- anonymous, authenticated, cross-seller, seed-product, and service-role boundaries;
- server-controlled ownership, claim, verification, snapshot, seller, price, and total fields;
- stale optimistic concurrency returning 409;
- zero, not-specified, new, and all four circular lifecycle formula cases;
- status and seed exclusions, exact coverage denominator, quantity summation, and breakdown consistency;
- real multi-seller atomic checkout, authoritative snapshots, idempotent replay, per-item fulfillment, cancellation, and inventory restoration;
- platform, seller, buyer, intruder, and public-storefront attribution/privacy;
- snapshot immutability after later listing edits;
- deterministic repeated metrics, no negative stock, exact cleanup, and the unchanged 148-row seed catalog.

### Rendered Playwright E2E

Command (with backend and built Next production server running):

```text
python frontend/phase14_sustainability_qa_e2e.py
```

Final stability result: **38/38 passed × 3 consecutive runs**, with one non-pass note per run: Tawk.to was not configured, so no widget iframe existed to exercise an open-state overlap check.

The suite uses runtime registration, random in-memory passwords, real database rows, a real completed order, the actual six-step `/sell` flow, production impact APIs, and captured-ID cleanup. It does not mock impact values. Covered routes and states include homepage impact, methodology, filtered/unfiltered Shop, URL history, category/search compatibility, circular and legacy PDPs, logged-out gates, sell validation/review/publish, dashboard editing and impact, private buyer/seller impact, public seller impact, and client-navigation freshness.

Responsive coverage runs ten core routes at 375×667, 390×844, 768×1024, 1024×768, and 1440×900. Each route must return below 400, expose exactly one `main` and one visible `h1`, and avoid document-level horizontal overflow.

## Defects found and fixed

| Severity | Defect and root cause | Fix | Regression proof |
|---|---|---|---|
| P2 | `reuse_packaging: "javascript:…"` was accepted because a permissive equality expression coerced every unknown value to `false`. | Added canonical boolean normalization that accepts only booleans, 0/1, and their canonical string forms; every other value receives a 422 field error. | Phase 14 backend “Malformed packaging input is rejected”; Phase 11 39/39 regression. |
| P2 | `/sell` and `/profile` nested page-level `<main>` elements inside the root layout `<main>`. | Replaced only the nested semantic wrappers with visually identical `<div>` wrappers. | Phase 14 responsive matrix requires one main landmark on all ten routes at all five sizes. |
| P2 | Shop filters changed to a single flex row at `lg`; five minimum-width selects plus search required about 1,281 px and overflowed a 1024 px viewport. | Kept the two/three-column grid until the content-driven `xl` breakpoint. | 1024×768 filtered Shop changed from reproducible failure to pass in three final runs. |

One P3 historical-suite issue remains: Phase 11 browser functionality passed 20 checks, but the suite reported 20/21 because Next issued two background RSC requests to the nonexistent parent `/products?_rsc=…`. No application source link targets `/products`, the rendered product/detail/dashboard flows passed, and adding a new parent route solely to silence internal prefetch noise would expand Phase 14 scope.

## Regression matrix

| Suite | Result | Status/details |
|---|---:|---|
| Phase 14 backend | 63/63 | Passed |
| Phase 14 browser | 38/38 ×3 | Passed; Tawk unconfigured note |
| Phase 13 backend | 35/35 | Passed |
| Phase 13 browser | 20/20 | Passed |
| Phase 12 backend | 18/18 | Passed |
| Phase 12 browser | 13/13 | Passed |
| Phase 11 backend | 39/39 | Passed after exporting its documented existing QA env values without printing them |
| Phase 11 browser | 20/21 | Failed only its network assertion on two `/products?_rsc` background 404s; all 20 functional checks passed |
| Phase 10 backend | 38/38 | Passed |
| Phase 10 browser | 22/22 | Passed |
| Phase 9 backend security | — | Blocked before execution: `PHASE7_QA_PASSWORD` unavailable (exit 2) |
| Phase 9 Seller Dashboard browser | — | Blocked before execution: `PHASE7_QA_PASSWORD` unavailable (exit 2) |
| Phase 8 profile/storefront | — | Blocked before execution: `PHASE7_QA_PASSWORD` unavailable (exit 2) |
| Phase 8.1 positioning | 29/29 | Passed at all five required viewport sizes |
| Phase 8.1 Shoes/hybrid language | 37/37 | Passed |
| Phase 8.1 brand/location | — | Blocked before execution: `PHASE7_QA_PASSWORD` unavailable (exit 2) |
| Phase 7 sell | — | Blocked before execution: `PHASE7_QA_PASSWORD` unavailable (exit 2) |
| Phase 6 catalog validator | pass | 148 active seed products; no integrity violations |
| Phase 6 seeder dry-run 1 | pass | 0 insert, 0 update, 148 unchanged |
| Phase 6 seeder dry-run 2 | pass | 0 insert, 0 update, 148 unchanged |
| Smoke | 18 pass, 0 fail, 1 skip | Dynamic seller route skipped because the run found no seller link |
| Catalog runtime/image sweep | pass | 0 image 404s, 0 server 5xx, 0 console errors |
| Frontend lint | pass | `npm run lint` |
| Frontend production build | pass | `npm run build`; 23 pages generated/validated |
| Backend JavaScript syntax | pass | `node --check` on 47 source files; 0 failures |
| Python syntax | pass | `py_compile` on 13 frontend test files; 0 failures |
| Migration parity | pass | Local = remote through `20260723000000` |
| Linked schema lint | pass | 0 errors, 1 existing unused-variable warning |

Credential-gated historical suites were attempted and accurately recorded as blocked. No password was guessed, displayed, reset, or written. Their sustainability-critical ownership and UI paths are additionally covered by the disposable-user Phase 11–14 suites, but those newer passes are not reported as historical-suite passes.

## Development database before/after

These are factual development values, not presentation samples. Seed listings are excluded from user-listing and journey metrics.

| Metric | Before (2026-07-20T18:14:51.340Z) | After cleanup (2026-07-20T19:00:49.074Z) |
|---|---:|---:|
| Active catalog products | 151 | 151 |
| Active user listings | 3 | 3 |
| Sellers represented by active user listings | 3 | 3 |
| Active user listings with specified journey | 0 | 0 |
| Journey coverage | 0% | 0% |
| Active circular listings | 0 | 0 |
| Active deadstock / pre-loved / repaired / upcycled | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Completed circular units | 0 | 0 |
| Completed deadstock / pre-loved / repaired / upcycled | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |

Metrics may change as legitimate development data changes. The evidence screenshots show nonzero values only while real, ID-scoped fixtures exist; those fixtures are removed immediately afterward. StyleHub estimates no CO2, water, landfill, waste, carbon, sustainability score, or monetary environmental savings. Product Journey claims are seller-declared and not independently certified.

## Cleanup and integrity evidence

- Every Phase 14 user, product, sustainability row, image row, Storage object, order, item, idempotency row, coupon row, and inventory movement is tracked by captured ID/path and removed in `finally` cleanup.
- Backend cleanup and every final browser pass confirmed no captured rows remained.
- No Phase 14 stock was negative.
- The post-QA database snapshot exactly matched the preflight snapshot.
- The catalog validator and two dry-runs confirmed all 148 verified seed products were unchanged.
- Retained legitimate user listings were not selected by cleanup queries.

## Known honest limitations

- Tests used headless Chromium viewport emulation, not physical iOS/Android hardware or Safari/Firefox engines.
- Tawk.to is not configured in this QA runtime; absence and overflow were checked, but a real open/closed widget interaction could not be exercised.
- Four older suites remain blocked by an unavailable retained-account password; it was not reset.
- Phase 11 browser retains the P3 internal `/products?_rsc` 404 noted above.
- Schema lint retains one non-error unused-variable warning in `stylehub_restock_order_item`.
- This is development-project evidence, not a production load, penetration, disaster-recovery, or independent sustainability-certification audit.
