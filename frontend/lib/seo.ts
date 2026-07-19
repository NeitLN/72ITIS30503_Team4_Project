export const SITE_NAME = 'StyleHub';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const DEFAULT_TITLE = 'StyleHub — Chợ thời trang C2C';
export const DEFAULT_DESCRIPTION = 'Mua và bán streetwear, sneaker, đồ archive, phụ kiện và thời trang đã qua sử dụng của các thương hiệu địa phương qua một chợ C2C cao cấp dạng demo.';

export function buildTitle(title?: string) {
  if (!title) return DEFAULT_TITLE;
  return `${title} — ${SITE_NAME}`;
}

export function buildDescription(description?: string) {
  if (!description) return DEFAULT_DESCRIPTION;
  return description;
}
