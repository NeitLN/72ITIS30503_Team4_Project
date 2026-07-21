# StyleHub — Seller-Declared Brand Creation

## Purpose

Lets an authenticated seller use a brand StyleHub's catalog doesn't have yet
when creating or editing a product, while keeping that brand honestly
labeled as seller-declared and unverified — never presented as an
independently checked, catalog-equivalent brand.

## User flow

1. Seller opens `/sell` (or edits an existing listing from
   `/seller/dashboard`) and reaches the brand field.
2. Seller searches the existing brand list via the combobox
   (`frontend/components/sell/BrandField.tsx`).
3. If not found, the seller clicks **"Không tìm thấy thương hiệu? Thêm
   thương hiệu mới"**, which reveals a dedicated new-brand text input (not
   silent free-text typed into the search box) plus the disclosure:
   *"Thương hiệu mới sẽ được ghi nhận là do người bán khai báo và chưa được
   StyleHub xác minh."* A "Hủy, quay lại chọn thương hiệu có sẵn" link
   returns to search mode.
4. On submit, the backend normalizes and validates the name
   (`backend/services/brandService.js`).
5. If an equivalent brand already exists (case/whitespace/Unicode-form
   insensitive), that existing brand is used — never a duplicate.
6. Otherwise a new brand row is created with
   `source = 'seller_declared'`, `verification_status = 'pending'`,
   `created_by` = the authenticated seller's id.
7. The product is created/updated referencing that brand's real `id`.
8. The brand appears in the Shop brand filter as soon as it has at least
   one active product (`GET /api/brands?scope=shop-filter`).
9. Every surface that shows the brand (Review & Publish, Seller Dashboard
   edit, product card, product detail, public seller storefront via the
   product) also shows *"Thương hiệu do người bán khai báo, chưa được
   StyleHub xác minh."* whenever `verification_status !== 'verified'`.

No logo, website, country, founding year, description, social accounts,
trademark status, certification, or ownership information is ever
invented or fetched — only the seller-submitted name and system-recorded
metadata (`source`, `verification_status`, `created_by`, timestamps) are
stored.

## Routes

| Route | Change |
| --- | --- |
| `POST /api/products` | Accepts `brand_slug` (free-text brand name); resolves/creates via `resolveOrCreateBrand(name, { createdBy: user.id })`. Unchanged request shape from Phase 7/8.1. |
| `PATCH /api/seller/listings/:id` | Same, via `sellerListingService.updateMyListing`. Omitting the field preserves the current brand. |
| `GET /api/brands` | Now also returns `source` and `verification_status` per brand. |
| `GET /api/brands?scope=shop-filter` | **New.** Returns only brands with ≥1 active product — the Shop filter's data source; never an empty-result option. |

## API payload shape (no credentials)

`POST /api/products` is `multipart/form-data`; the brand-relevant fields:

```
brand_slug: "Loop & Mend Studio"     // free text — existing OR new name
```

There is deliberately **one** brand field, not a separate `brand_id` +
`new_brand_name` pair — an unambiguous payload was preferred over a
dual-field shape that would need its own precedence rule for "what if both
are sent." The backend resolves existing-vs-new by database lookup, not by
a client-declared intent, so a client cannot claim "this is new" to force
creation of a duplicate.

`created_by`, `source`, and `verification_status` are **never** accepted
from the client in any field, form field, or nested object — see
"Authorization" below.

## Database fields (`public.brands`)

Migration: `supabase/migrations/20260724000000_add_brand_provenance.sql`.

| Column | Type | Meaning |
| --- | --- | --- |
| `source` | `text` (check: `catalog` \| `seller_declared`) | `catalog` for every existing curated brand; `seller_declared` for anything created through `resolveOrCreateBrand`'s create path |
| `verification_status` | `text` (check: `verified` \| `pending` \| `rejected`) | `verified` for the existing 52 catalog brands; a brand this feature creates is always `pending` |
| `created_by` | `uuid`, FK → `public.users(id) on delete set null` | The authenticated seller who first typed the name; `null` for catalog rows |

`slug` (already existed, unique) remains the durable canonical identity —
no new normalized-name column was added, since `slug` already NFD-strips
diacritics and collapses case/whitespace/punctuation into a single
deterministic key, and the database-level `unique` constraint on it is
exactly what makes duplicate prevention race-safe (see below).

**Backward compatibility:** every pre-existing brand row defaulted to
`source='catalog'`, `verification_status='verified'` — the same status
quo they already had in practice. `products.brand_id` and every brand's
`name`/`slug`/`id` were left untouched. One row was corrected: `Loop & Mend
Studio` (created via this same free-text path during Phase 15, before this
migration existed) was updated to `seller_declared`/`pending` by exact
slug match — a one-time honesty correction, not a broad update.

**Rollback:** `alter table public.brands drop column if exists source, drop
column if exists verification_status, drop column if exists created_by;`
removes only the provenance labels — no brand, product, or FK relationship
is affected.

## Normalization rules (`backend/services/brandService.js`)

`normalizeForCompare(name)`:
1. Unicode-normalizes to NFC (so a name typed with combining marks compares
   equal to the same name typed precomposed — Vietnamese-safe).
2. Trims and collapses internal whitespace.
3. Case-folds.

It does **not** strip diacritics for the equality check — `"Đế"` and
`"De"` remain distinct. Diacritics *are* stripped at the `slug` layer
(`slugifyBrand`, unchanged from Phase 8.1), which is intentional: the slug
is a URL-safe key, not the honesty-relevant identity comparison.

Validation (`validateBrandInput`) rejects: control characters, HTML tags,
over-length (>60 chars), and symbols-only names — with Vietnamese field
errors (e.g. `Tên thương hiệu không được chứa mã HTML.`,
`Tên thương hiệu tối đa 60 ký tự.`).

## Duplicate and concurrency protection

Unchanged from the Phase 8.1 mechanism, now carrying the new columns:

1. An in-app case/NFC-insensitive lookup against all active brands returns
   an existing match immediately (fast path, also returns its real
   `source`/`verification_status` — never re-creates it).
2. If no match, `INSERT ... ON CONFLICT (slug) DO NOTHING` (via
   `.upsert(..., { onConflict: 'slug', ignoreDuplicates: true })`) is the
   actual race-safe boundary — atomic at the Postgres level, not a
   check-then-insert race. Two concurrent requests for the same normalized
   name both attempt this; exactly one wins the insert.
3. The loser re-selects by `slug` and gets the winner's row (including its
   `created_by`/casing) — never a second row, never an error.

Verified live this session: two simultaneous `POST /api/products` requests
for the same new brand name (different case) from two different sellers
resolved to exactly one canonical brand row.

**Ordering fix (this feature):** `resolveOrCreateBrand` is now called
*after* every field/category/file validation and *after* the image upload
succeeds in `listingService.createListing` (previously it ran first) — a
request that was always going to fail validation can no longer create an
orphaned brand row first. See "Known limitations" for the one remaining
rare edge case.

## Authorization

- `POST /api/products` and `PATCH /api/seller/listings/:id` both require
  `authenticateUser` + `requireAuth` (an anonymous request is rejected with
  401 before any brand logic runs — verified live this session).
- This app has **no distinct seller-only role gate** on listing creation —
  any authenticated user (customer or seller role) may list a product,
  which was true before this feature and is unchanged by it (verified by
  reading `routes/products.js` / `middleware/auth.js`). The safety property
  this feature adds is: a customer-role account's created brand is always
  attributed to *that same account* (`created_by`), never elevated to
  `verified`/`catalog`, and never attributed to anyone else.
- `created_by` comes exclusively from the verified `req.user.id` (the
  backend's own signed session token) — never from the request body. There
  is no field name the client can send that reaches `brands.created_by`,
  `source`, or `verification_status`; `resolveOrCreateBrand` only ever
  accepts a plain string for the brand name itself, and coerces any
  non-string input (e.g. an injected object) to a harmless string via
  `String(...)` rather than reading its properties.

## Verification-status behavior

- Every brand seeded by `backend/scripts/seedVerifiedCatalog.js` is
  `catalog`/`verified`.
- Every brand created by a seller through `/sell` or listing edit is
  `seller_declared`/`pending` — permanently, until a future moderation
  action changes it (none exists yet; see below).
- `rejected` is modeled in the schema for a future moderation workflow but
  nothing in this feature sets it.

## Shop filter integration

`app/shop/page.tsx` now calls `getShopFilterBrands()` (real, server-side,
same pattern as categories) instead of the previous hardcoded 11-brand
list in `ShopFilters.tsx` (which included brands like `bitis`/`ananas`/
`zara` that don't even exist in the catalog, and never picked up a new
brand). The dropdown now shows every brand with ≥1 active product,
suffixed `(chưa xác minh)` for pending ones, and filtering by `brand=<slug>`
is unchanged (`productService.js` already filtered by real `brand_id`
resolved from the slug). URL synchronization and browser Back/Forward are
unaffected — verified live this session.

## Editing behavior

- Switching to an existing brand: `PATCH` with `brand_slug` set to another
  real brand's name resolves to that brand's `id`.
- Declaring a new brand: same field, a name with no existing match —
  creates a `seller_declared`/`pending` row exactly as at creation time.
- Omitting the field entirely leaves `brand_id`/`brand` unchanged (existing
  Phase 9 no-op-preserves-current behavior, re-verified this session).

## Test commands

```bash
# Backend (requires the backend running and backend/.env configured)
node backend/phase16_seller_brand_test.js

# Browser (requires backend on :8080 and a built, running frontend on :3000)
python frontend/phase16_seller_brand_e2e.py
```

Both register their own disposable, namespaced accounts/brands at runtime
(`stylehub-brand-test-*` brand names, `phase16-*` emails) with in-memory
random passwords never written to any file, and clean up by exact captured
ID in a `finally`/end-of-run step — never a broad delete.

## Known limitations

- A brand created via this feature can never become `verified` through any
  code path in this repository — there is no moderation UI yet (by
  design; see below).
- A rare orphan-brand window still technically exists: if image upload
  succeeds but the subsequent product `INSERT` itself fails (a true
  database-level failure, not a validation failure), the just-created
  brand row is not rolled back. This is low-impact (an unused `pending`
  brand with zero products never surfaces in the Shop filter, and a retry
  with the same name reuses it rather than duplicating it) and was judged
  not worth a full transactional rewrite (e.g. a dedicated Postgres RPC
  mirroring the atomic-checkout pattern) for this feature's scope.
- No rate limiting was added — this repository has no existing
  request-rate-limiting middleware to extend, and adding a new dependency
  solely for this feature was judged out of scope.
- The pre-existing logged-out `/sell` page renders two `<h1>` elements
  (a marketing hero heading plus the sign-in gate heading). This was
  observed during this feature's responsive QA pass but predates this
  feature (the gate JSX was not touched) and is out of scope here.

## Moderation recommendations (future work, not implemented)

The schema is ready for a moderation workflow without further migration:
- **Approve**: `update brands set verification_status = 'verified' where id = ...` (by an admin-authenticated route, not yet built — this repo currently has no admin brand-management UI to extend).
- **Reject**: `verification_status = 'rejected'`; the app would then need a rule for what happens to products still referencing a rejected brand (not designed here).
- **Rename**: update `name`/`slug` directly — existing products keep the same `brand_id`, so a rename is automatically reflected everywhere.
- **Merge duplicates**: repoint affected `products.brand_id` rows to the canonical brand, then delete the duplicate — needs its own script mirroring `backend/scripts/cleanupSustainabilityDemo.js`'s exact-ID-scoped-delete pattern.

None of these were built now — Phase 16 intentionally stops at "create the
data model and mark provenance," per its own scope.
