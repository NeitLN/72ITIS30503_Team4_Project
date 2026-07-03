const { supabase, isSupabaseConfigured } = require('../lib/supabase');

const generateOrderCode = async () => {
  let isUnique = false;
  let code = '';
  
  // Try up to 5 times to generate a unique code
  for (let attempt = 0; attempt < 5; attempt++) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    code = `SH${dateStr}${randomStr}`;
    
    // Check uniqueness
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('order_code', code)
      .maybeSingle();
      
    if (!data && !error) {
      isUnique = true;
      break;
    }
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate a unique order code. Please try again.');
  }
  
  return code;
};

const validateOrderPayload = (payload) => {
  const { customer, paymentMethod, items } = payload;
  
  if (!customer || !customer.name || !customer.name.trim()) throw new Error('Customer name is required.');
  if (!customer.email || !customer.email.includes('@')) throw new Error('Valid customer email is required.');
  if (!customer.phone || !customer.phone.trim()) throw new Error('Customer phone is required.');
  if (!customer.address || !customer.address.trim()) throw new Error('Customer address is required.');
  
  if (!paymentMethod || !['cod', 'bank_transfer'].includes(paymentMethod)) {
    throw new Error('Invalid payment method.');
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order items cannot be empty.');
  }
  
  items.forEach(item => {
    if (!item.productName) throw new Error('Product name is required for all items.');
    if (!item.quantity || item.quantity <= 0) throw new Error('Item quantity must be greater than 0.');
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) throw new Error('Item unit price must be 0 or greater.');
  });
};

const calculateTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const shipping_fee = subtotal > 0 ? 30000 : 0;
  const total_amount = subtotal + shipping_fee;
  
  return { subtotal, shipping_fee, total_amount };
};

const isAllowedStatusTransition = (currentStatus, nextStatus) => {
  const allowedTransitions = {
    'pending': ['processing', 'cancelled'],
    'processing': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
  };
  
  return allowedTransitions[currentStatus]?.includes(nextStatus) || false;
};

const createOrder = async (user, payload) => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');
  
  validateOrderPayload(payload);
  
  const { customer, paymentMethod, notes, items } = payload;
  const totals = calculateTotals(items);
  const orderCode = await generateOrderCode();
  
  // 1. Insert into orders table
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      order_code: orderCode,
      user_id: user.id, // Comes securely from auth token middleware
      customer_name: customer.name.trim(),
      customer_email: customer.email.trim().toLowerCase(),
      customer_phone: customer.phone.trim(),
      shipping_address: customer.address.trim(),
      city: customer.city?.trim() || null,
      payment_method: paymentMethod,
      subtotal: totals.subtotal,
      shipping_fee: totals.shipping_fee,
      total_amount: totals.total_amount,
      notes: notes?.trim() || null,
      status: 'pending' // Enforced default
    }])
    .select()
    .single();
    
  if (orderError) {
    console.error('Error inserting parent order:', orderError);
    throw new Error('Database error while saving the order record.');
  }
  
  // 2. Prepare child items
  const orderItemsData = items.map(item => ({
    order_id: order.id,
    product_id: item.productId || null,
    variant_id: item.variantId || null,
    product_name: item.productName,
    product_slug: item.productSlug || null,
    image_url: item.imageUrl || null,
    sku: item.sku || null,
    size: item.size || null,
    condition: item.condition || null,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_total: item.unitPrice * item.quantity
  }));
  
  // 3. Insert child items
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsData);
    
  if (itemsError) {
    console.error('Error inserting order items. Parent order was inserted.', itemsError);
    // Ideally we would roll back the parent transaction here. 
    // Since Supabase REST doesn't natively support full transactions via single HTTP call easily, 
    // we attempt a manual rollback if child inserts fail.
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error('Database error while saving order items. Order creation aborted.');
  }
  
  // 4. Return full completed order with items attached
  return { ...order, items: orderItemsData };
};

const listMyOrders = async (userId) => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');
  
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, status, payment_method, subtotal, shipping_fee, total_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching user orders:', error);
    throw new Error('Failed to retrieve your orders.');
  }
  
  return data;
};

const listAllOrders = async () => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');
  
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, customer_name, customer_email, customer_phone, payment_method, status, subtotal, shipping_fee, total_amount, created_at, updated_at')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching all orders:', error);
    throw new Error('Failed to retrieve orders list.');
  }
  
  return data;
};

const getOrderById = async (orderId, user) => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');
  
  // 1. Fetch order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
    
  if (orderError || !order) {
    throw { status: 404, message: 'Order not found' };
  }
  
  // Authorization check
  if (user.role !== 'admin' && order.user_id !== user.id) {
    throw { status: 403, message: 'Access denied. You can only view your own orders.' };
  }
  
  // 2. Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
    
  if (itemsError) {
    console.error(`Error fetching items for order ${orderId}:`, itemsError);
    // Don't fail the entire request, just return an empty array for items
  }
  
  return { ...order, items: items || [] };
};

const updateOrderStatus = async (orderId, nextStatus) => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');
  
  // 1. Fetch current status
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();
    
  if (fetchError || !currentOrder) {
    throw { status: 404, message: 'Order not found' };
  }
  
  // 2. Validate transition
  if (!isAllowedStatusTransition(currentOrder.status, nextStatus)) {
    throw { status: 400, message: `Cannot transition order status from '${currentOrder.status}' to '${nextStatus}'.` };
  }
  
  // 3. Perform update
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', orderId)
    .select('id, order_code, status')
    .single();
    
  if (updateError) {
    console.error('Error updating order status:', updateError);
    throw new Error('Failed to update order status in the database.');
  }
  
  return updatedOrder;
};

module.exports = {
  createOrder,
  listMyOrders,
  listAllOrders,
  getOrderById,
  updateOrderStatus
};
