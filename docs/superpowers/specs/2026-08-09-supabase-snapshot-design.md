# Supabase Full Snapshot for GitHub Portfolio Preservation

Date: 2026-08-09

## Purpose

The user is done submitting this project for their course and wants to delete
the live Supabase project to free up their account for other coursework,
while keeping the GitHub repo (`NeitLN/72ITIS30503_Team4_Project`, public) as
a portfolio piece for future job applications. The requirement is that a
`git pull` of the repo, followed by recreating a fresh Supabase project and
running a documented restore procedure, reproduces the **exact current live
state** of the app — not just the baseline seed data already present in
`supabase/migrations/` — including every product, user, order, and uploaded
image that exists right now.

## Non-goals

- No live/ongoing sync between the Supabase project and the repo — this is a
  one-time snapshot taken immediately before the project is deleted.
- No automated restore script (rejected in favor of a documented CLI command
  sequence — see Approaches Considered).
- No anonymization step — confirmed with the user that all current DB rows
  (255 `users`, 47 `orders`) are synthetic/seed/test data, not real people's
  PII, so raw data is safe to commit to a public repo.
- `dispute-evidence` storage bucket is out of scope: it has never been
  created on the live project (confirmed via `storage.listBuckets()`), so
  there is nothing to snapshot for it.

## Current live state (measured 2026-08-09, informs sizing)

- `products`: 188 rows, `users`: 255, `orders`: 47, `order_items`: 75,
  `categories`: 27, `brands`: 57, `notifications`: 21.
- Storage: `product-images` bucket — 152 files, ~6.9 MB. `avatars` bucket —
  20 files, ~0.55 MB. Total ~7.5 MB, trivial for a git commit.
- Schema is fully captured across 32 files in `supabase/migrations/`,
  including migrations that insert baseline seed rows (e.g.
  `20260705172059_seed_expanded_c2c_product_catalog.sql`).

## Approaches considered

1. **Commit snapshot + documented CLI restore steps (chosen).** Take a
   one-time data dump and storage copy using the official Supabase CLI,
   commit the output into `supabase/snapshot/`, and write a step-by-step
   restore doc. No custom code. Snapshot is ~10 MB, well within normal git
   limits.
2. Same snapshot, wrapped in a single automated restore script. Rejected:
   this restore happens at most once (when reviving the project for a job
   search), so a maintained script is more ongoing surface area than value.
   The CLI commands in the doc are already copy-paste simple.
3. Same snapshot, stored as a GitHub Release asset instead of committed to
   the repo tree. Rejected: at ~10 MB there's no meaningful repo-bloat
   concern that would justify moving it out of normal `git pull` reach.

## Design

### What gets captured

```
supabase/
  snapshot/
    data.sql                    # supabase db dump --data-only --linked
    storage/
      product-images/           # supabase storage cp -r ss:///product-images . --linked
      avatars/                  # supabase storage cp -r ss:///avatars . --linked
docs/
  restore-supabase-project.md   # restore procedure, committed alongside
```

`data.sql` is a Postgres data-only dump (via the Supabase CLI, which shells
out to a version-matched `pg_dump` in Docker) of every row in every table in
the `public` schema of the live project, taken immediately before deletion.

### Restore procedure (goes into `docs/restore-supabase-project.md`)

1. Create a new Supabase project (free tier).
2. `supabase link --project-ref <new-ref>`.
3. `supabase db push` — applies all 32 migrations, creating the schema and
   the migrations' own baseline seed rows.
4. **Truncate before loading the snapshot**, to avoid primary-key conflicts
   between the migrations' baseline seed rows and the snapshot (which is a
   superset containing those same rows plus everything added since). The
   table list is derived mechanically: every `COPY public.<table>` line in
   `data.sql` names a table that must be truncated first. Run:
   `TRUNCATE TABLE <those tables> RESTART IDENTITY CASCADE;` via the new
   project's SQL Editor or `psql`.
5. Load the snapshot: `psql "<new-project-connection-string>" -f
   supabase/snapshot/data.sql`.
6. Recreate the storage buckets (empty) via the existing one-off scripts:
   `node backend/scripts/setupProductImagesBucket.js` and
   `node backend/scripts/setupAvatarsBucket.js`.
7. Upload the snapshot files into those buckets:
   `supabase storage cp -r supabase/snapshot/storage/product-images
   ss:///product-images --linked` (same pattern for `avatars`).
8. Copy the new project's URL/anon key/service-role key into `.env`,
   `backend/.env`, `frontend/.env.local` per the existing `.env.example`
   files.
9. `npm install` in root/`frontend`/`backend`, run `npm run dev:frontend` and
   `npm run dev:backend`, verify `http://localhost:8080/api/health` and spot
   check a product page renders with its image.

### Error handling / edge cases

- If step 4's truncate list is wrong (missing a table), step 5's `psql`
  load will fail loudly on a duplicate-key or foreign-key error rather than
  silently corrupting data — the restore doc will tell the reader to re-derive
  the table list from `data.sql`'s `COPY` lines rather than trust a
  hardcoded list that may drift as the schema evolves after 2026-08-09.
- `supabase db dump` requires Docker Desktop running locally (it shells out
  to a containerized `pg_dump` matched to the project's Postgres version).
  This is an execution-time prerequisite for taking the snapshot, not for
  restoring it later (restoring only needs `psql`, which ships with any
  Postgres client or can be run via the Supabase SQL Editor in the browser
  with no local install at all).

### Testing / verification

- After generating `supabase/snapshot/`, sanity-check row counts by grepping
  `COPY public.<table>` line counts in `data.sql` against the live counts
  captured above (188 products, 255 users, etc.).
- Verify storage file counts match (152 + 20 = 172 files) by counting files
  under `supabase/snapshot/storage/`.
- Full end-to-end restore (spinning up an actual second Supabase project to
  prove the restore doc works) is out of scope for this pass — the user will
  exercise the real restore procedure once, whenever they actually need the
  project back for an interview. The doc will be written precisely enough
  that this is a fair trade-off.
