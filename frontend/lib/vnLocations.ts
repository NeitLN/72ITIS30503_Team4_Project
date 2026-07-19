/**
 * Phase 8.1 — single source of truth for Vietnam's 34 provincial-level
 * administrative units (2025 reorganization), plus accent/case-insensitive
 * search and a safe display-only mapping for legacy English location
 * strings already stored on existing products/profiles (Phase 6 seed data
 * and earlier Phase 7/8 forms used plain English city names — those rows
 * are never rewritten; this module only affects how they're *displayed*
 * and what NEW records store going forward).
 *
 * No remote API — the list is static so the form works reliably offline.
 */

// Canonical order matches the numbered list this module was specified from.
export const VN_PROVINCES: string[] = [
  'Hà Nội',
  'Huế',
  'Lai Châu',
  'Điện Biên',
  'Sơn La',
  'Lạng Sơn',
  'Cao Bằng',
  'Tuyên Quang',
  'Lào Cai',
  'Thái Nguyên',
  'Phú Thọ',
  'Bắc Ninh',
  'Hưng Yên',
  'Hải Phòng',
  'Ninh Bình',
  'Quảng Ninh',
  'Thanh Hóa',
  'Nghệ An',
  'Hà Tĩnh',
  'Quảng Trị',
  'Đà Nẵng',
  'Quảng Ngãi',
  'Gia Lai',
  'Đắk Lắk',
  'Khánh Hòa',
  'Lâm Đồng',
  'Đồng Nai',
  'Tây Ninh',
  'Thành phố Hồ Chí Minh',
  'Đồng Tháp',
  'Vĩnh Long',
  'An Giang',
  'Cần Thơ',
  'Cà Mau',
];

// Common colloquial/abbreviated search aliases that don't change the stored
// canonical name. Keys are matched after normalizeVnText(), so write them
// already lowercase/unaccented.
const RAW_ALIASES: Record<string, string> = {
  'hcm': 'Thành phố Hồ Chí Minh',
  'tphcm': 'Thành phố Hồ Chí Minh',
  'tp hcm': 'Thành phố Hồ Chí Minh',
  'sai gon': 'Thành phố Hồ Chí Minh',
  'saigon': 'Thành phố Hồ Chí Minh',
  'hcmc': 'Thành phố Hồ Chí Minh',
  'ho chi minh city': 'Thành phố Hồ Chí Minh',
  'hn': 'Hà Nội',
  'hanoi': 'Hà Nội',
  'dn': 'Đà Nẵng',
  'danang': 'Đà Nẵng',
  'hp': 'Hải Phòng',
  'haiphong': 'Hải Phòng',
  'ct': 'Cần Thơ',
  'cantho': 'Cần Thơ',
  'hue': 'Huế',
};

/** Lowercase, strip Vietnamese diacritics (including đ/Đ, which don't
 * decompose via NFD), and collapse whitespace. */
export function normalizeVnText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim()
    .replace(/\s+/g, ' ');
}

const NORMALIZED_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_ALIASES).map(([alias, canonical]) => [normalizeVnText(alias), canonical]),
);

/** Search the 34 canonical provinces by name or known alias. Case- and
 * accent-insensitive. Returns results in the fixed canonical order. */
export function searchVnLocations(query: string): string[] {
  const q = normalizeVnText(query);
  if (!q) return VN_PROVINCES.slice();

  const matched = new Set<string>();
  for (const province of VN_PROVINCES) {
    if (normalizeVnText(province).includes(q)) matched.add(province);
  }
  for (const [alias, canonical] of Object.entries(NORMALIZED_ALIASES)) {
    if (alias.includes(q) || q.includes(alias)) matched.add(canonical);
  }
  return VN_PROVINCES.filter((p) => matched.has(p));
}

export function isCanonicalVnLocation(value: string): boolean {
  return VN_PROVINCES.includes(value);
}

// Safe DISPLAY-only mapping for legacy English location strings already
// stored on existing rows (Phase 6 seed products' `location` column, and
// early Phase 7/8 forms). Never used to rewrite stored data — only to
// render old values in natural Vietnamese. Values not in this map are
// returned unchanged (safe passthrough for anything else already stored).
const LEGACY_LOCATION_DISPLAY_MAP: Record<string, string> = {
  'Ho Chi Minh City': 'Thành phố Hồ Chí Minh',
  'Hanoi': 'Hà Nội',
  'Da Nang': 'Đà Nẵng',
  'Can Tho': 'Cần Thơ',
  'Hai Phong': 'Hải Phòng',
  'Hue': 'Huế',
  // Bien Hoa and Nha Trang are cities *within* a canonical province
  // (Đồng Nai and Khánh Hòa respectively), not standalone units under the
  // 2025 list — displayed with their containing province for honesty
  // rather than collapsed to just the province name (which would lose
  // information) or left as untranslated English.
  'Bien Hoa': 'Biên Hòa (Đồng Nai)',
  'Nha Trang': 'Nha Trang (Khánh Hòa)',
};

export function displayVnLocation(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  return LEGACY_LOCATION_DISPLAY_MAP[trimmed] || trimmed;
}
