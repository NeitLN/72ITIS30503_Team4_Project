# StyleHub — Final Presentation Demo Checklist

A reliable, repeatable lecturer demo flow using the retained Phase 15
dataset (see `docs/sustainability-demo-data.md` for exact accounts,
listings, and metrics). No passwords, tokens, or secret IDs appear below —
if a live login is needed, run
`node backend/scripts/seedSustainabilityDemo.js --apply --show-credentials`
beforehand in your own terminal (see that document for details).

Before presenting: confirm both servers are running (`npm run dev:backend`,
`npm run build && npm run start` in `frontend/`) and
`node backend/scripts/validateSustainabilityDemo.js` exits `0`.

| # | Step | Start route | Role | Expected result | Fallback | Report section | Test / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Homepage & sustainability UVP | `/` | none | Hero + "Wear Longer. Waste Less." framing visible above the fold | If network is down, static hero copy still renders (client-side impact panel degrades gracefully) | Positioning / UVP | Phase 8.1 positioning suite |
| 2 | Homepage Circular Impact values | `/` (scroll to Circular Impact section) | none | Non-zero "active circular listings" / "completed circular units" tiles | If API is down, section shows its existing loading/error state, not a crash | Sustainability UVP | `docs/sustainability-demo-data.md` before/after table |
| 3 | Shop lifecycle filters | `/shop` | none | Lifecycle filter chips/select present | — | Shop filtering | Phase 12 backend (18/18) |
| 4 | URL synchronization & browser history | `/shop?lifecycle=deadstock%2Cpre_loved%2Crepaired%2Cupcycled` | none | Exactly the 10 active circular listings (seed + demo) render; back/forward preserves filter state | — | Circular discovery | Phase 12 suite; live-verified this session (10 circular active listings) |
| 5 | Product Journey badges | `/shop?lifecycle=pre_loved` | none | Each card shows its lifecycle badge (e.g. Pre-loved) | — | Product Journey | Phase 11 suite |
| 6 | Circular product detail | `/products/vans-old-skool-black-pre-loved` | none | Full Product Journey panel: material, seller-declared story, "seller-declared, not certified" language | — | Product Journey | Phase 11 suite; live-verified (image renders, no console error) |
| 7 | Legacy/not-specified product detail | `/products/ader-error-tetris-logo-tee-b8313e` | none | No lifecycle claim shown, page still renders cleanly | — | Honest comparison | `docs/sustainability-demo-data.md` |
| 8 | Seller registration/login | `/register`, `/login` | none → seller | Real account created/logged in | Use a demo seller login instead if avoiding a live registration | Auth | Phase 9 suite (credential-gated; see limitations) |
| 9 | `/sell` Product Journey fields | `/sell` | seller | Six-step wizard including lifecycle selector, material/repair/upcycle/story fields | — | Product Journey listing fields | Phase 7/11 suites |
| 10 | Review & Publish summary | `/sell` (final step) | seller | Sustainability summary shown before publish | — | Review & Publish | Phase 7 suite (credential-gated; see limitations) |
| 11 | Seller Dashboard editing | `/seller/dashboard` | seller (e.g. `rewear-saigon`) | 4 listings visible, editable with optimistic concurrency | — | Seller Dashboard | Phase 9/13/14 suites |
| 12 | Seller private impact | `/profile` (impact panel) while logged in as a demo seller | seller | Only that seller's attributed sold units (e.g. hcmc seller shows `circularUnitsSold: 1`) | — | Private impact | `docs/sustainability-demo-data.md`; Phase 15 test |
| 13 | Cart and atomic checkout | `/cart` → `/checkout` | buyer | Real order created via `stylehub_checkout_atomic`; two payment methods (COD, bank transfer) shown | If demoing live, use a fresh cart to avoid re-triggering the retained demo orders | Atomic checkout | Phase 10 suite (38/38 this session) |
| 14 | Multi-seller order behavior | Order confirmation for a cart spanning 2+ sellers | buyer | Single order, independent per-seller fulfillment status | The retained `completed-multiseller` demo order already demonstrates this if a live multi-seller cart isn't set up in time | Multi-seller checkout | `docs/sustainability-demo-data.md` |
| 15 | Buyer private impact | `/profile` (impact panel) as `bao-tram` | buyer | `circularUnitsPurchased: 4`, `circularUnitsSold: 0` | — | Private impact | `docs/sustainability-demo-data.md` |
| 16 | Public seller storefront impact | `/seller/rewear-hanoi` | none | Public "Seller Impact" panel: active circular count + completed units sold only, no private data | — | Public seller impact | Phase 13/14 suites; live-verified screenshot this session |
| 17 | `/sustainability` methodology and disclosure | `/sustainability` | none | Full methodology, "What we do not claim," and "About this data" academic-transparency panel | — | Methodology & honesty | `docs/circular-impact-methodology.md` |
| 18 | Contact and support | `/contact` | none | Email/phone/hours, contact form, coursework-project note | — | Contact | This phase's defect sweep |
| 19 | Map/location | `/contact` | none | Embedded map under "Văn phòng" | — | Map requirement | Added this phase; live-verified `200`, no console error |
| 20 | Two payment methods | `/checkout` | buyer | COD and bank transfer both selectable and both accepted by the backend | — | Payment methods | Source-verified this phase (frontend/backend allow-lists match) |
| 21 | Mobile responsive experience | Any of the above at ~390×844 | none | No horizontal overflow, single main/h1, touch-usable filters | — | Responsive design | Phase 14 suite (38/38 ×3 at 5 breakpoints); spot-checked again this phase at desktop width |
| 22 | Database persistence evidence | Any impact panel, refreshed | none | Values persist across reload/relogin (not client-only state) | — | Persistence | Live-verified this session via `supabaseAdmin` row queries matching API responses |
| 23 | Seller-declared brand creation | `/sell` step 2 | seller | Click "Không tìm thấy thương hiệu? Thêm thương hiệu mới", type a new name, see the unverified disclosure, publish, then view it on `/shop` (brand filter) and the product detail page with the disclosure still shown | Use the retained `rewear-saigon` listing "Loop & Mend Shoulder Bag" as a pre-made example if live creation isn't rehearsed in time | Seller-declared brands | `docs/seller-declared-brand-workflow.md`; backend 38/38, browser 22/22 |

## Known honest limitations for the live demo

- Tawk.to is not configured (`NEXT_PUBLIC_TAWKTO_ID` unset) — step 18 will
  not show a live-chat widget.
- Steps 8 and 10 (fresh registration, full `/sell` wizard) are best
  rehearsed once before presenting since they create real rows; prefer
  reusing an existing demo seller for the live audience-facing pass.
- No public production URL exists yet (see
  `docs/production-deployment-guide.md`) — this checklist assumes a local
  `npm run dev:backend` + `npm run build && npm run start` demo
  environment.
