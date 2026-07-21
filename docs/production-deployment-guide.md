# StyleHub — Production Deployment Guide

Read-only architecture audit performed 2026-07-21. **No hosting provider is
configured anywhere in this repository** — no `vercel.json`, `netlify.toml`,
`render.yaml`, `Procfile`, `Dockerfile`, or CI deploy workflow was found.
This guide documents the actual architecture and the exact steps needed to
deploy it; it does not assume or fabricate a provider. No external
deployment was created, modified, or triggered while writing this document.

## Architecture summary

Three independent services:

1. **Frontend** — Next.js 16 (App Router), `frontend/`. Talks to the
   backend only over HTTP via `NEXT_PUBLIC_API_URL`; holds no
   service-role secret.
2. **Backend** — Express 5, `backend/`. The only holder of
   `SUPABASE_SERVICE_ROLE_KEY`; all authenticated writes (listings,
   checkout, sustainability) go through this process, never directly from
   the browser to Supabase.
3. **Database** — Supabase Postgres (already provisioned; this repository
   is linked to an existing project via `supabase/config.toml` /
   `npx supabase link`). Migrations live in `supabase/migrations/`.

## Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | backend | Project REST URL |
| `SUPABASE_ANON_KEY` | backend (some read paths), root `.env` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only | **Never** ship this to the frontend or a public build |
| `PORT` | backend | Express listen port (default 8080) |
| `STYLEHUB_AUTH_SECRET` | backend | HMAC key signing this app's own session tokens — treat as a real secret |
| `STYLEHUB_ADMIN_CODE` | backend | Required to self-register with `role: admin` |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Public, same project as backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Public anon key |
| `NEXT_PUBLIC_API_URL` | frontend | Public backend base URL the browser calls |
| `NEXT_PUBLIC_TAWKTO_ID` | frontend | `property-id/widget-id`; widget is omitted entirely if unset |

Root `.env`, `backend/.env`, and `frontend/.env.local` currently split these
across three files (see `docs/production-environment-checklist.md` for the
exact reconciliation). None of these files or their values are committed —
only `.env.example`/`backend/.env.example` (variable names, no values) are
tracked.

## CORS and origin allowlist

`backend/server.js` currently calls `app.use(cors())` with no origin
restriction (reflects any origin). This is acceptable for this course
project's development use but **should be tightened before any public
deployment** to an explicit allowlist of the deployed frontend origin(s)
(e.g. `cors({ origin: [FRONTEND_URL] })`). This was not changed in Phase 15
because doing so without a known production frontend URL would risk
breaking the existing exercised dev flow — flagging it here as a
deployment-time action item rather than guessing an origin.

## Authentication

This app's authentication is **not** Supabase Auth — it's a custom
HMAC-signed token system (`backend/services/authService.js`). There is no
OAuth/callback URL to configure. The only redirect-like configuration is
`STYLEHUB_AUTH_SECRET`, which must be identical across every backend
instance/replica so tokens signed by one are verifiable by another.

## Next.js image / static assets

`frontend/public/images/products/` (170 files) is served as static assets
by Next.js directly — no external image CDN or `next.config.ts`
`images.domains` allowlist is configured, because no remote image host is
used (all product/demo images are local files, see
`docs/sustainability-demo-data.md`). A production deploy must ship this
directory as part of the frontend build/static output.

## Health check

`GET /api/health` on the backend returns `{ service, status, databaseConfigured }`
— use this as the deployment platform's health-check endpoint.

## Install / build / start

**Frontend** (from `frontend/`):
```bash
npm install
npm run build   # next build — produces the 23-route production build
npm run start   # next start — serves the build
```

**Backend** (from `backend/`):
```bash
npm install
npm start        # node server.js
```

## Database migrations and seed/demo data (deployment order)

1. `npx supabase link --project-ref <ref>` (already done for the linked
   dev project in this repository).
2. `npx supabase db push` (or the project's existing migration-apply
   process) to bring a target database to schema parity — verify with
   `npx supabase migration list` (local vs remote columns must match).
3. Seed the verified 148-product catalog:
   `node backend/scripts/seedVerifiedCatalog.js --apply` (from `backend/`).
4. Optionally seed the Phase 15 sustainability demo dataset:
   `node backend/scripts/seedSustainabilityDemo.js --apply` (see
   `docs/sustainability-demo-data.md`) — **only against the confirmed
   development/demo project**, never an unknown production database.

## Post-deployment smoke checks

- `GET /api/health` → `200`, `databaseConfigured: true`
- `GET /api/sustainability/impact` → `200`, valid JSON with
  `methodologyVersion` and `generatedAt`
- Frontend `/` → `200`, one `main`, one `h1`
- Frontend `/products` → redirects (`307`) to `/shop`, not a `404`
- A real registration + login round trip
- A real add-to-cart → checkout round trip with a test/demo account only

## Rollback and cleanup considerations

- Database migrations in this project are additive-only through
  `20260723000000` — no destructive migration exists to roll back.
- If a deployment needs to be torn down, remove the hosting
  service/instance for frontend and backend; the Supabase project itself
  is independent infrastructure and is not deleted by this repository's
  own tooling.
- The Phase 15 demo dataset has its own scoped, namespace-verified cleanup
  command (`backend/scripts/cleanupSustainabilityDemo.js --apply --yes`) —
  see `docs/sustainability-demo-data.md`. It never touches the 148-product
  seed catalog or any non-namespaced row.

## What this document does not do

It does not select, provision, or configure Vercel, Netlify, Render,
Railway, Fly.io, or any other hosting provider — none is configured in
this repository, and choosing one is a decision (and, if paid, a cost) for
the user to make. The actual deployment happens after the user reviews and
pushes this Phase 15 commit.
