export const SITE_NAME = 'StyleHub';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const DEFAULT_TITLE = 'StyleHub — C2C Fashion Marketplace';
export const DEFAULT_DESCRIPTION = 'Buy and sell local streetwear, sneakers, archive pieces, accessories, and pre-loved fashion through a premium C2C marketplace demo.';

export function buildTitle(title?: string) {
  if (!title) return DEFAULT_TITLE;
  return `${title} — ${SITE_NAME}`;
}

export function buildDescription(description?: string) {
  if (!description) return DEFAULT_DESCRIPTION;
  return description;
}
