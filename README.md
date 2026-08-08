# StyleHub

A full-stack C2C fashion marketplace where buyers and sellers list, discover,
transact, and resolve disputes on new and pre-loved clothing — built end to
end: schema design, checkout and payment flow, seller tooling, messaging,
disputes, and an admin console.

> **Live demo status:** the project's Supabase database was intentionally
> decommissioned after coursework submission to free up hosting quota. A
> full point-in-time snapshot (schema, data, and uploaded images) is kept in
> [`supabase/snapshot/`](supabase/snapshot/) — see
> [Restoring the Supabase project](docs/restore-supabase-project.md) to spin
> it back up.

## What it does

**Buyer experience**
- Browse and search by category, brand, condition, price, and location
- Wishlist, cart, and a checkout flow with clearly-labeled simulated
  payment + escrow (no misleading "real payment" claims)
- Order tracking with per-item fulfillment status for orders that span
  multiple sellers
- In-app messaging with sellers and an in-app notification feed

**Seller tools**
- A real listing pipeline (`/sell`) with image upload to Supabase Storage —
  not a static demo catalog
- Seller dashboard with an explicit listing lifecycle
  (`draft → active → hidden / sold → archived`)
- Public seller storefront/profile pages
- Seller-facing finance and sales analytics views

**Trust & safety**
- Dispute resolution flow with evidence upload to a **private** storage
  bucket, served only through short-lived signed URLs to verified
  participants (buyer, seller, or admin) — never a public link
- Admin console for transaction oversight and order management

**Sustainability**
- Seller-declared product "journey" classification
  (`new / deadstock / pre-loved / repaired / upcycled`)
- Reports only direct listing counts — deliberately does **not** fabricate
  CO2, water, or waste savings it has no way to verify

**Localization**
- Hybrid English/Vietnamese content (not a blanket machine translation),
  tuned for a general C2C marketplace audience in Vietnam

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Express 5 (Node.js), REST API |
| Database | Supabase Postgres — 32 tracked migrations |
| Storage / Auth | Supabase Storage (public + private, signed-URL-gated buckets); custom token-based auth, not Supabase Auth |
| Testing | Playwright end-to-end tests (checkout/payment, auth, role-based access control) |

## Architecture

```
Next.js frontend (:3000)  --server components-->  Express API (:8080)  -->  Supabase (Postgres + Storage)
```

The frontend holds no hardcoded catalog data — every product, category, and
brand is served through the backend API, backed by the live database.

```
root/
  frontend/   Next.js app — buyer, seller, and admin UI
  backend/    Express API + one-off data/ops scripts
  supabase/   Migrations (schema history), seed data, and a full snapshot
  docs/       Architecture notes, methodology, and restore instructions
```

## Getting started

1. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

2. Set up a Supabase project (or restore the one snapshotted in this repo —
   see [docs/restore-supabase-project.md](docs/restore-supabase-project.md)),
   then copy `.env.example` → `.env` in the root, `backend/`, and
   `frontend/.env.local`, filling in your project's URL and keys.

3. Run the apps:
   ```bash
   npm run dev:frontend   # http://localhost:3000
   npm run dev:backend    # http://localhost:8080
   ```
   `GET /api/health` on the backend confirms the database connection; if
   env vars are missing, catalog endpoints return a safe 503 instead of
   crashing.

## Testing

```bash
cd frontend
npx playwright test
```

Covers the checkout/payment flow, authentication, and role-based access
control across buyer/seller/admin surfaces.

## Project background

Built collaboratively as a university e-commerce course project, developed
in iterative phases — from initial catalog and taxonomy through payments,
seller tooling, disputes, and sustainability reporting — with schema
evolution tracked as ordinary Postgres migrations rather than one-off SQL.
