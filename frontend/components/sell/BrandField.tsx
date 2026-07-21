'use client';

import { useState } from 'react';
import { Combobox } from '../ui/Combobox';
import { BrandOption } from '../../lib/brands';
import { UNBRANDED_LABEL } from '../../lib/listingOptions';
import { normalizeVnText } from '../../lib/vnLocations';

export interface BrandFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  brands: BrandOption[];
  brandsLoading?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  errorId?: string;
}

function matchesKnownBrand(value: string, brands: BrandOption[]): boolean {
  const target = normalizeVnText(value);
  if (!target || normalizeVnText(UNBRANDED_LABEL) === target) return true;
  return brands.some((b) => normalizeVnText(b.name) === target);
}

/**
 * Shared brand field for `/sell` and Seller Dashboard editing: search +
 * select an existing brand, or explicitly declare a new one. Selecting
 * "Thêm thương hiệu mới" reveals a dedicated input (not silent free-text
 * typed into the search box) so the seller makes a deliberate choice, and
 * shows the required unverified disclosure before they type anything.
 * Backend resolution (existing-match-wins, race-safe create) happens in
 * `backend/services/brandService.js` regardless of which path the seller
 * used here — this component only shapes the interaction.
 */
export function BrandField({
  id, value, onChange, brands, brandsLoading, disabled, ariaInvalid, errorId,
}: BrandFieldProps) {
  const [addingNew, setAddingNew] = useState(false);

  const getBrandOptions = (query: string): string[] => {
    const q = normalizeVnText(query);
    const names = brands.map((b) => b.name);
    const filtered = q ? names.filter((n) => normalizeVnText(n).includes(q)) : names;
    if (!q || normalizeVnText(UNBRANDED_LABEL).includes(q)) return [UNBRANDED_LABEL, ...filtered];
    return filtered;
  };

  if (addingNew) {
    return (
      <div className="space-y-2">
        <label htmlFor={`${id}-new`} className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-neutral-500">
          Tên thương hiệu mới *
        </label>
        <input
          id={`${id}-new`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={errorId}
          placeholder="Ví dụ: Xưởng may Thảo Nguyên"
          disabled={disabled}
          className={`w-full border ${ariaInvalid ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50`}
        />
        <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Thương hiệu mới sẽ được ghi nhận là do người bán khai báo và chưa được StyleHub xác minh.
        </p>
        <button
          type="button"
          onClick={() => { setAddingNew(false); onChange(''); }}
          className="font-mono text-xs uppercase tracking-wider text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
        >
          Hủy, quay lại chọn thương hiệu có sẵn
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-neutral-500">Thương hiệu</label>
      <Combobox
        id={id}
        value={value}
        onChange={onChange}
        getOptions={brandsLoading ? () => [] : getBrandOptions}
        allowFreeText={false}
        placeholder={brandsLoading ? 'Đang tải thương hiệu…' : 'Tìm thương hiệu có sẵn'}
        description="Tìm và chọn một thương hiệu có sẵn, hoặc thêm thương hiệu mới bên dưới."
        disabled={disabled || brandsLoading}
        emptyMessage="Không tìm thấy thương hiệu."
        ariaInvalid={ariaInvalid}
        ariaDescribedBy={errorId}
      />
      <button
        type="button"
        onClick={() => { setAddingNew(true); onChange(matchesKnownBrand(value, brands) ? '' : value); }}
        disabled={disabled}
        className="font-mono text-xs uppercase tracking-wider text-neutral-600 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
      >
        Không tìm thấy thương hiệu? Thêm thương hiệu mới
      </button>
    </div>
  );
}
