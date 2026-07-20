# Phase 14 Presentation Screenshot Checklist

All retained images are optimized JPEGs generated from a built, running application with real, temporary database state. No impact response is mocked. Test addresses, order details, secrets, consoles, and unrelated desktop content are absent. Runtime fixtures are removed after capture.

| File | Route/state | Viewport/crop | What it proves | Suggested use |
|---|---|---|---|---|
| `01-home-circular-impact-desktop.jpg` | Homepage live impact ledger | 1440×900, ledger crop | Homepage UVP, direct counts, coverage, methodology timestamp | Sustainability UVP overview slide |
| `02-sustainability-methodology-desktop.jpg` | `/sustainability` with loaded live ledger | 1440×900 viewport | Honest methodology, direct-count language, real active/completed/coverage values | Methodology/SDG discussion slide |
| `03-shop-circular-filter-desktop.jpg` | Filtered Shop, real pre-loved listing | 1440×900 viewport | Lifecycle selector, URL-addressable active chips, badge/listing discovery | Circular discovery slide |
| `04-product-journey-desktop.jpg` | Circular product PDP | Product Journey crop | Seller-declared source, lifecycle, material, story, packaging intent | Product detail/traceability slide |
| `05-public-seller-impact-desktop.jpg` | Public seller storefront | Public ledger crop | Safe seller-only active/sold counts and privacy disclosure | Public trust/privacy slide |
| `06-private-profile-impact-desktop.jpg` | Authenticated seller profile | Private ledger crop | Seller coverage and completed sold units; purchased remains private/zero | Personal impact slide |
| `07-seller-dashboard-impact-desktop.jpg` | Seller Dashboard overview | Dashboard ledger crop | Same private calculation surfaced in seller workflow | Seller operations slide |
| `08-sell-product-journey-desktop.jpg` | `/sell`, Condition & Size step | 1440×1200 viewport | Six lifecycle choices, repair fields, story, packaging, live preview | Seller input workflow slide |
| `09-sell-review-journey-desktop.jpg` | `/sell`, Review & Publish | Summary crop | Classification and seller-declared disclosure survive review | Publish confirmation inset |
| `10-seller-dashboard-journey-desktop.jpg` | Dashboard listing after edit | Listing-row crop | Persisted upcycled badge and normal seller actions | Journey maintenance inset |
| `11-sustainability-mobile-390.jpg` | `/sustainability`, live ledger loaded | 390×844 viewport | Mobile hierarchy, wrapping, direct counts, no overflow | Responsive/mobile slide |

## Presenter checks

- [x] Use the retained stable filenames; do not substitute early loading-state captures.
- [x] Explain that the nonzero screenshot values existed in real temporary rows and were removed afterward.
- [x] State “seller-declared, not independently certified.”
- [x] State that seed listings are excluded from user-listing impact coverage.
- [x] Describe “completed circular units” as summed quantities from immutable completed order-item snapshots.
- [x] Do not describe the numbers as CO2, water, waste, landfill, carbon, or monetary savings.
- [x] Do not imply the screenshots show current post-cleanup development totals; current totals are listed in the QA report.
- [x] Keep private-ledger crops separate from the public seller ledger when explaining privacy.
- [x] Mention that the mobile screenshot is Playwright Chromium emulation, not a physical-device certification.
- [x] If demonstrating Tawk.to live, configure and manually verify it first; the QA runtime had no Tawk widget configured.

## Capture reproducibility

1. Build the frontend with `npm run build` in `frontend/`.
2. Run the backend on port 8080 and the built frontend on port 3000.
3. Run `python frontend/phase14_sustainability_qa_e2e.py`.
4. Confirm `PHASE14 E2E SUMMARY: 38/38 passed` and exact cleanup before using the overwritten images.
5. Visually inspect all eleven files and keep only `docs/evidence/phase14/` as presentation evidence.
