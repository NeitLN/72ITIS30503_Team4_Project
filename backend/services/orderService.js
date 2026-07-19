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
    throw new Error('Không thể tạo mã đơn hàng duy nhất. Vui lòng thử lại.');
  }

  return code;
};

const validateOrderPayload = (payload) => {
  const { customer, paymentMethod, items } = payload;

  if (!customer || !customer.name || !customer.name.trim()) throw new Error('Vui lòng nhập họ và tên.');
  if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) throw new Error('Vui lòng nhập email hợp lệ.');
  if (!customer.phone || !/^0[0-9]{9}$/.test(customer.phone.trim())) throw new Error('Số điện thoại Việt Nam không hợp lệ.');
  if (!customer.address || !customer.address.trim()) throw new Error('Vui lòng nhập địa chỉ giao hàng.');

  if (!paymentMethod || !['cod', 'bank_transfer'].includes(paymentMethod)) {
    throw new Error('Phương thức thanh toán không hợp lệ.');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Đơn hàng phải có ít nhất một sản phẩm.');
  }

  items.forEach(item => {
    if (!item.productName) throw new Error('Thiếu tên sản phẩm cho một hoặc nhiều mục.');
    if (!item.quantity || item.quantity <= 0) throw new Error('Số lượng sản phẩm phải lớn hơn 0.');
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) throw new Error('Đơn giá sản phẩm phải từ 0 trở lên.');
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
    throw { status: 400, message: 'Vui lòng nhập mã giảm giá.' };
  }

  const normalizedCode = code.trim().toUpperCase();

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (error || !coupon) {
    throw { status: 404, message: 'Mã giảm giá không hợp lệ.' };
  }

  if (!coupon.is_active) {
    throw { status: 400, message: 'Mã giảm giá này không còn hoạt động.' };
  }

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    throw { status: 400, message: 'Mã giảm giá này chưa có hiệu lực.' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    throw { status: 400, message: 'Mã giảm giá đã hết hạn.' };
  }

  if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) {
    throw { status: 400, message: `Đơn hàng cần tối thiểu ${coupon.minimum_order_amount.toLocaleString('vi-VN')}đ để áp dụng mã này.` };
  }

  return coupon;
};

// Phase 9: revalidate every cart item against its CURRENT, real product
// row right before the order is created — a listing a seller hid, sold,
// or archived (or simply ran out of stock) since it was added to the cart
// must never be purchasable just because the client's local cart still
// shows it. Never trust price/availability implied by the client payload.
const validateItemsAvailability = async (items) => {
  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  if (!productIds.length) return;

  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, status, stock')
    .in('id', productIds);
  if (fetchErr) throw new Error('Không thể kiểm tra tình trạng sản phẩm. Vui lòng thử lại.');

  const byId = new Map((products || []).map((p) => [p.id, p]));
  const unavailable = [];
  for (const item of items) {
    if (!item.productId) continue;
    const product = byId.get(item.productId);
    if (!product || product.status !== 'active') {
      unavailable.push(item.productName || product?.name || 'một sản phẩm');
      continue;
    }
    if (typeof product.stock === 'number' && product.stock < item.quantity) {
      unavailable.push(item.productName || product.name);
    }
  }

  if (unavailable.length) {
    throw { status: 409, message: `Sản phẩm sau không còn khả dụng, vui lòng cập nhật giỏ hàng: ${unavailable.join(', ')}.` };
  }
};

const createOrder = async (user, payload) => {
  if (!isSupabaseConfigured()) throw new Error('Database is not configured');

  validateOrderPayload(payload);
  await validateItemsAvailability(payload.items);

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
    // Never propagate the raw Postgres error message to the client — it may
    // contain internal schema/constraint details. It's already logged above.
    throw new Error('Không thể lưu đơn hàng. Vui lòng thử lại.');
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
    throw new Error('Không thể lưu chi tiết đơn hàng. Đơn hàng đã được hủy tạo.');
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
    throw new Error('Không thể tải danh sách đơn hàng của bạn.');
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
    throw new Error('Không thể tải danh sách đơn hàng.');
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
    throw { status: 404, message: 'Không tìm thấy đơn hàng.' };
  }
  
  // Authorization check
  if (user.role !== 'admin' && order.user_id !== user.id) {
    throw { status: 403, message: 'Bạn chỉ có thể xem đơn hàng của chính mình.' };
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
    throw { status: 404, message: 'Không tìm thấy đơn hàng.' };
  }
  
  // 2. Validate transition
  if (!isAllowedStatusTransition(currentOrder.status, nextStatus)) {
    throw { status: 400, message: `Không thể chuyển trạng thái đơn hàng từ '${currentOrder.status}' sang '${nextStatus}'.` };
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
    throw new Error('Không thể cập nhật trạng thái đơn hàng.');
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
