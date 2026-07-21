'use client';

import { Combobox } from '../ui/Combobox';
import { BrandOption, findEquivalentBrand, normalizeBrandText } from '../../lib/brands';
import { UNBRANDED_LABEL } from '../../lib/listingOptions';

export interface BrandFieldProps {
  id: string;
  value: string;
  onChange: (value: string, selectedBrandId: string | null) => void;
  brands: BrandOption[];
  brandsLoading?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  errorId?: string;
}

/**
 * One accessible field for `/sell` and Seller Dashboard editing. An exact
 * suggestion match carries its canonical ID; any other valid text remains
 * ordinary free text for the backend to resolve/create at product submit.
 */
export function BrandField({
  id, value, onChange, brands, brandsLoading, disabled, ariaInvalid, errorId,
}: BrandFieldProps) {
  const getBrandOptions = (query: string): string[] => {
    const q = normalizeBrandText(query);
    const names = brands.map((b) => b.name);
    const filtered = q ? names.filter((name) => normalizeBrandText(name).includes(q)) : names;
    if (!q || normalizeBrandText(UNBRANDED_LABEL).includes(q)) return [UNBRANDED_LABEL, ...filtered];
    return filtered;
  };

  const handleChange = (nextValue: string) => {
    const match = findEquivalentBrand(nextValue, brands);
    onChange(nextValue, match?.id || null);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-neutral-500">Thương hiệu</label>
      <Combobox
        id={id}
        value={value}
        onChange={handleChange}
        getOptions={brandsLoading ? () => [] : getBrandOptions}
        allowFreeText
        placeholder="Nhập hoặc tìm thương hiệu"
        description="Nhập tên thương hiệu. Nếu chưa có trong hệ thống, thương hiệu sẽ được ghi nhận khi bạn đăng sản phẩm."
        disabled={disabled}
        emptyMessage={brandsLoading ? 'Đang tải gợi ý thương hiệu…' : 'Không tìm thấy thương hiệu phù hợp. Bạn vẫn có thể sử dụng tên này.'}
        ariaInvalid={ariaInvalid}
        ariaDescribedBy={errorId}
      />
    </div>
  );
}
