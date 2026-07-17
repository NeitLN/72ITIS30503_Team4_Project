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
  if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) throw new Error('Valid customer email is required.');
  if (!customer.phone || !/^0[0-9]{9}$/.test(customer.phone.trim())) throw new Error('Invalid Vietnamese phone number.');
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

const calculateTotals = (items, appliedCoupon = null) => {
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  // Free shipping over 500,000 VND, matching the threshold promised in the cart UI.
  const shipping_fee = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
  
  let discount_amount = 0;

  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discount_amount = subtotal * (appliedCoupon.discount_value / 100);
      if (appliedCoupon.maximum_discount_amount) {
        discount_amount = Math.min(discount_amount, appliedCoupon.maximum_discount_amount);
      }
    } else if (appliedCoupon.discount_type === 'fixed') {
      discount_amount = Math.min(appliedCoupon.discount_value, subtotal + shipping_fee);
    } else if (appliedCoupon.discount_type === 'free_shipping') {
      discount_amount = shipping_fee;
    }
  }

  // Ensure total is never negative
  const total_amount = Math.max(0, subtotal + shipping_fee - discount_amount);
  
  return { subtotal, shipping_fee, discount_amount, total_amount };
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

const validateCouponCode = async (code, subtotal) => {
  if (!code || !code.trim()) {
    throw { status: 400, message: 'Coupon code is missing.' };
  }

  const normalizedCode = code.trim().toUpperCase();

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (error || !coupon) {
    throw { status: 404, message: 'Invalid coupon code.' };
  }

  if (!coupon.is_active) {
    throw { status: 400, message: 'This coupon is no longer active.' };
  }

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    throw { status: 400, message: 'This coupon is not yet valid.' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    throw { status: 400, message: 'This coupon has expired.' };
  }

  if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) {
    throw { status: 400, message: `Minimum order amount of ${coupon.minimum_order_amount} required.` };
  }

  return coupon;
};

const createOrder = async (user, payload) => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');
  
  validateOrderPayload(payload);
  
  const { customer, paymentMethod, notes, items, couponCode } = payload;
  
  // Calculate raw subtotal first to validate coupon
  const rawSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  let appliedCoupon = null;
  if (couponCode) {
    appliedCoupon = await validateCouponCode(couponCode, rawSubtotal);
  }

  const totals = calculateTotals(items, appliedCoupon);
  const orderCode = await generateOrderCode();
  
  // 1. Insert into orders table
  const orderPayload = {
    // Original required NOT NULL columns
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    customer_address: customer.address,
    customer_city: customer.city,
    payment_method: paymentMethod,
    total_amount: totals.total_amount,
    status: 'pending',

    // Newer columns
    user_id: user.id,
    shipping_address: customer.address,
    city: customer.city,
    subtotal: totals.subtotal,
    shipping_fee: totals.shipping_fee,
    discount_amount: totals.discount_amount,
    order_code: orderCode,
    notes: notes?.trim() || null
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([orderPayload])
    .select()
    .single();
    
  if (orderError) {
    console.error('Order insert payload:', orderPayload);
    console.error('Order insert error:', {
      message: orderError?.message,
      details: orderError?.details,
      hint: orderError?.hint,
      code: orderError?.code,
    });
    throw new Error(orderError?.message || 'Database error while saving the order record.');
  }

  // 1b. Insert into order_coupons if applicable
  if (appliedCoupon) {
    const { error: couponError } = await supabase
      .from('order_coupons')
      .insert([{
        order_id: order.id,
        coupon_id: appliedCoupon.id,
        discount_amount: totals.discount_amount
      }]);
      
    if (couponError) {
      console.error('Warning: Failed to insert order_coupons record:', couponError);
      // Not failing the entire order, just logging
    }
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
    .select('id, order_code, status, payment_method, subtotal, shipping_fee, discount_amount, total_amount, created_at')
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
    .select('id, order_code, user_id, customer_name, customer_email, customer_phone, status, payment_method, subtotal, shipping_fee, discount_amount, total_amount, created_at, updated_at')
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
  updateOrderStatus,
  validateCouponCode,
  calculateTotals
};
