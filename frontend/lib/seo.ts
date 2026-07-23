export const SITE_NAME = 'StyleHub';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const DEFAULT_TITLE = 'StyleHub — Sàn thương mại điện tử C2C';
export const DEFAULT_DESCRIPTION = 'Nền tảng thời trang C2C nơi mọi người có thể mua, đăng bán và tìm lại giá trị mới cho các sản phẩm thuộc nhiều thương hiệu, phong cách và tình trạng khác nhau.';

export function buildTitle(title?: string) {
  if (!title) return DEFAULT_TITLE;
  return `${title} — ${SITE_NAME}`;
}

export function buildDescription(description?: string) {
  if (!description) return DEFAULT_DESCRIPTION;
  return description;
}
