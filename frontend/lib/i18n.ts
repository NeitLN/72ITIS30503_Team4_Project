/**
 * StyleHub hybrid-language content policy (Phase 8.1 correction).
 *
 * StyleHub is a Vietnamese C2C fashion marketplace, not a translated
 * English site. Content is deliberately bilingual — English where fashion
 * shoppers already think in English, Vietnamese where the user is doing a
 * task and needs zero ambiguity. Blanket machine-style translation of every
 * string (including brand slogans, taxonomy, and editorial headings) was
 * tried in an earlier pass and reverted: it made the marketplace read as
 * generic and mechanical, and weakened the streetwear/Grailed-Depop-style
 * identity the brand is built on.
 *
 * DECISION RUBRIC — apply this to any new or edited string before writing it:
 *   1. Would a Vietnamese fashion/streetwear shopper already understand
 *      this English term without translation? (Most do for "Shop", "Sale",
 *      "Sneakers", "Hoodie", "Drop", brand/collection names, sizing.)
 *   2. Does translating it word-for-word sound stiff, overly formal, or
 *      like a government notice rather than a fashion marketplace?
 *   3. Is this editorial/branding copy (voice, identity, taxonomy) or is it
 *      transactional copy (an instruction, a warning, a form field, a
 *      status the user must act on correctly)?
 *   4. Could a misunderstanding here cause a real user error — wrong
 *      address, wrong payment, a lost order, a rejected upload?
 *   5. Is the choice consistent with how the same concept is labeled
 *      everywhere else on the site?
 *   When genuinely unsure: default to English for branding/taxonomy/
 *   editorial copy, default to Vietnamese for anything transactional,
 *   instructional, or legal.
 *
 * ENGLISH — brand identity, campaign/editorial copy, primary fashion
 *   taxonomy (category names), product/brand/collection names, size
 *   terminology, short nav labels, other short labels that read more
 *   naturally in English (e.g. "Live Preview", "New Arrivals").
 *   See `EN` below for the canonical anchor strings — import from there
 *   instead of re-typing them so the site can't drift out of sync again.
 *
 * VIETNAMESE — instructions needed to complete a task, form helper/
 *   description text, validation and error messages, auth guidance, cart/
 *   checkout/payment/shipping explanations, order-status explanations,
 *   profile-editing instructions, empty states, destructive-action
 *   confirmations, legal/support/privacy/delivery content, and any
 *   accessibility text where Vietnamese is clearer for this audience.
 *   See `vi` below (unchanged from the original Phase 8.1 pass — this
 *   object was already scoped correctly to transactional copy).
 *
 * Stored enum/identifier values (order status, payment method, product
 * condition, category/brand slugs) are NEVER translated at the data layer —
 * only their *display* label changes, via `tStatus`/`tPaymentMethod`/
 * `formatCondition` (see `lib/format.ts`). Never invent a second mapping.
 *
 * Third-party widget copy (e.g. the Tawk.to chat bubble) is configured in
 * that vendor's own dashboard — it cannot be localized from this source
 * tree, and this file makes no claim to control it.
 */

/** Canonical English brand/editorial/taxonomy anchors. Import these rather
 * than re-typing the strings, so a future edit can't silently drift one
 * occurrence out of sync with the rest of the site. */
export const EN = {
  common: {
    noImage: 'No image',
  },
  brand: {
    name: 'StyleHub',
    tagline: 'Shop the drop. Sell the archive.',
    howItWorks: 'How the marketplace works',
  },
  nav: {
    shop: 'Shop',
    about: 'About',
    sell: 'Sell',
  },
  home: {
    newArrivals: 'New Arrivals',
    onSale: 'On Sale',
    viewAllProducts: 'View All Products',
  },
  sell: {
    hubEyebrow: 'Seller Hub',
    hubHeading: 'List your archive. Find its next owner.',
    categoryAndBrand: 'Category & Brand',
    livePreview: 'Live Preview',
  },
} as const;

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
    simulatedCard: 'Simulated Card / Demo Card',
    simulatedCardCopy: 'Mô phỏng thanh toán bằng thương hiệu thẻ và bốn số cuối.',
    simulatedCardBrand: 'Thương hiệu thẻ mô phỏng',
    simulatedCardLastFour: 'Bốn số cuối',
    simulatedCardWarning: 'Simulated payment for academic demonstration only. No real card or money is processed.',
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
    simulatedCardBrandRequired: 'Vui lòng chọn thương hiệu thẻ mô phỏng.',
    simulatedCardLastFourInvalid: 'Vui lòng nhập đúng bốn chữ số cuối.',
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
    simulated_card: 'Thẻ mô phỏng',
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
