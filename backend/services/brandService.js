const { supabase, isSupabaseConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const getBrands = async () => {
  checkDb();

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

module.exports = {
  getBrands,
};
