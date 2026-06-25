# 72ITIS30503_Team4_Project
# 👗 StyleHub — Fashion Marketplace Platform

> **Course:** 72ITIS30503 — E-Commerce and Social Networks
> **Program:** Information Technology (Honors Program) — Van Lang University
> **Academic Year:** 2025 – 2026

---

## 📋 Project Overview

**StyleHub** is a modern, full-featured fashion marketplace that connects independent clothing brands and individual sellers with fashion-conscious buyers. The platform supports product listings, secure checkout, user reviews, and a curated discovery feed — built with a decoupled headless architecture for maximum performance and scalability.git add .
git commit -m "docs: update README"

---

## 👥 Team Information

- Võ Việt Tiến
- Võ Hoàng Minh
- Bùi Duy Anh
- Đỗ Quốc Bảo

**Class Code:** [253_72ITIS30503_01]
**Team ID:** [Team 4]
**Repository:** [https://github.com/NeitLN/72ITIS30503_Team4_Project]

---

## 🏗️ Architecture

**Selected Path: Path C — Modern Decoupled / Headless Web**

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend / API | Node.js + Express.js |
| CMS / Content | Strapi (Headless CMS) *(Obsolete in Phase 0 - removed)* |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth (JWT) |
| Storage | Supabase Storage (product images) |
| Version Control | Git + GitHub |
| Package Manager | PNPM |

### Architectural Justification

A fashion marketplace demands **strong SEO** for product discoverability, **rich and dynamic UI** for browsing experiences, and a **flexible content model** to accommodate diverse product attributes (size, color, material, brand). Next.js with Server-Side Rendering (SSR) directly addresses the SEO requirement, while its React foundation enables component-driven UI development. Strapi as a headless CMS provides a seller-facing dashboard to manage product content without engineering involvement. Supabase delivers a managed PostgreSQL database with real-time capabilities and built-in file storage, eliminating the need for separate infrastructure. This decoupled approach also allows the frontend and backend to scale independently during traffic spikes — a critical concern for flash sales and seasonal fashion events.

---

## 📁 Project Structure

```
stylehub/
├── frontend/                  # Next.js Application
│   ├── app/
│   │   ├── (shop)/            # Public-facing store pages
│   │   ├── (auth)/            # Login / Register
│   │   └── dashboard/         # Seller dashboard
│   ├── components/            # Reusable UI components
│   ├── lib/                   # API clients, utils
│   └── public/                # Static assets
│
├── backend/                   # Node.js REST API
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation
│   │   ├── models/            # DB models
│   │   └── routes/            # API endpoints
│   └── .env.example
│
├── .gitignore
├── README.md
└── docker-compose.yml         # Optional local orchestration
```

---

## 🌿 Git Branch Strategy

This project follows the **GitFlow** branching model:

```
main          ← Production-ready code only (protected)
│
└── develop   ← Integration branch for all features
      │
      ├── feature/setup-readme
      ├── feature/product-listing
      ├── feature/user-auth
      └── feature/checkout-flow
```

**Branch Rules:**
- `main` is **protected** — direct pushes are blocked; merges require a Pull Request with at least 1 approval.
- All new work starts from `develop` as a `feature/*` branch.
- Commit messages follow the **Conventional Commits** standard: `feat:`, `fix:`, `docs:`, `chore:`.

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- PNPM >= 8.x (`npm install -g pnpm`)
- Git
- A free [Supabase](https://supabase.com) account

### 1. Clone the Repository

```bash
git clone https://github.com/<ClassCode>_<TeamID>_Project.git
cd <ClassCode>_<TeamID>_Project
git checkout develop
```

### 2. Install Dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 3. Configure Environment Variables

Copy the example env files and fill in your credentials:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Backend
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
```

### 4. Run the Development Servers

```bash
# Frontend (http://localhost:3000)
npm run dev:frontend

# Backend API (http://localhost:8080)
npm run dev:backend
```

### 5. Smoke Test

Open your browser and verify:
- `http://localhost:3000` → Next.js welcome / home page loads ✅
- `http://localhost:8080/` → Returns `StyleHub Backend Running` ✅

---

## 🔒 .gitignore Highlights

```gitignore
# Dependencies
node_modules/

# Environment secrets — NEVER commit these
.env
.env.local
.env.production

# Next.js build output
.next/
out/

# Strapi build
cms/build/
cms/.cache/

# OS artifacts
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

---

## 📌 Key Features (Planned)

- [x] Project scaffolding & Git setup
- [ ] User registration & JWT authentication
- [ ] Product listing with categories and filters
- [ ] Shopping cart & checkout flow
- [ ] Seller dashboard (via Strapi CMS)
- [ ] Product image upload (Supabase Storage)
- [ ] Order management system
- [ ] Review & rating system

---

## 📞 Contact & Collaboration

- **Lecturer / TA:** tuan.ht@vlu.edu.vn (added as repository collaborator)
- **Repository Access:** Private — collaborators only

---

*Last updated: May 2026*