const LIFECYCLE_TYPES = Object.freeze([
  'new',
  'deadstock',
  'pre_loved',
  'repaired',
  'upcycled',
  'not_specified',
]);

const CIRCULAR_LIFECYCLE_TYPES = Object.freeze([
  'deadstock',
  'pre_loved',
  'repaired',
  'upcycled',
]);

const CLAIM_SOURCES = Object.freeze(['seller_declared']);

const FIELD_LIMITS = Object.freeze({
  material: 120,
  repair_history: 1000,
  upcycle_details: 1000,
  product_story: 1500,
});

const MIN_MEANINGFUL_DETAIL_LENGTH = 8;
const SUSTAINABILITY_FIELDS = Object.freeze([
  'lifecycle_type',
  'material',
  'repair_history',
  'upcycle_details',
  'product_story',
  'reuse_packaging',
]);
const SERVER_CONTROLLED_FIELDS = new Set([
  'claim_source',
  'verification_status',
  'verified',
  'is_verified',
  'certified',
  'is_certified',
  'lifecycle_type_snapshot',
  'claim_source_snapshot',
]);
const LIFECYCLE_SET = new Set(LIFECYCLE_TYPES);

// Newline and tab are legitimate textarea input. Other C0 controls and DEL
// are rejected instead of silently removed so the seller can correct input.
// eslint-disable-next-line no-control-regex
const UNSAFE_CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const UNSAFE_MARKUP_RE = /<\s*\/?\s*(script|iframe|object|embed|style)\b|javascript\s*:|on(?:error|load|click|focus|mouseover)\s*=/i;

class SustainabilityValidationError extends Error {
  constructor(message, fieldErrors) {
    super(message);
    this.status = 422;
    this.fieldErrors = fieldErrors || {};
  }
}

function emptySustainability() {
  return {
    lifecycle_type: 'not_specified',
    material: null,
    repair_history: null,
    upcycle_details: null,
    product_story: null,
    reuse_packaging: false,
    claim_source: null,
  };
}

function normalizeText(value, field, limit, errors) {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).replace(/\r\n?/g, '\n');
  if (UNSAFE_CONTROL_RE.test(raw)) {
    errors[field] = 'Thông tin chứa ký tự điều khiển không được hỗ trợ.';
    return null;
  }
  if (UNSAFE_MARKUP_RE.test(raw)) {
    errors[field] = 'Không được nhập mã script hoặc markup không an toàn.';
    return null;
  }

  const normalized = raw
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length > limit) {
    errors[field] = `Thông tin tối đa ${limit} ký tự.`;
    return null;
  }
  return normalized || null;
}

function normalizeBoolean(value, field, errors) {
  if (value == null || value === '' || value === false || value === 0 || value === 'false' || value === '0') {
    return false;
  }
  if (value === true || value === 1 || value === 'true' || value === '1') {
    return true;
  }
  errors[field] = 'Giá trị phải là true hoặc false.';
  return false;
}

function parseSustainabilityEnvelope(raw) {
  if (!raw || typeof raw !== 'object') return { provided: false, value: null };

  let value = raw.sustainability;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw new SustainabilityValidationError('Product Journey không hợp lệ.', {
        sustainability: 'Dữ liệu Product Journey không đúng định dạng.',
      });
    }
  }

  const hasTopLevelField = [...SUSTAINABILITY_FIELDS, ...SERVER_CONTROLLED_FIELDS]
    .some((key) => Object.prototype.hasOwnProperty.call(raw, key));

  if (value === undefined && hasTopLevelField) {
    value = {};
    for (const key of [...SUSTAINABILITY_FIELDS, ...SERVER_CONTROLLED_FIELDS]) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) value[key] = raw[key];
    }
  }

  if (value === undefined) return { provided: false, value: null };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SustainabilityValidationError('Product Journey không hợp lệ.', {
      sustainability: 'Dữ liệu Product Journey phải là một object.',
    });
  }
  return { provided: true, value };
}

function validateSustainability(raw, { requireExplicit = false } = {}) {
  const envelope = parseSustainabilityEnvelope(raw);
  if (!envelope.provided) {
    if (requireExplicit) {
      throw new SustainabilityValidationError('Vui lòng chọn hành trình sản phẩm.', {
        lifecycle_type: 'Vui lòng chọn một lựa chọn, kể cả Không xác định.',
      });
    }
    return { provided: false, value: emptySustainability() };
  }

  const input = envelope.value;
  const errors = {};
  for (const key of Object.keys(input)) {
    if (SERVER_CONTROLLED_FIELDS.has(key)) {
      errors[key] = 'Trường này do StyleHub quản lý và không thể tự đặt.';
    } else if (!SUSTAINABILITY_FIELDS.includes(key)) {
      errors[key] = 'Trường Product Journey không được hỗ trợ.';
    }
  }

  const lifecycleType = String(input.lifecycle_type || '').trim();
  if (!LIFECYCLE_SET.has(lifecycleType)) {
    errors.lifecycle_type = 'Vui lòng chọn hành trình sản phẩm hợp lệ.';
  }

  const material = normalizeText(input.material, 'material', FIELD_LIMITS.material, errors);
  const repairHistory = normalizeText(input.repair_history, 'repair_history', FIELD_LIMITS.repair_history, errors);
  const upcycleDetails = normalizeText(input.upcycle_details, 'upcycle_details', FIELD_LIMITS.upcycle_details, errors);
  const productStory = normalizeText(input.product_story, 'product_story', FIELD_LIMITS.product_story, errors);
  const reusePackaging = normalizeBoolean(input.reuse_packaging, 'reuse_packaging', errors);

  if (lifecycleType === 'repaired' && (!repairHistory || repairHistory.length < MIN_MEANINGFUL_DETAIL_LENGTH)) {
    errors.repair_history = `Mô tả phần đã sửa ít nhất ${MIN_MEANINGFUL_DETAIL_LENGTH} ký tự.`;
  }
  if (lifecycleType === 'upcycled' && (!upcycleDetails || upcycleDetails.length < MIN_MEANINGFUL_DETAIL_LENGTH)) {
    errors.upcycle_details = `Mô tả cách tái thiết kế ít nhất ${MIN_MEANINGFUL_DETAIL_LENGTH} ký tự.`;
  }

  if (Object.keys(errors).length) {
    throw new SustainabilityValidationError('Vui lòng kiểm tra lại Product Journey.', errors);
  }

  if (lifecycleType === 'not_specified') {
    return {
      provided: true,
      value: {
        lifecycle_type: 'not_specified',
        material: null,
        repair_history: null,
        upcycle_details: null,
        product_story: null,
        reuse_packaging: false,
        claim_source: 'seller_declared',
      },
    };
  }

  return {
    provided: true,
    value: {
      lifecycle_type: lifecycleType,
      material,
      repair_history: repairHistory,
      upcycle_details: upcycleDetails,
      product_story: productStory,
      reuse_packaging: reusePackaging,
      claim_source: 'seller_declared',
    },
  };
}

function toDatabasePayload(value) {
  return {
    lifecycle_type: value.lifecycle_type,
    material: value.material,
    repair_history: value.repair_history,
    upcycle_details: value.upcycle_details,
    product_story: value.product_story,
    reuse_packaging: Boolean(value.reuse_packaging),
  };
}

function toPublicSustainability(row, { minimal = false } = {}) {
  if (!row) {
    const fallback = emptySustainability();
    return minimal
      ? { lifecycle_type: fallback.lifecycle_type, claim_source: fallback.claim_source }
      : fallback;
  }

  const safe = {
    lifecycle_type: LIFECYCLE_SET.has(row.lifecycle_type) ? row.lifecycle_type : 'not_specified',
    material: row.material || null,
    repair_history: row.repair_history || null,
    upcycle_details: row.upcycle_details || null,
    product_story: row.product_story || null,
    reuse_packaging: Boolean(row.reuse_packaging),
    claim_source: row.claim_source === 'seller_declared' ? 'seller_declared' : null,
  };
  return minimal
    ? { lifecycle_type: safe.lifecycle_type, claim_source: safe.claim_source }
    : safe;
}

module.exports = {
  LIFECYCLE_TYPES,
  CIRCULAR_LIFECYCLE_TYPES,
  CLAIM_SOURCES,
  FIELD_LIMITS,
  MIN_MEANINGFUL_DETAIL_LENGTH,
  SUSTAINABILITY_FIELDS,
  SustainabilityValidationError,
  emptySustainability,
  validateSustainability,
  toDatabasePayload,
  toPublicSustainability,
};
