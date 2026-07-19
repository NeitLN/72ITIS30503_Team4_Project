// Shared between the /sell wizard (components/sell/SellListingClient.tsx)
// and the Phase 9 seller-dashboard listing editor
// (components/seller/ListingEditForm.tsx) so both ever offer the exact same
// condition/size options and shoe-category rule — never a second, drifting
// copy. Mirrors backend/constants/shoeCategories.js and the
// ALLOWED_CONDITIONS set in backend/services/listingService.js.
export const CONDITIONS = [
  { value: 'new_with_tags', label: 'Mới, còn tag' },
  { value: 'like_new', label: 'Như mới' },
  { value: 'excellent', label: 'Rất tốt' },
  { value: 'good', label: 'Tốt' },
  { value: 'fair', label: 'Tạm được' },
];

export const CLOTHING_SIZES = [
  { value: 'XS', label: 'XS' }, { value: 'S', label: 'S' }, { value: 'M', label: 'M' },
  { value: 'L', label: 'L' }, { value: 'XL', label: 'XL' }, { value: 'XXL', label: 'XXL' },
  { value: 'One Size', label: 'Một cỡ' },
];

export const SHOE_SIZES = [
  ...['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'].map((v) => ({ value: v, label: v })),
  { value: 'One Size', label: 'Một cỡ' },
];

export const SHOE_LIKE_CATEGORIES = new Set(['shoes', 'slides', 'boots', 'loafers', 'other-shoes']);

export const UNBRANDED_LABEL = 'Không có thương hiệu';

export const MAX_IMAGES = 6;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  active: 'Đang bán',
  hidden: 'Tạm ẩn',
  sold: 'Đã bán',
  archived: 'Đã lưu trữ',
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  awaiting_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị hàng',
  shipped: 'Đã giao vận chuyển',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};
