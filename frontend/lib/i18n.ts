export const VI_LOCALE = 'vi-VN';
export const VI_TIMEZONE = 'Asia/Ho_Chi_Minh';

export const vi = {
  common: {
    loading: 'Đang tải...',
    error: 'Đã xảy ra lỗi.',
    retry: 'Thử lại',
    save: 'Lưu',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    back: 'Quay lại',
    continueShopping: 'Tiếp tục mua sắm',
    viewDetails: 'Xem chi tiết',
  },

  cart: {
    title: 'Giỏ hàng',
    empty: 'Giỏ hàng của bạn đang trống.',
    item: 'Sản phẩm',
    items: 'Sản phẩm',
    quantity: 'Số lượng',
    price: 'Giá',
    remove: 'Xóa',
    subtotal: 'Tạm tính',
    shippingFee: 'Phí vận chuyển',
    discount: 'Giảm giá',
    total: 'Tổng cộng',
    orderSummary: 'Tóm tắt đơn hàng',
    checkout: 'Thanh toán',
    continueShopping: 'Tiếp tục mua sắm',
  },

  checkout: {
    title: 'Thanh toán',
    loginRequiredTitle: 'Đăng nhập để đặt hàng',
    loginRequiredBody: 'Vui lòng đăng nhập để đặt hàng và theo dõi lịch sử mua hàng.',
    goToLogin: 'Đến trang đăng nhập',
    createAccount: 'Tạo tài khoản',
    formTitle: 'Thông tin giao hàng',
    fullName: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại',
    phoneHint: 'Dùng để xác nhận giao hàng.',
    province: 'Tỉnh / Thành phố',
    district: 'Quận / Huyện',
    street: 'Địa chỉ cụ thể',
    paymentMethod: 'Phương thức thanh toán',
    cod: 'Thanh toán khi nhận hàng',
    bankTransfer: 'Chuyển khoản ngân hàng',
    orderSummary: 'Tóm tắt đơn hàng',
    placeOrder: 'Đặt hàng',
    processingOrder: 'Đang xử lý đơn hàng...',
    successTitle: 'Đặt hàng thành công',
    successMessage: 'Cảm ơn bạn đã mua sắm tại StyleHub.',
    viewMyOrders: 'Xem đơn hàng của tôi',
  },

  validation: {
    fullNameRequired: 'Vui lòng nhập họ và tên.',
    fullNameMin: 'Họ và tên phải có ít nhất 2 ký tự.',
    emailRequired: 'Vui lòng nhập email.',
    emailInvalid: 'Vui lòng nhập email hợp lệ.',
    phoneRequired: 'Vui lòng nhập số điện thoại.',
    phoneInvalid: 'Số điện thoại Việt Nam không hợp lệ.',
    provinceRequired: 'Vui lòng nhập tỉnh hoặc thành phố.',
    districtRequired: 'Vui lòng nhập quận hoặc huyện.',
    streetRequired: 'Vui lòng nhập địa chỉ cụ thể.',
    paymentMethodRequired: 'Vui lòng chọn phương thức thanh toán.',
  },

  orders: {
    title: 'Đơn hàng của tôi',
    empty: 'Bạn chưa có đơn hàng nào.',
    orderCode: 'Mã đơn hàng',
    orderId: 'Mã đơn',
    orderDate: 'Ngày đặt',
    createdAt: 'Ngày tạo',
    updatedAt: 'Cập nhật lúc',
    status: 'Trạng thái',
    total: 'Tổng tiền',
    subtotal: 'Tạm tính',
    shippingFee: 'Phí vận chuyển',
    discount: 'Giảm giá',
    paymentMethod: 'Phương thức thanh toán',
    shippingAddress: 'Địa chỉ giao hàng',
    customer: 'Khách hàng',
    phone: 'Số điện thoại',
    email: 'Email',
  },

  adminOrders: {
    title: 'Quản lý đơn hàng',
    customer: 'Khách hàng',
    orderCode: 'Mã đơn hàng',
    status: 'Trạng thái',
    total: 'Tổng tiền',
    paymentMethod: 'Thanh toán',
    createdAt: 'Ngày tạo',
    updateStatus: 'Cập nhật trạng thái',
    actions: 'Thao tác',
  },

  payment: {
    cod: 'Thanh toán khi nhận hàng',
    bank_transfer: 'Chuyển khoản ngân hàng',
    bankTransfer: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
    unknown: 'Không xác định',
  },

  status: {
    pending: 'Đang chờ xử lý',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipped: 'Đang giao hàng',
    delivered: 'Đã giao hàng',
    cancelled: 'Đã hủy',
    canceled: 'Đã hủy',
    completed: 'Hoàn tất',
    paid: 'Đã thanh toán',
    unpaid: 'Chưa thanh toán',
  },

  coupon: {
    title: 'Mã giảm giá',
    placeholder: 'Nhập mã giảm giá',
    apply: 'Áp dụng mã',
    remove: 'Gỡ mã',
    discount: 'Giảm giá',
    invalid: 'Mã giảm giá không hợp lệ.',
    expired: 'Mã giảm giá đã hết hạn.',
    applied: 'Đã áp dụng mã giảm giá.',
    notImplementedYet: 'Mã giảm giá sẽ được xử lý ở bước tiếp theo.',
  },
} as const;

export function tStatus(status: string | null | undefined): string {
  if (!status) return '';
  return vi.status[status as keyof typeof vi.status] || status;
}

export function tPaymentMethod(method: string | null | undefined): string {
  if (!method) return '';
  return vi.payment[method as keyof typeof vi.payment] || method;
}
