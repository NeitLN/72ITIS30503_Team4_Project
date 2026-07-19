export const LIFECYCLE_TYPES = [
  'new',
  'deadstock',
  'pre_loved',
  'repaired',
  'upcycled',
  'not_specified',
] as const;

export type LifecycleType = (typeof LIFECYCLE_TYPES)[number];
export type ClaimSource = 'seller_declared';

export interface ProductSustainability {
  lifecycle_type: LifecycleType;
  material: string | null;
  repair_history: string | null;
  upcycle_details: string | null;
  product_story: string | null;
  reuse_packaging: boolean;
  claim_source: ClaimSource | null;
}

export interface ProductJourneyFormState {
  lifecycle_type: LifecycleType | '';
  material: string;
  repair_history: string;
  upcycle_details: string;
  product_story: string;
  reuse_packaging: boolean;
}

export interface LifecycleOption {
  value: LifecycleType;
  label: string;
  description: string;
  previewLabel: string;
  requires?: 'repair_history' | 'upcycle_details';
}

export const PRODUCT_JOURNEY_LIMITS = Object.freeze({
  material: 120,
  repair_history: 1000,
  upcycle_details: 1000,
  product_story: 1500,
});

export const MIN_MEANINGFUL_DETAIL_LENGTH = 8;

export const LIFECYCLE_OPTIONS: readonly LifecycleOption[] = [
  {
    value: 'new',
    label: 'NEW',
    previewLabel: 'New',
    description: 'Sản phẩm mới, chưa qua sử dụng.',
  },
  {
    value: 'deadstock',
    label: 'DEADSTOCK',
    previewLabel: 'Deadstock',
    description: 'Hàng tồn kho chưa qua sử dụng; không hàm ý có chứng nhận.',
  },
  {
    value: 'pre_loved',
    label: 'PRE-LOVED',
    previewLabel: 'Pre-loved',
    description: 'Sản phẩm đã được sử dụng và đang tiếp tục vòng đời mới.',
  },
  {
    value: 'repaired',
    label: 'REPAIRED',
    previewLabel: 'Repaired',
    description: 'Sản phẩm đã được sửa chữa; cần mô tả phần đã sửa.',
    requires: 'repair_history',
  },
  {
    value: 'upcycled',
    label: 'UPCYCLED',
    previewLabel: 'Upcycled',
    description: 'Sản phẩm đã được tái thiết kế; cần mô tả thay đổi.',
    requires: 'upcycle_details',
  },
  {
    value: 'not_specified',
    label: 'NOT SPECIFIED',
    previewLabel: 'Not specified',
    description: 'Bạn chưa có hoặc không muốn cung cấp thông tin hành trình.',
  },
];

export const EMPTY_PRODUCT_JOURNEY: ProductJourneyFormState = {
  lifecycle_type: '',
  material: '',
  repair_history: '',
  upcycle_details: '',
  product_story: '',
  reuse_packaging: false,
};

export function toProductJourneyForm(value?: ProductSustainability | null): ProductJourneyFormState {
  return {
    lifecycle_type: value?.lifecycle_type || 'not_specified',
    material: value?.material || '',
    repair_history: value?.repair_history || '',
    upcycle_details: value?.upcycle_details || '',
    product_story: value?.product_story || '',
    reuse_packaging: Boolean(value?.reuse_packaging),
  };
}

export function validateProductJourney(value: ProductJourneyFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!value.lifecycle_type || !LIFECYCLE_TYPES.includes(value.lifecycle_type as LifecycleType)) {
    errors.lifecycle_type = 'Vui lòng chọn một lựa chọn, kể cả Not specified.';
  }

  for (const field of ['material', 'repair_history', 'upcycle_details', 'product_story'] as const) {
    if (value[field].trim().length > PRODUCT_JOURNEY_LIMITS[field]) {
      errors[field] = `Thông tin tối đa ${PRODUCT_JOURNEY_LIMITS[field]} ký tự.`;
    }
  }

  if (value.lifecycle_type === 'repaired' && value.repair_history.trim().length < MIN_MEANINGFUL_DETAIL_LENGTH) {
    errors.repair_history = `Mô tả phần đã sửa ít nhất ${MIN_MEANINGFUL_DETAIL_LENGTH} ký tự.`;
  }
  if (value.lifecycle_type === 'upcycled' && value.upcycle_details.trim().length < MIN_MEANINGFUL_DETAIL_LENGTH) {
    errors.upcycle_details = `Mô tả cách tái thiết kế ít nhất ${MIN_MEANINGFUL_DETAIL_LENGTH} ký tự.`;
  }
  return errors;
}

export function prepareProductJourney(value: ProductJourneyFormState) {
  if (value.lifecycle_type === 'not_specified') {
    return {
      lifecycle_type: 'not_specified' as const,
      material: null,
      repair_history: null,
      upcycle_details: null,
      product_story: null,
      reuse_packaging: false,
    };
  }

  const text = (input: string) => input.trim() || null;
  return {
    lifecycle_type: value.lifecycle_type,
    material: text(value.material),
    repair_history: text(value.repair_history),
    upcycle_details: text(value.upcycle_details),
    product_story: text(value.product_story),
    reuse_packaging: value.reuse_packaging,
  };
}

export function getLifecycleOption(value: ProductJourneyFormState['lifecycle_type']) {
  return LIFECYCLE_OPTIONS.find((option) => option.value === value);
}
