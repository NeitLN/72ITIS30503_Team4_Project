DO $$ 
DECLARE
  v_tops_id uuid;
  v_bottoms_id uuid;
  v_footwear_id uuid;
  v_accessories_id uuid;
  v_bags_id uuid;
BEGIN
  -- Parent groupings
  SELECT id INTO v_tops_id FROM categories WHERE slug = 'tops';
  IF v_tops_id IS NULL THEN
    v_tops_id := gen_random_uuid();
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) 
    VALUES (v_tops_id, 'Tops', 'tops', null, 10, true);
  ELSE
    UPDATE categories SET name = 'Tops' WHERE slug = 'tops';
  END IF;

  SELECT id INTO v_bottoms_id FROM categories WHERE slug = 'bottoms';
  IF v_bottoms_id IS NULL THEN
    v_bottoms_id := gen_random_uuid();
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) 
    VALUES (v_bottoms_id, 'Bottoms', 'bottoms', null, 20, true);
  ELSE
    UPDATE categories SET name = 'Bottoms' WHERE slug = 'bottoms';
  END IF;

  SELECT id INTO v_footwear_id FROM categories WHERE slug = 'footwear';
  IF v_footwear_id IS NULL THEN
    v_footwear_id := gen_random_uuid();
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) 
    VALUES (v_footwear_id, 'Footwear', 'footwear', null, 30, true);
  ELSE
    UPDATE categories SET name = 'Footwear' WHERE slug = 'footwear';
  END IF;

  -- Accessories parent (already mapped originally, just ensuring name)
  SELECT id INTO v_accessories_id FROM categories WHERE slug = 'accessories-group';
  IF v_accessories_id IS NULL THEN
    v_accessories_id := gen_random_uuid();
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) 
    VALUES (v_accessories_id, 'Accessories', 'accessories-group', null, 40, true);
  ELSE
    UPDATE categories SET name = 'Accessories' WHERE slug = 'accessories-group';
  END IF;

  -- Bags parent
  SELECT id INTO v_bags_id FROM categories WHERE slug = 'bags-group';
  IF v_bags_id IS NULL THEN
    v_bags_id := gen_random_uuid();
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) 
    VALUES (v_bags_id, 'Bags', 'bags-group', null, 50, true);
  ELSE
    UPDATE categories SET name = 'Bags' WHERE slug = 'bags-group';
  END IF;

  -- Tops children
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 't-shirts') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'T-shirts & Polo Shirts', 't-shirts', v_tops_id, 1, true);
  ELSE
    UPDATE categories SET name = 'T-shirts & Polo Shirts', parent_id = v_tops_id WHERE slug = 't-shirts';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'jerseys') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Jerseys', 'jerseys', v_tops_id, 2, true);
  ELSE
    UPDATE categories SET name = 'Jerseys', parent_id = v_tops_id WHERE slug = 'jerseys';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'shirts') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Shirts', 'shirts', v_tops_id, 3, true);
  ELSE
    UPDATE categories SET name = 'Shirts', parent_id = v_tops_id WHERE slug = 'shirts';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sweaters-cardigans') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Sweaters & Cardigans', 'sweaters-cardigans', v_tops_id, 4, true);
  ELSE
    UPDATE categories SET name = 'Sweaters & Cardigans', parent_id = v_tops_id WHERE slug = 'sweaters-cardigans';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'hoodies') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Sweatshirts & Hoodies', 'hoodies', v_tops_id, 5, true);
  ELSE
    UPDATE categories SET name = 'Sweatshirts & Hoodies', parent_id = v_tops_id WHERE slug = 'hoodies';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'outerwear') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Outerwear', 'outerwear', v_tops_id, 6, true);
  ELSE
    UPDATE categories SET name = 'Outerwear', parent_id = v_tops_id WHERE slug = 'outerwear';
  END IF;

  -- Bottoms children
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'pants') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Pants', 'pants', v_bottoms_id, 1, true);
  ELSE
    UPDATE categories SET name = 'Pants', parent_id = v_bottoms_id WHERE slug = 'pants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'shorts') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Shorts', 'shorts', v_bottoms_id, 2, true);
  ELSE
    UPDATE categories SET name = 'Shorts', parent_id = v_bottoms_id WHERE slug = 'shorts';
  END IF;

  -- Footwear children
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'shoes') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Sneakers', 'shoes', v_footwear_id, 1, true);
  ELSE
    UPDATE categories SET name = 'Sneakers', parent_id = v_footwear_id WHERE slug = 'shoes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'slides') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Slides', 'slides', v_footwear_id, 2, true);
  ELSE
    UPDATE categories SET name = 'Slides', parent_id = v_footwear_id WHERE slug = 'slides';
  END IF;

  -- Accessories children (the original 'accessories' slug acts as 'Other accessories')
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'accessories') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Other accessories', 'accessories', v_accessories_id, 5, true);
  ELSE
    UPDATE categories SET name = 'Other accessories', parent_id = v_accessories_id WHERE slug = 'accessories';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'caps-hats') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Caps/Hats', 'caps-hats', v_accessories_id, 1, true);
  ELSE
    UPDATE categories SET name = 'Caps/Hats', parent_id = v_accessories_id WHERE slug = 'caps-hats';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'phone-cases') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Phone cases', 'phone-cases', v_accessories_id, 2, true);
  ELSE
    UPDATE categories SET name = 'Phone cases', parent_id = v_accessories_id WHERE slug = 'phone-cases';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'wallets') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Wallets', 'wallets', v_accessories_id, 3, true);
  ELSE
    UPDATE categories SET name = 'Wallets', parent_id = v_accessories_id WHERE slug = 'wallets';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'underwear') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Underwear', 'underwear', v_accessories_id, 4, true);
  ELSE
    UPDATE categories SET name = 'Underwear', parent_id = v_accessories_id WHERE slug = 'underwear';
  END IF;

  -- Bags children (the original 'bags' slug acts as 'Bags' but we can map it)
  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'bags') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Bags', 'bags', v_bags_id, 4, true);
  ELSE
    UPDATE categories SET name = 'Bags', parent_id = v_bags_id WHERE slug = 'bags';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'backpacks') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Backpacks', 'backpacks', v_bags_id, 1, true);
  ELSE
    UPDATE categories SET name = 'Backpacks', parent_id = v_bags_id WHERE slug = 'backpacks';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'crossbody-bags') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Crossbody bags', 'crossbody-bags', v_bags_id, 2, true);
  ELSE
    UPDATE categories SET name = 'Crossbody bags', parent_id = v_bags_id WHERE slug = 'crossbody-bags';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'bowler-bags') THEN
    INSERT INTO categories (id, name, slug, parent_id, sort_order, is_active) VALUES (gen_random_uuid(), 'Bowler bags', 'bowler-bags', v_bags_id, 3, true);
  ELSE
    UPDATE categories SET name = 'Bowler bags', parent_id = v_bags_id WHERE slug = 'bowler-bags';
  END IF;

END $$;
