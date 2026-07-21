# Final Report Evidence Map

This map connects the sustainability problem/UVP, implementation, database authority, automated proof, and presentation artifacts. Paths are repository-relative.

| Requirement | Implementation | Database/API source | Test evidence | Screenshot/report evidence |
|---|---|---|---|---|
| Sustainability problem and UVP | `frontend/components/home/CircularImpactSection.tsx`; `frontend/app/sustainability/page.tsx` | `GET /api/sustainability/impact` | Phase 13 backend/browser; Phase 14 browser live-API comparison | `01-home-circular-impact-desktop.jpg`; `02-sustainability-methodology-desktop.jpg` |
| Seller-declared Product Journey | `ProductJourneyFields.tsx`, `SellListingClient.tsx`, `ListingEditForm.tsx`, `ProductJourneyDetails.tsx` | `product_sustainability`; seller listing create/update services | Phase 11 backend 39/39; Phase 14 validation, sell, publish, and edit checks | `04-product-journey-desktop.jpg`; `08-sell-product-journey-desktop.jpg`; `09-sell-review-journey-desktop.jpg` |
| Strict lifecycle and content validation | `backend/constants/sustainability.js` | Server validation before service/RPC writes; DB lifecycle constraint | Phase 14 backend unsupported, unsafe, control, size, Unicode, and malformed packaging cases | QA report defect table |
| Circular discovery | `ShopFilters.tsx`, `LifecycleBadge.tsx`, `ProductCard.tsx`, category/product pages | Product/category APIs join the minimum safe sustainability projection | Phase 12 backend 18/18 and browser 13/13; Phase 14 URL/history/category/search/PDP checks | `03-shop-circular-filter-desktop.jpg`; `04-product-journey-desktop.jpg` |
| Honest legacy fallback | `ProductJourneyDetails.tsx`; dashboard lifecycle badge | Missing row normalizes to `not_specified` without invented details | Phase 11 legacy checks; Phase 14 legacy PDP/dashboard checks | QA report and browser suite |
| Circular impact formulas | `backend/services/impactService.js`; `PlatformImpactPanel.tsx`; `ImpactLedger.tsx` | Active user products + `product_sustainability`; completed `order_items` snapshots | Phase 14 pure formula/status/quantity/breakdown/determinism matrix; Phase 13 backend 35/35 | `01-home-circular-impact-desktop.jpg`; `02-sustainability-methodology-desktop.jpg` |
| Seller and buyer private impact | `PersonalImpactCard.tsx`; profile/dashboard clients | Authenticated `GET /api/profile/me/impact` scoped to token user | Phase 14 multi-seller seller/buyer/intruder checks and rendered private profiles | `06-private-profile-impact-desktop.jpg`; `07-seller-dashboard-impact-desktop.jpg` |
| Safe public seller impact | `PublicSellerImpactCard.tsx`; public seller page | Allowlisted `GET /api/sellers/:username/impact` | Phase 14 public top-level/metric allowlists, private-field scan, cross-user isolation | `05-public-seller-impact-desktop.jpg` |
| Ownership and seed protection | Seller listing routes/services; central auth middleware | User listing ownership predicates; seed `listing_source` wall | Phase 14 cross-seller, seed, spoof, 404, and 409 cases; Phase 11 backend | QA report security section |
| Supabase/RPC security | Server-only Supabase admin client; locked migrations | RLS/grants in `20260722010000`, `20260722020000`, `20260723000000` | Phase 14 anonymous/authenticated table/RPC denial and frontend key scan | QA report migration/schema section |
| Atomic checkout and snapshots | `backend/services/orderService.js`; Phase 10 atomic checkout path | `order_items.lifecycle_type_snapshot`, `claim_source_snapshot`; service-role atomic RPC | Phase 14 authoritative spoof-resistant multi-seller/idempotency/cancellation/immutability checks; Phase 10 38/38 + 22/22 | QA report checkout section |
| Historical integrity after edits | Impact service reads completed immutable snapshots, not current product rows | Snapshot immutability trigger/constraints | Phase 14 later-edit and direct-mutation cases; Phase 13 backend | QA report defect/integrity sections |
| Accessibility | Root layout landmark, field labels, focus-first errors, live regions | Rendered DOM semantics | Phase 14 keyboard/focus/label/gate/live-region checks; one `main` and one `h1` per route | `08-sell-product-journey-desktop.jpg`; QA report P2 landmark fix |
| Responsive UX | Content-driven Shop toolbar breakpoint; responsive ledger/form/card layouts | Rendered application at fixed viewports | Phase 14 ten-route matrix at five sizes; Phase 8.1 positioning 29/29 | `11-sustainability-mobile-390.jpg`; QA report P2 overflow fix |
| Database/catalog integrity | Seed validator/seeder and captured-ID cleanup | 148 seed products; active development catalog | Phase 6 validator + dry-run twice; Phase 14 cleanup and negative-stock checks | QA report before/after and cleanup tables |
| No fabricated environmental claims | Methodology copy and direct-count ledgers | Counts only; methodology v1.0 | Phase 13/14 regex checks prohibit numeric CO2/water/waste estimates | `02-sustainability-methodology-desktop.jpg`; QA report limitations |

## Report-ready claims supported by evidence

- StyleHub lets sellers declare one controlled Product Journey classification and optional factual details; StyleHub does not present it as certification.
- Circular discovery is addressable through stable Shop URLs and is visible on cards, PDPs, category pages, and seller tools.
- Active impact counts are based on active user listings; verified seed rows are excluded from user-listing coverage.
- Completed impact sums order-item quantity from immutable checkout snapshots and excludes cancelled/non-completed items.
- Private seller/buyer ledgers and public seller ledgers have different, tested allowlists.
- The QA package estimates no environmental savings and makes no unsupported equivalency claim.

## Production-readiness boundary

The evidence supports correctness in the configured development project and built local production runtime. It does not establish third-party claim verification, production traffic capacity, multi-browser parity, physical-device behavior, or environmental lifecycle assessment. Those limitations must remain visible in the final project report.

## Phase 15 — final demo and deployment readiness

| Requirement | Implementation | Database/API source | Test evidence | Screenshot/report evidence |
|---|---|---|---|---|
| Non-zero factual demo Circular Impact | `backend/data/sustainabilityDemoCatalog.js`; `backend/scripts/seedSustainabilityDemo.js` (real `/sell` + checkout APIs, never direct writes) | 4 demo accounts, 12 demo listings, 2 real orders, namespaced | Phase 15 backend suite 38/38; `validateSustainabilityDemo.js` 24/24 | `docs/sustainability-demo-data.md` before/after table |
| Idempotent, namespace-scoped demo lifecycle | `seedSustainabilityDemo.js` / `validateSustainabilityDemo.js` / `cleanupSustainabilityDemo.js` | Namespace resolved fresh from DB every run, never a cached ID file | Live-verified this session: dry-run → apply → second apply (0 created) → cleanup dry-run (exact set) | `docs/sustainability-demo-data.md` |
| Honest academic-transparency disclosure | `frontend/app/sustainability/page.tsx` (`#sustainability-disclosure`), `docs/circular-impact-methodology.md` | — | Phase 15 test suite (disclosure copy present; no visible demo/test/sample wording anywhere else) | Screenshot `phase15/01-sustainability-demo-impact.png` |
| Realistic marketplace naming (no visible "Demo"/"Test"/"Sample") | `backend/data/sustainabilityDemoCatalog.js`; `backend/scripts/seedSustainabilityDemo.js` (`migrateLegacyIdentities`) | 4 accounts + 12 listings renamed in place (same row ids); identification moved from visible naming to email-domain + seller/buyer-id membership | Phase 15 test suite (word-boundary demo/test/sample scan across name/description/bio/journey text) 40/40; full-route browser sweep 0 hits | `docs/sustainability-demo-data.md` "Naming revision" |
| `/products?_rsc` 404 investigation | `frontend/next.config.ts` `redirects()` | Root cause: Next.js App Router prefetch of the `/products` parent segment, which had no page of its own | Live-verified this session: `/products` now `307`s to `/shop`; zero HTTP ≥400 responses (incl. all `_rsc` requests) across 6 spot-checked routes | `docs/final-rubric-compliance-audit.md` |
| Map requirement (previously missing) | `frontend/app/contact/page.tsx` (keyless Google Maps iframe) | — | Live-verified `200`, no console error | `docs/final-rubric-compliance-audit.md` |
| Lecturer rubric compliance audit | — | — | Manual evidence-cited audit | `docs/final-rubric-compliance-audit.md` |
| Production deployment readiness | — | No hosting provider configured (verified by repo search) | — | `docs/production-deployment-guide.md`; `docs/production-environment-checklist.md` |
| Lecturer demonstration flow | — | — | — | `docs/final-presentation-demo-checklist.md` |

## Phase 16 — seller-declared brand creation

| Requirement | Implementation | Database/API source | Test evidence | Screenshot/report evidence |
|---|---|---|---|---|
| Seller can declare a new, unverified brand | `frontend/components/sell/BrandField.tsx`; `backend/services/brandService.js resolveOrCreateBrand` | `brands.source`/`verification_status`/`created_by` (migration `20260724000000_add_brand_provenance.sql`) | Phase 16 backend suite 38/38; browser suite 22/22 | `docs/seller-declared-brand-workflow.md` |
| Duplicate/concurrency protection | Atomic `INSERT ... ON CONFLICT (slug) DO NOTHING`; NFC-safe case-insensitive pre-check | `brands.slug` unique index | Live-verified: whitespace/case variant + a genuine concurrent race both resolved to one canonical row | `docs/seller-declared-brand-workflow.md` |
| Real Shop brand filter (was hardcoded) | `frontend/app/shop/page.tsx` + `ShopFilters.tsx`; `GET /api/brands?scope=shop-filter` | Only brands with ≥1 active product | Live-verified: new brand appeared and filtered correctly | `docs/final-rubric-compliance-audit.md` Phase 16 update |
| Unverified-brand disclosure | Product card, product detail, Review & Publish, Seller Dashboard edit | `products.brand_id` → `brands.verification_status` | Browser suite confirms disclosure text on all four surfaces | `docs/seller-declared-brand-workflow.md` |
