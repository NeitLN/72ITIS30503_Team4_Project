import { Product, ProductImage, Seller } from '../types/product';
import { displayVnLocation } from './vnLocations';

/** Formats a price using native Intl API for Vietnamese Locale */
export function formatVND(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVietnamDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatVietnamDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Mới',
  new_with_tags: 'Mới, còn tag',
  new_without_tags: 'Mới, không tag',
  like_new: 'Như mới',
  excellent: 'Rất tốt',
  very_good: 'Rất tốt',
  good: 'Tốt',
  fair: 'Tạm được',
  used: 'Đã sử dụng',
  used_good: 'Đã sử dụng · Tốt',
  used_fair: 'Đã sử dụng · Tạm được',
};

export function formatCondition(condition?: string | null): string {
  if (!condition) return 'Chưa rõ tình trạng';
  const label = CONDITION_LABELS[condition];
  if (label) return label;
  const readable = condition.replace(/_/g, ' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function prettifySlug(slug?: string | null): string | null {
  if (!slug) return null;
  const readable = slug.replace(/-/g, ' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

/** A normalized, display-ready view of a listing with graceful fallbacks. */
export interface ListingView {
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  imageAlt: string;
  condition: string;
  size: string;
  brandName: string | null;
  categoryName: string | null;
  sellerName: string;
  /** Display handle: "@username" for real sellers, plain fallback label otherwise. */
  sellerHandle: string;
  /** Real, unprefixed username — null when there is no linkable storefront (e.g. a legacy seed seller with only a flat seller_name). Use this, not sellerHandle, to decide whether to render a link. */
  sellerUsername: string | null;
  sellerRating: string | null;
  sellerLocation: string;
  isVerifiedSeller: boolean;
  soldCount: number | null;
  isSoldOut: boolean;
}

export function getListingView(product: Product): ListingView {
  const seller: Seller = product.seller ?? {};
  const images = (product.images ?? []) as ProductImage[];
  const primaryImage =
    images.find((img) => img.is_primary) ??
    [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

  const stock = product.stock ?? product.stock_quantity;
  const isSoldOut =
    product.status === 'sold' ||
    product.stock_status === 'out_of_stock' ||
    (stock !== undefined && stock <= 0);

  const username = seller.username || product.sellerUsername;
  const sellerName =
    username || product.seller_name || product.sellerName || seller.full_name || 'Người bán trên StyleHub';

  return {
    name: product.name || product.title || 'Tin đăng chưa có tên',
    price: product.price,
    salePrice: product.sale_price ?? null,
    imageUrl:
      product.thumbnail_url ||
      product.thumbnail ||
      product.image_url ||
      product.image ||
      product.imageUrl ||
      primaryImage?.image_url ||
            ((primaryImage as unknown as Record<string, unknown>)?.url as string) ||
      null,
    imageAlt: primaryImage?.alt_text || product.name || product.title || 'Ảnh sản phẩm',
    condition: formatCondition(product.condition),
    size: product.size || 'Một cỡ',
    brandName: product.brand?.name ?? null,
    categoryName: product.category?.name ?? prettifySlug(product.category_slug) ?? null,
    sellerName,
    sellerHandle: username ? `@${username}` : sellerName,
    sellerUsername: username || null,
    sellerRating: seller.seller_rating != null ? String(seller.seller_rating) : null,
    sellerLocation: displayVnLocation(product.location || seller.location || 'Việt Nam'),
    isVerifiedSeller: Boolean(seller.is_verified_seller),
    soldCount: seller.sold_count ?? null,
    isSoldOut,
  };
}




