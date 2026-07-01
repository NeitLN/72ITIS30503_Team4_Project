const { supabase, isSupabaseConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const getCategories = async () => {
  checkDb();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

const getCategoryBySlug = async (slug) => {
  checkDb();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};

const getProductsByCategorySlug = async (slug, options = {}) => {
  checkDb();
  
  // To avoid complex joins, we can first find the category ID, then get products
  const category = await getCategoryBySlug(slug);
  if (!category) return null;
  
  // Then pass category_id to a product query. For simplicity, we can just require productService
  // However, circular dependency might occur, let's keep it simple here.
  
  let query = supabase
    .from('products')
    .select(`
      *,
      seller:users(username, full_name, avatar_url, location, seller_rating, sold_count, is_verified_seller),
      brand:brands(name, slug, is_local, country),
      category:categories(name, slug),
      images:product_images(image_url, alt_text, sort_order, is_primary)
    `, { count: 'exact' })
    .eq('status', 'active')
    .eq('category_id', category.id);
    
  // Pagination
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;
  
  return {
    category,
    products: data,
    meta: {
      page,
      limit,
      count
    }
  };
};

const buildCategoryTree = (categories) => {
  const map = {};
  const roots = [];

  // Initialize map
  categories.forEach(cat => {
    map[cat.id] = { ...cat, children: [] };
  });

  // Build tree
  categories.forEach(cat => {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  });

  return roots;
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  getProductsByCategorySlug,
  buildCategoryTree
};
