'use client';

import React from 'react';
import {
  LIFECYCLE_OPTIONS,
  PRODUCT_JOURNEY_LIMITS,
  ProductJourneyFormState,
} from '../../lib/productJourney';

interface ProductJourneyFieldsProps {
  value: ProductJourneyFormState;
  onChange: (next: ProductJourneyFormState) => void;
  errors?: Record<string, string>;
  idPrefix: string;
}

export const ProductJourneyFields = ({
  value,
  onChange,
  errors = {},
  idPrefix,
}: ProductJourneyFieldsProps) => {
  const setField = <K extends keyof ProductJourneyFormState>(field: K, next: ProductJourneyFormState[K]) => {
    onChange({ ...value, [field]: next });
  };
  const lifecycleErrorId = `${idPrefix}-lifecycle_type-error`;
  const showDetails = Boolean(value.lifecycle_type && value.lifecycle_type !== 'not_specified');

  return (
    <fieldset className="min-w-0 border-t border-neutral-200 pt-6">
      <legend className="w-full px-0">
        <span className="block font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-900">
          PHÂN LOẠI SẢN PHẨM
        </span>
        <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-neutral-600">
          Chia sẻ hành trình của sản phẩm để người mua hiểu rõ hơn về tình trạng và cách sản phẩm đã được sử dụng.
          Thông tin này do bạn cung cấp và chưa được StyleHub kiểm định.
        </span>
      </legend>

      <div
        className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-invalid={Boolean(errors.lifecycle_type) || undefined}
        aria-describedby={errors.lifecycle_type ? lifecycleErrorId : undefined}
      >
        {LIFECYCLE_OPTIONS.map((option, index) => {
          const selected = value.lifecycle_type === option.value;
          const inputId = index === 0
            ? `${idPrefix}-lifecycle_type`
            : `${idPrefix}-lifecycle_type-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`flex min-h-11 cursor-pointer items-start gap-3 border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neutral-900 ${
                selected ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-300 bg-white hover:border-neutral-500'
              }`}
            >
              <input
                id={inputId}
                type="radio"
                name={`${idPrefix}-lifecycle_type-choice`}
                value={option.value}
                checked={selected}
                onChange={() => setField('lifecycle_type', option.value)}
                aria-describedby={errors.lifecycle_type ? lifecycleErrorId : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-neutral-900"
              />
              <span className="min-w-0">
                <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-900">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-neutral-600">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {errors.lifecycle_type && <p id={lifecycleErrorId} className="mt-2 text-xs text-red-600">{errors.lifecycle_type}</p>}

      {showDetails && (
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor={`${idPrefix}-material`} className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-neutral-500">
              Chất liệu (không bắt buộc)
            </label>
            <input
              id={`${idPrefix}-material`}
              type="text"
              maxLength={PRODUCT_JOURNEY_LIMITS.material}
              value={value.material}
              onChange={(event) => setField('material', event.target.value)}
              aria-invalid={Boolean(errors.material) || undefined}
              aria-describedby={errors.material ? `${idPrefix}-material-error` : undefined}
              placeholder="Ví dụ: Cotton, denim, da thật — chỉ điền khi bạn biết"
              className={`min-h-11 w-full border px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none ${errors.material ? 'border-red-500' : 'border-neutral-300'}`}
            />
            {errors.material && <p id={`${idPrefix}-material-error`} className="mt-1 text-xs text-red-600">{errors.material}</p>}
          </div>

          {value.lifecycle_type === 'repaired' && (
            <div>
              <label htmlFor={`${idPrefix}-repair_history`} className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-neutral-500">
                Lịch sử sửa chữa *
              </label>
              <textarea
                id={`${idPrefix}-repair_history`}
                rows={4}
                maxLength={PRODUCT_JOURNEY_LIMITS.repair_history}
                value={value.repair_history}
                onChange={(event) => setField('repair_history', event.target.value)}
                aria-invalid={Boolean(errors.repair_history) || undefined}
                aria-describedby={errors.repair_history ? `${idPrefix}-repair_history-error` : undefined}
                placeholder="Mô tả phần đã sửa, thời điểm hoặc cách sửa nếu bạn biết."
                className={`w-full border px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none ${errors.repair_history ? 'border-red-500' : 'border-neutral-300'}`}
              />
              {errors.repair_history && <p id={`${idPrefix}-repair_history-error`} className="mt-1 text-xs text-red-600">{errors.repair_history}</p>}
            </div>
          )}

          {value.lifecycle_type === 'upcycled' && (
            <div>
              <label htmlFor={`${idPrefix}-upcycle_details`} className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-neutral-500">
                Chi tiết tái thiết kế *
              </label>
              <textarea
                id={`${idPrefix}-upcycle_details`}
                rows={4}
                maxLength={PRODUCT_JOURNEY_LIMITS.upcycle_details}
                value={value.upcycle_details}
                onChange={(event) => setField('upcycle_details', event.target.value)}
                aria-invalid={Boolean(errors.upcycle_details) || undefined}
                aria-describedby={errors.upcycle_details ? `${idPrefix}-upcycle_details-error` : undefined}
                placeholder="Mô tả sản phẩm gốc và những thay đổi đã thực hiện."
                className={`w-full border px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none ${errors.upcycle_details ? 'border-red-500' : 'border-neutral-300'}`}
              />
              {errors.upcycle_details && <p id={`${idPrefix}-upcycle_details-error`} className="mt-1 text-xs text-red-600">{errors.upcycle_details}</p>}
            </div>
          )}

          <div>
            <label htmlFor={`${idPrefix}-product_story`} className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-neutral-500">
              Câu chuyện sản phẩm (không bắt buộc)
            </label>
            <textarea
              id={`${idPrefix}-product_story`}
              rows={4}
              maxLength={PRODUCT_JOURNEY_LIMITS.product_story}
              value={value.product_story}
              onChange={(event) => setField('product_story', event.target.value)}
              aria-invalid={Boolean(errors.product_story) || undefined}
              aria-describedby={errors.product_story ? `${idPrefix}-product_story-error` : undefined}
              placeholder="Một kỷ niệm, cách bạn đã sử dụng hoặc lý do bạn chuyển tiếp sản phẩm."
              className={`w-full border px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none ${errors.product_story ? 'border-red-500' : 'border-neutral-300'}`}
            />
            {errors.product_story && <p id={`${idPrefix}-product_story-error`} className="mt-1 text-xs text-red-600">{errors.product_story}</p>}
          </div>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed text-neutral-700">
            <input
              type="checkbox"
              checked={value.reuse_packaging}
              onChange={(event) => setField('reuse_packaging', event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-neutral-900"
            />
            <span>Tôi dự định sử dụng lại bao bì phù hợp khi giao sản phẩm.</span>
          </label>
          <p className="text-xs leading-relaxed text-neutral-500">
            Đây là dự định do người bán cung cấp, không phải hành động đã được StyleHub xác minh.
          </p>
        </div>
      )}
    </fieldset>
  );
};
