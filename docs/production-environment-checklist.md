# StyleHub — Production Environment Checklist

Companion checklist to `docs/production-deployment-guide.md`. Variable
names only — no values, no secrets.

## Backend (`backend/.env`, see `backend/.env.example`)

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — **backend only, never in a frontend
      build or a public repo**
- [ ] `PORT` (defaults to 8080 if unset)
- [ ] `STYLEHUB_AUTH_SECRET` — must be identical across all backend
      replicas/instances
- [ ] `STYLEHUB_ADMIN_CODE`

## Frontend (`frontend/.env.local`)

- [ ] `NEXT_PUBLIC_API_URL` — the deployed backend's public base URL
- [ ] `NEXT_PUBLIC_TAWKTO_ID` — optional; widget is simply omitted if unset
      (verified this phase: no console error, no duplicate script, when
      unset)

## Root `.env` (`/.env.example`)

Currently a partial mirror used by some root-level tooling. Verified this
phase that it is missing `SUPABASE_SERVICE_ROLE_KEY` — this is fine
functionally (the backend's own `backend/.env` is authoritative and takes
precedence as of the Phase 15 dotenv-loading fix in `backend/server.js`
and `backend/lib/supabase.js`), but is worth reconciling before a new
contributor is confused by two `.env.example` files with different key
sets. Not restructured in Phase 15 to avoid an unrelated, broader
environment-file refactor.

## Frontend build-time requirements

- [ ] `frontend/public/images/products/` (170 files, ~consistent with the
      148-product catalog + Phase 15 demo images) must be included in the
      deployed build/static output.
- [ ] No `images.remotePatterns`/`domains` entry is needed in
      `next.config.ts` — every product image is a local static asset.

## CORS / origin allowlist

- [ ] Backend `cors()` currently allows all origins (see deployment
      guide) — tighten to the deployed frontend origin(s) before any
      public exposure.

## Database

- [ ] Confirm `npx supabase migration list` shows local = remote before
      and after any deploy (verified this phase: parity holds through
      `20260723000000_lock_down_order_items.sql`).
- [ ] Confirm the linked project is the intended target — never point
      migrations or seed scripts at an unknown/unconfirmed project.

## Filesystem / browser assumptions

- [ ] Backend Storage buckets `product-images` and `avatars` must exist
      on the target Supabase project (`backend/scripts/setupProductImagesBucket.js`,
      `setupAvatarsBucket.js`) before seller image uploads will succeed.
- [ ] No server-side filesystem writes outside `node_modules`/build output
      — all user-uploaded images go to Supabase Storage, not local disk.
- [ ] Frontend uses `localStorage` for cart/wishlist client state only
      (no server-side session storage assumption beyond the signed auth
      token).

## Service-role usage boundary

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is read only by
      `backend/lib/supabase.js` and used only by backend service modules
      that have already authenticated the caller — verified this phase
      that the frontend's `lib/impact.ts` contains no service-role
      reference (re-run as part of the Phase 14 backend suite this
      session, 63/63 passed, includes this exact check).

## Known environment gaps in this development setup

- [ ] `NEXT_PUBLIC_TAWKTO_ID` is unset — live-chat widget cannot be
      exercised end-to-end here (documented limitation, not a defect).
- [ ] `PHASE7_QA_PASSWORD` (and related legacy QA env vars) are unset —
      four historical Phase 7-9/8.1 suites remain blocked, same as
      Phase 14's finding; no password was guessed or reset to unblock
      them.
