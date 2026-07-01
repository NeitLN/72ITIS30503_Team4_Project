const { supabase, isSupabaseConfigured } = require('../lib/supabase');
const productService = require('./productService');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const normalizeCategory = (cat) => ({
  id: cat.id,
  parent_id: cat.parent_id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  image_url: cat.image_url || cat.image || '',
  sort_order: cat.sort_order !== undefined ? cat.sort_order : (cat.display_order || 0),
  is_active: cat.is_active !== undefined ? cat.is_active : true
});

const getCategories = async () => {
  checkDb();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    // Removing the strict is_active filter just in case the old schema doesn't have it.
    // We will filter in JS if needed.
    .order('name', { ascending: true });

  if (error) throw error;
  
  const normalized = (data || []).map(normalizeCategory).filter(c => c.is_active);
  // Sort by sort_order
  normalized.sort((a, b) => a.sort_order - b.sort_order);
  
  return normalized;
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
  return normalizeCategory(data);
};

const getProductsByCategorySlug = async (slug, options = {}) => {
  checkDb();
  
  const category = await getCategoryBySlug(slug);
  if (!category) return null;
  
  // Reuse product service without embedded query
  const productsResult = await productService.getProducts({
    ...options,
    category: slug
  });
  
  return {
    category,
    products: productsResult.data,
    meta: productsResult.meta
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
