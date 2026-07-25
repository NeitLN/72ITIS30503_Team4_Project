'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { BrandField } from '../sell/BrandField';
import { ROUTES } from '../../constants/routes';
import { computeQualityScore } from '../../lib/quality';
import { getCategoryTree } from '../../lib/catalog';
import { Category } from '../../types/category';
import { getBrands, BrandOption, findEquivalentBrand, normalizeBrandText } from '../../lib/brands';
import { searchVnLocations } from '../../lib/vnLocations';
import {
  CONDITIONS, CLOTHING_SIZES, SHOE_SIZES, SHOE_LIKE_CATEGORIES, UNBRANDED_LABEL,
} from '../../lib/listingOptions';
import {
  SellerListing, getMyListing, updateMyListing, addListingImages, removeListingImage, reorderListingImages,
} from '../../lib/sellerDashboard';
import { ProductJourneyFields } from '../sustainability/ProductJourneyFields';
import {
  ProductJourneyFormState,
  prepareProductJourney,
  toProductJourneyForm,
  validateProductJourney,
} from '../../lib/productJourney';

interface ListingEditFormProps {
  listingId: string;
  onSaved: (listing: SellerListing) => void;
  onCancel: () => void;
}

type FormState = {
  name: string;
  description: string;
  category_slug: string;
  brand: string;
  brand_id: string | null;
  condition: string;
  size: string;
  price: string;
  sale_price: string;
  stock: string;
  inventory_mode: 'simple' | 'variant';
  variants: Array<{ id?: string, title: string, price: string, stock: string, sku: string }>;
  location: string;
  is_negotiable: boolean;
  product_journey: ProductJourneyFormState;
};

function toForm(listing: SellerListing): FormState {
  return {
    name: listing.name,
    description: listing.description,
    category_slug: listing.category_slug,
    brand: listing.brand || '',
    brand_id: listing.brand_id,
    condition: listing.condition,
    size: listing.size,
    price: String(listing.price),
    sale_price: listing.sale_price != null ? String(listing.sale_price) : '',
    stock: String(listing.stock),
    inventory_mode: listing.inventory_mode === 'variant' ? 'variant' : 'simple',
    variants: listing.variants?.map((v) => ({
      id: v.id,
      title: v.title || '',
      price: String(v.price || 0),
      stock: String(v.stock || 0),
      sku: v.sku || ''
    })) || [],
    location: listing.location,
    is_negotiable: listing.is_negotiable,
    product_journey: toProductJourneyForm(listing.sustainability),
  };
}

export const ListingEditForm = ({ listingId, onSaved, onCancel }: ListingEditFormProps) => {
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pendingImageAction, setPendingImageAction] = useState<string | null>(null); // imageId being reordered/removed

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listingRes, catRes, brandRes] = await Promise.all([
          getMyListing(listingId),
          getCategoryTree().catch(() => ({ data: [] as Category[] })),
          getBrands().catch(() => ({ data: [] as BrandOption[] })),
        ]);
        if (cancelled) return;
        if (!listingRes.success) {
          setLoadError(listingRes.error.message || 'Không thể tải sản phẩm.');
          return;
        }
        setListing(listingRes.data);
        setForm(toForm(listingRes.data));
        setCategories(catRes.data || []);
        setBrands(brandRes.data || []);
      } catch {
        if (!cancelled) setLoadError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  const leafCategories: Category[] = categories.flatMap((c) => (c.children && c.children.length ? c.children : []));
  const isShoeLike = form ? SHOE_LIKE_CATEGORIES.has(form.category_slug) : false;
  const sizeOptions = isShoeLike ? SHOE_SIZES : CLOTHING_SIZES;

  const setField = (field: keyof FormState, value: FormState[keyof FormState]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const setBrandField = (value: string, brandId: string | null) => {
    setForm((prev) => (prev ? { ...prev, brand: value, brand_id: brandId } : prev));
    setErrors((prev) => {
      if (!prev.brand) return prev;
      const next = { ...prev };
      delete next.brand;
      return next;
    });
  };

  const setProductJourney = (value: ProductJourneyFormState) => {
    setForm((prev) => (prev ? { ...prev, product_journey: value } : prev));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of ['lifecycle_type', 'material', 'repair_history', 'upcycle_details', 'product_story']) delete next[key];
      return next;
    });
  };

  const validate = (f: FormState): Record<string, string> => {
    const e: Record<string, string> = {};
    const name = f.name.trim();
    if (!name || name.length < 3) e.name = 'Nhập tên sản phẩm (ít nhất 3 ký tự).';
    else if (name.length > 120) e.name = 'Tên sản phẩm tối đa 120 ký tự.';
    const description = f.description.trim();
    if (!description || description.length < 10) e.description = 'Mô tả sản phẩm ít nhất 10 ký tự.';
    else if (description.length > 2000) e.description = 'Mô tả tối đa 2000 ký tự.';
    if (!f.category_slug) e.category_slug = 'Vui lòng chọn danh mục.';
    if (!f.condition) e.condition = 'Vui lòng chọn tình trạng sản phẩm.';
    if (!f.size) e.size = 'Vui lòng chọn kích thước.';
    
    if (f.inventory_mode === 'simple') {
      const price = Number(f.price);
      if (!f.price || !Number.isFinite(price) || price <= 0) e.price = 'Nhập giá bán hợp lệ (VNĐ, lớn hơn 0).';
      else if (price > 500_000_000) e.price = 'Giá bán quá cao so với thị trường đồ cũ.';
      if (f.sale_price) {
        const sale = Number(f.sale_price);
        if (!Number.isFinite(sale) || sale <= 0) e.sale_price = 'Giá giảm phải lớn hơn 0.';
        else if (Number.isFinite(price) && sale >= price) e.sale_price = 'Giá giảm phải thấp hơn giá gốc.';
      }
      const stock = Number(f.stock);
      if (!Number.isInteger(stock) || stock < 0) e.stock = 'Số lượng phải là số nguyên và không âm.';
    } else {
      if (f.variants.length === 0) {
        e.variants = 'Cần ít nhất một phân loại.';
      } else {
        let hasStock = false;
        f.variants.forEach((v, idx) => {
          if (!v.title?.trim()) e[`variants[${idx}].title`] = 'Nhập tên phân loại.';
          const vPrice = Number(v.price);
          if (!Number.isFinite(vPrice) || vPrice < 0) e[`variants[${idx}].price`] = 'Giá hợp lệ.';
          const vStock = Number(v.stock);
          if (!Number.isInteger(vStock) || vStock < 0) e[`variants[${idx}].stock`] = 'Kho hợp lệ.';
          else if (vStock > 0) hasStock = true;
        });
        if (!hasStock) e.variants = 'Ít nhất một phân loại phải có số lượng > 0.';
      }
    }
    
    if (!f.location.trim()) e.location = 'Vui lòng chọn một tỉnh/thành phố hợp lệ.';
    Object.assign(e, validateProductJourney(f.product_journey));
    return e;
  };

  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = Object.keys(fieldErrors)[0];
    if (first) document.getElementById(first === 'lifecycle_type' ? 'edit-lifecycle_type' : `edit-${first}`)?.focus();
  };

  const handleSave = async () => {
    if (!form || !listing) return;
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setStatusMessage('Đang lưu…');

    try {
      const res = await updateMyListing(listing.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        category_slug: form.category_slug,
        ...(form.brand_id
          ? { brand_id: form.brand_id }
          : { new_brand_name: form.brand.trim() }),
        condition: form.condition,
        size: form.size,
        inventory_mode: form.inventory_mode,
        price: form.inventory_mode === 'simple' ? form.price : (form.variants[0]?.price || '0'),
        sale_price: form.inventory_mode === 'simple' ? (form.sale_price || null) : null,
        stock: form.inventory_mode === 'simple' ? form.stock : '0',
        variants: form.inventory_mode === 'variant' ? JSON.stringify(form.variants) : undefined,
        location: form.location.trim(),
        is_negotiable: form.is_negotiable,
        sustainability: prepareProductJourney(form.product_journey),
        expected_updated_at: listing.updated_at,
      });
      if (res.success) {
        setStatusMessage('Đã lưu thay đổi.');
        onSaved(res.data);
      } else {
        setSaveError(res.error.message || 'Không thể lưu thay đổi.');
        if (res.error.details) setErrors((prev) => ({ ...prev, ...res.error.details }));
        setStatusMessage('Lưu thay đổi không thành công.');
      }
    } catch {
      setSaveError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
      setStatusMessage('Lưu thay đổi không thành công do lỗi kết nối.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || !listing) return;
    setImageError(null);
    setIsUploadingImages(true);
    try {
      const res = await addListingImages(listing.id, Array.from(files));
      if (res.success) {
        setListing(res.data);
      } else {
        setImageError(res.error.message || 'Không thể tải lên ảnh.');
      }
    } catch {
      setImageError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!listing) return;
    setImageError(null);
    setPendingImageAction(imageId);
    try {
      const res = await removeListingImage(listing.id, imageId);
      if (res.success) setListing(res.data);
      else setImageError(res.error.message || 'Không thể xóa ảnh.');
    } catch {
      setImageError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      setPendingImageAction(null);
    }
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    if (!listing) return;
    const target = index + direction;
    if (target < 0 || target >= listing.images.length) return;
    const ids = listing.images.map((img) => img.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setPendingImageAction(listing.images[index].id);
    try {
      const res = await reorderListingImages(listing.id, ids);
      if (res.success) setListing(res.data);
      else setImageError(res.error.message || 'Không thể sắp xếp lại ảnh.');
    } catch {
      setImageError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      setPendingImageAction(null);
    }
  };

  if (loading) {
    return <div className="py-16 text-center animate-pulse text-sm text-neutral-500">Đang tải sản phẩm…</div>;
  }
  if (loadError || !listing || !form) {
    return (
      <div className="py-12 text-center">
        <p role="alert" className="text-sm text-red-600 mb-4">{loadError || 'Không thể tải sản phẩm.'}</p>
        <Button variant="outline" onClick={onCancel} className="font-mono text-xs uppercase tracking-wider">Quay lại</Button>
      </div>
    );
  }

  const errClass = (field: string) => (errors[field] ? 'border-red-500' : 'border-neutral-300');

  // Convenience match against the loaded brand list (backend is the sole
  // authority — see BrandField.tsx and backend/services/brandService.js).
  const matchedBrand = form.brand_id
    ? brands.find((brand) => brand.id === form.brand_id)
    : findEquivalentBrand(form.brand, brands);
  const brandIsUnverified = Boolean(form.brand)
    && normalizeBrandText(form.brand) !== normalizeBrandText(UNBRANDED_LABEL)
    && (!matchedBrand || matchedBrand.verification_status !== 'verified');

  const { score, checks } = computeQualityScore({
    name: form.name,
    description: form.description,
    category_slug: form.category_slug,
    brand: form.brand,
    condition: form.condition,
    size: form.size,
    price: form.price,
    imageCount: listing.images.length,
  });

  return (
    <div>
      <div aria-live="polite" className="sr-only">{statusMessage}</div>

      <div className="flex items-center justify-between mb-6 border-b border-neutral-100 pb-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Chỉnh sửa sản phẩm</h2>
        <Link
          href={`${ROUTES.PRODUCT(listing.slug)}`}
          target="_blank"
          className="text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
          data-testid="seller-edit-view-product"
        >
          Xem trang sản phẩm &rarr;
        </Link>
      </div>

      <div className="mb-8 border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Chất lượng tin đăng</span>
          <span className={`font-mono text-sm font-bold ${score === 100 ? 'text-green-600' : score > 60 ? 'text-neutral-900' : 'text-orange-600'}`}>
            {score}%
          </span>
        </div>
        <div className="w-full h-1 bg-neutral-200 mb-4">
          <div className={`h-full ${score === 100 ? 'bg-green-600' : 'bg-neutral-900'} transition-all`} style={{ width: `${score}%` }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {checks.map(c => (
            <div key={c.key} className={`flex items-center gap-2 ${c.passed ? 'text-neutral-400' : 'text-neutral-900 font-medium'}`}>
              <span>{c.passed ? '✓' : '○'}</span>
              {c.label}
            </div>
          ))}
        </div>
      </div>

      {saveError && (
        <div role="alert" className="mb-6 border border-red-300 bg-red-50 p-4 text-sm text-red-700">{saveError}</div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="edit-name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tên sản phẩm *</label>
          <input
            id="edit-name" type="text" value={form.name} onChange={(e) => setField('name', e.target.value)}
            aria-invalid={!!errors.name}
            className={`w-full border ${errClass('name')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="edit-description" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Mô tả *</label>
          <textarea
            id="edit-description" rows={5} value={form.description} onChange={(e) => setField('description', e.target.value)}
            aria-invalid={!!errors.description}
            className={`w-full border ${errClass('description')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="edit-category_slug" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Danh mục *</label>
            <select
              id="edit-category_slug" value={form.category_slug} onChange={(e) => setField('category_slug', e.target.value)}
              aria-invalid={!!errors.category_slug}
              className={`w-full border ${errClass('category_slug')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
            >
              <option value="">Chọn danh mục</option>
              {leafCategories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            {errors.category_slug && <p className="text-red-500 text-xs mt-1">{errors.category_slug}</p>}
          </div>
          <div>
            <BrandField
              id="edit-brand"
              value={form.brand}
              onChange={setBrandField}
              brands={brands}
              ariaInvalid={!!errors.brand}
              errorId={errors.brand ? 'edit-brand-error' : undefined}
            />
            {errors.brand && <p id="edit-brand-error" className="mt-1 text-xs text-red-600">{errors.brand}</p>}
            {brandIsUnverified && (
              <p className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Thương hiệu do người bán khai báo, chưa được StyleHub xác minh.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="edit-condition" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tình trạng *</label>
            <select
              id="edit-condition" value={form.condition} onChange={(e) => setField('condition', e.target.value)}
              aria-invalid={!!errors.condition}
              className={`w-full border ${errClass('condition')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
            >
              <option value="">Chọn tình trạng</option>
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
          </div>
          <div>
            <label htmlFor="edit-size" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Kích thước *</label>
            <select
              id="edit-size" value={form.size} onChange={(e) => setField('size', e.target.value)}
              aria-invalid={!!errors.size}
              className={`w-full border ${errClass('size')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
            >
              <option value="">Chọn kích thước</option>
              {sizeOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-3">Loại kho hàng *</label>
          <div className="flex gap-4 mb-6">
            <label className="flex items-center gap-2 text-sm text-neutral-900 cursor-pointer">
              <input
                type="radio" name="edit_inventory_mode" value="simple"
                checked={form.inventory_mode === 'simple'}
                onChange={() => setField('inventory_mode', 'simple')}
                className="h-4 w-4 border-neutral-300 text-neutral-900"
              />
              Đơn giản (Một tùy chọn)
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-900 cursor-pointer">
              <input
                type="radio" name="edit_inventory_mode" value="variant"
                checked={form.inventory_mode === 'variant'}
                onChange={() => setField('inventory_mode', 'variant')}
                className="h-4 w-4 border-neutral-300 text-neutral-900"
              />
              Nhiều phân loại (Size/Màu)
            </label>
          </div>
        </div>

        {form.inventory_mode === 'simple' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="edit-price" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Giá bán (VNĐ) *</label>
              <input
                id="edit-price" type="number" min="1" value={form.price} onChange={(e) => setField('price', e.target.value)}
                aria-invalid={!!errors.price}
                className={`w-full border ${errClass('price')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
              <label htmlFor="edit-sale_price" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Giá giảm (không bắt buộc)</label>
              <input
                id="edit-sale_price" type="number" min="1" value={form.sale_price} onChange={(e) => setField('sale_price', e.target.value)}
                aria-invalid={!!errors.sale_price}
                className={`w-full border ${errClass('sale_price')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
              />
              {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price}</p>}
            </div>
            <div>
              <label htmlFor="edit-stock" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Số lượng *</label>
              <input
                id="edit-stock" type="number" min="0" value={form.stock} onChange={(e) => setField('stock', e.target.value)}
                aria-invalid={!!errors.stock}
                className={`w-full border ${errClass('stock')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
              />
              {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
            </div>
            <div>
              <label htmlFor="edit-location" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tỉnh/Thành phố *</label>
              <Combobox
                id="edit-location" value={form.location} onChange={(v) => setField('location', v)}
                getOptions={searchVnLocations} placeholder="Tìm tỉnh/thành phố..."
                ariaInvalid={!!errors.location}
                emptyMessage="Không tìm thấy tỉnh/thành phố phù hợp."
              />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4 border border-neutral-200 bg-neutral-50 p-4 sm:p-6 mb-6">
            <p className="font-mono text-xs uppercase tracking-wider text-neutral-900 font-bold mb-2">Danh sách phân loại</p>
            {errors.variants && <p className="text-red-500 text-xs mb-4">{errors.variants}</p>}
            {form.variants.map((v, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start border-b border-neutral-200 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Tên (Size/Màu) *</label>
                  <input
                    type="text" value={v.title}
                    placeholder="VD: Size L - Đen"
                    onChange={(e) => {
                      const next = [...form.variants];
                      next[idx].title = e.target.value;
                      setField('variants', next as FormState['variants']);
                    }}
                    className={`w-full border ${errors[`variants[${idx}].title`] ? 'border-red-500' : 'border-neutral-300'} px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors[`variants[${idx}].title`] && <p className="text-red-500 text-[10px] mt-1">{errors[`variants[${idx}].title`]}</p>}
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Giá *</label>
                  <input
                    type="number" min="0" value={v.price}
                    onChange={(e) => {
                      const next = [...form.variants];
                      next[idx].price = e.target.value;
                      setField('variants', next as FormState['variants']);
                    }}
                    className={`w-full border ${errors[`variants[${idx}].price`] ? 'border-red-500' : 'border-neutral-300'} px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors[`variants[${idx}].price`] && <p className="text-red-500 text-[10px] mt-1">{errors[`variants[${idx}].price`]}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Kho *</label>
                  <input
                    type="number" min="0" value={v.stock}
                    onChange={(e) => {
                      const next = [...form.variants];
                      next[idx].stock = e.target.value;
                      setField('variants', next as FormState['variants']);
                    }}
                    className={`w-full border ${errors[`variants[${idx}].stock`] ? 'border-red-500' : 'border-neutral-300'} px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors[`variants[${idx}].stock`] && <p className="text-red-500 text-[10px] mt-1">{errors[`variants[${idx}].stock`]}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">SKU</label>
                  <input
                    type="text" value={v.sku}
                    onChange={(e) => {
                      const next = [...form.variants];
                      next[idx].sku = e.target.value;
                      setField('variants', next as FormState['variants']);
                    }}
                    className={`w-full border ${errors[`variants[${idx}].sku`] ? 'border-red-500' : 'border-neutral-300'} px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors[`variants[${idx}].sku`] && <p className="text-red-500 text-[10px] mt-1">{errors[`variants[${idx}].sku`]}</p>}
                </div>
                <div className="sm:col-span-1 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...form.variants];
                      next.splice(idx, 1);
                      setField('variants', next as FormState['variants']);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-bold w-full text-center py-1"
                    title="Xóa phân loại"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setField('variants', [...form.variants, { title: '', price: form.price || '0', stock: '1', sku: '' }] as FormState['variants'])}
              className="text-sm font-mono uppercase tracking-wider text-neutral-700 hover:text-neutral-900 underline"
            >
              + Thêm phân loại
            </button>
            <div className="mt-6">
              <label htmlFor="edit-location" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tỉnh/Thành phố *</label>
              <Combobox
                id="edit-location" value={form.location} onChange={(v) => setField('location', v)}
                getOptions={searchVnLocations} placeholder="Tìm tỉnh/thành phố..."
                ariaInvalid={!!errors.location}
                emptyMessage="Không tìm thấy tỉnh/thành phố phù hợp."
              />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox" checked={form.is_negotiable} onChange={(e) => setField('is_negotiable', e.target.checked)}
            className="h-4 w-4 border-neutral-300"
          />
          Có thể thương lượng giá
        </label>

        <ProductJourneyFields
          idPrefix="edit"
          value={form.product_journey}
          onChange={setProductJourney}
          errors={errors}
        />

        {/* Images */}
        <div className="border-t border-neutral-100 pt-6">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-3">Hình ảnh</h3>
          {imageError && <p role="alert" className="text-red-500 text-xs mb-2">{imageError}</p>}
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4" data-testid="seller-edit-images">
            {listing.images.map((img, i) => (
              <li key={img.id} className="relative border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt_text || `Ảnh sản phẩm ${i + 1}`} className="aspect-square w-full object-cover" />
                {img.is_primary && (
                  <span className="absolute top-1 left-1 bg-neutral-900 text-white text-[9px] font-mono uppercase px-1.5 py-0.5">Ảnh chính</span>
                )}
                <div className="absolute bottom-1 right-1 flex gap-1">
                  {i > 0 && (
                    <button
                      type="button" onClick={() => moveImage(i, -1)} disabled={pendingImageAction === img.id}
                      aria-label={`Di chuyển ảnh ${i + 1} lên trước`}
                      className="bg-white/90 border border-neutral-300 text-neutral-700 text-xs h-5 w-5 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40"
                    >
                      &larr;
                    </button>
                  )}
                  {i < listing.images.length - 1 && (
                    <button
                      type="button" onClick={() => moveImage(i, 1)} disabled={pendingImageAction === img.id}
                      aria-label={`Di chuyển ảnh ${i + 1} xuống sau`}
                      className="bg-white/90 border border-neutral-300 text-neutral-700 text-xs h-5 w-5 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40"
                    >
                      &rarr;
                    </button>
                  )}
                </div>
                <button
                  type="button" onClick={() => handleRemoveImage(img.id)} disabled={pendingImageAction === img.id || listing.images.length <= 1}
                  aria-label={`Xóa ảnh ${i + 1}`}
                  className="absolute top-1 right-1 bg-white/90 border border-neutral-300 text-neutral-700 text-xs h-5 w-5 flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <label htmlFor="edit-images-input" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            Thêm ảnh (JPEG/PNG/WebP, tối đa 5MB mỗi ảnh)
          </label>
          <input
            id="edit-images-input" type="file" multiple accept="image/jpeg,image/png,image/webp"
            disabled={isUploadingImages}
            onChange={(e) => { handleAddImages(e.target.files); e.target.value = ''; }}
            className="w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none file:mr-3 file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-1.5 file:text-xs file:uppercase file:font-mono disabled:opacity-50"
          />
        </div>

        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" type="button" onClick={onCancel} disabled={isSaving} className="font-mono text-xs uppercase tracking-wider" data-testid="seller-edit-cancel">
            Hủy
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving} aria-busy={isSaving} className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white" data-testid="seller-edit-save">
            {isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </div>
  );
};
