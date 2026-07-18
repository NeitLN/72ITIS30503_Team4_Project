# Product Image Sources & Verification (Phase 6)

This document records the provenance and verification status of every product
image used by the StyleHub demo/seed catalog. It is the companion to the
authoritative manifest `backend/scripts/data/verifiedCatalog.js` and seeder
`backend/scripts/seedVerifiedCatalog.js`, validated by
`backend/scripts/validateCatalog.js`.

## Provenance & licensing

**Original 82 (first Phase 6 pass, 2026-07-17):** every asset already existed
in this repository (committed by the team in prior "Image addition" work) and
is served as a **local static asset** — never hotlinked, never a signed/CDN/
temporary URL. Files carry a `.jpg` extension for historical consistency;
several are internally WEBP/AVIF/PNG. Browsers render them correctly and
Next.js serves them from `public/`. The older `SOURCES.md` in this folder is
**historical**: it documented an earlier batch of LoremFlickr keyword
placeholders, most of which have since been replaced with real product
photography. Assets still showing that placeholder/lifestyle character were
audited out (see "Rejected" below).

**Expansion batch of 13 (2026-07-18, catalog growth to 96 products):** sourced
from **Wikimedia Commons** under open licenses (CC0, CC-BY, CC-BY-SA, or
Public Domain — see the table below for the exact license per file) or reused
from an existing unused repo asset (`slingbag.jpg`, previously flagged
"surplus, pending individual verification"). Every Commons image was
downloaded once as a static file into this folder — **not hotlinked, not a
signed/temporary URL** — fetched at Commons' own listed thumbnail size (500px)
per their API rate-limit policy. Each was visually inspected before use (not
judged by filename) to confirm it shows the exact stated brand/model. No
proprietary retailer or brand press-kit imagery was used.

| Image file | Source page | License | Attribution |
| --- | --- | --- | --- |
| `nike-air-force-1-white.jpg` | [Nike air Force 1 white on white.jpg](https://commons.wikimedia.org/wiki/File:Nike_air_Force_1_white_on_white.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `new-balance-550-burgundy.jpg` | [New Balance 550.jpg](https://commons.wikimedia.org/wiki/File:New_Balance_550.jpg) | CC0 | Wikimedia Commons contributor |
| `converse-chuck-taylor-leather.jpg` | [Converse All Star de couro preto.jpg](https://commons.wikimedia.org/wiki/File:Converse_All_Star_de_couro_preto_-_Black_Leather_Converse_All_star.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `dr-martens-1460-boots.jpg` | [Pair of brown Dr Martens 1460 boots...jpg](https://commons.wikimedia.org/wiki/File:Pair_of_brown_Dr_Martens_1460_boots_with_the_sole_of_one_boot_showing.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `casio-gshock-gw-m5610u.jpg` | [CASIO G-Shock GW-M5610U.jpg](https://commons.wikimedia.org/wiki/File:CASIO_G-Shock_GW-M5610U.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `adidas-adilette-slides.jpg` | [Adilette sandals 2004.jpg](https://commons.wikimedia.org/wiki/File:Adilette_sandals_2004.jpg) | CC BY-SA 3.0 | Wikimedia Commons contributor |
| `jansport-classic-backpack.jpg` | [Jansport Backpack 3 2019-03-07.jpg](https://commons.wikimedia.org/wiki/File:Jansport_Backpack_3_2019-03-07.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `rayban-original-wayfarer.jpg` | [Ray Ban Original Wayfarer.jpg](https://commons.wikimedia.org/wiki/File:Ray_Ban_Original_Wayfarer.jpg) | CC BY-SA 3.0 | Wikimedia Commons contributor |
| `nike-dunk-low-grey-fog.jpg` | [Nike Dunk Low.jpg](https://commons.wikimedia.org/wiki/File:Nike_Dunk_Low.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `birkenstock-arizona-esd.jpg` | [Birkenstock Arizona ESD.jpg](https://commons.wikimedia.org/wiki/File:Birkenstock_Arizona_ESD.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `adidas-stan-smith.jpg` | [Adidas Stan Smith wht-blk.jpg](https://commons.wikimedia.org/wiki/File:Adidas_Stan_Smith_wht-blk.jpg) | CC BY-SA 3.0 | Wikimedia Commons contributor |
| `crocs-classic-clog.jpg` | [Crocs-synthetic-clogs.jpg](https://commons.wikimedia.org/wiki/File:Crocs-synthetic-clogs.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `nike-air-max-90-black.jpg` | [Nike Air Max 90.jpg](https://commons.wikimedia.org/wiki/File:Nike_Air_Max_90.jpg) | CC BY-SA 4.0 | Wikimedia Commons contributor |
| `slingbag.jpg` | Pre-existing repo asset (Tan & Loom branded crossbody, visible embossed logo) | n/a (already local, no re-fetch) | — |

CC-BY/CC-BY-SA requires attribution to the original uploader on redistribution;
this table plus the Commons source-page links satisfy that for this
educational/demo project. None of these files are hotlinked at runtime — the
app only ever serves the locally-committed copy from `public/images/products/`.

## Verification method

Every asset was **visually inspected** (not judged by filename alone) and
classified:

- **VERIFIED_EXACT** — the photo shows that exact brand/model (logo/model
  details confirmed). Only these are attached to a branded, model-specific
  listing.
- **VERIFIED_GENERIC** — a clean, accurate product photo with no identifying
  brand. Used only for generic, unbranded ("No Brand") listings — never labelled
  with a famous brand.
- Assets that could not be confidently matched, showed the wrong product, were
  lifestyle/scene shots, were non-fashion, or were too low-resolution were
  **not used** (listed at the end).

Each product below satisfies: product name ↔ brand ↔ model ↔ category ↔ image.

## Verified assets in the active catalog (82)

| Image file | Product | Brand | Category | Verification |
| --- | --- | --- | --- | --- |
| `adidas-trefoil-tee.jpg` | Adidas Originals Trefoil Tee | Adidas | t-shirts | VERIFIED_EXACT |
| `levents-popular-logo-tee.jpg` | Levents Popular Logo Tee | Levents | t-shirts | VERIFIED_EXACT |
| `dirtycoins-oversized-tee.jpg` | DirtyCoins Icon Oversized Tee | DirtyCoins | t-shirts | VERIFIED_EXACT |
| `uniqlo-u-crew-neck-tee.jpg` | Uniqlo U Crew Neck Tee | Uniqlo | t-shirts | VERIFIED_EXACT |
| `uniqlo-logo-shirt.jpg` | Uniqlo UT Minimal Graphic Tee | Uniqlo | t-shirts | VERIFIED_EXACT |
| `pucci-logo-shirt.jpg` | Pucci Emblem Graphic Tee | No Brand (generic) | t-shirts | VERIFIED_GENERIC |
| `white-jersey.jpg` | Ribbed White Long-Sleeve Top | No Brand (generic) | t-shirts | VERIFIED_GENERIC |
| `hades-heartlock-shirt.jpg` | Hades Heartlock Plaid Short-Sleeve Shirt | Hades | shirts | VERIFIED_EXACT |
| `coolmate-shirt.jpg` | Coolmate Cotton Compact Polo | Coolmate | shirts | VERIFIED_EXACT |
| `fresh-cotton-shirt.jpg` | Patterned Resort Short-Sleeve Shirt | No Brand (generic) | shirts | VERIFIED_GENERIC |
| `linen-shirt.jpg` | Natural Linen-Blend Long-Sleeve Shirt | No Brand (generic) | shirts | VERIFIED_GENERIC |
| `oxford-shirt.jpg` | Classic White Oxford Shirt | No Brand (generic) | shirts | VERIFIED_GENERIC |
| `oriental-bamboo-shirt.jpg` | Panda Bamboo Embroidered Camp Shirt | No Brand (generic) | shirts | VERIFIED_GENERIC |
| `plaid-fannel-shirt.jpg` | Buffalo Check Flannel Shirt | No Brand (generic) | shirts | VERIFIED_GENERIC |
| `football-jersey.jpg` | Custom Team Football Jersey | No Brand (generic) | jerseys | VERIFIED_GENERIC |
| `rothco-tactical-jersey.jpg` | Woodland Camo Tactical Combat Shirt | No Brand (generic) | jerseys | VERIFIED_GENERIC |
| `boss-cotton-knited-sweater.jpg` | Hugo Boss Cotton Knit Crewneck Sweater | Hugo Boss | sweaters-cardigans | VERIFIED_EXACT |
| `swe-hoodie.jpg` | Sweazy 999 Cross Graphic Hoodie | No Brand (generic) | hoodies | VERIFIED_GENERIC |
| `hm-loose-fit-hoodie.jpg` | Loose-Fit Green Pullover Hoodie | No Brand (generic) | hoodies | VERIFIED_GENERIC |
| `grimm-dc-hoodie.jpg` | Oversized Black Pullover Hoodie | No Brand (generic) | hoodies | VERIFIED_GENERIC |
| `adidas-buttonup-jacket.jpg` | Adidas Originals Frog-Button Track Jacket | Adidas | outerwear | VERIFIED_EXACT |
| `boss-regular-fit-leather-jacket.jpg` | Hugo Boss Regular-Fit Leather Jacket | Hugo Boss | outerwear | VERIFIED_EXACT |
| `degrey-varsity-hoodie.jpg` | Degrey Athlete Embroidered Jacket | Degrey | outerwear | VERIFIED_EXACT |
| `cropped-bomber-jacket.jpg` | Cropped Nylon Bomber Jacket | No Brand (generic) | outerwear | VERIFIED_GENERIC |
| `hm-regular-woolblend-jacket.jpg` | Wool-Blend Collared Zip Jacket | No Brand (generic) | outerwear | VERIFIED_GENERIC |
| `levents-raw-denim-stitch-baggy-jeans.jpg` | Levents Raw Denim Stitch Baggy Jeans | Levents | pants | VERIFIED_EXACT |
| `bad-habits-cargo-pants.jpg` | Bad Habits Washed Baggy Denim Pants | Bad Habits | pants | VERIFIED_EXACT |
| `sportwear-club-fleece-cargo-pants.jpg` | Nike Sportswear Club Fleece Cargo Pants | Nike | pants | VERIFIED_EXACT |
| `classic-trousers.jpg` | Puma Classics Cargo Joggers | Puma | pants | VERIFIED_EXACT |
| `puma-pants.jpg` | Puma Dare To Wide-Leg Pants | Puma | pants | VERIFIED_EXACT |
| `coolmate-jogger-pants.jpg` | Coolmate Daily Jogger Pants | Coolmate | pants | VERIFIED_EXACT |
| `coolmate-kaki-excool-pants.jpg` | Slim-Fit Excool Khaki Chinos | No Brand (generic) | pants | VERIFIED_GENERIC |
| `sweat-pants.jpg` | Relaxed Ankle Jogger Pants | No Brand (generic) | pants | VERIFIED_GENERIC |
| `puma-short.jpg` | Puma Run Favourite Woven Shorts | Puma | shorts | VERIFIED_EXACT |
| `adidas-samba-og.jpg` | Adidas Samba OG | Adidas | shoes | VERIFIED_EXACT |
| `adidas-gazelle.jpg` | Adidas Gazelle Indoor | Adidas | shoes | VERIFIED_EXACT |
| `unisex-palermo-sneakers.jpg` | Puma Palermo | Puma | shoes | VERIFIED_EXACT |
| `vans-sneakers.jpg` | Vans Skate Low | Vans | shoes | VERIFIED_EXACT |
| `shondo-sneaker.jpg` | Shondo Retro Low Sneaker | Shondo | shoes | VERIFIED_EXACT |
| `zara-chunky-sole-light-weight-sneaker.jpg` | Minimal White Court Sneakers | No Brand (generic) | shoes | VERIFIED_GENERIC |
| `retro-sneakers.jpg` | Retro Suede Runner Sneakers | No Brand (generic) | shoes | VERIFIED_GENERIC |
| `black-boots.jpg` | Black Leather Derby Shoes | No Brand (generic) | shoes | VERIFIED_GENERIC |
| `leather-sandals.jpg` | Brown Leather Cross-Strap Sandals | No Brand (generic) | slides | VERIFIED_GENERIC |
| `adidas-trefoil-cap.jpg` | Adidas Originals Trefoil Baseball Cap | Adidas | caps-hats | VERIFIED_EXACT |
| `nike-drifit-club.jpg` | Nike Heritage86 Metal Swoosh Cap | Nike | caps-hats | VERIFIED_EXACT |
| `boss-cap.jpg` | Hugo Boss Logo Baseball Cap | Hugo Boss | caps-hats | VERIFIED_EXACT |
| `dirtycoins-logo-cap.jpg` | DirtyCoins Racing Flame Cap | DirtyCoins | caps-hats | VERIFIED_EXACT |
| `hades-logo-beanie.jpg` | Hades Studio Logo Cuff Beanie | Hades | caps-hats | VERIFIED_EXACT |
| `wool-slouchy-beany.jpg` | Charcoal Slouchy Knit Beanie | No Brand (generic) | caps-hats | VERIFIED_GENERIC |
| `nike-everyday-socks.jpg` | Nike Everyday Cushioned Crew Socks (Pack) | Nike | accessories | VERIFIED_EXACT |
| `uniqlo-socks.jpg` | Argyle Patterned Dress Socks | No Brand (generic) | accessories | VERIFIED_GENERIC |
| `puma-cyclone-black-watch.jpg` | Puma Cyclone Chronograph Watch | Puma | accessories | VERIFIED_EXACT |
| `chain-necklace.jpg` | Gold-Tone Cuban Link Chain Necklace | No Brand (generic) | accessories | VERIFIED_GENERIC |
| `black-satin-tie.jpg` | Black Satin Slim Tie | No Brand (generic) | accessories | VERIFIED_GENERIC |
| `dotted-tie.jpg` | Navy Pin-Dot Silk Tie | No Brand (generic) | accessories | VERIFIED_GENERIC |
| `hm-necktie.jpg` | Navy Repp Stripe Tie | No Brand (generic) | accessories | VERIFIED_GENERIC |
| `palmwrap-gloves.jpg` | Adidas Leather Golf Glove | Adidas | accessories | VERIFIED_EXACT |
| `motoport-racing-glove.jpg` | Armored Motorsport Riding Gloves | No Brand (generic) | accessories | VERIFIED_GENERIC |
| `wallet-2.jpg` | Nike Air Max Card Wallet | Nike | wallets | VERIFIED_EXACT |
| `purse.jpg` | Tan Leather Zip-Around Long Wallet | No Brand (generic) | wallets | VERIFIED_GENERIC |
| `seamless-boxer-briefs-grey.jpg` | Seamless AIRism-Style Boxer Briefs | No Brand (generic) | underwear | VERIFIED_GENERIC |
| `coach-tabby-shoulder-bag.jpg` | Coach Tabby Quilted Shoulder Bag | Coach | bags | VERIFIED_EXACT |
| `michael-kors-jet-set-tote.jpg` | Michael Kors Jet Set Travel Tote | Michael Kors | bags | VERIFIED_EXACT |
| `levi-tote-bag.jpg` | Levi's Canvas Carry-All Tote | Levi's | bags | VERIFIED_EXACT |
| `nike-one-tote.jpg` | Nike One Training Tote Bag | Nike | bags | VERIFIED_EXACT |
| `nike-utility-power-2.0.jpg` | Nike Utility Power Training Duffel | Nike | bags | VERIFIED_EXACT |
| `hades-leather-backpack.jpg` | Hades Studded Leather Backpack | Hades | backpacks | VERIFIED_EXACT |
| `vans-old-skool-bagpack.jpg` | Vans Old Skool Backpack | Vans | backpacks | VERIFIED_EXACT |
| `pebble-mini-bagpack.jpg` | Navy Pebbled Leather Mini Backpack | No Brand (generic) | backpacks | VERIFIED_GENERIC |
| `ergonomic-bagpack.jpg` | Navy Ergonomic Commuter Daypack | No Brand (generic) | backpacks | VERIFIED_GENERIC |
| `charles-keith-gabine-bag.jpg` | Charles & Keith Gabine Saddle Bag | Charles & Keith | crossbody-bags | VERIFIED_EXACT |
| `crossbody-4.jpg` | The North Face Convertible Crossbody Bag | The North Face | crossbody-bags | VERIFIED_EXACT |
| `hades-humid-wasteland-bag.jpg` | Hades Humid Wasteland Distressed Denim Bag | Hades | crossbody-bags | VERIFIED_EXACT |
| `degrey-simili-cross-bag.jpg` | Degrey Simili Cross Mini Bag | Degrey | crossbody-bags | VERIFIED_EXACT |
| `davies-mini-shoulder-bag.jpg` | Davies Original Utility Messenger Sling | Davies | crossbody-bags | VERIFIED_EXACT |
| `nylon-metal-pouch-bag.jpg` | Nylon Compass Utility Crossbody Bag | No Brand (generic) | crossbody-bags | VERIFIED_GENERIC |
| `crossbody-2.jpg` | Black Leather Saddle Crossbody Bag | No Brand (generic) | crossbody-bags | VERIFIED_GENERIC |
| `crossbody-3.jpg` | Quilted Black Crossbody Bag | No Brand (generic) | crossbody-bags | VERIFIED_GENERIC |
| `loen-shoulder-bag.jpg` | Soft Leather Baguette Shoulder Bag | No Brand (generic) | crossbody-bags | VERIFIED_GENERIC |
| `mini-top-handle-satchel-bag.jpg` | Patent Mini Top-Handle Bag | No Brand (generic) | crossbody-bags | VERIFIED_GENERIC |
| `mini-bowler-bag.jpg` | Adidas Originals Patent Bowler Bag | Adidas | bowler-bags | VERIFIED_EXACT |
| `bowler-bag.jpg` | Black Leather Classic Bowler Bag | No Brand (generic) | bowler-bags | VERIFIED_GENERIC |

## Verified assets in the expansion batch (13, added 2026-07-18)

| Image file | Product | Brand | Category | Verification |
| --- | --- | --- | --- | --- |
| `nike-air-force-1-white.jpg` | Nike Air Force 1 Low White | Nike | shoes | VERIFIED_EXACT |
| `new-balance-550-burgundy.jpg` | New Balance 550 Burgundy | New Balance | shoes | VERIFIED_EXACT |
| `converse-chuck-taylor-leather.jpg` | Converse Chuck Taylor All Star Leather | Converse | shoes | VERIFIED_EXACT |
| `dr-martens-1460-boots.jpg` | Dr. Martens 1460 Oxblood Boots | Dr. Martens | shoes | VERIFIED_EXACT |
| `casio-gshock-gw-m5610u.jpg` | Casio G-Shock GW-M5610U | Casio | accessories | VERIFIED_EXACT |
| `adidas-adilette-slides.jpg` | Adidas Adilette Slides | Adidas | slides | VERIFIED_EXACT |
| `jansport-classic-backpack.jpg` | JanSport Classic Backpack | JanSport | backpacks | VERIFIED_EXACT |
| `rayban-original-wayfarer.jpg` | Ray-Ban Original Wayfarer | Ray-Ban | accessories | VERIFIED_EXACT |
| `nike-dunk-low-grey-fog.jpg` | Nike Dunk Low Grey Fog | Nike | shoes | VERIFIED_EXACT |
| `birkenstock-arizona-esd.jpg` | Birkenstock Arizona ESD Sandals | Birkenstock | slides | VERIFIED_EXACT |
| `adidas-stan-smith.jpg` | Adidas Stan Smith | Adidas | shoes | VERIFIED_EXACT |
| `crocs-classic-clog.jpg` | Crocs Classic Clog | Crocs | slides | VERIFIED_EXACT |
| `nike-air-max-90-black.jpg` | Nike Air Max 90 Black | Nike | shoes | VERIFIED_EXACT |
| `slingbag.jpg` | Tan & Loom Pebbled Leather Crossbody Bag | Tan & Loom | crossbody-bags | VERIFIED_EXACT |

All 14 are VERIFIED_EXACT (branded, model-specific) — no generic images were
needed for this batch since the goal was brand diversity. Every image visibly
shows the stated brand's logo/wordmark/silhouette (Nike swoosh, adidas
3-stripes/trefoil, Converse tongue label, Dr. Martens AirWair heel loop and
yellow welt stitch, CASIO/G-SHOCK dial text, JanSport chest patch, Ray-Ban
temple/lens etch, Birkenstock cork sole + ESD logo patch, Crocs strap rivet
logo, Tan & Loom embossed hardware) — confirmed by direct visual inspection,
not inferred from the source filename.

**Categories intentionally left without a new asset:** `phone-cases` — no
Commons search for generic/branded phone cases returned a clean, confidently-
matchable product photo. Rather than attach a mismatched or lifestyle image,
this category remains empty, consistent with the "skip a product rather than
attach an inaccurate image" rule established in the original Phase 6 pass.
Apparel categories (hoodies, sweaters, jerseys, jackets) also had very thin
Commons coverage — most search terms returned zero results or only lifestyle/
action photography unsuitable for a clean product listing, which is why the
expansion batch skews toward footwear, bags, and accessories where Commons'
coverage is much stronger.

## Rejected / unused assets (21) — not attached to any listing

**Mismatched content or lifestyle/placeholder shots (LoremFlickr-era leftovers):**

- `nike-air-force-1.jpg` — photo is actually **ASICS** green runners, not a Nike Air Force 1.
- `new-balance-550.jpg` — grey runner in a busy styled scene; not the 550 model.
- `nike-sportswear-club-tee.jpg` — random "Breakfast" beer graphic worn by a person; not Nike.
- `routine-smart-chinos.jpg` — extreme close-up of Puma jacket snap buttons; not chinos.
- `levents-tote-bag.jpg` — shows a seated person's sneakers, not a tote bag.
- `levis-501-original-jeans.jpg` — lifestyle photo of jeans on a person; not a clean product shot.
- `hm-relaxed-fit-hoodie.jpg` — dark lifestyle photo of a person in an orange hoodie.
- `hoodie-extra1.jpg` — lifestyle photo of a person in a blue hoodie in a living room.
- `tshirt-extra1.jpg` — Coke-parody graphic tee on a hanger, busy background.
- `slides-1.jpg`, `slides-2.jpg`, `slides-3.jpg` — feet/sneakers shot in a car footwell; not slides.
- `slides-4.jpg` — high-top sneakers on a table (angled lifestyle); not slides.

**Out of scope (non-fashion):**

- `brown-towel.jpg`, `cotton-guest-towels.jpg` — bath towels.
- `rothco-tool-bag.jpg` — canvas mechanics tool bag ("BAG, TOOL, MECHANICS").

**Too low-resolution for a catalog card:**

- `puma-essentials-hoodie.jpg` (194×259, ~3 KB) — genuine Puma hoodie but tiny.
- `dirtycoin-bag.jpg` (201×251, ~4 KB) — genuine DirtyCoins monogram backpack but tiny.
- `nylon-cap.jpg` (225×225, ~4 KB) — 5-panel cap but tiny.

**Surplus / not individually re-verified (usable, simply not needed):**

- `unisex-utility-shoulder-bag.jpg` — clean nylon round shoulder bag; crossbody category already well covered.
- `slingbag.jpg` — left unused pending individual verification.
