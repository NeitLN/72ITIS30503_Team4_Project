import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Two lockfiles exist (repo-root orchestrator + frontend/), which makes
  // Next.js infer the workspace root incorrectly. frontend/ is the only
  // place Next/Turbopack ever runs from, so pin it explicitly.
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      // Phase 15: `/products` has no page of its own (only the dynamic
      // `/products/[slug]` detail route does), so it 404'd both for a
      // direct visit and for Next's own background Link-prefetch of that
      // parent route segment (visible as `/products?_rsc=...` 404s in
      // Phase 11-14 QA network logs). Redirecting the bare parent path to
      // the real catalog resolves both.
      {
        source: '/products',
        destination: '/shop',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
