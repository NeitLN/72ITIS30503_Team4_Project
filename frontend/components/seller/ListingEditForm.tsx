'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { BrandField } from '../sell/BrandField';
import { ROUTES } from '../../constants/routes';
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

  const setField = (field: keyof FormState, value: string | boolean) => {
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
    const price = Number(f.price);
    if (!f.price || !Number.isFinite(price) || price <= 0) e.price = 'Nhập giá bán hợp lệ (VNĐ, lớn hơn 0).';
    if (f.sale_price) {
      const sale = Number(f.sale_price);
      if (!Number.isFinite(sale) || sale <= 0) e.sale_price = 'Giá giảm phải lớn hơn 0.';
      else if (Number.isFinite(price) && sale >= price) e.sale_price = 'Giá giảm phải thấp hơn giá gốc.';
    }
    const stock = Number(f.stock);
    if (!Number.isInteger(stock) || stock < 0) e.stock = 'Số lượng phải là số nguyên và không âm.';
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
        price: form.price,
        sale_price: form.sale_price || null,
        stock: form.stock,
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
