/**
 * Phase 8.1 — canonical Vietnam provincial-level units (2025 reorganization).
 * Mirrors frontend/lib/vnLocations.ts's VN_PROVINCES exactly — kept as a
 * plain backend copy since the frontend module is TypeScript/ESM and this
 * backend is CommonJS. Update both together if the canonical list changes.
 */
const VN_PROVINCES = [
  'Hà Nội', 'Huế', 'Lai Châu', 'Điện Biên', 'Sơn La', 'Lạng Sơn', 'Cao Bằng',
  'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh', 'Hưng Yên',
  'Hải Phòng', 'Ninh Bình', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh',
  'Quảng Trị', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Đắk Lắk', 'Khánh Hòa',
  'Lâm Đồng', 'Đồng Nai', 'Tây Ninh', 'Thành phố Hồ Chí Minh', 'Đồng Tháp',
  'Vĩnh Long', 'An Giang', 'Cần Thơ', 'Cà Mau',
];

const VN_PROVINCE_SET = new Set(VN_PROVINCES);

// Legacy English location strings this app has stored on existing rows
// (Phase 6 seed products, early Phase 7/8 forms) — accepted as-is on NEW
// submissions too (never rewritten, never rejected), mapped internally to
// their canonical equivalent only for validation purposes. New submissions
// from the redesigned selector always send a canonical name directly.
const LEGACY_ALIASES = {
  'ho chi minh city': 'Thành phố Hồ Chí Minh',
  'hanoi': 'Hà Nội',
  'da nang': 'Đà Nẵng',
  'can tho': 'Cần Thơ',
  'hai phong': 'Hải Phòng',
  'hue': 'Huế',
  'bien hoa': 'Đồng Nai',
  'nha trang': 'Khánh Hòa',
};

function isCanonicalVnLocation(value) {
  return VN_PROVINCE_SET.has(String(value || '').trim());
}

function isKnownLocation(value) {
  const trimmed = String(value || '').trim();
  return VN_PROVINCE_SET.has(trimmed) || Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, trimmed.toLowerCase());
}

module.exports = { VN_PROVINCES, isCanonicalVnLocation, isKnownLocation };
