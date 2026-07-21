# StyleHub — Unified Seller Brand Entry

## Purpose

Lets an authenticated seller use a brand StyleHub's catalog doesn't have yet
when creating or editing a product, while keeping that brand honestly
labeled as seller-declared and unverified — never presented as an
independently checked, catalog-equivalent brand.

## User flow

1. Seller opens `/sell` (or edits an existing listing from
   `/seller/dashboard`) and uses one visible **Thương hiệu** combobox.
2. Typing filters existing suggestions by case-insensitive partial match;
   leading, trailing, and repeated whitespace are ignored.
3. Selecting a suggestion stores its canonical `brand_id`. If the seller
   edits the text so it no longer matches, that selected ID is cleared.
4. If no equivalent suggestion exists, the seller simply leaves the typed
   text in the same field and continues. There is no add button, second
   input, creation mode, or confirmation dialog.
5. No brand row is created while the seller types, leaves, or cancels the
   form. Resolution/creation happens only inside authenticated product
   creation or editing.
6. On submit, the backend normalizes and validates the name
   (`backend/services/brandService.js`).
7. If an equivalent brand already exists (case/whitespace/Unicode-form
   insensitive), that existing brand is used — never a duplicate.
8. Otherwise a new brand row is created with
   `source = 'seller_declared'`, `verification_status = 'pending'`,
   `created_by` = the authenticated seller's id.
9. The product is created/updated referencing that brand's real `id`.
10. The brand appears in the searchable Shop brand filter as soon as it has
    at least one active product (`GET /api/brands?scope=shop-filter`).
11. Review & Publish, Seller Dashboard editing, and Product Detail show the
    full disclosure *"Thương hiệu do người bán khai báo, chưa được StyleHub
    xác minh."* whenever `verification_status !== 'verified'`. Compact
    product cards (including Shop and public seller storefronts) keep the
    canonical brand name clean and expose the established unverified marker
    instead of repeating the full warning on every card.

No logo, website, country, founding year, description, social accounts,
trademark status, certification, or ownership information is ever
invented or fetched — only the seller-submitted name and system-recorded
metadata (`source`, `verification_status`, `created_by`, timestamps) are
stored.

## Routes

| Route | Change |
| --- | --- |
| `POST /api/products` | Accepts exactly one brand channel: canonical `brand_id` or free-text `new_brand_name`; resolves through `resolveBrandSelection(..., { createdBy: user.id })`. The legacy `brand_slug`/`brand` name channel remains compatible. |
| `PATCH /api/seller/listings/:id` | Same one-of contract via `sellerListingService.updateMyListing`. Omitting every brand field preserves the current brand. |
| `GET /api/brands` | Now also returns `source` and `verification_status` per brand. |
| `GET /api/brands?scope=shop-filter` | **New.** Returns only brands with ≥1 active product — the Shop filter's data source; never an empty-result option. |

## API payload shape (no credentials)

`POST /api/products` is `multipart/form-data`; the frontend sends exactly
one of these brand-relevant shapes:

```
brand_id: "<canonical UUID>"          // selected existing suggestion

// OR
new_brand_name: "Loop & Mend Studio" // ordinary unselected text
```

The UI still contains only one field. The two payload channels preserve the
secure internal distinction between a selected canonical row and raw text.
Sending both is rejected with `422`; neither channel takes precedence. Even
`new_brand_name` is authoritative only as text: the backend rechecks for an
equivalent existing row before creating anything, so typing ` NIKE ` cannot
force a duplicate. An empty/omitted value preserves the existing supported
"Không có thương hiệu" behavior.

Older clients may still send `brand_slug` or `brand` as a single free-text
name. These compatibility fields cannot be combined with either new channel.

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
over-length (>60 chars), symbols-only names, email-only values, and URL-only
values — with Vietnamese field errors (e.g.
`Tên thương hiệu không được chứa mã HTML.`,
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

`app/shop/page.tsx` calls `getShopFilterBrands()` once on the server and gives
`ShopFilters.tsx` the complete active-brand dataset. The client-side
combobox filters that set by normalized partial substring without issuing a
request for every keystroke. It has loading/error/empty messaging and shows
`(chưa xác minh)` for pending suggestions.

Only selecting an option changes product results. Selection writes the
brand's stable slug to `brand=<slug>`, preserves unrelated filters, resets
pagination, and remains synchronized through refresh and browser
Back/Forward. The temporary search text is not written to the URL. Clearing
the selected brand removes only `brand`; clear-all retains its existing
behavior.

Example: Seller A enters `ABC Studio` and publishes Product B. If the brand
does not exist, submission creates one `seller_declared`/`pending` row and
Product B references it. Buyer C types `abc` in the Shop brand search,
selects `ABC Studio (chưa xác minh)`, and the URL-backed filter returns
Product B.

## Editing behavior

- The saved canonical `brand_id` and display name initialize the same unified
  field, so an unrelated edit reuses the existing row and creates nothing.
- Switching to an existing suggestion sends its `brand_id`.
- Replacing it with unmatched text sends `new_brand_name` and creates or
  resolves a `seller_declared`/`pending` row exactly as at creation time.
- Clearing sends an empty free-text value and restores the supported
  unbranded state.
- Omitting the field entirely leaves `brand_id`/`brand` unchanged (existing
  Phase 9 no-op-preserves-current behavior, re-verified this session).

## Test commands

```bash
# Backend (requires the backend running and backend/.env configured)
node backend/phase16_seller_brand_test.js

# Browser (requires backend on :8080 and a running frontend; defaults to :3000)
python frontend/phase16_seller_brand_e2e.py

# Use a different local frontend port when needed
PHASE_WEB_BASE=http://localhost:3001 python frontend/phase16_seller_brand_e2e.py
```

Both register their own disposable, namespaced accounts/brands at runtime
(`stylehub-brand-test-*` brand names, `phase16-*` emails) with in-memory
random passwords never written to any file, and clean up by exact captured
ID in a `finally`/end-of-run step — never a broad delete.

## Known limitations

- Shop brand suggestions use the complete active-brand dataset returned by
  the current endpoint. This avoids per-keystroke requests and is appropriate
  for the present catalog size; a future very large catalog may move the same
  normalized search contract server-side.
- The server-rendered Shop brand list uses `cache: 'no-store'` so a
  just-published active brand is immediately searchable. Typing still filters
  the already-loaded option dataset in the browser and does not issue a
  request for every keystroke.
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
