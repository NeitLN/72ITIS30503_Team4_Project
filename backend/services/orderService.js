const { supabase, isSupabaseConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

/**
 * Creates a new order along with its line items (Parent-Child Relational Insert)
 */
const createOrder = async (orderData) => {
  checkDb();
  
  const {
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    customer_city,
    payment_method,
    total_amount,
    items = []
  } = orderData;

  // 1. Insert Parent Order Record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([
      {
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        customer_city,
        payment_method,
        total_amount,
        status: 'pending' // Default initial state
      }
    ])
    .select()
    .single();

  if (orderError) {
    console.error('Error creating parent order:', orderError);
    throw orderError;
  }

  const orderId = order.id;

  // 2. Insert Child Order Items (Relational Data)
  if (items.length > 0) {
    const formattedItems = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id || null,
      product_name: item.name || item.product_name,
      price: item.price,
      quantity: item.quantity || 1,
      size: item.size || 'One size',
      condition: item.condition || 'New'
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(formattedItems);

    if (itemsError) {
      console.error('Error creating child order items:', itemsError);
      // Rollback option in pure PG is transactional, in Supabase REST we delete the parent on error
      await supabase.from('orders').delete().eq('id', orderId);
      throw itemsError;
    }
  }

  // Return full structured order with items
  return {
    ...order,
    items
  };
};

/**
 * Gets all orders sorted by creation date descending
 */
const getOrders = async () => {
  checkDb();
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Gets a specific order along with all its relational order items (Parent-Child Fetch)
 */
const getOrderById = async (orderId) => {
  checkDb();
  
  // Fetch parent order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) {
    if (orderError.code === 'PGRST116') return null; // Not found
    throw orderError;
  }

  // Fetch child order items (Relational details)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (itemsError) throw itemsError;

  return {
    ...order,
    items: items || []
  };
};

/**
 * Transition order status (pending -> processing -> completed)
 */
const updateOrderStatus = async (orderId, status) => {
  checkDb();
  
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
