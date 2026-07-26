const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

/**
 * Creates a notification. Relies on the unique constraint (user_id, event_key)
 * to prevent duplicates for idempotent events.
 */
async function createNotification(payload) {
  checkDb();
  const { user_id, type, title, body, action_href, event_key } = payload;

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id,
      type,
      title: title?.trim(),
      body: body?.trim(),
      action_href,
      event_key,
    })
    .select()
    .maybeSingle();

  // Handle unique violation silently as success (idempotent)
  if (error && error.code === '23505') {
    return null; // Already exists
  }
  if (error) throw error;
  return data;
}

async function listMyNotifications(userId, options = {}) {
  checkDb();
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  let limit = parseInt(options.limit, 10) || 20;
  if (limit > 50) limit = 50;

  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (options.status === 'unread') {
    query = query.eq('is_read', false);
  } else if (options.status === 'read') {
    query = query.eq('is_read', true);
  }

  if (options.type) {
    query = query.eq('type', options.type);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    if (error.code === 'PGRST103') {
      return { data: [], meta: { page, limit, count: 0 } };
    }
    throw error;
  }

  return {
    data,
    meta: { page, limit, count },
  };
}

async function getUnreadCount(userId) {
  checkDb();
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

async function markNotificationRead(userId, notificationId) {
  checkDb();
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data; // null if not found/not owned
}

async function markAllNotificationsRead(userId) {
  checkDb();
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  if (error) throw error;
  return (data || []).length;
}

module.exports = {
  createNotification,
  listMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};