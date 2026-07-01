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

## Lab Mapping Summary

- **Lab 1:** Architecture + Git
- **Lab 2:** Sitemap + taxonomy + Express routes
- **Lab 3:** ERD + migrations + dynamic navigation
- **Lab 4:** SEO + slug routing + metadata
- **Lab 5:** PIM + simple/variable products

*Note: Strapi appeared in early Lab 1 documentation but is not used in the final implementation.*
