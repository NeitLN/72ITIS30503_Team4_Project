# StyleHub

A C2C fashion marketplace for local brands, pre-loved items, and street style lovers.

## Architecture

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Express.js, Node.js
- **Database & Auth & Storage:** Supabase (PostgreSQL)

## Folder Structure

```
root/
  frontend/      # Next.js frontend application
  backend/       # Express.js backend application
  supabase/      # Supabase migrations and seeds
```

## Setup Instructions

1. Install dependencies for frontend and backend:
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. Environment Variables:
   Copy `.env.example` to `.env` in the root (or inside frontend/backend if needed) and fill in your Supabase keys.

3. Run the applications:
   ```bash
   npm run dev:frontend
   npm run dev:backend
   ```

## Available Scripts (from Root)

- `npm run dev:frontend` - Starts Next.js development server
- `npm run dev:backend` - Starts Express.js server
- `npm run build` - Builds the frontend
- `npm run lint` - Lints the frontend

## Database Foundation (Phase 1)

- Supabase migrations are stored in `supabase/migrations/`
- Phase 1 creates the catalog schema (users, brands, categories, products, attributes, variants) and corresponding seed data.
- **Do not run remote db push** without approval. Apply locally first if testing.
- Future phases will connect backend/frontend to this schema dynamically.

## Backend APIs (Phase 2 & Phase 3)

- To connect the backend to Supabase, create a `.env` file in the `backend/` folder (or root folder) by copying `backend/.env.example`.
- Required environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT`.
- To verify the backend API, start the server (`npm run dev:backend`) and check `http://localhost:8080/api/health`. If the database is not configured, endpoints like `/api/products` will safely return a 503 response.
- **WARNING: Do not run `supabase db reset`.** Existing remote data must not be destroyed.
- Migrations (`supabase/migrations/`) should only be pushed to the database (e.g. `npx supabase db push`) after explicit approval.

## Lab Mapping Summary

- **Lab 1:** Architecture + Git
- **Lab 2:** Sitemap + taxonomy + Express routes
- **Lab 3:** ERD + migrations + dynamic navigation
- **Lab 4:** SEO + slug routing + metadata
- **Lab 5:** PIM + simple/variable products

*Note: Strapi appeared in early Lab 1 documentation but is not used in the final implementation.*
