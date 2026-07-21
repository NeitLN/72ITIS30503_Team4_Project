# StyleHub Phase 15 — Sustainability Demo Data

This document is the operator manual and honesty record for the durable
demonstration dataset created for the final presentation. It exists so
anyone — a teammate, a lecturer, a future maintainer — can see exactly what
was created, why every account/listing/order is unmistakably labeled as
demo data, and how to reproduce or remove it safely.

## Why this exists

Phase 14 verified the Phase 11–13 sustainability implementation, but a
verified *implementation* is not the same as a *believable demo*: after
Phase 14's own QA cleanup, the development database's circular metrics were
factually zero (0 active circular listings, 0 completed circular units).
Phase 15 adds a small, permanent, honestly-labeled dataset so the lecturer
sees **real, non-zero Circular Impact numbers calculated by the actual
Phase 13 impact service from actual stored rows** — not screenshots, not
hand-edited totals, not a mocked API response.

## Namespace — how every demo row is identified

| What | Marker |
| --- | --- |
| Seller/buyer usernames | start with `stylehub-demo-` |
| Seller/buyer emails | on the reserved, non-routable `example.test` domain (RFC 2606 reserves the `example.` label; `.test` is an IANA-reserved TLD guaranteed to never resolve or accept mail) |
| Demo listing names | start with `Demo Circular — ` (so their auto-generated slug starts with `demo-circular-`) |
| Demo order notes | exactly `StyleHub Phase 15 sustainability demo order — course demonstration data, not a real transaction.` |
| Seller bios | end with `[Tài khoản dữ liệu demo StyleHub — không phải người dùng thật.]` |

The single source of truth for the namespace and every account/listing/order
definition is [`backend/data/sustainabilityDemoCatalog.js`](../backend/data/sustainabilityDemoCatalog.js).
`backend/scripts/cleanupSustainabilityDemo.js` re-derives this exact set
from the live database on every run — nothing is ever tracked by a cached ID
file.

Demo accounts are never presented as real customers. Demo listings/orders
are never presented as organic marketplace activity. Product Journey claims
on demo listings are `seller_declared` exactly like any real listing —
never certified, never independently verified.

## Commands

All commands run from the repository root, with the backend already running
(`npm run dev:backend`) and `backend/.env` containing
`SUPABASE_SERVICE_ROLE_KEY` + `STYLEHUB_AUTH_SECRET`.

```bash
# Preview only — no writes, safe to run any time
node backend/scripts/seedSustainabilityDemo.js --dry-run

# Create (or verify, if already created) the full dataset
node backend/scripts/seedSustainabilityDemo.js --apply

# Read-only correctness/namespace/honesty check, exits non-zero on failure
node backend/scripts/validateSustainabilityDemo.js

# Prove idempotency: rerun apply — must report 0 created, N existing
node backend/scripts/seedSustainabilityDemo.js --apply

# Preview exactly what a cleanup would remove (always safe)
node backend/scripts/cleanupSustainabilityDemo.js --dry-run

# Actually remove the namespaced dataset (NOT part of the normal workflow —
# Phase 15 data is meant to be retained for the lecturer demo)
node backend/scripts/cleanupSustainabilityDemo.js --apply --yes

# Backend regression suite covering all of the above end-to-end
node backend/phase15_sustainability_demo_test.js
```

### Credentials

Demo account passwords are **never** generated randomly and never written
to any file — they are deterministically derived at runtime from
`STYLEHUB_AUTH_SECRET` (`HMAC-SHA256("stylehub-phase15-demo-password:<username>")`),
so the seeder, validator, and test suite can always log back in without a
stored secret. To hand a password to a lecturer for a live login demo, run:

```bash
node backend/scripts/seedSustainabilityDemo.js --apply --show-credentials
```

This prints each demo account's email + derived password once, to your own
terminal only. Copy it before closing the terminal — it is not saved
anywhere, and rerunning the command reprints the same value (it is derived,
not random) as long as `STYLEHUB_AUTH_SECRET` in `backend/.env` is unchanged.

## Dataset — accounts

| Username | Role | Location | Bio marker |
| --- | --- | --- | --- |
| `stylehub-demo-seller-hanoi` | seller | Hà Nội | ends `... không phải người dùng thật.]` |
| `stylehub-demo-seller-hcmc` | seller | Thành phố Hồ Chí Minh | ends `... không phải người dùng thật.]` |
| `stylehub-demo-seller-danang` | seller | Đà Nẵng | ends `... không phải người dùng thật.]` |
| `stylehub-demo-buyer` | customer | Thành phố Hồ Chí Minh | ends `... không phải người dùng thật.]` |

## Dataset — listings (12) and lifecycle distribution

All demo listings are simple products (no variants) — see "Known
limitations" below for why. Prices are realistic VND resale prices.

| # | Title | Category | Brand | Lifecycle | Seller |
| --- | --- | --- | --- | --- | --- |
| 1 | Vans Old Skool Black | shoes | Vans | **pre_loved** | Hà Nội |
| 2 | Nike Air Force 1 Low White | shoes | Nike | **pre_loved** | Hà Nội |
| 3 | Adidas Stan Smith | shoes | Adidas | **deadstock** | Hà Nội |
| 4 | Dr. Martens 1460 Oxblood Boots | boots | Dr. Martens | **repaired** | Hà Nội |
| 5 | New Balance 550 Burgundy | shoes | New Balance | **deadstock** | TP.HCM |
| 6 | Birkenstock Arizona ESD | slides | Birkenstock | **pre_loved** | TP.HCM |
| 7 | Coach Tabby Quilted Shoulder Bag | bags | Coach | **repaired** | TP.HCM |
| 8 | Loop & Mend Shoulder Bag | crossbody-bags | *Loop & Mend Studio* (independent) | **upcycled** | TP.HCM |
| 9 | Levi's Canvas Carry-All Tote | bags | Levi's | **upcycled** | Đà Nẵng |
| 10 | Charles & Keith Gabine Saddle Bag | crossbody-bags | Charles & Keith | **pre_loved** | Đà Nẵng |
| 11 | Uniqlo U Crew Neck Tee | t-shirts | Uniqlo | new (comparison, non-circular) | Đà Nẵng |
| 12 | Ader Error Tetris Logo Tee | t-shirts | Ader Error | not_specified (comparison) | Đà Nẵng |

Lifecycle totals: **deadstock 2 · pre_loved 4 · repaired 2 · upcycled 2**
(10 circular listings), plus 1 `new` and 1 `not_specified` listing kept
deliberately for honest side-by-side comparison — StyleHub does not count
`new` as circular, and `not_specified` carries no lifecycle claim at all.

7 categories are represented (shoes, boots, slides, bags, crossbody-bags,
t-shirts), 11 existing catalog brands plus 1 independent/custom brand
(`Loop & Mend Studio`, created the same way any real seller creates a new
brand — free-text resolved by `brandService.resolveOrCreateBrand`), and
both sale (#2, #7) and non-sale, featured (#1, #7) and non-featured
listings.

**Why not 12–16:** 12 was the maximum count supportable by images that
passed direct visual inspection (not filename-based) without hotlinking,
without AI generation, and without reusing an image whose visible content
doesn't match the listing (see Image provenance below). This mirrors the
existing, already-documented Phase 6 finding in
[`frontend/public/images/products/IMAGE_SOURCES.md`](../frontend/public/images/products/IMAGE_SOURCES.md):
open-license sourcing has strong footwear/bag/accessory coverage and very
thin apparel coverage.

## Image provenance

Every demo listing image is an already-committed local static asset from
`frontend/public/images/products/` — never hotlinked, never AI-generated.

- **1 previously-unused asset**: `vans-old-skool-black.jpg`. It existed in
  the repository but was not part of the 148-product seed catalog manifest
  (`backend/scripts/data/verifiedCatalog.js`). Visually confirmed to show
  Vans Old Skool sneakers matching the filename before use.
- **11 reused seed-catalog images**, each already `VERIFIED_EXACT` or
  `VERIFIED_GENERIC` in the Phase 6 provenance record
  (`IMAGE_SOURCES.md`) and re-inspected visually in this phase before reuse.
  Each demo listing describes the *same real branded item* shown in that
  photo being resold/repaired/upcycled by a different (demo) seller than
  whichever round-robin seed account the catalog seeder assigned it to —
  the seed catalog rows themselves were never edited, relabeled, or
  touched. This means the same product photo can appear twice on the site
  (once under its seed catalog listing, once under a Phase 15 demo
  listing); this is documented here rather than hidden, and does not
  misrepresent either listing's content.
- **1 image was rejected during this phase's inspection**:
  `ergonomic-bagpack.jpg` (the original candidate for the independent-brand
  upcycled listing) visibly shows a real "Jeune Premier" hardware tag on
  close inspection, despite being filed as `VERIFIED_GENERIC` in the Phase 6
  record — using it under a different, unrelated custom brand name would
  have been dishonest. It was swapped for `loen-shoulder-bag.jpg` (plain,
  logo-free) instead. `ergonomic-bagpack.jpg` was not otherwise modified,
  removed, or reused, and no seed-catalog listing was changed.
- **1 candidate was excluded for being unreadable, not unsuitable**:
  `unisex-utility-shoulder-bag.jpg` is stored as AVIF content despite its
  `.jpg` extension; this environment could not decode/visually verify it
  (no image-conversion tool available), so per the "never choose an image
  from its filename alone" rule it was left unused rather than assumed
  acceptable.

After applying the dataset, every demo listing's image was verified to load
(`200`, no broken `<img>`) in the automated browser check described below.

## Demonstration orders and factual impact

Two orders are created through the **real** checkout path
(`POST /api/orders` → `stylehub_checkout_atomic`), the same per-item
fulfillment API real sellers use
(`PATCH /api/seller/orders/items/:id/fulfillment`), and the real cancel
endpoint (`POST /api/orders/:id/cancel`) — never a direct table write.

| Order | Buyer | Lines | Outcome |
| --- | --- | --- | --- |
| `completed-multiseller` | demo buyer | Vans Old Skool ×1 (Hà Nội seller), Coach Tabby ×1 (TP.HCM seller), Levi's Tote ×2 (Đà Nẵng seller) | driven through `awaiting_confirmation → confirmed → preparing → shipped → completed` on every item |
| `cancelled-exclusion` | demo buyer | Adidas Stan Smith ×1 (Hà Nội seller) | cancelled via the real cancel endpoint — proves cancelled items are excluded from completed impact |

This single completed order already spans **3 sellers** (multi-seller
checkout) and includes a **quantity-2 line** (Levi's tote) in the same
order, satisfying both requirements without needing a second completed
order. Idempotency keys are deterministic per order (derived from the order
key), so rerunning the seeder replays the same order via the checkout RPC's
own idempotent-replay guarantee instead of creating a duplicate.

## Before / after impact metrics

Source: `GET /api/sustainability/impact` (platform scope), calculated live
by `backend/services/impactService.js` — not hand-edited.

| Metric | Before — 2026-07-21T13:32:18.707Z | After — 2026-07-21T13:35:34.865Z |
| --- | ---: | ---: |
| Active user listings | 3 | 15 |
| Active journey-specified listings | 0 | 11 |
| Journey coverage | 0% | 73.3% |
| Active circular listings | 0 | 10 |
| Active breakdown (deadstock/pre_loved/repaired/upcycled) | 0/0/0/0 | 2/4/2/2 |
| Completed circular units | 0 | 4 |
| Completed breakdown (deadstock/pre_loved/repaired/upcycled) | 0/0/0/0 | 0/1/1/2 |
| Active seed catalog products | 148 | 148 (unchanged) |

Per-scope verification performed the same day (see the Phase 15 test suite
for the automated version of these checks):

- Seller `stylehub-demo-seller-hanoi` private impact: 4 active listings, 4
  circular, `circularUnitsSold: 1` (only the Vans item it sold).
- Seller `stylehub-demo-seller-hcmc` private impact: 4 active, 4 circular,
  `circularUnitsSold: 1` (only the Coach item it sold).
- Seller `stylehub-demo-seller-danang` private impact: 4 active, 2 circular
  + 1 `new` + 1 `not_specified`, `circularUnitsSold: 2` (the qty-2 Levi's
  line).
- Demo buyer private impact: 0 listings, `circularUnitsPurchased: 4` (the
  full completed total — the cancelled Adidas line is correctly excluded).
- Public storefront for `stylehub-demo-seller-hanoi`: exposes only
  `activeCircularListings`, `completedCircularUnitsSold`, and the active
  lifecycle breakdown — no buyer identity, order, address, or total field.
- A cross-seller intruder request could not read another seller's private
  metrics (unchanged Phase 13/14 privacy boundary — re-verified by the
  existing Phase 13/14 backend suites, not re-implemented here).

## Honest disclosure

- `/sustainability` — full disclosure panel, anchored `#demo-disclosure`,
  states StyleHub is a university course demonstration environment, that
  some accounts/listings/orders are prepared demo data, and restates that
  Product Journey is seller-declared and Circular Impact is not a certified
  environmental outcome.
- Homepage Circular Impact section — one short line linking to the same
  anchor, styled to match the existing panel (no new banner, no change to
  the section's visual hierarchy).
- `docs/circular-impact-methodology.md` — a "Demo environment (Phase 15)"
  section states the methodology does not treat demo rows specially: they
  are counted exactly like any other row, so this document is the place
  that explains why a non-zero metric isn't proof of organic activity.
- Every demo seller bio ends with the same explicit Vietnamese disclosure
  string, visible on every demo storefront page.

No CO2, water, landfill, carbon, waste, environmental score, or monetary
environmental-savings figure is computed, implied, or displayed anywhere in
this dataset or its documentation.

## Cleanup

Cleanup is namespace-scoped, resolves the exact row set fresh from the
database on every invocation (see
[`backend/scripts/cleanupSustainabilityDemo.js`](../backend/scripts/cleanupSustainabilityDemo.js)),
and refuses to proceed if any resolved row fails its own namespace safety
check.

```bash
node backend/scripts/cleanupSustainabilityDemo.js --dry-run   # always safe, prints exactly what would be removed
node backend/scripts/cleanupSustainabilityDemo.js --apply --yes
```

Dry-run result recorded during Phase 15 development: **4 users, 12
products, 2 orders** — exactly the manifest, nothing else. The Phase 15
workflow intentionally does **not** run the real cleanup — the dataset is
meant to be retained in the confirmed development Supabase project for the
lecturer demo.

## Known limitations

- All 12 demo listings are simple products. The seller-facing listing
  creation/edit APIs (`listingService.js`, `sellerListingService.js`) do
  not expose variant authoring at all (`product_variants` is read-only,
  populated only by the seed catalog) — creating a "variable" demo listing
  would have required building new, out-of-scope product functionality.
- `is_featured` is not settable through any seller-facing API (`/sell`
  hardcodes it `false`); the two featured demo listings were flagged with a
  direct, scoped `products.id = <exact demo product>` update after
  creation — the same mechanism the Phase 6 catalog seeder already uses,
  not a new capability.
- The same photo can appear on both a seed-catalog listing and a Phase 15
  demo listing (see Image provenance above) — documented, not hidden.
- This is development-database evidence from a single test pass, not a
  production load test or an independent sustainability audit.
