-- Phase 8.1 correction — promote the existing "Footwear" parent group to a
-- fully-fledged "Shoes" taxonomy with 5 children, matching the mega-menu's
-- other 4 top-level groups (Tops, Bottoms, Accessories, Bags).
--
-- Additive + idempotent, same pattern as
-- 20260705155154_update_category_taxonomy_display_names.sql: reuses the
-- existing `footwear`-slug parent row and its two existing children
-- (`shoes` = "Sneakers", `slides`) rather than creating duplicates, so
-- existing IDs and /category/<slug> URLs never change. Only display names
-- change on the two existing rows; three new leaf rows are added.
DO $$
DECLARE
  v_footwear_id uuid;
BEGIN
  -- Reuse the existing "Footwear" parent row — rename display to "Shoes",
  -- keep slug/id untouched.
  SELECT id INTO v_footwear_id FROM categories WHERE slug = 'footwear';
  IF v_footwear_id IS NULL THEN
    v_footwear_id := gen_random_uuid();
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active)
    VALUES (v_footwear_id, 'Shoes', 'footwear', null, 30, true);
  ELSE
    UPDATE categories SET name = 'Shoes' WHERE slug = 'footwear';
  END IF;

  -- Existing child: shoes -> "Sneakers" (already correctly named, no change).
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'shoes') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active)
    VALUES (gen_random_uuid(), 'Sneakers', 'shoes', v_footwear_id, 301, true);
  ELSE
    UPDATE categories SET name = 'Sneakers', parent_id = v_footwear_id WHERE slug = 'shoes';
  END IF;

  -- Existing child: slides -> rename display to "Sandals & Slides" (slug kept).
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'slides') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active)
    VALUES (gen_random_uuid(), 'Sandals & Slides', 'slides', v_footwear_id, 302, true);
  ELSE
    UPDATE categories SET name = 'Sandals & Slides', parent_id = v_footwear_id WHERE slug = 'slides';
  END IF;

  -- New child: Boots.
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'boots') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active)
    VALUES (gen_random_uuid(), 'Boots', 'boots', v_footwear_id, 303, true);
  ELSE
    UPDATE categories SET name = 'Boots', parent_id = v_footwear_id WHERE slug = 'boots';
  END IF;

  -- New child: Loafers.
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'loafers') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active)
    VALUES (gen_random_uuid(), 'Loafers', 'loafers', v_footwear_id, 304, true);
  ELSE
    UPDATE categories SET name = 'Loafers', parent_id = v_footwear_id WHERE slug = 'loafers';
  END IF;

  -- New child: Other Shoes.
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'other-shoes') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active)
    VALUES (gen_random_uuid(), 'Other Shoes', 'other-shoes', v_footwear_id, 305, true);
  ELSE
    UPDATE categories SET name = 'Other Shoes', parent_id = v_footwear_id WHERE slug = 'other-shoes';
  END IF;
END $$;

-- Reclassify 2 genuine seed-managed footwear products that were sitting
-- under the "Sneakers" catch-all (`shoes`) but are not sneakers by product
-- identity — verified by name + brand, not a keyword guess:
--   - "Dr. Martens 1460 Oxblood Boots" (brand: Dr. Martens) -> boots
--   - "Black Leather Derby Shoes" (dress/derby shoe silhouette) -> loafers
-- Scoped to listing_source = 'seed' so no real user listing is ever touched,
-- and matched by exact name so a rerun of this migration is a no-op.
UPDATE products
SET category_slug = 'boots', updated_at = now()
WHERE listing_source = 'seed'
  AND name = 'Dr. Martens 1460 Oxblood Boots'
  AND category_slug = 'shoes';

UPDATE products
SET category_slug = 'loafers', updated_at = now()
WHERE listing_source = 'seed'
  AND name = 'Black Leather Derby Shoes'
  AND category_slug = 'shoes';
