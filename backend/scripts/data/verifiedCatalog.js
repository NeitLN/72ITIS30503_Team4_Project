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
];

// ---------------------------------------------------------------------------
// Canonical categories that must exist (child leaf slugs used by products).
// ---------------------------------------------------------------------------
const CANONICAL_CATEGORIES = [
  't-shirts', 'jerseys', 'shirts', 'sweaters-cardigans', 'hoodies', 'outerwear',
  'pants', 'shorts', 'shoes', 'slides', 'caps-hats', 'accessories', 'wallets',
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
  { slug: 'black-leather-derby-shoes', name: 'Black Leather Derby Shoes', brand: null, cat: 'shoes', img: 'black-boots.jpg', price: 550000, cond: 'excellent', size: 'EU 42' },

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
  { slug: 'dr-martens-1460-oxblood-boots', name: 'Dr. Martens 1460 Oxblood Boots', brand: 'dr-martens', cat: 'shoes', img: 'dr-martens-1460-boots.jpg', price: 1950000, cond: 'good', size: 'EU 40', feat: true },
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
    const shoeLike = p.cat === 'shoes' || p.cat === 'slides';
    if (shoeLike && !/^EU \d{2}$/.test(p.size) && p.size !== 'One Size') throw new Error(`Non-shoe size on shoe-like product ${p.slug}: ${p.size}`);
    if (!shoeLike && /^EU \d{2}$/.test(p.size)) throw new Error(`Shoe size on non-shoe product ${p.slug}: ${p.size}`);
  }
}

module.exports = { P, BRANDS, CANONICAL_CATEGORIES, SELLERS, LOCATIONS, BASE_DATE, DAY, IMG_DIR, imgPath, assertData };
