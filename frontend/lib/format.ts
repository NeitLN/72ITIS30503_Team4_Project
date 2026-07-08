import { Product, ProductImage, Seller } from '../types/product';

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
  new: 'Brand new',
  new_with_tags: 'New with tags',
  new_without_tags: 'New without tags',
  like_new: 'Like new',
  excellent: 'Excellent',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
  used: 'Used',
  used_good: 'Used · Good',
  used_fair: 'Used · Fair',
};

export function formatCondition(condition?: string | null): string {
  if (!condition) return 'Condition not listed';
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
    username || product.seller_name || product.sellerName || seller.full_name || 'Independent seller';

  return {
    name: product.name || product.title || 'Untitled listing',
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
    imageAlt: primaryImage?.alt_text || product.name || product.title || 'Listing photo',
    condition: formatCondition(product.condition),
    size: product.size || 'One size',
    brandName: product.brand?.name ?? null,
    categoryName: product.category?.name ?? prettifySlug(product.category_slug) ?? null,
    sellerName,
    sellerHandle: username ? `@${username}` : sellerName,
    sellerRating: seller.seller_rating != null ? String(seller.seller_rating) : null,
    sellerLocation: product.location || seller.location || 'Vietnam',
    isVerifiedSeller: Boolean(seller.is_verified_seller),
    soldCount: seller.sold_count ?? null,
    isSoldOut,
  };
}




