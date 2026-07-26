const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const notificationService = require('./notificationService');

const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

class ConversationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = 'ConversationError';
  }
}

function toPublicParticipant(user) {
  if (!user) return null;
  return {
    username: user.username,
    full_name: user.full_name,
    avatar_url: user.avatar_url
  };
}

async function getOrCreateOrderConversation(userId, orderId, requestedSellerId = null) {
  checkDb();

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) throw new ConversationError('Không tìm thấy đơn hàng.', 404);

  let sellerId = null;
  const isBuyer = order.buyer_id === userId;

  if (isBuyer) {
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .select('seller_id')
      .eq('order_id', orderId);
    if (itemsErr) throw itemsErr;
    if (!items || items.length === 0) throw new ConversationError('Không tìm thấy đơn hàng.', 404);

    const uniqueSellers = [...new Set(items.map(i => i.seller_id))];
    
    if (uniqueSellers.length > 1) {
      if (!requestedSellerId) {
        throw new ConversationError('Đơn hàng có nhiều người bán, vui lòng chọn người bán để nhắn tin.', 400);
      }
      if (!uniqueSellers.includes(requestedSellerId)) {
        throw new ConversationError('Người bán không tồn tại trong đơn hàng này.', 404);
      }
      sellerId = requestedSellerId;
    } else {
      if (requestedSellerId && requestedSellerId !== uniqueSellers[0]) {
        throw new ConversationError('Người bán không tồn tại trong đơn hàng này.', 404);
      }
      sellerId = uniqueSellers[0];
    }
  } else {
    // For sellers, body requestedSellerId must not override authenticated identity.
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .eq('seller_id', userId)
      .limit(1);
    if (itemsErr) throw itemsErr;
    if (!items || items.length === 0) throw new ConversationError('Không tìm thấy đơn hàng.', 404); // returns safe 404
    sellerId = userId;
  }

  if (sellerId === order.buyer_id) {
    throw new ConversationError('Không thể tạo cuộc trò chuyện với chính mình.', 400);
  }

  // Find existing
  const { data: existing, error: findErr } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('order_id', orderId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing.id;

  // Create new
  const { data: created, error: createErr } = await supabaseAdmin
    .from('conversations')
    .insert({
      order_id: orderId,
      buyer_id: order.buyer_id,
      seller_id: sellerId,
    })
    .select('id')
    .maybeSingle();

  if (createErr) {
    if (createErr.code === '23505') {
      const { data: retry } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('order_id', orderId)
        .eq('seller_id', sellerId)
        .maybeSingle();
      if (retry) return retry.id;
    }
    throw createErr;
  }

  return created.id;
}

async function listMyConversations(userId, options = {}) {
  checkDb();
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  let limit = parseInt(options.limit, 10) || 20;
  if (limit > 50) limit = 50;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from('conversations')
    .select(`
      id,
      order_id,
      status,
      updated_at,
      buyer:users!buyer_id(id, full_name, avatar_url, username),
      seller:users!seller_id(id, full_name, avatar_url, username)
    `, { count: 'exact' })
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {
    if (error.code === 'PGRST103') {
      return { data: [], meta: { page, limit, count: 0 } };
    }
    throw error;
  }

  const conversationIds = data.map(c => c.id);
  if (conversationIds.length > 0) {
    const { data: messages, error: msgsErr } = await supabaseAdmin
      .from('messages')
      .select('conversation_id, body, created_at, sender_id, is_read')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (msgsErr) throw msgsErr; // Propagate database error

    if (messages) {
      data.forEach(c => {
        const convMsgs = messages.filter(m => m.conversation_id === c.id);
        if (convMsgs.length > 0) {
          const lastMsg = convMsgs[0];
          c.last_message = {
            body: lastMsg.body,
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id
          };
          c.unread_count = convMsgs.filter(m => m.sender_id !== userId && !m.is_read).length;
        } else {
          c.last_message = null;
          c.unread_count = 0;
        }
      });
    }
  }

  return {
    data: data.map(c => {
      const otherParticipant = c.buyer.id === userId ? c.seller : c.buyer;
      return {
        id: c.id,
        order_id: c.order_id,
        status: c.status,
        updated_at: c.updated_at,
        other_participant: toPublicParticipant(otherParticipant),
        last_message: c.last_message,
        unread_count: c.unread_count || 0
      };
    }),
    meta: { page, limit, count },
  };
}

// Internal resolver providing full participant IDs for correct logic evaluation
async function resolveConversationForParticipant(userId, conversationId) {
  checkDb();
  const { data: conv, error } = await supabaseAdmin
    .from('conversations')
    .select(`
      id,
      order_id,
      buyer_id,
      seller_id,
      status,
      buyer:users!buyer_id(id, full_name, avatar_url, username),
      seller:users!seller_id(id, full_name, avatar_url, username)
    `)
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    if (error.code === '22P02') return null;
    throw error;
  }
  if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) return null;

  return {
    ...conv,
    caller_role: conv.buyer_id === userId ? 'buyer' : 'seller',
    other_user_id: conv.buyer_id === userId ? conv.seller_id : conv.buyer_id,
    other_participant_raw: conv.buyer_id === userId ? conv.seller : conv.buyer
  };
}

async function getConversation(userId, conversationId) {
  const conv = await resolveConversationForParticipant(userId, conversationId);
  if (!conv) return null;

  return {
    id: conv.id,
    order_id: conv.order_id,
    status: conv.status,
    other_participant: toPublicParticipant(conv.other_participant_raw)
  };
}

async function listMessages(userId, conversationId, options = {}) {
  const conv = await resolveConversationForParticipant(userId, conversationId);
  if (!conv) throw new ConversationError('Không tìm thấy cuộc trò chuyện.', 404);

  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  let limit = parseInt(options.limit, 10) || 50;
  if (limit > 100) limit = 100;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, body, created_at, is_read, read_at', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    if (error.code === 'PGRST103') {
      return { data: [], meta: { page, limit, count: 0 } };
    }
    throw error;
  }

  return { data, meta: { page, limit, count } };
}

async function sendMessage(userId, conversationId, body) {
  const conv = await resolveConversationForParticipant(userId, conversationId);
  if (!conv) throw new ConversationError('Không tìm thấy cuộc trò chuyện.', 404);
  if (conv.status !== 'active') throw new ConversationError('Cuộc trò chuyện đã đóng.', 400);

  const trimmed = String(body || '').trim();
  if (!trimmed) throw new ConversationError('Nội dung tin nhắn không được để trống.', 422);
  if (trimmed.length > 2000) throw new ConversationError('Tin nhắn quá dài (tối đa 2000 ký tự).', 422);

  const { data: msg, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: trimmed
    })
    .select('id, sender_id, body, created_at, is_read')
    .single();

  if (error) throw error;

  await supabaseAdmin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  try {
    const senderRoleLabel = conv.caller_role === 'buyer' ? 'người mua' : 'người bán';
    await notificationService.createNotification({
      user_id: conv.other_user_id,
      type: 'buyer_message',
      title: 'Tin nhắn mới',
      body: `Bạn có tin nhắn mới từ ${senderRoleLabel}.`,
      action_href: `/messages/${conversationId}`,
      event_key: `msg_${msg.id}`
    });
  } catch (notifErr) {
    console.error('Failed to dispatch message notification', notifErr);
  }

  return msg;
}

async function markConversationRead(userId, conversationId) {
  const conv = await resolveConversationForParticipant(userId, conversationId);
  if (!conv) throw new ConversationError('Không tìm thấy cuộc trò chuyện.', 404);

  const { error } = await supabaseAdmin
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return true;
}

async function reportMessage(userId, messageId, reason) {
  checkDb();

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw new ConversationError('Vui lòng nhập lý do báo cáo.', 422);
  if (trimmedReason.length > 500) throw new ConversationError('Lý do quá dài (tối đa 500 ký tự).', 422);

  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('messages')
    .select('conversation_id')
    .eq('id', messageId)
    .maybeSingle();

  if (msgErr) {
    if (msgErr.code === '22P02') throw new ConversationError('Không tìm thấy tin nhắn.', 404);
    throw msgErr;
  }
  if (!msg) throw new ConversationError('Không tìm thấy tin nhắn.', 404);

  const conv = await resolveConversationForParticipant(userId, msg.conversation_id);
  if (!conv) throw new ConversationError('Không tìm thấy tin nhắn.', 404);

  const { error: insertErr } = await supabaseAdmin
    .from('message_reports')
    .insert({
      message_id: messageId,
      reporter_id: userId,
      reason: trimmedReason
    });

  if (insertErr) {
    if (insertErr.code === '23505') return true;
    throw insertErr;
  }

  return true;
}

module.exports = {
  ConversationError,
  getOrCreateOrderConversation,
  listMyConversations,
  getConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  reportMessage
};