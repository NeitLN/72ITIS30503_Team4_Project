# StyleHub Phase 15 — Sustainability Demo Data

This document is the operator manual and honesty record for the durable
dataset created for the final presentation. It exists so anyone — a
teammate, a lecturer, a future maintainer — can see exactly what was
created, how it is identified and safely removable, and how to reproduce
it, even though none of it is labeled "demo"/"test"/"sample" in the
product itself (see "Customer-facing presentation" below).

## Why this exists

Phase 14 verified the Phase 11–13 sustainability implementation, but a
verified *implementation* is not the same as a *believable storefront*:
after Phase 14's own QA cleanup, the development database's circular
metrics were factually zero (0 active circular listings, 0 completed
circular units). Phase 15 adds a small, permanent dataset so the lecturer
sees **real, non-zero Circular Impact numbers calculated by the actual
Phase 13 impact service from actual stored rows** — not screenshots, not
hand-edited totals, not a mocked API response.

## Customer-facing presentation

A shopper, seller, or lecturer browsing the live site sees three ordinary
resale shops ("Rewear" in Hà Nội, Sài Gòn, and Đà Nẵng) and one ordinary
buyer, selling ordinary-looking secondhand/deadstock fashion items. There
is no "Demo"/"Test"/"Sample" wording anywhere in a product title,
description, seller display name, username, or bio. The only place this
dataset's academic nature is disclosed is the dedicated, centrally-placed
`/sustainability` methodology page (see "Honest disclosure" below) — it is
not repeated on every product card or profile, per the project's own
"don't over-label ordinary listings" guidance.

## Namespace — how every record is identified

Because nothing here is visibly labeled, identification is **relational**,
not name-based:

| What | How it's identified |
| --- | --- |
| Accounts | Their email is exactly one of the 4 addresses in `DEMO_ACCOUNTS` (`backend/data/sustainabilityDemoCatalog.js`), all on the reserved, non-routable `example.test` domain (RFC 2606 reserves the `example.` label; `.test` is an IANA-reserved TLD guaranteed to never resolve or accept mail — never shown to anyone). |
| Listings | `products.seller_id` belongs to one of those 4 accounts AND `listing_source = 'user'`. |
| Orders | `orders.user_id` belongs to one of those 4 accounts. |

The single source of truth for every account/listing/order definition is
[`backend/data/sustainabilityDemoCatalog.js`](../backend/data/sustainabilityDemoCatalog.js).
`backend/scripts/cleanupSustainabilityDemo.js` re-derives the exact current
row set from the live database on every run by exact email match — nothing
is ever tracked by a cached ID file, and no partial-name match is used
anywhere in the resolution path.

Demo accounts are never presented as real customers. Demo listings/orders
are never presented as organic marketplace activity to anyone who already
knows to look for them (this document, the methodology page, and the
source code are the honest record) — but they are also never visually
distinguished from an ordinary listing on the storefront itself, which is
the specific correction this revision makes (see "Naming revision" below).
Product Journey claims on these listings are `seller_declared` exactly
like any real listing — never certified, never independently verified.

## Naming revision (this update)

An earlier revision of this dataset used visible `stylehub-demo-*`
usernames and a literal `"Demo Circular — "` product-name prefix as BOTH
the identification marker AND the customer-facing text — so a shopper
browsing `/shop` or a seller's storefront would see "Demo Circular — Vans
Old Skool Black" and "@stylehub-demo-seller-danang" directly. This read as
placeholder/test content rather than a real marketplace, so it was
replaced:

| Old (visible) | New (visible) |
| --- | --- |
| `@stylehub-demo-seller-hanoi`, display name "StyleHub Demo Seller — Hà Nội" | `@rewear-hanoi`, display name "Rewear Hà Nội" |
| `@stylehub-demo-seller-hcmc`, "StyleHub Demo Seller — TP. Hồ Chí Minh" | `@rewear-saigon`, "Rewear Sài Gòn" |
| `@stylehub-demo-seller-danang`, "StyleHub Demo Seller — Đà Nẵng" | `@rewear-danang`, "Rewear Đà Nẵng" |
| `@stylehub-demo-buyer`, "StyleHub Demo Buyer" | `@bao-tram`, "Bảo Trâm" |
| Every bio ending `[Tài khoản dữ liệu demo StyleHub — không phải người dùng thật.]` | Ordinary shop/customer bios with no disclosure suffix |
| Every listing name prefixed `"Demo Circular — "` (slug `demo-circular-...`) | Plain realistic titles (e.g. "Vans Old Skool Black (Pre-loved)"), slug regenerated to match |
| Descriptions/stories containing "Dữ liệu demo StyleHub", "Người bán demo khai báo", "so sánh — không thuộc vòng lặp tuần hoàn" | Ordinary marketplace description/story text with the same honest facts, no meta commentary |

The lifecycle parenthetical (Pre-loved/Deadstock/Repaired/Upcycled) in
titles was **kept** — that's a normal resale-marketplace convention (the
same lifecycle badges shown elsewhere on the site), not test/demo wording.

Usernames use hyphens (`rewear-hanoi`), not dots, because this app's
username format only allows lowercase letters, digits, `_`, and `-`
(`backend/services/profileService.js`); emails keep dots
(`rewear.hanoi@example.test`) since that's a normal email shape and is
never shown to anyone but the account holder.

**Migrating already-retained data:** `backend/scripts/seedSustainabilityDemo.js`'s
`--apply` mode runs a `migrateLegacyIdentities()` step before its normal
ensure logic. It finds any row still on the old naming (by the exact old
email pattern for accounts, by the exact old slug prefix for listings),
renames it *in place* (same row id, so every FK — products, orders,
images, journeys, order snapshots — is preserved automatically), and
re-hashes the login password to match the new username-derived value. It
is a safe no-op once nothing old-style remains — verified by running
`--apply` twice in a row during this update (second run reported zero
migrations, zero new rows).

## Commands

All commands run from the repository root, with the backend already running
(`npm run dev:backend`) and `backend/.env` containing
`SUPABASE_SERVICE_ROLE_KEY` + `STYLEHUB_AUTH_SECRET`.

```bash
# Preview only — no writes, safe to run any time
node backend/scripts/seedSustainabilityDemo.js --dry-run

# Create (or verify/migrate, if already created) the full dataset
node backend/scripts/seedSustainabilityDemo.js --apply

# Read-only correctness/namespace/honesty check, exits non-zero on failure
node backend/scripts/validateSustainabilityDemo.js

# Prove idempotency: rerun apply — must report 0 created, N existing
node backend/scripts/seedSustainabilityDemo.js --apply

# Preview exactly what a cleanup would remove (always safe)
node backend/scripts/cleanupSustainabilityDemo.js --dry-run

# Actually remove the dataset (NOT part of the normal workflow — this data
# is meant to be retained for the lecturer demo)
node backend/scripts/cleanupSustainabilityDemo.js --apply --yes

# Backend regression suite covering all of the above end-to-end
node backend/phase15_sustainability_demo_test.js
```

The validator and the Phase 15 test suite both scan every visible field
(listing name/description/slug, account username/display name/bio, Product
Journey material/repair_history/upcycle_details/product_story) for the
word-bounded pattern `\b(demo|test|sample)\b` and fail if any match is
found — this is the automated guarantee behind "no visible demo/test/sample
wording," not just a one-time manual check.

### Credentials

Account passwords are **never** generated randomly and never written to
any file — they are deterministically derived at runtime from
`STYLEHUB_AUTH_SECRET` (`HMAC-SHA256("stylehub-phase15-demo-password:<username>")`,
using the *current* username), so the seeder, validator, and test suite can
always log back in without a stored secret. To hand a password to a
lecturer for a live login demo, run:

```bash
node backend/scripts/seedSustainabilityDemo.js --apply --show-credentials
```

This prints each account's email + derived password once, to your own
terminal only. Copy it before closing the terminal — it is not saved
anywhere, and rerunning the command reprints the same value (it is derived,
not random) as long as `STYLEHUB_AUTH_SECRET` in `backend/.env` is unchanged.

## Dataset — accounts

| Username | Display name | Role | Location |
| --- | --- | --- | --- |
| `rewear-hanoi` | Rewear Hà Nội | seller | Hà Nội |
| `rewear-saigon` | Rewear Sài Gòn | seller | Thành phố Hồ Chí Minh |
| `rewear-danang` | Rewear Đà Nẵng | seller | Đà Nẵng |
| `bao-tram` | Bảo Trâm | customer | Thành phố Hồ Chí Minh |

## Dataset — listings (12) and lifecycle distribution

All listings are simple products (no variants) — see "Known limitations"
below for why. Prices are realistic VND resale prices.

| # | Title | Category | Brand | Lifecycle | Seller |
| --- | --- | --- | --- | --- | --- |
| 1 | Vans Old Skool Black (Pre-loved) | shoes | Vans | **pre_loved** | Rewear Hà Nội |
| 2 | Nike Air Force 1 Low White (Pre-loved) | shoes | Nike | **pre_loved** | Rewear Hà Nội |
| 3 | Adidas Stan Smith (Deadstock) | shoes | Adidas | **deadstock** | Rewear Hà Nội |
| 4 | Dr. Martens 1460 Oxblood Boots (Repaired) | boots | Dr. Martens | **repaired** | Rewear Hà Nội |
| 5 | New Balance 550 Burgundy (Deadstock) | shoes | New Balance | **deadstock** | Rewear Sài Gòn |
| 6 | Birkenstock Arizona ESD (Pre-loved) | slides | Birkenstock | **pre_loved** | Rewear Sài Gòn |
| 7 | Coach Tabby Quilted Shoulder Bag (Repaired) | bags | Coach | **repaired** | Rewear Sài Gòn |
| 8 | Loop & Mend Shoulder Bag (Upcycled) | crossbody-bags | *Loop & Mend Studio* (independent) | **upcycled** | Rewear Sài Gòn |
| 9 | Levi's Canvas Carry-All Tote (Upcycled) | bags | Levi's | **upcycled** | Rewear Đà Nẵng |
| 10 | Charles & Keith Gabine Saddle Bag (Pre-loved) | crossbody-bags | Charles & Keith | **pre_loved** | Rewear Đà Nẵng |
| 11 | Uniqlo U Crew Neck Tee (New) | t-shirts | Uniqlo | new (comparison, non-circular) | Rewear Đà Nẵng |
| 12 | Ader Error Tetris Logo Tee | t-shirts | Ader Error | not_specified (comparison) | Rewear Đà Nẵng |

Lifecycle totals: **deadstock 2 · pre_loved 4 · repaired 2 · upcycled 2**
(10 circular listings), plus 1 `new` and 1 `not_specified` listing kept
deliberately for honest side-by-side comparison — StyleHub does not count
`new` as circular, and `not_specified` carries no lifecycle claim at all.
Titles #11/#12 previously carried a parenthetical meta-comment ("so sánh —
không thuộc vòng lặp tuần hoàn" / "so sánh") explaining their comparison
role — that commentary has been removed from the visible title; the
comparison rationale now lives only in this document and in the lifecycle
badge/methodology copy, not in the product name itself.

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

Every listing image is an already-committed local static asset from
`frontend/public/images/products/` — never hotlinked, never AI-generated.

- **1 previously-unused asset**: `vans-old-skool-black.jpg`. It existed in
  the repository but was not part of the 148-product seed catalog manifest
  (`backend/scripts/data/verifiedCatalog.js`). Visually confirmed to show
  Vans Old Skool sneakers matching the filename before use.
- **11 reused seed-catalog images**, each already `VERIFIED_EXACT` or
  `VERIFIED_GENERIC` in the Phase 6 provenance record
  (`IMAGE_SOURCES.md`) and re-inspected visually before reuse. Each listing
  describes the *same real branded item* shown in that photo being
  resold/repaired/upcycled by a different seller than whichever
  round-robin seed account the catalog seeder assigned it to — the seed
  catalog rows themselves were never edited, relabeled, or touched. This
  means the same product photo can appear twice on the site (once under
  its seed catalog listing, once under one of these listings); this is
  documented here rather than hidden, and does not misrepresent either
  listing's content.
- **1 image was rejected during inspection**: `ergonomic-bagpack.jpg` (the
  original candidate for the independent-brand upcycled listing) visibly
  shows a real "Jeune Premier" hardware tag on close inspection, despite
  being filed as `VERIFIED_GENERIC` in the Phase 6 record — using it under
  a different, unrelated custom brand name would have been dishonest. It
  was swapped for `loen-shoulder-bag.jpg` (plain, logo-free) instead.
  `ergonomic-bagpack.jpg` was not otherwise modified, removed, or reused,
  and no seed-catalog listing was changed.
- **1 candidate was excluded for being unreadable, not unsuitable**:
  `unisex-utility-shoulder-bag.jpg` is stored as AVIF content despite its
  `.jpg` extension; this environment could not decode/visually verify it
  (no image-conversion tool available), so per the "never choose an image
  from its filename alone" rule it was left unused rather than assumed
  acceptable.

After applying the dataset, every listing's image was verified to load
(`200`, no broken `<img>`) in the automated browser check described below.

## Demonstration orders and factual impact

Two orders are created through the **real** checkout path
(`POST /api/orders` → `stylehub_checkout_atomic`), the same per-item
fulfillment API real sellers use
(`PATCH /api/seller/orders/items/:id/fulfillment`), and the real cancel
endpoint (`POST /api/orders/:id/cancel`) — never a direct table write.

| Order | Buyer | Lines | Outcome |
| --- | --- | --- | --- |
| `completed-multiseller` | Bảo Trâm | Vans Old Skool ×1 (Rewear Hà Nội), Coach Tabby ×1 (Rewear Sài Gòn), Levi's Tote ×2 (Rewear Đà Nẵng) | driven through `awaiting_confirmation → confirmed → preparing → shipped → completed` on every item |
| `cancelled-exclusion` | Bảo Trâm | Adidas Stan Smith ×1 (Rewear Hà Nội) | cancelled via the real cancel endpoint — proves cancelled items are excluded from completed impact |

This single completed order already spans **3 sellers** (multi-seller
checkout) and includes a **quantity-2 line** (Levi's tote) in the same
order, satisfying both requirements without needing a second completed
order. Idempotency keys are deterministic per order (derived from the order
key), so rerunning the seeder replays the same order via the checkout RPC's
own idempotent-replay guarantee instead of creating a duplicate. Because
this update also changed the buyer's checkout display name/address/notes,
a rerun's replay attempt correctly comes back as a idempotency-key/content
conflict (proving the RPC's anti-replay-with-different-content protection
still works) rather than a silent duplicate; the seeder resolves the real
order id from `checkout_idempotency` and patches only the cosmetic display
fields (`customer_name`, `shipping_address`, `notes`) directly — never
`order_items`, snapshots, totals, or inventory.

## Before / after impact metrics

Source: `GET /api/sustainability/impact` (platform scope), calculated live
by `backend/services/impactService.js` — not hand-edited. These are the
original Phase 15 figures; the naming revision in this update changed no
listing's lifecycle, price, quantity, or order state, so the numbers are
unchanged by it.

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

Per-scope verification (re-confirmed after the naming revision):

- Seller `rewear-hanoi` private impact: 4 active listings, 4 circular,
  `circularUnitsSold: 1` (only the Vans item it sold).
- Seller `rewear-saigon` private impact: 4 active, 4 circular,
  `circularUnitsSold: 1` (only the Coach item it sold).
- Seller `rewear-danang` private impact: 4 active, 2 circular + 1 `new` +
  1 `not_specified`, `circularUnitsSold: 2` (the qty-2 Levi's line).
- Buyer `bao-tram` private impact: 0 listings, `circularUnitsPurchased: 4`
  (the full completed total — the cancelled Adidas line is correctly
  excluded).
- Public storefront for `rewear-hanoi`: exposes only
  `activeCircularListings`, `completedCircularUnitsSold`, and the active
  lifecycle breakdown — no buyer identity, order, address, or total field.
- A cross-seller intruder request could not read another seller's private
  metrics (unchanged Phase 13/14 privacy boundary — re-verified by the
  existing Phase 13/14 backend suites, not re-implemented here).

## Honest disclosure

- `/sustainability` — an "About this data" panel (anchored
  `#sustainability-disclosure`) states StyleHub is currently a university
  coursework project, that some marketplace activity was prepared to
  populate Circular Impact for academic purposes, and restates that
  Product Journey is seller-declared and Circular Impact is not a
  certified environmental outcome. This is the **only** place the
  academic nature of the data is disclosed — deliberately not repeated on
  every product card, storefront, or the homepage, so ordinary browsing
  reads as an ordinary marketplace.
- `docs/circular-impact-methodology.md` — states the methodology does not
  treat this dataset specially: rows are counted exactly like any other
  row, so this document is the place that explains why a non-zero metric
  isn't proof of purely organic activity.

No CO2, water, landfill, carbon, waste, environmental score, or monetary
environmental-savings figure is computed, implied, or displayed anywhere in
this dataset or its documentation.

## Cleanup

Cleanup is relationally scoped, resolves the exact row set fresh from the
database on every invocation (see
[`backend/scripts/cleanupSustainabilityDemo.js`](../backend/scripts/cleanupSustainabilityDemo.js)),
and refuses to proceed if any resolved row fails its own namespace safety
check.

```bash
node backend/scripts/cleanupSustainabilityDemo.js --dry-run   # always safe, prints exactly what would be removed
node backend/scripts/cleanupSustainabilityDemo.js --apply --yes
```

Dry-run result recorded during this update: **4 users, 12 products, 2
orders** — exactly the manifest, nothing else. The normal workflow
intentionally does **not** run the real cleanup — the dataset is meant to
be retained in the confirmed development Supabase project for the
lecturer demo.

## Known limitations

- All 12 listings are simple products. The seller-facing listing
  creation/edit APIs (`listingService.js`, `sellerListingService.js`) do
  not expose variant authoring at all (`product_variants` is read-only,
  populated only by the seed catalog) — creating a "variable" listing
  would have required building new, out-of-scope product functionality.
- `is_featured` is not settable through any seller-facing API (`/sell`
  hardcodes it `false`); the two featured listings were flagged with a
  direct, scoped `products.id = <exact product>` update after creation —
  the same mechanism the Phase 6 catalog seeder already uses, not a new
  capability.
- The same photo can appear on both a seed-catalog listing and one of
  these listings (see Image provenance above) — documented, not hidden.
- This is development-database evidence from a single test pass, not a
  production load test or an independent sustainability audit.
