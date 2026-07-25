import { UNBRANDED_LABEL } from './listingOptions';

export interface QualityCheck {
  key: string;
  label: string;
  passed: boolean;
}

export interface QualityScoreResult {
  score: number;
  checks: QualityCheck[];
}

export interface QualityInput {
  name: string;
  description: string;
  category_slug?: string;
  brand?: string;
  condition?: string;
  size?: string;
  price?: number | string;
  imageCount: number;
}

export function computeQualityScore(input: QualityInput): QualityScoreResult {
  const checks: QualityCheck[] = [
    { key: 'name', label: 'Tên sản phẩm', passed: (input.name || '').trim().length >= 3 },
    { key: 'description', label: 'Mô tả chi tiết', passed: (input.description || '').trim().length >= 50 },
    { key: 'category', label: 'Có danh mục', passed: !!input.category_slug },
    { key: 'brand', label: 'Có thương hiệu', passed: !!input.brand && input.brand !== UNBRANDED_LABEL },
    { key: 'condition', label: 'Tình trạng', passed: !!input.condition },
    { key: 'size', label: 'Kích thước', passed: !!input.size },
    { key: 'price', label: 'Giá bán hợp lệ', passed: !!input.price && Number(input.price) > 0 },
    { key: 'images', label: 'Ít nhất 3 ảnh', passed: input.imageCount >= 3 },
    { key: 'cover', label: 'Ảnh bìa', passed: input.imageCount > 0 },
  ];
  const passedCount = checks.filter((c) => c.passed).length;
  const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;

  return { score, checks };
}
