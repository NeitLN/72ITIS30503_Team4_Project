/**
 * StyleHub — Verified catalog manifest (Phase 6 expansion)
 * ----------------------------------------------------------
 * Single source of truth for the demo/seed catalog. Every entry maps to a
 * REAL, visually-verified image asset in frontend/public/images/products/.
 * Branded products use an image of that exact brand/model; generic listings
 * use unbranded images with no brand attached. See IMAGE_SOURCES.md for the
 * per-asset provenance/verification/license record.
 *
 * This file is data only (no I/O, no Supabase calls) so it can be imported
 * by both the seeder (seedVerifiedCatalog.js) and the validator.
 */
const path = require('path');
const fs = require('fs');

const IMG_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', 'products');
const imgPath = (file) => `/images/products/${file}`;

// Fixed base date -> deterministic created_at ordering across reruns.
const BASE_DATE = Date.parse('2026-07-16T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Brands (slug -> display name, is_local). Only brands backed by verified images.
// ---------------------------------------------------------------------------
const BRANDS = [
  { slug: 'nike', name: 'Nike', is_local: false },
  { slug: 'adidas', name: 'Adidas', is_local: false },
  { slug: 'puma', name: 'Puma', is_local: false },
  { slug: 'vans', name: 'Vans', is_local: false },
  { slug: 'uniqlo', name: 'Uniqlo', is_local: false },
  { slug: 'levis', name: "Levi's", is_local: false },
  { slug: 'hugo-boss', name: 'Hugo Boss', is_local: false },
  { slug: 'coach', name: 'Coach', is_local: false },
  { slug: 'michael-kors', name: 'Michael Kors', is_local: false },
  { slug: 'charles-keith', name: 'Charles & Keith', is_local: false },
  { slug: 'the-north-face', name: 'The North Face', is_local: false },
  // New in Phase 6 expansion (all VERIFIED_EXACT, sourced from Wikimedia Commons —
  // see IMAGE_SOURCES.md "Phase 6 expansion" table for license + attribution)
  { slug: 'new-balance', name: 'New Balance', is_local: false },
  { slug: 'converse', name: 'Converse', is_local: false },
  { slug: 'dr-martens', name: 'Dr. Martens', is_local: false },
  { slug: 'casio', name: 'Casio', is_local: false },
  { slug: 'jansport', name: 'JanSport', is_local: false },
  { slug: 'rayban', name: 'Ray-Ban', is_local: false },
  { slug: 'birkenstock', name: 'Birkenstock', is_local: false },
  { slug: 'crocs', name: 'Crocs', is_local: false },
  { slug: 'tan-loom', name: 'Tan & Loom', is_local: false },
  // Vietnamese / local streetwear
  { slug: 'dirtycoins', name: 'DirtyCoins', is_local: true },
  { slug: 'hades', name: 'Hades', is_local: true },
  { slug: 'degrey', name: 'Degrey', is_local: true },
  { slug: 'levents', name: 'Levents', is_local: true },
  { slug: 'coolmate', name: 'Coolmate', is_local: true },
  { slug: 'davies', name: 'Davies', is_local: true },
  { slug: 'shondo', name: 'Shondo', is_local: true },
  { slug: 'bad-habits', name: 'Bad Habits', is_local: true },
  { slug: 'grimm-dc', name: 'Grimm DC', is_local: true },
  { slug: 'clownz', name: 'Clownz', is_local: true },
  { slug: 'machine56', name: 'Machine56', is_local: true },
  { slug: 'teelab', name: 'Teelab Studio', is_local: true },
  { slug: 'now-saigon', name: 'NOW Saigon', is_local: true },
  { slug: 'aoki', name: 'Aoki', is_local: true },
  { slug: 'str8eway', name: 'STR8EWAY', is_local: true },
  // Phase 6.2 expansion (2026-07-18, catalog growth toward 200) — new
  // international brands, each backed by a visually-confirmed logo/wordmark
  // in a real image the team added in commit 3753a04.
  { slug: 'ader-error', name: 'Ader Error', is_local: false },
  { slug: 'arcteryx', name: "Arc'teryx", is_local: false },
  { slug: 'balenciaga', name: 'Balenciaga', is_local: false },
  { slug: 'bape', name: 'BAPE', is_local: false },
  { slug: 'champion', name: 'Champion', is_local: false },
  { slug: 'gucci', name: 'Gucci', is_local: false },
  { slug: 'mlb', name: 'MLB', is_local: false },
  { slug: 'salomon', name: 'Salomon', is_local: false },
  { slug: 'stussy', name: 'Stussy', is_local: false },
  { slug: 'supreme', name: 'Supreme', is_local: false },
  { slug: 'tobi', name: 'Tobi', is_local: false },
  { slug: 'essentials', name: 'Essentials Fear of God', is_local: false },
  { slug: 'fila', name: 'Fila', is_local: false },
  { slug: 'patagonia', name: 'Patagonia', is_local: false },
];

// ---------------------------------------------------------------------------
// Canonical categories that must exist (child leaf slugs used by products).
// ---------------------------------------------------------------------------
const CANONICAL_CATEGORIES = [
  't-shirts', 'jerseys', 'shirts', 'sweaters-cardigans', 'hoodies', 'outerwear',
  'pants', 'shorts', 'shoes', 'slides', 'boots', 'loafers', 'other-shoes',
  'caps-hats', 'accessories', 'wallets',
  'underwear', 'bags', 'backpacks', 'crossbody-bags', 'bowler-bags',
];

// ---------------------------------------------------------------------------
// Real demo seller accounts already present in the DB (role=customer,
// @stylehub.demo emails). Products are distributed round-robin across these
// four so every product references a valid, existing seller — never a
// randomly-created auth user, never a real user's account.
// ---------------------------------------------------------------------------
const SELLERS = [
  { id: '916d2b74-e637-4ad1-b7fc-1ad9d7dd0221', name: 'Minh Tran' },
  { id: '13b89382-2e42-4a8d-9afe-c597182080fb', name: 'Linh Nguyen' },
  { id: 'e3e63231-0d77-4c72-a4a5-121c40fbe62f', name: 'Quang Minh' },
  { id: '62f82b31-a5ea-469b-9e45-8ab4449f2787', name: 'Thao Vy' },
];
const LOCATIONS = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Bien Hoa', 'Nha Trang', 'Hue'];

// ---------------------------------------------------------------------------
// Curated products. brand=null -> generic unbranded listing (no brand attached).
// price/sale in VND. img = exact verified filename on disk. feat=true -> featured.
// ---------------------------------------------------------------------------
const P = [
  // ==== ORIGINAL PHASE 6 CATALOG (82 products, unchanged slugs/images) ====
  // ---- TOPS: t-shirts ----
  { slug: 'adidas-originals-trefoil-tee', name: 'Adidas Originals Trefoil Tee', brand: 'adidas', cat: 't-shirts', img: 'adidas-trefoil-tee.jpg', price: 450000, sale: 320000, cond: 'like_new', size: 'M' },
  { slug: 'levents-popular-logo-tee', name: 'Levents Popular Logo Tee', brand: 'levents', cat: 't-shirts', img: 'levents-popular-logo-tee.jpg', price: 350000, cond: 'new_with_tags', size: 'L' },
  { slug: 'dirtycoins-icon-oversized-tee', name: 'DirtyCoins Icon Oversized Tee', brand: 'dirtycoins', cat: 't-shirts', img: 'dirtycoins-oversized-tee.jpg', price: 390000, cond: 'like_new', size: 'XL' },
  { slug: 'uniqlo-u-crew-neck-tee', name: 'Uniqlo U Crew Neck Tee', brand: 'uniqlo', cat: 't-shirts', img: 'uniqlo-u-crew-neck-tee.jpg', price: 199000, cond: 'good', size: 'M' },
  { slug: 'uniqlo-ut-minimal-graphic-tee', name: 'Uniqlo UT Minimal Graphic Tee', brand: 'uniqlo', cat: 't-shirts', img: 'uniqlo-logo-shirt.jpg', price: 210000, cond: 'like_new', size: 'L' },
  { slug: 'pucci-emblem-graphic-tee', name: 'Pucci Emblem Graphic Tee', brand: null, cat: 't-shirts', img: 'pucci-logo-shirt.jpg', price: 480000, sale: 360000, cond: 'good', size: 'M' },
  { slug: 'ribbed-white-long-sleeve-top', name: 'Ribbed White Long-Sleeve Top', brand: null, cat: 't-shirts', img: 'white-jersey.jpg', price: 180000, cond: 'good', size: 'S' },

  // ---- TOPS: shirts ----
  { slug: 'hades-heartlock-plaid-shirt', name: 'Hades Heartlock Plaid Short-Sleeve Shirt', brand: 'hades', cat: 'shirts', img: 'hades-heartlock-shirt.jpg', price: 520000, cond: 'like_new', size: 'L' },
  { slug: 'coolmate-classic-oxford-polo', name: 'Coolmate Cotton Compact Polo', brand: 'coolmate', cat: 'shirts', img: 'coolmate-shirt.jpg', price: 265000, sale: 199000, cond: 'new_with_tags', size: 'L' },
  { slug: 'armani-exchange-patterned-resort-shirt', name: 'Patterned Resort Short-Sleeve Shirt', brand: null, cat: 'shirts', img: 'fresh-cotton-shirt.jpg', price: 430000, cond: 'good', size: 'M' },
  { slug: 'natural-linen-blend-shirt', name: 'Natural Linen-Blend Long-Sleeve Shirt', brand: null, cat: 'shirts', img: 'linen-shirt.jpg', price: 320000, cond: 'like_new', size: 'M' },
  { slug: 'classic-white-oxford-shirt', name: 'Classic White Oxford Shirt', brand: null, cat: 'shirts', img: 'oxford-shirt.jpg', price: 290000, cond: 'good', size: 'L' },
  { slug: 'panda-bamboo-embroidered-shirt', name: 'Panda Bamboo Embroidered Camp Shirt', brand: null, cat: 'shirts', img: 'oriental-bamboo-shirt.jpg', price: 275000, cond: 'like_new', size: 'M' },
  { slug: 'buffalo-check-flannel-shirt', name: 'Buffalo Check Flannel Shirt', brand: null, cat: 'shirts', img: 'plaid-fannel-shirt.jpg', price: 340000, sale: 255000, cond: 'good', size: 'L' },

  // ---- TOPS: jerseys ----
  { slug: 'custom-team-football-jersey', name: 'Custom Team Football Jersey', brand: null, cat: 'jerseys', img: 'football-jersey.jpg', price: 250000, cond: 'new_with_tags', size: 'L' },
  { slug: 'woodland-camo-tactical-combat-shirt', name: 'Woodland Camo Tactical Combat Shirt', brand: null, cat: 'jerseys', img: 'rothco-tactical-jersey.jpg', price: 380000, cond: 'good', size: 'M' },

  // ---- TOPS: sweaters-cardigans ----
  { slug: 'hugo-boss-cotton-knit-sweater', name: 'Hugo Boss Cotton Knit Crewneck Sweater', brand: 'hugo-boss', cat: 'sweaters-cardigans', img: 'boss-cotton-knited-sweater.jpg', price: 890000, sale: 690000, cond: 'like_new', size: 'M' },

  // ---- TOPS: hoodies ----
  { slug: 'sweazy-999-cross-graphic-hoodie', name: 'Sweazy 999 Cross Graphic Hoodie', brand: null, cat: 'hoodies', img: 'swe-hoodie.jpg', price: 560000, cond: 'like_new', size: 'L' },
  { slug: 'hm-loose-fit-green-hoodie', name: 'Loose-Fit Green Pullover Hoodie', brand: null, cat: 'hoodies', img: 'hm-loose-fit-hoodie.jpg', price: 320000, sale: 235000, cond: 'good', size: 'L' },
  { slug: 'essentials-black-oversized-hoodie', name: 'Oversized Black Pullover Hoodie', brand: null, cat: 'hoodies', img: 'grimm-dc-hoodie.jpg', price: 300000, cond: 'good', size: 'XL' },

  // ---- OUTERWEAR ----
  { slug: 'adidas-originals-frog-button-track-jacket', name: 'Adidas Originals Frog-Button Track Jacket', brand: 'adidas', cat: 'outerwear', img: 'adidas-buttonup-jacket.jpg', price: 1250000, sale: 980000, cond: 'like_new', size: 'M' },
  { slug: 'hugo-boss-leather-zip-jacket', name: 'Hugo Boss Regular-Fit Leather Jacket', brand: 'hugo-boss', cat: 'outerwear', img: 'boss-regular-fit-leather-jacket.jpg', price: 3200000, cond: 'excellent', size: 'L', feat: true },
  { slug: 'degrey-athlete-coach-jacket', name: 'Degrey Athlete Embroidered Jacket', brand: 'degrey', cat: 'outerwear', img: 'degrey-varsity-hoodie.jpg', price: 680000, cond: 'like_new', size: 'L', feat: true },
  { slug: 'cropped-nylon-bomber-jacket', name: 'Cropped Nylon Bomber Jacket', brand: null, cat: 'outerwear', img: 'cropped-bomber-jacket.jpg', price: 520000, cond: 'good', size: 'S' },
  { slug: 'wool-blend-collared-zip-jacket', name: 'Wool-Blend Collared Zip Jacket', brand: null, cat: 'outerwear', img: 'hm-regular-woolblend-jacket.jpg', price: 610000, sale: 450000, cond: 'good', size: 'M' },

  // ---- BOTTOMS: pants ----
  { slug: 'levents-raw-denim-baggy-jeans', name: 'Levents Raw Denim Stitch Baggy Jeans', brand: 'levents', cat: 'pants', img: 'levents-raw-denim-stitch-baggy-jeans.jpg', price: 690000, cond: 'like_new', size: 'M' },
  { slug: 'bad-habits-washed-baggy-denim', name: 'Bad Habits Washed Baggy Denim Pants', brand: 'bad-habits', cat: 'pants', img: 'bad-habits-cargo-pants.jpg', price: 720000, sale: 540000, cond: 'like_new', size: 'L' },
  { slug: 'nike-club-fleece-cargo-pants', name: 'Nike Sportswear Club Fleece Cargo Pants', brand: 'nike', cat: 'pants', img: 'sportwear-club-fleece-cargo-pants.jpg', price: 950000, cond: 'new_with_tags', size: 'L', feat: true },
  { slug: 'puma-relaxed-cargo-joggers', name: 'Puma Classics Cargo Joggers', brand: 'puma', cat: 'pants', img: 'classic-trousers.jpg', price: 620000, cond: 'good', size: 'M' },
  { slug: 'puma-woven-wide-leg-pants', name: 'Puma Dare To Wide-Leg Pants', brand: 'puma', cat: 'pants', img: 'puma-pants.jpg', price: 560000, sale: 420000, cond: 'like_new', size: 'M' },
  { slug: 'coolmate-daily-jogger-pants', name: 'Coolmate Daily Jogger Pants', brand: 'coolmate', cat: 'pants', img: 'coolmate-jogger-pants.jpg', price: 245000, cond: 'good', size: 'L' },
  { slug: 'coolmate-excool-khaki-chinos', name: 'Slim-Fit Excool Khaki Chinos', brand: null, cat: 'pants', img: 'coolmate-kaki-excool-pants.jpg', price: 280000, cond: 'good', size: 'M' },
  { slug: 'uniqlo-relaxed-jogger-pants', name: 'Relaxed Ankle Jogger Pants', brand: null, cat: 'pants', img: 'sweat-pants.jpg', price: 190000, cond: 'good', size: 'M' },

  // ---- BOTTOMS: shorts ----
  { slug: 'puma-favourite-running-shorts', name: 'Puma Run Favourite Woven Shorts', brand: 'puma', cat: 'shorts', img: 'puma-short.jpg', price: 290000, sale: 210000, cond: 'like_new', size: 'M' },

  // ---- FOOTWEAR: shoes ----
  { slug: 'adidas-samba-og-white-black', name: 'Adidas Samba OG', brand: 'adidas', cat: 'shoes', img: 'adidas-samba-og.jpg', price: 2100000, sale: 1750000, cond: 'like_new', size: 'EU 42', feat: true },
  { slug: 'adidas-gazelle-indoor-beige', name: 'Adidas Gazelle Indoor', brand: 'adidas', cat: 'shoes', img: 'adidas-gazelle.jpg', price: 2300000, cond: 'new_with_tags', size: 'EU 40' },
  { slug: 'puma-palermo-white-black', name: 'Puma Palermo', brand: 'puma', cat: 'shoes', img: 'unisex-palermo-sneakers.jpg', price: 1450000, cond: 'like_new', size: 'EU 43' },
  { slug: 'vans-skate-low-black-white', name: 'Vans Skate Low', brand: 'vans', cat: 'shoes', img: 'vans-sneakers.jpg', price: 1150000, sale: 890000, cond: 'good', size: 'EU 41' },
  { slug: 'shondo-retro-low-sneaker', name: 'Shondo Retro Low Sneaker', brand: 'shondo', cat: 'shoes', img: 'shondo-sneaker.jpg', price: 690000, cond: 'like_new', size: 'EU 42' },
  { slug: 'minimal-white-court-sneakers', name: 'Minimal White Court Sneakers', brand: null, cat: 'shoes', img: 'zara-chunky-sole-light-weight-sneaker.jpg', price: 420000, cond: 'good', size: 'EU 41' },
  { slug: 'retro-suede-runner-sneakers', name: 'Retro Suede Runner Sneakers', brand: null, cat: 'shoes', img: 'retro-sneakers.jpg', price: 380000, cond: 'good', size: 'EU 40' },
  { slug: 'black-leather-derby-shoes', name: 'Black Leather Derby Shoes', brand: null, cat: 'loafers', img: 'black-boots.jpg', price: 550000, cond: 'excellent', size: 'EU 42' },

  // ---- FOOTWEAR: slides ----
  { slug: 'brown-leather-cross-strap-sandals', name: 'Brown Leather Cross-Strap Sandals', brand: null, cat: 'slides', img: 'leather-sandals.jpg', price: 350000, cond: 'like_new', size: 'EU 40' },

  // ---- ACCESSORIES: caps-hats ----
  { slug: 'adidas-originals-trefoil-cap', name: 'Adidas Originals Trefoil Baseball Cap', brand: 'adidas', cat: 'caps-hats', img: 'adidas-trefoil-cap.jpg', price: 320000, cond: 'new_with_tags', size: 'One Size' },
  { slug: 'nike-heritage86-metal-swoosh-cap', name: 'Nike Heritage86 Metal Swoosh Cap', brand: 'nike', cat: 'caps-hats', img: 'nike-drifit-club.jpg', price: 350000, sale: 260000, cond: 'like_new', size: 'One Size' },
  { slug: 'hugo-boss-logo-baseball-cap', name: 'Hugo Boss Logo Baseball Cap', brand: 'hugo-boss', cat: 'caps-hats', img: 'boss-cap.jpg', price: 480000, cond: 'like_new', size: 'One Size' },
  { slug: 'dirtycoins-racing-flame-cap', name: 'DirtyCoins Racing Flame Cap', brand: 'dirtycoins', cat: 'caps-hats', img: 'dirtycoins-logo-cap.jpg', price: 290000, cond: 'like_new', size: 'One Size' },
  { slug: 'hades-studio-cuff-beanie', name: 'Hades Studio Logo Cuff Beanie', brand: 'hades', cat: 'caps-hats', img: 'hades-logo-beanie.jpg', price: 250000, cond: 'good', size: 'One Size' },
  { slug: 'charcoal-slouchy-knit-beanie', name: 'Charcoal Slouchy Knit Beanie', brand: null, cat: 'caps-hats', img: 'wool-slouchy-beany.jpg', price: 150000, cond: 'good', size: 'One Size' },

  // ---- ACCESSORIES: other ----
  { slug: 'nike-everyday-cushion-crew-socks', name: 'Nike Everyday Cushioned Crew Socks (Pack)', brand: 'nike', cat: 'accessories', img: 'nike-everyday-socks.jpg', price: 190000, cond: 'new_with_tags', size: 'One Size' },
  { slug: 'uniqlo-argyle-dress-socks', name: 'Argyle Patterned Dress Socks', brand: null, cat: 'accessories', img: 'uniqlo-socks.jpg', price: 90000, cond: 'new_with_tags', size: 'One Size' },
  { slug: 'puma-cyclone-chronograph-watch', name: 'Puma Cyclone Chronograph Watch', brand: 'puma', cat: 'accessories', img: 'puma-cyclone-black-watch.jpg', price: 1250000, sale: 950000, cond: 'excellent', size: 'One Size' },
  { slug: 'gold-cuban-link-chain-necklace', name: 'Gold-Tone Cuban Link Chain Necklace', brand: null, cat: 'accessories', img: 'chain-necklace.jpg', price: 240000, cond: 'like_new', size: 'One Size' },
  { slug: 'black-satin-slim-tie', name: 'Black Satin Slim Tie', brand: null, cat: 'accessories', img: 'black-satin-tie.jpg', price: 120000, cond: 'new_with_tags', size: 'One Size' },
  { slug: 'navy-dot-silk-tie', name: 'Navy Pin-Dot Silk Tie', brand: null, cat: 'accessories', img: 'dotted-tie.jpg', price: 130000, cond: 'good', size: 'One Size' },
  { slug: 'navy-repp-stripe-tie', name: 'Navy Repp Stripe Tie', brand: null, cat: 'accessories', img: 'hm-necktie.jpg', price: 125000, cond: 'good', size: 'One Size' },
  { slug: 'adidas-leather-golf-glove', name: 'Adidas Leather Golf Glove', brand: 'adidas', cat: 'accessories', img: 'palmwrap-gloves.jpg', price: 260000, cond: 'like_new', size: 'One Size' },
  { slug: 'armored-motorsport-riding-gloves', name: 'Armored Motorsport Riding Gloves', brand: null, cat: 'accessories', img: 'motoport-racing-glove.jpg', price: 420000, cond: 'good', size: 'One Size' },

  // ---- ACCESSORIES: wallets ----
  { slug: 'nike-air-max-card-wallet', name: 'Nike Air Max Card Wallet', brand: 'nike', cat: 'wallets', img: 'wallet-2.jpg', price: 450000, cond: 'like_new', size: 'One Size' },
  { slug: 'tan-leather-zip-around-wallet', name: 'Tan Leather Zip-Around Long Wallet', brand: null, cat: 'wallets', img: 'purse.jpg', price: 310000, sale: 235000, cond: 'good', size: 'One Size' },

  // ---- UNDERWEAR ----
  { slug: 'seamless-boxer-briefs-grey', name: 'Seamless AIRism-Style Boxer Briefs', brand: null, cat: 'underwear', img: 'seamless-boxer-briefs-grey.jpg', price: 150000, cond: 'new_with_tags', size: 'L' },

  // ---- BAGS: totes / shoulder ----
  { slug: 'coach-tabby-quilted-shoulder-bag', name: 'Coach Tabby Quilted Shoulder Bag', brand: 'coach', cat: 'bags', img: 'coach-tabby-shoulder-bag.jpg', price: 4800000, sale: 3900000, cond: 'excellent', size: 'One Size', feat: true },
  { slug: 'michael-kors-jet-set-travel-tote', name: 'Michael Kors Jet Set Travel Tote', brand: 'michael-kors', cat: 'bags', img: 'michael-kors-jet-set-tote.jpg', price: 3600000, cond: 'like_new', size: 'One Size', feat: true },
  { slug: 'levis-canvas-carry-all-tote', name: "Levi's Canvas Carry-All Tote", brand: 'levis', cat: 'bags', img: 'levi-tote-bag.jpg', price: 520000, cond: 'good', size: 'One Size' },
  { slug: 'nike-one-training-tote-bag', name: 'Nike One Training Tote Bag', brand: 'nike', cat: 'bags', img: 'nike-one-tote.jpg', price: 690000, cond: 'like_new', size: 'One Size' },
  { slug: 'nike-utility-power-duffel-teal', name: 'Nike Utility Power Training Duffel', brand: 'nike', cat: 'bags', img: 'nike-utility-power-2.0.jpg', price: 850000, sale: 640000, cond: 'good', size: 'One Size' },

  // ---- BAGS: backpacks ----
  { slug: 'hades-studded-leather-backpack', name: 'Hades Studded Leather Backpack', brand: 'hades', cat: 'backpacks', img: 'hades-leather-backpack.jpg', price: 780000, cond: 'like_new', size: 'One Size', feat: true },
  { slug: 'vans-old-skool-backpack-black', name: 'Vans Old Skool Backpack', brand: 'vans', cat: 'backpacks', img: 'vans-old-skool-bagpack.jpg', price: 620000, cond: 'good', size: 'One Size' },
  { slug: 'navy-pebbled-mini-backpack', name: 'Navy Pebbled Leather Mini Backpack', brand: null, cat: 'backpacks', img: 'pebble-mini-bagpack.jpg', price: 340000, cond: 'like_new', size: 'One Size' },
  { slug: 'navy-ergonomic-daypack', name: 'Navy Ergonomic Commuter Daypack', brand: null, cat: 'backpacks', img: 'ergonomic-bagpack.jpg', price: 380000, cond: 'good', size: 'One Size' },

  // ---- BAGS: crossbody ----
  { slug: 'charles-keith-gabine-saddle-bag', name: 'Charles & Keith Gabine Saddle Bag', brand: 'charles-keith', cat: 'crossbody-bags', img: 'charles-keith-gabine-bag.jpg', price: 1150000, sale: 890000, cond: 'like_new', size: 'One Size' },
  { slug: 'north-face-neon-shoulder-crossbody', name: 'The North Face Convertible Crossbody Bag', brand: 'the-north-face', cat: 'crossbody-bags', img: 'crossbody-4.jpg', price: 590000, cond: 'good', size: 'One Size' },
  { slug: 'hades-humid-wasteland-denim-bag', name: 'Hades Humid Wasteland Distressed Denim Bag', brand: 'hades', cat: 'crossbody-bags', img: 'hades-humid-wasteland-bag.jpg', price: 640000, cond: 'like_new', size: 'One Size' },
  { slug: 'degrey-simili-cross-mini-bag', name: 'Degrey Simili Cross Mini Bag', brand: 'degrey', cat: 'crossbody-bags', img: 'degrey-simili-cross-bag.jpg', price: 420000, cond: 'good', size: 'One Size' },
  { slug: 'davies-utility-messenger-sling', name: 'Davies Original Utility Messenger Sling', brand: 'davies', cat: 'crossbody-bags', img: 'davies-mini-shoulder-bag.jpg', price: 390000, cond: 'like_new', size: 'One Size' },
  { slug: 'nylon-compass-utility-crossbody', name: 'Nylon Compass Utility Crossbody Bag', brand: null, cat: 'crossbody-bags', img: 'nylon-metal-pouch-bag.jpg', price: 350000, cond: 'good', size: 'One Size' },
  { slug: 'black-leather-saddle-crossbody', name: 'Black Leather Saddle Crossbody Bag', brand: null, cat: 'crossbody-bags', img: 'crossbody-2.jpg', price: 330000, cond: 'good', size: 'One Size' },
  { slug: 'quilted-black-crossbody-bag', name: 'Quilted Black Crossbody Bag', brand: null, cat: 'crossbody-bags', img: 'crossbody-3.jpg', price: 360000, sale: 270000, cond: 'like_new', size: 'One Size' },
  { slug: 'soft-leather-baguette-shoulder-bag', name: 'Soft Leather Baguette Shoulder Bag', brand: null, cat: 'crossbody-bags', img: 'loen-shoulder-bag.jpg', price: 300000, cond: 'good', size: 'One Size' },
  { slug: 'patent-mini-top-handle-bag', name: 'Patent Mini Top-Handle Bag', brand: null, cat: 'crossbody-bags', img: 'mini-top-handle-satchel-bag.jpg', price: 220000, cond: 'good', size: 'One Size' },

  // ---- BAGS: bowler ----
  { slug: 'adidas-originals-patent-bowler-bag', name: 'Adidas Originals Patent Bowler Bag', brand: 'adidas', cat: 'bowler-bags', img: 'mini-bowler-bag.jpg', price: 560000, cond: 'like_new', size: 'One Size' },
  { slug: 'black-leather-classic-bowler-bag', name: 'Black Leather Classic Bowler Bag', brand: null, cat: 'bowler-bags', img: 'bowler-bag.jpg', price: 480000, sale: 360000, cond: 'good', size: 'One Size' },

  // ==== PHASE 6 EXPANSION (14 new products, added 2026-07-18) ====
  // Sourced from Wikimedia Commons under CC licenses (CC0/CC-BY/CC-BY-SA/Public
  // Domain) or an existing verified repo asset. Each visually confirmed to show
  // the exact stated brand/model. Full per-image attribution in IMAGE_SOURCES.md.
  { slug: 'nike-air-force-1-low-white', name: 'Nike Air Force 1 Low White', brand: 'nike', cat: 'shoes', img: 'nike-air-force-1-white.jpg', price: 1350000, cond: 'like_new', size: 'EU 42' },
  { slug: 'new-balance-550-burgundy', name: 'New Balance 550 Burgundy', brand: 'new-balance', cat: 'shoes', img: 'new-balance-550-burgundy.jpg', price: 2450000, sale: 1990000, cond: 'new_with_tags', size: 'EU 41' },
  { slug: 'converse-chuck-taylor-leather-black', name: 'Converse Chuck Taylor All Star Leather', brand: 'converse', cat: 'shoes', img: 'converse-chuck-taylor-leather.jpg', price: 890000, sale: 690000, cond: 'like_new', size: 'EU 39' },
  { slug: 'dr-martens-1460-oxblood-boots', name: 'Dr. Martens 1460 Oxblood Boots', brand: 'dr-martens', cat: 'boots', img: 'dr-martens-1460-boots.jpg', price: 1950000, cond: 'good', size: 'EU 40', feat: true },
  { slug: 'casio-gshock-gw-m5610u', name: 'Casio G-Shock GW-M5610U', brand: 'casio', cat: 'accessories', img: 'casio-gshock-gw-m5610u.jpg', price: 1650000, cond: 'like_new', size: 'One Size', feat: true },
  { slug: 'adidas-adilette-slides-navy', name: 'Adidas Adilette Slides', brand: 'adidas', cat: 'slides', img: 'adidas-adilette-slides.jpg', price: 450000, cond: 'good', size: 'EU 42' },
  { slug: 'jansport-classic-backpack-navy', name: 'JanSport Classic Backpack', brand: 'jansport', cat: 'backpacks', img: 'jansport-classic-backpack.jpg', price: 590000, sale: 450000, cond: 'like_new', size: 'One Size' },
  { slug: 'rayban-original-wayfarer-black', name: 'Ray-Ban Original Wayfarer', brand: 'rayban', cat: 'accessories', img: 'rayban-original-wayfarer.jpg', price: 2200000, cond: 'new_with_tags', size: 'One Size', feat: true },
  { slug: 'nike-dunk-low-grey-fog', name: 'Nike Dunk Low Grey Fog', brand: 'nike', cat: 'shoes', img: 'nike-dunk-low-grey-fog.jpg', price: 2450000, cond: 'new_with_tags', size: 'EU 43', feat: true },
  { slug: 'birkenstock-arizona-esd-black', name: 'Birkenstock Arizona ESD Sandals', brand: 'birkenstock', cat: 'slides', img: 'birkenstock-arizona-esd.jpg', price: 1450000, sale: 1150000, cond: 'new_with_tags', size: 'EU 41' },
  { slug: 'tan-loom-pebbled-leather-crossbody', name: 'Tan & Loom Pebbled Leather Crossbody Bag', brand: 'tan-loom', cat: 'crossbody-bags', img: 'slingbag.jpg', price: 780000, cond: 'like_new', size: 'One Size' },
  { slug: 'adidas-stan-smith-white-navy', name: 'Adidas Stan Smith', brand: 'adidas', cat: 'shoes', img: 'adidas-stan-smith.jpg', price: 1890000, cond: 'new_with_tags', size: 'EU 40', feat: true },
  { slug: 'crocs-classic-clog-black', name: 'Crocs Classic Clog', brand: 'crocs', cat: 'slides', img: 'crocs-classic-clog.jpg', price: 590000, sale: 450000, cond: 'like_new', size: 'EU 42' },
  { slug: 'nike-air-max-90-black', name: 'Nike Air Max 90 Black', brand: 'nike', cat: 'shoes', img: 'nike-air-max-90-black.jpg', price: 2150000, sale: 1750000, cond: 'good', size: 'EU 42' },

  // ==== PHASE 6.2 EXPANSION (52 new products, added from commit 3753a04's ====
  // 54 team-added image assets, added 2026-07-18). Every asset visually
  // inspected before use — several filenames were misleading vs. actual
  // content and were corrected here (see IMAGE_SOURCES.md "Phase 6.2" table):
  // adidas-ultraboost-light.jpg is actually an Adidas Duramo Speed 2 (visible
  // model text on the shoe), coolmate-active-v2-tee.jpg is cargo joggers not
  // a tee, tobi-essential-zip-hoodie.jpg is an Essentials Fear of God pullover
  // (not Tobi, not zip). uniqlo-airism-oversized-tee.jpg was rejected outright
  // (ambiguous two-garment lifestyle crop, no confirmable brand mark).
  { slug: 'ader-error-tetris-logo-tee', name: 'Ader Error Tetris Logo Tee', brand: 'ader-error', cat: 't-shirts', img: 'ader-error-tetris-logo-tee.jpg', price: 950000, sale: 750000, cond: 'new_with_tags', size: 'M' },
  { slug: 'adidas-adicolor-trefoil-tee-white', name: 'Adidas Adicolor Trefoil Tee White', brand: 'adidas', cat: 't-shirts', img: 'adidas-originals-trefoil-tee.jpg', price: 420000, sale: 320000, cond: 'like_new', size: 'S' },
  { slug: 'arcteryx-beta-ar-shell-jacket', name: "Arc'teryx Beta AR Shell Jacket", brand: 'arcteryx', cat: 'outerwear', img: 'arcteryx-beta-ar-shell.jpg', price: 8900000, cond: 'excellent', size: 'L', feat: true },
  { slug: 'bad-habits-rolltop-backpack', name: 'Bad Habits Roll-Top Backpack', brand: 'bad-habits', cat: 'backpacks', img: 'bad-habits-rabbit-backpack.jpg', price: 690000, sale: 520000, cond: 'like_new', size: 'One Size', neg: true },
  { slug: 'balenciaga-triple-s-clear-sole', name: 'Balenciaga Triple S Clear Sole Sneaker', brand: 'balenciaga', cat: 'shoes', img: 'balenciaga-triple-s-sneaker.jpg', price: 6200000, cond: 'like_new', size: 'EU 40', feat: true },
  { slug: 'bape-1st-camo-shark-hoodie', name: 'BAPE 1st Camo Shark Full-Zip Hoodie', brand: 'bape', cat: 'hoodies', img: 'bape-shark-full-zip-hoodie.jpg', price: 5400000, cond: 'excellent', size: 'L', feat: true },
  { slug: 'champion-reverse-weave-hoodie', name: 'Champion Reverse Weave Pullover Hoodie', brand: 'champion', cat: 'hoodies', img: 'champion-reverse-weave-hoodie.jpg', price: 780000, sale: 590000, cond: 'good', size: 'L', neg: true },
  { slug: 'clownz-basic-cuffed-beanie', name: 'Clownz Basic Cuffed Beanie', brand: 'clownz', cat: 'caps-hats', img: 'clownz-basic-beanie.jpg', price: 220000, sale: 165000, cond: 'new_with_tags', size: 'One Size', neg: true },
  { slug: 'clownz-monogram-bomber', name: 'Clownz Monogram Bomber Jacket', brand: 'clownz', cat: 'outerwear', img: 'clownz-monogram-jacket.jpg', price: 890000, sale: 690000, cond: 'like_new', size: 'M', neg: true },
  { slug: 'converse-chuck-70-hi-black', name: 'Converse Chuck 70 Hi Black', brand: 'converse', cat: 'shoes', img: 'converse-chuck-1970s.jpg', price: 1650000, sale: 1290000, cond: 'like_new', size: 'EU 39', neg: true },
  { slug: 'degrey-leather-backpack-cream', name: 'Degrey Leather Backpack Cream', brand: 'degrey', cat: 'backpacks', img: 'degrey-leather-backpack.jpg', price: 750000, cond: 'like_new', size: 'One Size', feat: true },
  { slug: 'degrey-athlete-track-jacket', name: 'Degrey Athlete Track Jacket', brand: 'degrey', cat: 'outerwear', img: 'degrey-line-hoodie.jpg', price: 620000, sale: 470000, cond: 'good', size: 'L', neg: true },
  { slug: 'essentials-fog-boxy-tee-black', name: 'Essentials Fear of God Boxy Tee Black', brand: 'essentials', cat: 't-shirts', img: 'essentials-fog-tee.jpg', price: 890000, sale: 690000, cond: 'like_new', size: 'XL', neg: true },
  { slug: 'essentials-fog-pullover-hoodie-taupe', name: 'Essentials Fear of God Pullover Hoodie Taupe', brand: 'essentials', cat: 'hoodies', img: 'tobi-essential-zip-hoodie.jpg', price: 1650000, sale: 1290000, cond: 'like_new', size: 'L', neg: true },
  { slug: 'fila-disruptor-ii-white', name: 'Fila Disruptor II White', brand: 'fila', cat: 'shoes', img: 'fila-disruptor-ii-white.jpg', price: 780000, sale: 590000, cond: 'new_with_tags', size: 'EU 39', neg: true },
  { slug: 'grimm-dc-logo-cap', name: 'Grimm DC Logo Cap', brand: 'grimm-dc', cat: 'caps-hats', img: 'grimm-dc-logo-cap.jpg', price: 260000, sale: 195000, cond: 'new_with_tags', size: 'One Size', neg: true },
  { slug: 'gucci-gg-marmont-belt', name: 'Gucci GG Marmont Leather Belt', brand: 'gucci', cat: 'accessories', img: 'gucci-gg-marmont-belt.jpg', price: 5900000, cond: 'excellent', size: 'One Size', feat: true },
  { slug: 'hades-shooting-star-tee-white', name: 'Hades Shooting Star Tee White', brand: 'hades', cat: 't-shirts', img: 'hades-shooting-star-tee.jpg', price: 480000, sale: 360000, cond: 'like_new', size: 'M', neg: true },
  { slug: 'levents-classic-logo-hoodie', name: 'Levents Classic Logo Hoodie', brand: 'levents', cat: 'hoodies', img: 'levents-classic-hoodie.jpg', price: 460000, sale: 350000, cond: 'good', size: 'L', neg: true },
  { slug: 'machine56-cyber-graphic-tee', name: 'Machine56 Cyber Graphic Tee', brand: 'machine56', cat: 't-shirts', img: 'machine56-cyber-graphic-tee.jpg', price: 350000, sale: 265000, cond: 'like_new', size: 'M', neg: true },
  { slug: 'mlb-chunky-liner-sneaker', name: 'MLB Chunky Liner Sneaker NY', brand: 'mlb', cat: 'shoes', img: 'mlb-chunky-liner-white.jpg', price: 1850000, sale: 1450000, cond: 'like_new', size: 'EU 40' },
  { slug: 'mlb-ny-yankees-monogram-bag', name: 'MLB NY Yankees Monogram Crossbody Bag', brand: 'mlb', cat: 'crossbody-bags', img: 'mlb-ny-yankees-monogram-bag.jpg', price: 2100000, cond: 'excellent', size: 'One Size', feat: true },
  { slug: 'new-balance-classic-logo-cap', name: 'New Balance Classic Logo Cap', brand: 'new-balance', cat: 'caps-hats', img: 'nb-classic-logo-cap.jpg', price: 320000, sale: 240000, cond: 'new_with_tags', size: 'One Size', neg: true },
  { slug: 'new-balance-530-white-silver', name: 'New Balance 530 White Silver', brand: 'new-balance', cat: 'shoes', img: 'new balance-530-white-silver.jpg', price: 2250000, sale: 1790000, cond: 'like_new', size: 'EU 41', neg: true },
  { slug: 'nike-sb-dunk-low-panda', name: 'Nike SB Dunk Low Panda', brand: 'nike', cat: 'shoes', img: 'nike-sb-dunk-low-panda.jpg', price: 2950000, cond: 'new_with_tags', size: 'EU 42', feat: true },
  { slug: 'now-saigon-varsity-jacket', name: 'NOW Saigon Varsity Jacket', brand: 'now-saigon', cat: 'outerwear', img: 'now-saigon-varsity-jacket.jpg', price: 890000, sale: 690000, cond: 'like_new', size: 'L', neg: true },
  { slug: 'salomon-xt-6-gore-tex', name: 'Salomon XT-6 Gore-Tex Trail Sneaker', brand: 'salomon', cat: 'shoes', img: 'salomon-xt-6-gore-tex.jpg', price: 3200000, cond: 'like_new', size: 'EU 42', feat: true },
  { slug: 'stussy-8-ball-tee-white', name: 'Stussy 8-Ball Tee White', brand: 'stussy', cat: 't-shirts', img: 'stussy-8-ball-tee.jpg', price: 590000, sale: 450000, cond: 'like_new', size: 'L', neg: true },
  { slug: 'supreme-box-logo-camp-cap-black', name: 'Supreme Box Logo Camp Cap Black', brand: 'supreme', cat: 'caps-hats', img: 'supreme-camp-cap-black.jpg', price: 1450000, cond: 'excellent', size: 'One Size', feat: true },
  { slug: 'teelab-studio-oversized-tee-white', name: 'Teelab Studio Oversized Tee White', brand: 'teelab', cat: 't-shirts', img: 'teelab-studio-oversized-tee.jpg', price: 280000, sale: 210000, cond: 'new_with_tags', size: 'XL', neg: true },
  { slug: 'tnf-nuptse-1996-jacket-black', name: 'The North Face Nuptse 1996 Jacket Black', brand: 'the-north-face', cat: 'outerwear', img: 'tnf-nuptse-1996-jacket.jpg', price: 3900000, cond: 'excellent', size: 'L', feat: true },
  { slug: 'tobi-parachute-shorts-cream', name: 'Tobi Parachute Shorts Cream', brand: 'tobi', cat: 'shorts', img: 'tobi-parachute-shorts.jpg', price: 350000, sale: 265000, cond: 'good', size: 'M', neg: true },
  { slug: 'uniqlo-ut-kaws-graphic-hoodie', name: 'Uniqlo UT x KAWS Graphic Hoodie', brand: 'uniqlo', cat: 'hoodies', img: 'uniqlo-kaws-graphic-hoodie.jpg', price: 620000, cond: 'like_new', size: 'L' },
  { slug: 'uniqlo-pocketable-uv-protection-jacket-white', name: 'Uniqlo Pocketable UV Protection Jacket White', brand: 'uniqlo', cat: 'outerwear', img: 'uniqlo-uv-protection-jacket.jpg', price: 390000, cond: 'good', size: 'M' },
  { slug: 'adidas-duramo-speed-2', name: 'Adidas Duramo Speed 2', brand: 'adidas', cat: 'shoes', img: 'adidas-ultraboost-light.jpg', price: 1850000, sale: 1450000, cond: 'new_with_tags', size: 'EU 41', neg: true },
  { slug: 'patagonia-baggies-shorts-green', name: 'Patagonia Baggies Shorts Green', brand: 'patagonia', cat: 'shorts', img: 'patagonia-baggies-shorts.jpg', price: 890000, sale: 690000, cond: 'like_new', size: 'M', neg: true },
  { slug: 'str8eway-lightning-bolt-zip-pouch', name: 'STR8EWAY Lightning Bolt Zip Pouch', brand: 'str8eway', cat: 'accessories', img: '5theway-monogram-wallet.jpg', price: 220000, sale: 165000, cond: 'good', size: 'One Size', neg: true },
  { slug: 'aoki-camo-messenger-sling-bag', name: 'Aoki Camo Messenger Sling Bag', brand: 'aoki', cat: 'crossbody-bags', img: 'aoku-messenger-sling-bag.jpg', price: 380000, sale: 290000, cond: 'good', size: 'One Size', neg: true },

  // ---- generic/unbranded listings (image shows no confirmable brand mark,
  // or the filename's claimed brand/model could not be visually confirmed —
  // some filenames also mismatch actual garment type; listed here honestly
  // under the visible product only) ----
  { slug: 'black-technical-hooded-jacket', name: 'Black Technical Hooded Jacket', brand: null, cat: 'outerwear', img: 'acronym-j1a-gt-jacket.jpg', price: 620000, sale: 470000, cond: 'good', size: 'L', neg: true },
  { slug: 'charcoal-belted-cargo-joggers', name: 'Charcoal Belted Cargo Joggers', brand: null, cat: 'pants', img: 'coolmate-active-v2-tee.jpg', price: 260000, sale: 195000, cond: 'good', size: 'M', neg: true },
  { slug: 'black-zip-cargo-utility-pants', name: 'Black Zip-Cargo Utility Pants', brand: null, cat: 'pants', img: 'davies-cargo-pants.jpg', price: 310000, cond: 'good', size: 'L' },
  { slug: 'washed-black-panelstitch-cargo-pants', name: 'Washed Black Panel-Stitch Cargo Pants', brand: null, cat: 'pants', img: 'hades-cargo-pants-black.jpg', price: 340000, cond: 'like_new', size: 'M' },
  { slug: 'beige-linen-camp-collar-shirt', name: 'Beige Linen-Blend Camp Collar Shirt', brand: null, cat: 'shirts', img: 'mango-linen-blend-shirt.jpg', price: 300000, cond: 'good', size: 'M' },
  { slug: 'navy-water-resistant-cargo-pants', name: 'Navy Water-Resistant Cargo Pants', brand: null, cat: 'pants', img: 'nilmance-water-resistant-cargo.jpg', price: 420000, cond: 'like_new', size: 'L' },
  { slug: 'black-quilted-technical-vest', name: 'Black Quilted Technical Vest', brand: null, cat: 'outerwear', img: 'riot-division-tech-vest.jpg', price: 480000, cond: 'good', size: 'M' },
  { slug: 'black-fisherman-bucket-hat', name: 'Black Fisherman Bucket Hat', brand: null, cat: 'caps-hats', img: 'snow-peak-bucket-hat.jpg', price: 150000, cond: 'good', size: 'One Size' },
  { slug: 'purple-colorblock-zip-hoodie', name: 'Purple Colorblock Zip Hoodie', brand: null, cat: 'hoodies', img: 'valorant-vct-spark-hoodie.jpg', price: 380000, cond: 'good', size: 'L' },
  { slug: 'black-chunky-leather-sneaker', name: 'Black Chunky Leather Sneaker', brand: null, cat: 'shoes', img: 'y-3-kaiwa-chunky-sneaker.jpg', price: 520000, cond: 'good', size: 'EU 42' },
  { slug: 'olive-ribbed-knit-beanie', name: 'Olive Ribbed Knit Beanie', brand: null, cat: 'caps-hats', img: 'zara-basic-knit-beanie.jpg', price: 120000, cond: 'new_with_tags', size: 'One Size' },
  { slug: 'black-slim-fit-trousers', name: 'Black Slim-Fit Trousers', brand: null, cat: 'pants', img: 'zara-slim-fit-trousers.jpg', price: 280000, cond: 'good', size: 'M' },
  { slug: 'light-wash-denim-mom-shorts', name: 'Light-Wash Denim Mom Shorts', brand: null, cat: 'shorts', img: 'pull-bear-denim-shorts.jpg', price: 220000, cond: 'good', size: 'S' },
  { slug: 'grey-vented-camp-collar-shirt', name: 'Grey Vented Camp Collar Shirt', brand: null, cat: 'shirts', img: 'columbia-silver-ridge-shirt.jpg', price: 310000, cond: 'good', size: 'L' },
];

function assertData() {
  const slugs = new Set();
  const imgs = new Set();
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (slugs.has(p.slug)) throw new Error(`Duplicate slug: ${p.slug}`);
    slugs.add(p.slug);
    if (imgs.has(p.img)) throw new Error(`Duplicate image used by two products: ${p.img}`);
    imgs.add(p.img);
    if (!fs.existsSync(path.join(IMG_DIR, p.img))) throw new Error(`Missing image asset on disk: ${p.img}`);
    if (!CANONICAL_CATEGORIES.includes(p.cat)) throw new Error(`Non-canonical category '${p.cat}' on ${p.slug}`);
    if (!(p.price > 0)) throw new Error(`Invalid price on ${p.slug}`);
    if (p.sale != null && !(p.sale > 0 && p.sale < p.price)) throw new Error(`Invalid sale price on ${p.slug}`);
    if (p.brand && !BRANDS.find(b => b.slug === p.brand)) throw new Error(`Unknown brand '${p.brand}' on ${p.slug}`);
    const shoeLike = ['shoes', 'slides', 'boots', 'loafers', 'other-shoes'].includes(p.cat);
    if (shoeLike && !/^EU \d{2}$/.test(p.size) && p.size !== 'One Size') throw new Error(`Non-shoe size on shoe-like product ${p.slug}: ${p.size}`);
    if (!shoeLike && /^EU \d{2}$/.test(p.size)) throw new Error(`Shoe size on non-shoe product ${p.slug}: ${p.size}`);
  }
}

module.exports = { P, BRANDS, CANONICAL_CATEGORIES, SELLERS, LOCATIONS, BASE_DATE, DAY, IMG_DIR, imgPath, assertData };
