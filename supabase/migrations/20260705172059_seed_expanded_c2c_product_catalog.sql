-- Migration to seed expanded C2C products to fill all categories

DO $$ 
DECLARE
  v_prod_id uuid;
BEGIN

  -- Vintage Oversized Graphic Tee
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'vintage-oversized-graphic-tee-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Vintage Oversized Graphic Tee',
      'vintage-oversized-graphic-tee-c2c',
      250000,
      't-shirts',
      '/images/products/tshirt-extra1.jpg',
      '/images/products/tshirt-extra1.jpg',
      'A great good item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'good',
      'L',
      'District 1, Ho Chi Minh City',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/tshirt-extra1.jpg',
      'Vintage Oversized Graphic Tee',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Adidas Trefoil Classic Tee
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'adidas-trefoil-classic-tee-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Adidas Trefoil Classic Tee',
      'adidas-trefoil-classic-tee-c2c',
      300000,
      't-shirts',
      '/images/products/adidas-trefoil-tee.jpg',
      '/images/products/adidas-trefoil-tee.jpg',
      'A great like new item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'like_new',
      'M',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/adidas-trefoil-tee.jpg',
      'Adidas Trefoil Classic Tee',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- DirtyCoins Logo Oversized Tee
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'dirtycoins-logo-oversized-tee-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'DirtyCoins Logo Oversized Tee',
      'dirtycoins-logo-oversized-tee-c2c',
      280000,
      't-shirts',
      '/images/products/dirtycoins-oversized-tee.jpg',
      '/images/products/dirtycoins-oversized-tee.jpg',
      'A great excellent item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'excellent',
      'XL',
      'Cau Giay, Hanoi',
      true,
      'Adidas',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/dirtycoins-oversized-tee.jpg',
      'DirtyCoins Logo Oversized Tee',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Levents Popular Logo Tee
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'levents-popular-logo-tee-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Levents Popular Logo Tee',
      'levents-popular-logo-tee-c2c',
      320000,
      't-shirts',
      '/images/products/levents-popular-logo-tee.jpg',
      '/images/products/levents-popular-logo-tee.jpg',
      'A great good item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'good',
      'M',
      'Bien Hoa, Dong Nai',
      true,
      'DirtyCoins',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/levents-popular-logo-tee.jpg',
      'Levents Popular Logo Tee',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nike Sportswear Club Tee
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nike-sportswear-club-tee-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nike Sportswear Club Tee',
      'nike-sportswear-club-tee-c2c',
      350000,
      't-shirts',
      '/images/products/nike-sportswear-club-tee.jpg',
      '/images/products/nike-sportswear-club-tee.jpg',
      'A great new with tags item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'new_with_tags',
      'L',
      'Thu Duc, HCMC',
      true,
      'Levents',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/nike-sportswear-club-tee.jpg',
      'Nike Sportswear Club Tee',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Uniqlo U Crew Neck Tee
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'uniqlo-u-crew-neck-tee-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Uniqlo U Crew Neck Tee',
      'uniqlo-u-crew-neck-tee-c2c',
      180000,
      't-shirts',
      '/images/products/uniqlo-u-crew-neck-tee.jpg',
      '/images/products/uniqlo-u-crew-neck-tee.jpg',
      'A great good item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'good',
      'M',
      'Go Vap, HCMC',
      true,
      'Nike',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/uniqlo-u-crew-neck-tee.jpg',
      'Uniqlo U Crew Neck Tee',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Vintage Football Jersey Red
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'vintage-football-jersey-red') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Vintage Football Jersey Red',
      'vintage-football-jersey-red',
      450000,
      'jerseys',
      '/images/products/jersey-1.jpg',
      '/images/products/jersey-1.jpg',
      'A great good item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'good',
      'L',
      'Nha Trang, Khanh Hoa',
      true,
      'Uniqlo',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jersey-1.jpg',
      'Vintage Football Jersey Red',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Retro Soccer Jersey Blue
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'retro-soccer-jersey-blue') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Retro Soccer Jersey Blue',
      'retro-soccer-jersey-blue',
      420000,
      'jerseys',
      '/images/products/jersey-2.jpg',
      '/images/products/jersey-2.jpg',
      'A great excellent item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'excellent',
      'M',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jersey-2.jpg',
      'Retro Soccer Jersey Blue',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Classic Stripes Jersey Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'classic-stripes-jersey-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Classic Stripes Jersey Black',
      'classic-stripes-jersey-black',
      380000,
      'jerseys',
      '/images/products/jersey-3.jpg',
      '/images/products/jersey-3.jpg',
      'A great used item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'used',
      'XL',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jersey-3.jpg',
      'Classic Stripes Jersey Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Streetwear Mesh Jersey White
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'streetwear-mesh-jersey-white') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Streetwear Mesh Jersey White',
      'streetwear-mesh-jersey-white',
      500000,
      'jerseys',
      '/images/products/jersey-4.jpg',
      '/images/products/jersey-4.jpg',
      'A great like new item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'like_new',
      'L',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jersey-4.jpg',
      'Streetwear Mesh Jersey White',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Oversized Oxford Shirt White
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'oversized-oxford-shirt-white') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Oversized Oxford Shirt White',
      'oversized-oxford-shirt-white',
      350000,
      'shirts',
      '/images/products/shirt-1.jpg',
      '/images/products/shirt-1.jpg',
      'A great excellent item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'excellent',
      'L',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shirt-1.jpg',
      'Oversized Oxford Shirt White',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Linen Button-Up Beige
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'linen-button-up-beige') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Linen Button-Up Beige',
      'linen-button-up-beige',
      320000,
      'shirts',
      '/images/products/shirt-2.jpg',
      '/images/products/shirt-2.jpg',
      'A great good item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'good',
      'M',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shirt-2.jpg',
      'Linen Button-Up Beige',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Plaid Flannel Shirt Red
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'plaid-flannel-shirt-red') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Plaid Flannel Shirt Red',
      'plaid-flannel-shirt-red',
      280000,
      'shirts',
      '/images/products/shirt-3.jpg',
      '/images/products/shirt-3.jpg',
      'A great used item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'used',
      'XL',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shirt-3.jpg',
      'Plaid Flannel Shirt Red',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Short Sleeve Camp Shirt Pattern
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'short-sleeve-camp-shirt-pattern') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Short Sleeve Camp Shirt Pattern',
      'short-sleeve-camp-shirt-pattern',
      300000,
      'shirts',
      '/images/products/shirt-4.jpg',
      '/images/products/shirt-4.jpg',
      'A great like new item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'like_new',
      'M',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shirt-4.jpg',
      'Short Sleeve Camp Shirt Pattern',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Cream Knit Cardigan
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'cream-knit-cardigan') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Cream Knit Cardigan',
      'cream-knit-cardigan',
      550000,
      'sweaters-cardigans',
      '/images/products/sweater-1.jpg',
      '/images/products/sweater-1.jpg',
      'A great excellent item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'excellent',
      'M',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/sweater-1.jpg',
      'Cream Knit Cardigan',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Chunky Wool Sweater Grey
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'chunky-wool-sweater-grey') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Chunky Wool Sweater Grey',
      'chunky-wool-sweater-grey',
      600000,
      'sweaters-cardigans',
      '/images/products/sweater-2.jpg',
      '/images/products/sweater-2.jpg',
      'A great good item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'good',
      'L',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/sweater-2.jpg',
      'Chunky Wool Sweater Grey',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- V-Neck Varsity Sweater Navy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'v-neck-varsity-sweater-navy') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'V-Neck Varsity Sweater Navy',
      'v-neck-varsity-sweater-navy',
      450000,
      'sweaters-cardigans',
      '/images/products/sweater-3.jpg',
      '/images/products/sweater-3.jpg',
      'A great used item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'used',
      'L',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/sweater-3.jpg',
      'V-Neck Varsity Sweater Navy',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Cropped Cardigan Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'cropped-cardigan-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Cropped Cardigan Black',
      'cropped-cardigan-black',
      350000,
      'sweaters-cardigans',
      '/images/products/sweater-4.jpg',
      '/images/products/sweater-4.jpg',
      'A great like new item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'like_new',
      'S',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/sweater-4.jpg',
      'Cropped Cardigan Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Essential Heavyweight Hoodie Gray
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'essential-heavyweight-hoodie-gray') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Essential Heavyweight Hoodie Gray',
      'essential-heavyweight-hoodie-gray',
      450000,
      'hoodies',
      '/images/products/hoodie-extra1.jpg',
      '/images/products/hoodie-extra1.jpg',
      'A great good item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'good',
      'L',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/hoodie-extra1.jpg',
      'Essential Heavyweight Hoodie Gray',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Degrey Varsity Hoodie
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'degrey-varsity-hoodie-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Degrey Varsity Hoodie',
      'degrey-varsity-hoodie-c2c',
      650000,
      'hoodies',
      '/images/products/degrey-varsity-hoodie.jpg',
      '/images/products/degrey-varsity-hoodie.jpg',
      'A great excellent item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'excellent',
      'M',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/degrey-varsity-hoodie.jpg',
      'Degrey Varsity Hoodie',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Grimm DC Hoodie Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'grimm-dc-hoodie-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Grimm DC Hoodie Black',
      'grimm-dc-hoodie-c2c',
      580000,
      'hoodies',
      '/images/products/grimm-dc-hoodie.jpg',
      '/images/products/grimm-dc-hoodie.jpg',
      'A great used item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'used',
      'XL',
      'Thu Duc, HCMC',
      true,
      'Degrey',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/grimm-dc-hoodie.jpg',
      'Grimm DC Hoodie Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- HM Relaxed Fit Hoodie
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'hm-relaxed-fit-hoodie-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'HM Relaxed Fit Hoodie',
      'hm-relaxed-fit-hoodie-c2c',
      350000,
      'hoodies',
      '/images/products/hm-relaxed-fit-hoodie.jpg',
      '/images/products/hm-relaxed-fit-hoodie.jpg',
      'A great like new item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'like_new',
      'M',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/hm-relaxed-fit-hoodie.jpg',
      'HM Relaxed Fit Hoodie',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Puma Essentials Hoodie
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'puma-essentials-hoodie-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Puma Essentials Hoodie',
      'puma-essentials-hoodie-c2c',
      420000,
      'hoodies',
      '/images/products/puma-essentials-hoodie.jpg',
      '/images/products/puma-essentials-hoodie.jpg',
      'A great good item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'good',
      'L',
      'Nha Trang, Khanh Hoa',
      true,
      'H&M',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/puma-essentials-hoodie.jpg',
      'Puma Essentials Hoodie',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- SWE Local Brand Hoodie
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'swe-hoodie-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'SWE Local Brand Hoodie',
      'swe-hoodie-c2c',
      500000,
      'hoodies',
      '/images/products/swe-hoodie.jpg',
      '/images/products/swe-hoodie.jpg',
      'A great excellent item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'excellent',
      'M',
      'Binh Thanh, HCMC',
      true,
      'Puma',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/swe-hoodie.jpg',
      'SWE Local Brand Hoodie',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Cropped Bomber Jacket Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'cropped-bomber-jacket-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Cropped Bomber Jacket Black',
      'cropped-bomber-jacket-black',
      750000,
      'outerwear',
      '/images/products/jacket-1.jpg',
      '/images/products/jacket-1.jpg',
      'A great excellent item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'excellent',
      'L',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jacket-1.jpg',
      'Cropped Bomber Jacket Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Vintage Denim Jacket Blue
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'vintage-denim-jacket-blue') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Vintage Denim Jacket Blue',
      'vintage-denim-jacket-blue',
      680000,
      'outerwear',
      '/images/products/jacket-2.jpg',
      '/images/products/jacket-2.jpg',
      'A great good item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'good',
      'M',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jacket-2.jpg',
      'Vintage Denim Jacket Blue',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Utility Windbreaker Olive
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'utility-windbreaker-olive') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Utility Windbreaker Olive',
      'utility-windbreaker-olive',
      550000,
      'outerwear',
      '/images/products/jacket-3.jpg',
      '/images/products/jacket-3.jpg',
      'A great used item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'used',
      'XL',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jacket-3.jpg',
      'Utility Windbreaker Olive',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Leather Moto Jacket
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'leather-moto-jacket') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Leather Moto Jacket',
      'leather-moto-jacket',
      1200000,
      'outerwear',
      '/images/products/jacket-4.jpg',
      '/images/products/jacket-4.jpg',
      'A great like new item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'like_new',
      'L',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/jacket-4.jpg',
      'Leather Moto Jacket',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Wide Leg Cargo Pants Olive
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'wide-leg-cargo-pants-olive-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Wide Leg Cargo Pants Olive',
      'wide-leg-cargo-pants-olive-c2c',
      450000,
      'pants',
      '/images/products/pants-extra1.jpg',
      '/images/products/pants-extra1.jpg',
      'A great good item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'good',
      'L',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/pants-extra1.jpg',
      'Wide Leg Cargo Pants Olive',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Bad Habits Cargo Pants
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'bad-habits-cargo-pants-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Bad Habits Cargo Pants',
      'bad-habits-cargo-pants-c2c',
      650000,
      'pants',
      '/images/products/bad-habits-cargo-pants.jpg',
      '/images/products/bad-habits-cargo-pants.jpg',
      'A great excellent item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'excellent',
      'M',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/bad-habits-cargo-pants.jpg',
      'Bad Habits Cargo Pants',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Coolmate Jogger Pants
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'coolmate-jogger-pants-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Coolmate Jogger Pants',
      'coolmate-jogger-pants-c2c',
      250000,
      'pants',
      '/images/products/coolmate-jogger-pants.jpg',
      '/images/products/coolmate-jogger-pants.jpg',
      'A great used item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'used',
      'L',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/coolmate-jogger-pants.jpg',
      'Coolmate Jogger Pants',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Levis 501 Original Jeans
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'levis-501-original-jeans-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Levis 501 Original Jeans',
      'levis-501-original-jeans-c2c',
      850000,
      'pants',
      '/images/products/levis-501-original-jeans.jpg',
      '/images/products/levis-501-original-jeans.jpg',
      'A great good item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'good',
      '32',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/levis-501-original-jeans.jpg',
      'Levis 501 Original Jeans',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Routine Smart Chinos
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'routine-smart-chinos-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Routine Smart Chinos',
      'routine-smart-chinos-c2c',
      350000,
      'pants',
      '/images/products/routine-smart-chinos.jpg',
      '/images/products/routine-smart-chinos.jpg',
      'A great like new item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'like_new',
      '30',
      'District 1, HCMC',
      true,
      'Levi''s',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/routine-smart-chinos.jpg',
      'Routine Smart Chinos',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Zara Wide Leg Trousers
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'zara-wide-leg-trousers-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Zara Wide Leg Trousers',
      'zara-wide-leg-trousers-c2c',
      550000,
      'pants',
      '/images/products/zara-wide-leg-trousers.jpg',
      '/images/products/zara-wide-leg-trousers.jpg',
      'A great excellent item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'excellent',
      'M',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/zara-wide-leg-trousers.jpg',
      'Zara Wide Leg Trousers',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Pleated Shorts Khaki
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'pleated-shorts-khaki') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Pleated Shorts Khaki',
      'pleated-shorts-khaki',
      300000,
      'shorts',
      '/images/products/shorts-1.jpg',
      '/images/products/shorts-1.jpg',
      'A great good item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'good',
      'L',
      'Cau Giay, Hanoi',
      true,
      'Zara',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shorts-1.jpg',
      'Pleated Shorts Khaki',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Sweat Shorts Grey
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'sweat-shorts-grey') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Sweat Shorts Grey',
      'sweat-shorts-grey',
      250000,
      'shorts',
      '/images/products/shorts-2.jpg',
      '/images/products/shorts-2.jpg',
      'A great used item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'used',
      'M',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shorts-2.jpg',
      'Sweat Shorts Grey',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Denim Cutoff Shorts
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'denim-cutoff-shorts') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Denim Cutoff Shorts',
      'denim-cutoff-shorts',
      320000,
      'shorts',
      '/images/products/shorts-3.jpg',
      '/images/products/shorts-3.jpg',
      'A great like new item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'like_new',
      '32',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shorts-3.jpg',
      'Denim Cutoff Shorts',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nylon Swim Shorts Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nylon-swim-shorts-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nylon Swim Shorts Black',
      'nylon-swim-shorts-black',
      280000,
      'shorts',
      '/images/products/shorts-4.jpg',
      '/images/products/shorts-4.jpg',
      'A great excellent item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'excellent',
      'M',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shorts-4.jpg',
      'Nylon Swim Shorts Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Retro Sneakers White Green
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'retro-sneakers-white-green') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Retro Sneakers White Green',
      'retro-sneakers-white-green',
      850000,
      'shoes',
      '/images/products/shoes-extra1.jpg',
      '/images/products/shoes-extra1.jpg',
      'A great good item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'good',
      '42',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/shoes-extra1.jpg',
      'Retro Sneakers White Green',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Adidas Samba OG
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'adidas-samba-og-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Adidas Samba OG',
      'adidas-samba-og-c2c',
      1800000,
      'shoes',
      '/images/products/adidas-samba-og.jpg',
      '/images/products/adidas-samba-og.jpg',
      'A great excellent item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'excellent',
      '41',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/adidas-samba-og.jpg',
      'Adidas Samba OG',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Converse Chuck 70 Classic
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'converse-chuck-70-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Converse Chuck 70 Classic',
      'converse-chuck-70-c2c',
      950000,
      'shoes',
      '/images/products/converse-chuck-70.jpg',
      '/images/products/converse-chuck-70.jpg',
      'A great used item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'used',
      '43',
      'District 1, HCMC',
      true,
      'Adidas',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/converse-chuck-70.jpg',
      'Converse Chuck 70 Classic',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- New Balance 550 White/Grey
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'new-balance-550-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'New Balance 550 White/Grey',
      'new-balance-550-c2c',
      1600000,
      'shoes',
      '/images/products/new-balance-550.jpg',
      '/images/products/new-balance-550.jpg',
      'A great like new item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'like_new',
      '40',
      'Hai Chau, Da Nang',
      true,
      'Converse',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/new-balance-550.jpg',
      'New Balance 550 White/Grey',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nike Air Force 1 07
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nike-air-force-1-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nike Air Force 1 07',
      'nike-air-force-1-c2c',
      1450000,
      'shoes',
      '/images/products/nike-air-force-1.jpg',
      '/images/products/nike-air-force-1.jpg',
      'A great good item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'good',
      '42',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/nike-air-force-1.jpg',
      'Nike Air Force 1 07',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Vans Old Skool Black/White
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'vans-old-skool-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Vans Old Skool Black/White',
      'vans-old-skool-c2c',
      750000,
      'shoes',
      '/images/products/vans-old-skool.jpg',
      '/images/products/vans-old-skool.jpg',
      'A great excellent item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'excellent',
      '41',
      'Bien Hoa, Dong Nai',
      true,
      'Nike',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/vans-old-skool.jpg',
      'Vans Old Skool Black/White',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Minimal Slides Sand
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'minimal-slides-sand') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Minimal Slides Sand',
      'minimal-slides-sand',
      350000,
      'slides',
      '/images/products/slides-1.jpg',
      '/images/products/slides-1.jpg',
      'A great good item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'good',
      '42',
      'Thu Duc, HCMC',
      true,
      'Vans',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/slides-1.jpg',
      'Minimal Slides Sand',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Chunky Rubber Mules Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'chunky-rubber-mules-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Chunky Rubber Mules Black',
      'chunky-rubber-mules-black',
      450000,
      'slides',
      '/images/products/slides-2.jpg',
      '/images/products/slides-2.jpg',
      'A great excellent item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'excellent',
      '43',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/slides-2.jpg',
      'Chunky Rubber Mules Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Sport Foam Slides White
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'sport-foam-slides-white') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Sport Foam Slides White',
      'sport-foam-slides-white',
      280000,
      'slides',
      '/images/products/slides-3.jpg',
      '/images/products/slides-3.jpg',
      'A great used item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'used',
      '40',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/slides-3.jpg',
      'Sport Foam Slides White',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Leather Crossover Sandals
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'leather-crossover-sandals') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Leather Crossover Sandals',
      'leather-crossover-sandals',
      550000,
      'slides',
      '/images/products/slides-4.jpg',
      '/images/products/slides-4.jpg',
      'A great like new item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'like_new',
      '41',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/slides-4.jpg',
      'Leather Crossover Sandals',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Minimalist Silver Ring
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'minimalist-silver-ring-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Minimalist Silver Ring',
      'minimalist-silver-ring-c2c',
      180000,
      'accessories',
      '/images/products/accessories-extra1.jpg',
      '/images/products/accessories-extra1.jpg',
      'A great like new item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'like_new',
      'One Size',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/accessories-extra1.jpg',
      'Minimalist Silver Ring',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Degrey Chain Necklace
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'degrey-chain-necklace-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Degrey Chain Necklace',
      'degrey-chain-necklace-c2c',
      250000,
      'accessories',
      '/images/products/degrey-chain-necklace.jpg',
      '/images/products/degrey-chain-necklace.jpg',
      'A great good item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'good',
      'One Size',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/degrey-chain-necklace.jpg',
      'Degrey Chain Necklace',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nike Everyday Cushion Socks
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nike-everyday-socks-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nike Everyday Cushion Socks',
      'nike-everyday-socks-c2c',
      120000,
      'accessories',
      '/images/products/nike-everyday-socks.jpg',
      '/images/products/nike-everyday-socks.jpg',
      'A great new with tags item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'new_with_tags',
      'L',
      'Cau Giay, Hanoi',
      true,
      'Degrey',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/nike-everyday-socks.jpg',
      'Nike Everyday Cushion Socks',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Hades Logo Beanie
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'hades-logo-beanie-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Hades Logo Beanie',
      'hades-logo-beanie-c2c',
      220000,
      'accessories',
      '/images/products/hades-logo-beanie.jpg',
      '/images/products/hades-logo-beanie.jpg',
      'A great excellent item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'excellent',
      'One Size',
      'Bien Hoa, Dong Nai',
      true,
      'Nike',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/hades-logo-beanie.jpg',
      'Hades Logo Beanie',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Washed Logo Cap Navy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'washed-logo-cap-navy') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Washed Logo Cap Navy',
      'washed-logo-cap-navy',
      250000,
      'caps-hats',
      '/images/products/cap-1.jpg',
      '/images/products/cap-1.jpg',
      'A great good item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'good',
      'One Size',
      'Thu Duc, HCMC',
      true,
      'Hades',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/cap-1.jpg',
      'Washed Logo Cap Navy',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Classic Dad Hat Beige
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'classic-dad-hat-beige') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Classic Dad Hat Beige',
      'classic-dad-hat-beige',
      180000,
      'caps-hats',
      '/images/products/cap-2.jpg',
      '/images/products/cap-2.jpg',
      'A great used item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'used',
      'One Size',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/cap-2.jpg',
      'Classic Dad Hat Beige',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nylon 5-Panel Cap Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nylon-5-panel-cap-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nylon 5-Panel Cap Black',
      'nylon-5-panel-cap-black',
      220000,
      'caps-hats',
      '/images/products/cap-3.jpg',
      '/images/products/cap-3.jpg',
      'A great excellent item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'excellent',
      'One Size',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/cap-3.jpg',
      'Nylon 5-Panel Cap Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Vintage Trucker Hat
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'vintage-trucker-hat') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Vintage Trucker Hat',
      'vintage-trucker-hat',
      280000,
      'caps-hats',
      '/images/products/cap-4.jpg',
      '/images/products/cap-4.jpg',
      'A great like new item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'like_new',
      'One Size',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/cap-4.jpg',
      'Vintage Trucker Hat',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Adidas Trefoil Cap Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'adidas-trefoil-cap-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Adidas Trefoil Cap Black',
      'adidas-trefoil-cap-c2c',
      350000,
      'caps-hats',
      '/images/products/adidas-trefoil-cap.jpg',
      '/images/products/adidas-trefoil-cap.jpg',
      'A great good item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'good',
      'One Size',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/adidas-trefoil-cap.jpg',
      'Adidas Trefoil Cap Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- DirtyCoins Logo Cap
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'dirtycoins-logo-cap-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'DirtyCoins Logo Cap',
      'dirtycoins-logo-cap-c2c',
      300000,
      'caps-hats',
      '/images/products/dirtycoins-logo-cap.jpg',
      '/images/products/dirtycoins-logo-cap.jpg',
      'A great excellent item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'excellent',
      'One Size',
      'Hai Chau, Da Nang',
      true,
      'Adidas',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/dirtycoins-logo-cap.jpg',
      'DirtyCoins Logo Cap',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Clear MagSafe Case 14 Pro
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'clear-magsafe-case-14-pro') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Clear MagSafe Case 14 Pro',
      'clear-magsafe-case-14-pro',
      150000,
      'phone-cases',
      '/images/products/phone-case-1.jpg',
      '/images/products/phone-case-1.jpg',
      'A great like new item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'like_new',
      'One Size',
      'Cau Giay, Hanoi',
      true,
      'DirtyCoins',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/phone-case-1.jpg',
      'Clear MagSafe Case 14 Pro',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Silicone Matte Case Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'silicone-matte-case-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Silicone Matte Case Black',
      'silicone-matte-case-black',
      80000,
      'phone-cases',
      '/images/products/phone-case-2.jpg',
      '/images/products/phone-case-2.jpg',
      'A great good item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'good',
      'One Size',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/phone-case-2.jpg',
      'Silicone Matte Case Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Leather Case 15 Pro Max
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'leather-case-15-pro-max') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Leather Case 15 Pro Max',
      'leather-case-15-pro-max',
      350000,
      'phone-cases',
      '/images/products/phone-case-3.jpg',
      '/images/products/phone-case-3.jpg',
      'A great excellent item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'excellent',
      'One Size',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/phone-case-3.jpg',
      'Leather Case 15 Pro Max',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Graphic Printed Case 13
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'graphic-printed-case-13') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Graphic Printed Case 13',
      'graphic-printed-case-13',
      120000,
      'phone-cases',
      '/images/products/phone-case-4.jpg',
      '/images/products/phone-case-4.jpg',
      'A great used item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'used',
      'One Size',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/phone-case-4.jpg',
      'Graphic Printed Case 13',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Leather Zip Wallet Brown
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'leather-zip-wallet-brown') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Leather Zip Wallet Brown',
      'leather-zip-wallet-brown',
      450000,
      'wallets',
      '/images/products/wallet-1.jpg',
      '/images/products/wallet-1.jpg',
      'A great excellent item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'excellent',
      'One Size',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/wallet-1.jpg',
      'Leather Zip Wallet Brown',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Slim Cardholder Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'slim-cardholder-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Slim Cardholder Black',
      'slim-cardholder-black',
      250000,
      'wallets',
      '/images/products/wallet-2.jpg',
      '/images/products/wallet-2.jpg',
      'A great good item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'good',
      'One Size',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/wallet-2.jpg',
      'Slim Cardholder Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Bifold Wallet Navy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'bifold-wallet-navy') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Bifold Wallet Navy',
      'bifold-wallet-navy',
      350000,
      'wallets',
      '/images/products/wallet-3.jpg',
      '/images/products/wallet-3.jpg',
      'A great used item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'used',
      'One Size',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/wallet-3.jpg',
      'Bifold Wallet Navy',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Canvas Coin Pouch
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'canvas-coin-pouch') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Canvas Coin Pouch',
      'canvas-coin-pouch',
      150000,
      'wallets',
      '/images/products/wallet-4.jpg',
      '/images/products/wallet-4.jpg',
      'A great like new item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'like_new',
      'One Size',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/wallet-4.jpg',
      'Canvas Coin Pouch',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Cotton Briefs 3-Pack
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'cotton-briefs-3-pack') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Cotton Briefs 3-Pack',
      'cotton-briefs-3-pack',
      220000,
      'underwear',
      '/images/products/underwear-1.jpg',
      '/images/products/underwear-1.jpg',
      'A great new with tags item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'new_with_tags',
      'M',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/underwear-1.jpg',
      'Cotton Briefs 3-Pack',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Performance Trunks Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'performance-trunks-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Performance Trunks Black',
      'performance-trunks-black',
      180000,
      'underwear',
      '/images/products/underwear-2.jpg',
      '/images/products/underwear-2.jpg',
      'A great new with tags item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'new_with_tags',
      'L',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/underwear-2.jpg',
      'Performance Trunks Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Classic Boxers Blue
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'classic-boxers-blue') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Classic Boxers Blue',
      'classic-boxers-blue',
      150000,
      'underwear',
      '/images/products/underwear-3.jpg',
      '/images/products/underwear-3.jpg',
      'A great new with tags item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'new_with_tags',
      'M',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/underwear-3.jpg',
      'Classic Boxers Blue',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Seamless Boxer Briefs Grey
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'seamless-boxer-briefs-grey') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Seamless Boxer Briefs Grey',
      'seamless-boxer-briefs-grey',
      190000,
      'underwear',
      '/images/products/underwear-4.jpg',
      '/images/products/underwear-4.jpg',
      'A great new with tags item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'new_with_tags',
      'L',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/underwear-4.jpg',
      'Seamless Boxer Briefs Grey',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Canvas Tote Bag Natural
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'canvas-tote-bag-natural') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Canvas Tote Bag Natural',
      'canvas-tote-bag-natural',
      250000,
      'bags',
      '/images/products/bags-extra1.jpg',
      '/images/products/bags-extra1.jpg',
      'A great good item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'good',
      'One Size',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/bags-extra1.jpg',
      'Canvas Tote Bag Natural',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Charles & Keith Gabine Saddle
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'charles-keith-gabine-bag-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Charles & Keith Gabine Saddle',
      'charles-keith-gabine-bag-c2c',
      1200000,
      'bags',
      '/images/products/charles-keith-gabine-bag.jpg',
      '/images/products/charles-keith-gabine-bag.jpg',
      'A great excellent item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'excellent',
      'One Size',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/charles-keith-gabine-bag.jpg',
      'Charles & Keith Gabine Saddle',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Coach Tabby Shoulder Bag
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'coach-tabby-shoulder-bag-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Coach Tabby Shoulder Bag',
      'coach-tabby-shoulder-bag-c2c',
      3500000,
      'bags',
      '/images/products/coach-tabby-shoulder-bag.jpg',
      '/images/products/coach-tabby-shoulder-bag.jpg',
      'A great good item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'good',
      'One Size',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/coach-tabby-shoulder-bag.jpg',
      'Coach Tabby Shoulder Bag',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Davies Mini Shoulder Bag
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'davies-mini-shoulder-bag-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Davies Mini Shoulder Bag',
      'davies-mini-shoulder-bag-c2c',
      280000,
      'bags',
      '/images/products/davies-mini-shoulder-bag.jpg',
      '/images/products/davies-mini-shoulder-bag.jpg',
      'A great like new item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'like_new',
      'One Size',
      'Hai Chau, Da Nang',
      true,
      'Coach',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/davies-mini-shoulder-bag.jpg',
      'Davies Mini Shoulder Bag',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Levents Tote Bag
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'levents-tote-bag-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Levents Tote Bag',
      'levents-tote-bag-c2c',
      220000,
      'bags',
      '/images/products/levents-tote-bag.jpg',
      '/images/products/levents-tote-bag.jpg',
      'A great used item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'used',
      'One Size',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/levents-tote-bag.jpg',
      'Levents Tote Bag',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Michael Kors Jet Set Tote
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'michael-kors-jet-set-tote-c2c') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Michael Kors Jet Set Tote',
      'michael-kors-jet-set-tote-c2c',
      2800000,
      'bags',
      '/images/products/michael-kors-jet-set-tote.jpg',
      '/images/products/michael-kors-jet-set-tote.jpg',
      'A great excellent item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'excellent',
      'One Size',
      'Bien Hoa, Dong Nai',
      true,
      'Levents',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/michael-kors-jet-set-tote.jpg',
      'Michael Kors Jet Set Tote',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Canvas Backpack Cream
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'canvas-backpack-cream') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Canvas Backpack Cream',
      'canvas-backpack-cream',
      450000,
      'backpacks',
      '/images/products/backpack-1.jpg',
      '/images/products/backpack-1.jpg',
      'A great good item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'good',
      'One Size',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/backpack-1.jpg',
      'Canvas Backpack Cream',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nylon Travel Backpack Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nylon-travel-backpack-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nylon Travel Backpack Black',
      'nylon-travel-backpack-black',
      650000,
      'backpacks',
      '/images/products/backpack-2.jpg',
      '/images/products/backpack-2.jpg',
      'A great excellent item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'excellent',
      'One Size',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/backpack-2.jpg',
      'Nylon Travel Backpack Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Mini Leather Backpack
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'mini-leather-backpack') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Mini Leather Backpack',
      'mini-leather-backpack',
      550000,
      'backpacks',
      '/images/products/backpack-3.jpg',
      '/images/products/backpack-3.jpg',
      'A great like new item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'like_new',
      'One Size',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/backpack-3.jpg',
      'Mini Leather Backpack',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Sport Daypack Navy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'sport-daypack-navy') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Sport Daypack Navy',
      'sport-daypack-navy',
      350000,
      'backpacks',
      '/images/products/backpack-4.jpg',
      '/images/products/backpack-4.jpg',
      'A great used item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'used',
      'One Size',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/backpack-4.jpg',
      'Sport Daypack Navy',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Nylon Crossbody Bag Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'nylon-crossbody-bag-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Nylon Crossbody Bag Black',
      'nylon-crossbody-bag-black',
      350000,
      'crossbody-bags',
      '/images/products/crossbody-1.jpg',
      '/images/products/crossbody-1.jpg',
      'A great excellent item from Minh Anh. Perfect for your streetwear wardrobe.',
      1,
      'Minh Anh',
      'excellent',
      'One Size',
      'District 1, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/crossbody-1.jpg',
      'Nylon Crossbody Bag Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Leather Sling Bag Brown
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'leather-sling-bag-brown') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Leather Sling Bag Brown',
      'leather-sling-bag-brown',
      550000,
      'crossbody-bags',
      '/images/products/crossbody-2.jpg',
      '/images/products/crossbody-2.jpg',
      'A great good item from Bao Anh. Perfect for your streetwear wardrobe.',
      1,
      'Bao Anh',
      'good',
      'One Size',
      'Hai Chau, Da Nang',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/crossbody-2.jpg',
      'Leather Sling Bag Brown',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Mini Messenger Bag Olive
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'mini-messenger-bag-olive') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Mini Messenger Bag Olive',
      'mini-messenger-bag-olive',
      420000,
      'crossbody-bags',
      '/images/products/crossbody-3.jpg',
      '/images/products/crossbody-3.jpg',
      'A great like new item from Linh Nguyen. Perfect for your streetwear wardrobe.',
      1,
      'Linh Nguyen',
      'like_new',
      'One Size',
      'Cau Giay, Hanoi',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/crossbody-3.jpg',
      'Mini Messenger Bag Olive',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Tech Pouch Grey
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'tech-pouch-grey') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Tech Pouch Grey',
      'tech-pouch-grey',
      280000,
      'crossbody-bags',
      '/images/products/crossbody-4.jpg',
      '/images/products/crossbody-4.jpg',
      'A great used item from Duc Huy. Perfect for your streetwear wardrobe.',
      1,
      'Duc Huy',
      'used',
      'One Size',
      'Bien Hoa, Dong Nai',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/crossbody-4.jpg',
      'Tech Pouch Grey',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Classic Bowler Bag Black
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'classic-bowler-bag-black') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Classic Bowler Bag Black',
      'classic-bowler-bag-black',
      650000,
      'bowler-bags',
      '/images/products/bowler-bag-1.jpg',
      '/images/products/bowler-bag-1.jpg',
      'A great excellent item from Gia Han. Perfect for your streetwear wardrobe.',
      1,
      'Gia Han',
      'excellent',
      'One Size',
      'Thu Duc, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/bowler-bag-1.jpg',
      'Classic Bowler Bag Black',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Mini Bowler Bag Red
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'mini-bowler-bag-red') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Mini Bowler Bag Red',
      'mini-bowler-bag-red',
      550000,
      'bowler-bags',
      '/images/products/bowler-bag-2.jpg',
      '/images/products/bowler-bag-2.jpg',
      'A great good item from Nhat Quang. Perfect for your streetwear wardrobe.',
      1,
      'Nhat Quang',
      'good',
      'One Size',
      'Go Vap, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/bowler-bag-2.jpg',
      'Mini Bowler Bag Red',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Canvas Trim Bowler Cream
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'canvas-trim-bowler-cream') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Canvas Trim Bowler Cream',
      'canvas-trim-bowler-cream',
      480000,
      'bowler-bags',
      '/images/products/bowler-bag-3.jpg',
      '/images/products/bowler-bag-3.jpg',
      'A great like new item from Thanh Vy. Perfect for your streetwear wardrobe.',
      1,
      'Thanh Vy',
      'like_new',
      'One Size',
      'Nha Trang, Khanh Hoa',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/bowler-bag-3.jpg',
      'Canvas Trim Bowler Cream',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Structured Bowler Bag Navy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'structured-bowler-bag-navy') THEN
    v_prod_id := gen_random_uuid();
    
    INSERT INTO public.products (
      id, name, slug, price, category_slug, image_url, thumbnail,
      description, stock, seller_name, condition, size, location, is_negotiable, brand, status
    ) VALUES (
      v_prod_id,
      'Structured Bowler Bag Navy',
      'structured-bowler-bag-navy',
      750000,
      'bowler-bags',
      '/images/products/bowler-bag-4.jpg',
      '/images/products/bowler-bag-4.jpg',
      'A great used item from Hoang Minh. Perfect for your streetwear wardrobe.',
      1,
      'Hoang Minh',
      'used',
      'One Size',
      'Binh Thanh, HCMC',
      true,
      'Vintage / Local',
      'active'
    );

    INSERT INTO public.product_images (product_id, url, alt_text, is_primary)
    VALUES (
      v_prod_id,
      '/images/products/bowler-bag-4.jpg',
      'Structured Bowler Bag Navy',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
