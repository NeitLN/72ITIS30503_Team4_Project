# Restoring StyleHub's Supabase Project From Snapshot

This project's live Supabase database and storage were snapshotted into
`supabase/snapshot/` on 2026-08-09, immediately before the original Supabase
project was deleted (course submission was complete; the project was deleted
to free up a slot on the free tier). Everything needed to bring the app back
to that exact state — full data, not just the seed migrations — lives in
this repo. Follow these steps when you need to revive it (e.g. for a job
interview demo).

Design rationale: [docs/superpowers/specs/2026-08-09-supabase-snapshot-design.md](superpowers/specs/2026-08-09-supabase-snapshot-design.md).

## What's in the snapshot

- `supabase/snapshot/data.sql` — a `public`-schema-only, data-only dump
  (`supabase db dump --data-only --schema public --linked`) of every table,
  taken at snapshot time: 188 products, 255 users, 47 orders, 27 categories,
  57 brands, and everything else in `public`.
- `supabase/snapshot/storage/product-images/` — 152 files (~6.9 MB), the full
  contents of the `product-images` bucket.
- `supabase/snapshot/storage/avatars/` — 20 files (~0.55 MB), the full
  contents of the `avatars` bucket.
- The `dispute-evidence` bucket was never created on the live project, so
  there's nothing to restore for it — `setupDisputeEvidenceBucket.js` will
  create it empty if/when you need it.
- `auth.*` and `storage.*` schemas were deliberately **excluded** from the
  dump: this app doesn't use real Supabase Auth (a custom token system is
  authoritative — see `stylehub-phase7-seller-listings` project notes), and
  those schemas are managed by Supabase itself, so inserting into them on a
  fresh project risks breaking its managed auth/storage services for no
  benefit.

## Prerequisites

- Supabase CLI installed (`npx supabase --version`).
- A `psql` client, OR just use the new project's SQL Editor in the Supabase
  dashboard to run the SQL files by hand if you don't want to install one.
- Node.js (for the bucket-setup scripts already in `backend/scripts/`).

## Steps

1. **Create a new Supabase project** (free tier is fine) in the dashboard.

2. **Link the repo to it:**
   ```bash
   npx supabase link --project-ref <new-project-ref>
   ```

3. **Push the schema.** This applies all migrations in
   `supabase/migrations/`, which creates every table *and* inserts the
   migrations' own baseline seed rows:
   ```bash
   npx supabase db push
   ```

4. **Truncate before loading the snapshot.** The snapshot in `data.sql` is a
   superset of the migrations' baseline seed (same rows, plus everything
   added on the live project afterward), so loading it on top of step 3
   without truncating first will fail on primary-key conflicts. Run this in
   the new project's SQL Editor (or via `psql`):
   ```sql
   TRUNCATE TABLE
     addresses, admin_transaction_events, attribute_values, attributes,
     brands, cart_items, carts, categories, checkout_idempotency,
     conversations, coupons, inventory_movements, messages, notifications,
     order_coupons, order_items, orders, payment_allocations, payment_events,
     payments, product_images, product_sustainability, product_variants,
     products, reviews, roles, shipments, users, variant_attribute_values,
     wishlists
   RESTART IDENTITY CASCADE;
   ```
   If the schema has grown since 2026-08-09 (new tables added), re-derive
   this list instead of trusting it blindly:
   ```bash
   grep -oE '^INSERT INTO "public"\."[a-zA-Z_]+"' supabase/snapshot/data.sql \
     | sed -E 's/INSERT INTO "public"\."([a-zA-Z_]+)"/\1/' | sort -u
   ```

5. **Load the snapshot data.** Get the connection string from
   *Project Settings → Database → Connection string* on the new project,
   then:
   ```bash
   psql "<connection-string>" -f supabase/snapshot/data.sql
   ```
   (The dump sets `session_replication_role = replica` internally, so
   foreign-key/trigger ordering — including the circular FK on `categories`
   — is not a problem during load.)
   If you don't have `psql`, paste the contents of `data.sql` into the new
   project's SQL Editor and run it instead.

6. **Recreate the storage buckets** (empty, matching the original policies):
   ```bash
   node backend/scripts/setupProductImagesBucket.js
   node backend/scripts/setupAvatarsBucket.js
   ```
   (Run against the new project — make sure `backend/.env` already points at
   it; see step 8.)

7. **Upload the snapshot files into the new buckets:**
   ```bash
   npx supabase storage cp -r supabase/snapshot/storage/product-images ss:///product-images --linked --experimental
   npx supabase storage cp -r supabase/snapshot/storage/avatars ss:///avatars --linked --experimental
   ```

8. **Set environment variables.** Copy the new project's URL, anon key, and
   service role key (from *Project Settings → API*) into:
   - root `.env` (see `.env.example`)
   - `backend/.env` (see `backend/.env.example`)
   - `frontend/.env.local`

9. **Install and run:**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   npm run dev:frontend
   npm run dev:backend
   ```
   Verify `http://localhost:8080/api/health`, then spot-check a product page
   to confirm images load from the new project's storage.
