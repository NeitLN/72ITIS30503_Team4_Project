const { supabase, isSupabaseConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const getProducts = async (options = {}) => {
  checkDb();
  
  let query = supabase
    .from('products')
    .select(`
      *,
      seller:users(username, full_name, avatar_url, location, seller_rating, sold_count, is_verified_seller),
      brand:brands(name, slug, is_local, country),
      category:categories(name, slug),
      images:product_images(image_url, alt_text, sort_order, is_primary)
    `, { count: 'exact' })
    .eq('status', 'active');

  if (options.category) {
    // If we wanted to include subcategories we would need an rpc or complex join,
    // but for simple cases we just match the slug of the category.
    // However, category relation is nested, we might need inner join.
    query = query.eq('category.slug', options.category).not('category', 'is', null);
  }

  if (options.brand) {
    query = query.eq('brand.slug', options.brand).not('brand', 'is', null);
  }

  if (options.condition) {
    query = query.eq('condition', options.condition);
  }

  if (options.product_type) {
    query = query.eq('product_type', options.product_type);
  }

  if (options.featured === 'true' || options.featured === true) {
    query = query.eq('is_featured', true);
  }

  if (options.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  // Pagination
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data,
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
    .select(`
      *,
      seller:users(username, full_name, avatar_url, location, seller_rating, sold_count, is_verified_seller),
      brand:brands(name, slug, is_local, country),
      category:categories(name, slug),
      images:product_images(image_url, alt_text, sort_order, is_primary)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
};

const getFeaturedProducts = async () => {
  return getProducts({ featured: true, limit: 10 });
};

const getProductVariants = async (productId) => {
  checkDb();
  
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
};

module.exports = {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  getProductVariants
};
