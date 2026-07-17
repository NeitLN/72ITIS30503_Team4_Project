const { supabase, isSupabaseConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const attachRelations = async (products) => {
  if (!products || products.length === 0) return products;

  const sellerIds = [...new Set(products.map(p => p.seller_id).filter(Boolean))];
  const brandIds = [...new Set(products.map(p => p.brand_id).filter(Boolean))];
  const categorySlugs = [...new Set(products.map(p => p.category_slug).filter(Boolean))];
  const productIds = [...new Set(products.map(p => p.id))];

  let users = [];
  let brands = [];
  let categories = [];
  let images = [];

  if (sellerIds.length > 0) {
    try {
      const { data } = await supabase.from('users').select('*').in('id', sellerIds);
      if (data) users = data;
    } catch (e) {}
  }
  
  if (brandIds.length > 0) {
    try {
      const { data } = await supabase.from('brands').select('*').in('id', brandIds);
      if (data) brands = data;
    } catch (e) {}
  }
  
  if (categorySlugs.length > 0) {
    try {
      const { data } = await supabase.from('categories').select('*').in('slug', categorySlugs);
      if (data) categories = data;
    } catch (e) {}
  }
  
  if (productIds.length > 0) {
    try {
      const { data } = await supabase.from('product_images').select('*').in('product_id', productIds);
      if (data) images = data;
    } catch (e) {}
  }

  return products.map(product => {
    const seller = users.find(u => u.id === product.seller_id);
    const brand = brands.find(b => b.id === product.brand_id);
    const category = categories.find(c => c.slug === product.category_slug);
    const productImages = images.filter(i => i.product_id === product.id);

    return {
      ...product,
      seller: seller ? {
        username: seller.username,
        full_name: seller.full_name,
        avatar_url: seller.avatar_url,
        location: seller.location,
        seller_rating: seller.seller_rating,
        sold_count: seller.sold_count,
        is_verified_seller: seller.is_verified_seller
      } : null,
      brand: brand ? {
        name: brand.name,
        slug: brand.slug,
        is_local: brand.is_local,
        country: brand.country
      } : null,
      category: category ? {
        name: category.name,
        slug: category.slug
      } : null,
      images: productImages.map(img => ({
        image_url: img.url || img.image_url || img.image || '',
        alt_text: img.alt_text || '',
        sort_order: img.sort_order !== undefined ? img.sort_order : (img.display_order || 0),
        is_primary: img.is_primary || false
      }))
    };
  });
};

const getProducts = async (options = {}) => {
  checkDb();
  
  let query = supabase.from('products').select('*', { count: 'exact' });

  // Assume active status is required unless specified
  query = query.eq('status', 'active');

  if (options.category) {
    try {
      const { data: catData } = await supabase.from('categories').select('id').eq('slug', options.category).single();
      if (catData) {
        query = query.eq('category_slug', options.category); // fallback to slug mapping if id throws
      } else {
        return { data: [], meta: { page: options.page || 1, limit: options.limit || 20, count: 0 } };
      }
    } catch (e) {
      return { data: [], meta: { page: options.page || 1, limit: options.limit || 20, count: 0 } };
    }
  }

  if (options.brand) {
    try {
      const { data: brandData } = await supabase.from('brands').select('id').eq('slug', options.brand).single();
      if (brandData) {
        query = query.eq('brand_id', brandData.id);
      } else {
        return { data: [], meta: { page: options.page || 1, limit: options.limit || 20, count: 0 } };
      }
    } catch (e) {
      return { data: [], meta: { page: options.page || 1, limit: options.limit || 20, count: 0 } };
    }
  }

  if (options.seller) {
    try {
      const { data: userData, error } = await supabase.from('users').select('id').eq('username', options.seller).single();
      if (!error && userData) {
        query = query.eq('seller_id', userData.id);
      } else {
        // Fallback for old schema where user table is empty but products have seller_name
        query = query.ilike('seller_name', `%${options.seller}%`);
      }
    } catch (e) {
      // If table users lacks username column, query by seller_name directly on products table (bulletproof fallback)
      query = query.ilike('seller_name', `%${options.seller}%`);
    }
  }

  if (options.condition) {
    query = query.eq('condition', options.condition);
  }

  if (options.product_type) {
    query = query.eq('product_type', options.product_type);
  }

  if (options.featured === 'true' || options.featured === true) {
    // Gracefully handle if old schema missing is_featured
    // Just sort differently as a fallback without breaking if it fails
    // But since it crashes on execution we need to check if column exists first or just catch at query
    // To avoid complex pg_catalog lookups, we will try the query and if it fails, catch it and fallback in route
    query = query.eq('is_featured', true);
  }

  if (options.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  if (options.on_sale === 'true' || options.on_sale === true || options.filter === 'on_sale') {
    query = query.not('sale_price', 'is', null).gt('sale_price', 0);
  }

  const page = parseInt(options.page) || 1;
  let limit = parseInt(options.limit) || 20;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  if (options.sort === 'latest' || options.filter === 'latest') {
    query = query.order('created_at', { ascending: false });
  } else {
    // Default sorting
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Filter out any products where sale_price is not strictly less than price
  let validData = data;
  if (options.on_sale === 'true' || options.on_sale === true || options.filter === 'on_sale') {
    validData = data.filter(p => p.sale_price < p.price);
  }

  const enrichedData = await attachRelations(validData);

  return {
    data: enrichedData,
    meta: {
      page,
      limit,
      count
    }
  };
};

const getProductBySlug = async (slug) => {
  checkDb();
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  const enrichedData = await attachRelations([data]);
  return enrichedData[0];
};

const getFeaturedProducts = async () => {
  try {
    return await getProducts({ featured: true, limit: 10 });
  } catch (err) {
    // If the database complains about missing `is_featured` column on older schemas, fallback gracefully
    if (err?.code === '42703' || err?.message?.includes('is_featured')) {
      return await getProducts({ limit: 10 });
    }
    throw err;
  }
};

const getProductVariants = async (productId) => {
  checkDb();
  
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select(`
        *,
        variant_attribute_values(
          attribute_value:attribute_values(
            value,
            slug,
            attribute:attributes(name, slug)
          )
        )
      `)
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  } catch (err) {
    // Fallback if relational mapping fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);
      
    if (fallbackError || !fallbackData) return [];
    
    return fallbackData.map(v => ({
      ...v,
      variant_attribute_values: []
    }));
  }
};

module.exports = {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  getProductVariants
};




