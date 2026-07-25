'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { BrandField } from './BrandField';
import { ROUTES } from '../../constants/routes';
import { ProductCard } from '../product/ProductCard';
import { Product } from '../../types/product';
import { ProductJourneyFields } from '../sustainability/ProductJourneyFields';
import { useAuth } from '../../hooks/useAuth';
import { getCategoryTree } from '../../lib/catalog';
import { Category } from '../../types/category';
import { getBrands, BrandOption, findEquivalentBrand, normalizeBrandText } from '../../lib/brands';
import { createListing } from '../../lib/products';
import { formatCondition } from '../../lib/format';
import { VN_PROVINCES, searchVnLocations } from '../../lib/vnLocations';
import {
  CONDITIONS, CLOTHING_SIZES, SHOE_SIZES, SHOE_LIKE_CATEGORIES, UNBRANDED_LABEL,
  MAX_IMAGES, MAX_IMAGE_BYTES, ALLOWED_IMAGE_MIME as ALLOWED_MIME,
} from '../../lib/listingOptions';
import {
  EMPTY_PRODUCT_JOURNEY,
  ProductJourneyFormState,
  getLifecycleOption,
  prepareProductJourney,
  validateProductJourney,
} from '../../lib/productJourney';

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

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  category_slug: '',
  brand: '',
  brand_id: null,
  condition: '',
  size: '',
  price: '',
  sale_price: '',
  stock: '1',
  location: 'Thành phố Hồ Chí Minh',
  is_negotiable: false,
  product_journey: EMPTY_PRODUCT_JOURNEY,
};

const DRAFT_KEY = 'stylehub:sell-draft-v2';

// Step nav + in-panel headings are deliberately English (compact wizard/
// editorial style, consistent with the mega-menu taxonomy and the rest of
// the marketplace's fashion voice) — see the hybrid-language rubric in
// `lib/i18n.ts`. Form labels, helper text, and validation inside each step
// stay Vietnamese since those are the parts a seller must get right to
// complete the task.
const STEP_LABELS = [
  'THÔNG TIN CƠ BẢN',
  'DANH MỤC & THƯƠNG HIỆU',
  'TÌNH TRẠNG & KÍCH THƯỚC',
  'GIÁ & VẬN CHUYỂN',
  'HÌNH ẢNH',
  'KIỂM TRA & ĐĂNG BÁN',
];

type ImageEntry = { file: File; previewUrl: string };

export const SellListingClient = () => {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const submitLockRef = useRef(false); // synchronous guard against rapid double-clicks

  // ---- Load categories & brands from the real backend ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCategoryTree();
        if (!cancelled) setCategories(res.data || []);
      } catch {
        if (!cancelled) setCategoriesError('Không thể tải danh mục. Vui lòng tải lại trang.');
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await getBrands();
        if (!cancelled) setBrands(res.data || []);
      } catch {
        // Non-fatal: brand is optional, form still works without the list loaded.
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Leaf categories only (children of a parent group) — matches the
  // canonical slugs products/categories/brands API actually use.
  const leafCategories: Category[] = categories.flatMap((c) => (c.children && c.children.length ? c.children : []));

  // ---- Draft persistence (fields only — File objects aren't serializable) ----
  useEffect(() => {
    // Deferred a tick (matches the pattern already used elsewhere in this
    // codebase for hydrating from localStorage) to avoid a synchronous
    // setState-in-effect cascade on mount.
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setForm({
            ...INITIAL_FORM,
            ...parsed,
            product_journey: { ...EMPTY_PRODUCT_JOURNEY, ...(parsed.product_journey || {}) },
          });
          setLastSaved(new Date());
        }
      } catch {
        // ignore corrupt draft
      }
      setDraftLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setLastSaved(new Date());
    }, 500); // Debounce save
    return () => clearTimeout(timer);
  }, [form, draftLoaded]);

  // Warn before leaving with unsaved progress past step 1.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (step > 1 && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step, isSubmitting]);

  // Revoke every preview URL on unmount.
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const setBrandField = (value: string, brandId: string | null) => {
    setForm((prev) => ({ ...prev, brand: value, brand_id: brandId }));
    setErrors((prev) => {
      if (!prev.brand) return prev;
      const next = { ...prev };
      delete next.brand;
      return next;
    });
  };

  const setProductJourney = (value: ProductJourneyFormState) => {
    setForm((prev) => ({ ...prev, product_journey: value }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of ['lifecycle_type', 'material', 'repair_history', 'upcycle_details', 'product_story']) delete next[key];
      return next;
    });
  };

  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = Object.keys(fieldErrors)[0];
    if (first) {
      const journeyFields = new Set(['lifecycle_type', 'material', 'repair_history', 'upcycle_details', 'product_story']);
      document.getElementById(journeyFields.has(first) ? `sell-${first}` : first)?.focus();
    }
  };

  const isShoeLike = SHOE_LIKE_CATEGORIES.has(form.category_slug);
  const sizeOptions = isShoeLike ? SHOE_SIZES : CLOTHING_SIZES;

  const validateStep = (targetStep: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (targetStep === 1) {
      const name = form.name.trim();
      if (!name || name.length < 3) e.name = 'Nhập tên sản phẩm (ít nhất 3 ký tự).';
      else if (name.length > 120) e.name = 'Tên sản phẩm tối đa 120 ký tự.';
      else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) e.name = 'Tên sản phẩm phải chứa chữ hoặc số, không chỉ có ký hiệu.';
      const description = form.description.trim();
      if (!description || description.length < 10) e.description = 'Mô tả sản phẩm ít nhất 10 ký tự.';
      else if (description.length > 2000) e.description = 'Mô tả tối đa 2000 ký tự.';
    }
    if (targetStep === 2) {
      if (!form.category_slug) e.category_slug = 'Vui lòng chọn danh mục.';
    }
    if (targetStep === 3) {
      if (!form.condition) e.condition = 'Vui lòng chọn tình trạng sản phẩm.';
      if (!form.size) e.size = 'Vui lòng chọn kích thước.';
      Object.assign(e, validateProductJourney(form.product_journey));
    }
    if (targetStep === 4) {
      const price = Number(form.price);
      if (!form.price || !Number.isFinite(price) || price <= 0) e.price = 'Nhập giá bán hợp lệ (VNĐ, lớn hơn 0).';
      else if (price > 500_000_000) e.price = 'Giá bán quá cao so với thị trường đồ cũ.';
      if (form.sale_price) {
        const sale = Number(form.sale_price);
        if (!Number.isFinite(sale) || sale <= 0) e.sale_price = 'Giá giảm phải lớn hơn 0.';
        else if (Number.isFinite(price) && sale >= price) e.sale_price = 'Giá giảm phải thấp hơn giá gốc.';
      }
      const stock = Number(form.stock);
      if (!Number.isInteger(stock) || stock < 1) e.stock = 'Số lượng phải là số nguyên và ít nhất là 1.';
      if (!form.location.trim() || !VN_PROVINCES.includes(form.location.trim())) e.location = 'Vui lòng chọn một tỉnh/thành phố hợp lệ.';
    }
    if (targetStep === 5) {
      if (images.length === 0) e.images = 'Vui lòng thêm ít nhất một ảnh.';
    }
    return e;
  };

  const goNext = () => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(6, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    setImageError(null);

    const existingKeys = new Set(images.map((i) => `${i.file.name}:${i.file.size}`));
    const accepted: ImageEntry[] = [];
    for (const file of incoming) {
      if (images.length + accepted.length >= MAX_IMAGES) {
        setImageError(`Chỉ được đăng tối đa ${MAX_IMAGES} ảnh.`);
        break;
      }
      if (!ALLOWED_MIME.has(file.type)) {
        setImageError(`"${file.name}" không đúng định dạng. Chỉ chấp nhận JPEG, PNG hoặc WebP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(`"${file.name}" vượt quá 5MB.`);
        continue;
      }
      if (file.size === 0) {
        setImageError(`"${file.name}" bị trống hoặc lỗi.`);
        continue;
      }
      const key = `${file.name}:${file.size}`;
      if (existingKeys.has(key)) {
        setImageError(`"${file.name}" đã được thêm rồi.`);
        continue;
      }
      existingKeys.add(key);
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) {
      setImages((prev) => [...prev, ...accepted]);
      setErrors((prev) => { const n = { ...prev }; delete n.images; return n; });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm(INITIAL_FORM);
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setErrors({});
    setImageError(null);
    setStep(1);
  };

  const handlePublish = async () => {
    if (submitLockRef.current) return; // synchronous guard — blocks a true double-click
    const allErrors = { ...validateStep(1), ...validateStep(2), ...validateStep(3), ...validateStep(4), ...validateStep(5) };
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      focusFirstError(allErrors);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setStatusMessage('Đang đăng sản phẩm…');

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('category_slug', form.category_slug);
    if (form.brand_id) fd.append('brand_id', form.brand_id);
    else if (form.brand.trim()) fd.append('new_brand_name', form.brand.trim());
    fd.append('condition', form.condition);
    fd.append('size', form.size);
    fd.append('price', form.price);
    if (form.sale_price) fd.append('sale_price', form.sale_price);
    fd.append('stock', form.stock);
    fd.append('location', form.location.trim());
    fd.append('is_negotiable', String(form.is_negotiable));
    fd.append('sustainability', JSON.stringify(prepareProductJourney(form.product_journey)));
    images.forEach((img) => fd.append('images', img.file));

    try {
      const res = await createListing(fd);
      if (res.success) {
        // Success: deliberately do NOT clear submitLockRef/isSubmitting here.
        // A `finally` block runs even after this `return`, which previously
        // re-enabled the Publish button for the instant before navigation
        // completed — long enough for a genuine second click to slip through
        // as a real second network request. Only the error paths below
        // release the guard, since only they leave the user on this page.
        setStatusMessage('Đăng sản phẩm thành công.');
        localStorage.removeItem(DRAFT_KEY);
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        router.push(ROUTES.PRODUCT(res.data.slug));
        return;
      }
      setSubmitError(res.error.message || 'Không thể đăng sản phẩm.');
      if (res.error.details) {
        setErrors((prev) => ({ ...prev, ...res.error.details }));
        if (res.error.details.brand) {
          setStep(2);
          setTimeout(() => document.getElementById('brand')?.focus(), 0);
        }
      }
      setStatusMessage('Đăng sản phẩm không thành công. Vui lòng kiểm tra lại các lỗi bên dưới.');
      submitLockRef.current = false;
      setIsSubmitting(false);
    } catch {
      setSubmitError('Lỗi kết nối — hệ thống có thể đang tạm ngưng. Thông tin của bạn chưa bị mất.');
      setStatusMessage('Đăng sản phẩm không thành công do lỗi kết nối.');
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ---- Auth gate ----
  if (!isHydrated) {
    return <Container className="py-16 text-center animate-pulse">Đang tải công cụ đăng bán…</Container>;
  }
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Đăng nhập để đăng bán
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Bạn cần có tài khoản StyleHub để đăng sản phẩm. Đăng nhập hoặc tạo tài khoản để tiếp tục —
            bạn sẽ được đưa trở lại đây ngay sau đó.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.SELL}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Đăng nhập
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.SELL}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Tạo tài khoản
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const displayBrand = !form.brand || normalizeBrandText(form.brand) === normalizeBrandText(UNBRANDED_LABEL)
    ? UNBRANDED_LABEL
    : form.brand;

  // Whether publishing will use/create a brand StyleHub has not verified —
  // true both for a brand new name and for an existing brand that was
  // itself previously seller-declared (e.g. still `pending`). Matching is
  // a convenience hint only; the backend is the sole authority on whether
  // a brand actually already exists (backend/services/brandService.js).
  const matchedBrand = form.brand_id
    ? brands.find((brand) => brand.id === form.brand_id)
    : findEquivalentBrand(form.brand, brands);
  const brandIsUnverified = Boolean(form.brand)
    && normalizeBrandText(form.brand) !== normalizeBrandText(UNBRANDED_LABEL)
    && (!matchedBrand || matchedBrand.verification_status !== 'verified');

  const previewProduct: Product = {
    id: 'draft',
    slug: '#',
    name: form.name || 'Tin đăng chưa có tên',
    price: Number(form.price) || 0,
    sale_price: form.sale_price ? Number(form.sale_price) : null,
    condition: form.condition || 'good',
    size: form.size || 'One Size',
    location: form.location,
    status: 'active',
    thumbnail_url: images[0]?.previewUrl,
    brand: form.brand ? {
      name: displayBrand,
      source: brandIsUnverified ? 'seller_declared' : matchedBrand?.source,
      verification_status: brandIsUnverified ? 'pending' : matchedBrand?.verification_status,
    } : undefined,
    category: form.category_slug ? { name: leafCategories.find((c) => c.slug === form.category_slug)?.name } : undefined,
  };

  const errClass = (field: string) => (errors[field] ? 'border-red-500' : 'border-neutral-300');
  const lifecycleOption = getLifecycleOption(form.product_journey.lifecycle_type);

  return (
    <Container className="py-10 sm:py-16">
      <div aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Step indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <ol className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li key={label} className={`flex items-center gap-1.5 ${active ? 'text-neutral-900 font-bold' : done ? 'text-neutral-500' : 'text-neutral-300'}`}>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-neutral-900 bg-neutral-900 text-white' : done ? 'border-neutral-400' : 'border-neutral-300'}`}
                  aria-hidden="true"
                >
                  {n}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        {lastSaved && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-green-600 animate-in fade-in flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Đã lưu bản nháp ({lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="border border-neutral-200 bg-white p-6 sm:p-8">

            {submitError && (
              <div role="alert" className="mb-6 border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Bước 1 — THÔNG TIN CƠ BẢN
                </h2>
                <div>
                  <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tên sản phẩm *</label>
                  <input
                    id="name" type="text" value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Ví dụ: Áo khoác denim Levi's 501 vintage"
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined}
                    className={`w-full border ${errClass('name')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="description" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Mô tả *</label>
                  <textarea
                    id="description"
                    value={form.description} onChange={(e) => setField('description', e.target.value)}
                    placeholder="Miêu tả sản phẩm: tình trạng, lỗi (nếu có), số đo, cách phối đồ..."
                    rows={5} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'description-error' : undefined}
                    className={`w-full border ${errClass('description')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.description && <p id="description-error" className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Bước 2 — DANH MỤC & THƯƠNG HIỆU
                </h2>
                {categoriesError && <p className="text-red-500 text-xs">{categoriesError}</p>}
                <div>
                  <label htmlFor="category_slug" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Danh mục *</label>
                  <select
                    id="category_slug"
                    value={form.category_slug} onChange={(e) => setField('category_slug', e.target.value)}
                    disabled={categoriesLoading} aria-invalid={!!errors.category_slug}
                    className={`w-full border ${errClass('category_slug')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50`}
                  >
                    <option value="">{categoriesLoading ? 'Đang tải danh mục…' : 'Chọn danh mục'}</option>
                    {leafCategories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                  {errors.category_slug && <p className="text-red-500 text-xs mt-1">{errors.category_slug}</p>}
                  {!categoriesLoading && leafCategories.length === 0 && !categoriesError && (
                    <p className="text-xs text-neutral-500 mt-1">Hiện chưa có danh mục nào.</p>
                  )}
                </div>
                <div>
                  <BrandField
                    id="brand"
                    value={form.brand}
                    onChange={setBrandField}
                    brands={brands}
                    brandsLoading={brandsLoading}
                    ariaInvalid={!!errors.brand}
                    errorId={errors.brand ? 'brand-error' : undefined}
                  />
                  {errors.brand && <p id="brand-error" className="mt-1 text-xs text-red-600">{errors.brand}</p>}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Bước 3 — TÌNH TRẠNG & KÍCH THƯỚC
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="condition" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tình trạng *</label>
                    <select
                      id="condition"
                      value={form.condition} onChange={(e) => setField('condition', e.target.value)}
                      aria-invalid={!!errors.condition}
                      className={`w-full border ${errClass('condition')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    >
                      <option value="">Chọn tình trạng</option>
                      {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
                  </div>
                  <div>
                    <label htmlFor="size" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Kích thước *</label>
                    <select
                      id="size"
                      value={form.size} onChange={(e) => setField('size', e.target.value)}
                      aria-invalid={!!errors.size}
                      className={`w-full border ${errClass('size')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    >
                      <option value="">Chọn kích thước</option>
                      {sizeOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
                    {isShoeLike && <p className="text-[10px] text-neutral-500 mt-1 uppercase font-mono tracking-wide">Giày dép dùng kích thước theo chuẩn EU.</p>}
                  </div>
                </div>
                <ProductJourneyFields
                  idPrefix="sell"
                  value={form.product_journey}
                  onChange={setProductJourney}
                  errors={errors}
                />
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Bước 4 — GIÁ & VẬN CHUYỂN
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="price" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Giá bán (VNĐ) *</label>
                    <input
                      id="price" type="number" min="1" value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      placeholder="0" aria-invalid={!!errors.price}
                      className={`w-full border ${errClass('price')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  </div>
                  <div>
                    <label htmlFor="sale_price" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Giá giảm (không bắt buộc)</label>
                    <input
                      id="sale_price" type="number" min="1" value={form.sale_price}
                      onChange={(e) => setField('sale_price', e.target.value)}
                      placeholder="Để trống nếu không giảm giá" aria-invalid={!!errors.sale_price}
                      className={`w-full border ${errClass('sale_price')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    />
                    {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price}</p>}
                  </div>
                  <div>
                    <label htmlFor="stock" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Số lượng *</label>
                    <input
                      id="stock" type="number" min="1" value={form.stock}
                      onChange={(e) => setField('stock', e.target.value)}
                      aria-invalid={!!errors.stock}
                      className={`w-full border ${errClass('stock')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    />
                    {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                  </div>
                  <div>
                    <label htmlFor="location" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tỉnh/Thành phố *</label>
                    <Combobox
                      id="location"
                      value={form.location}
                      onChange={(v) => setField('location', v)}
                      getOptions={searchVnLocations}
                      placeholder="Tìm tỉnh/thành phố..."
                      description="Gõ có dấu hoặc không dấu, ví dụ &quot;da nang&quot; hoặc &quot;tphcm&quot;."
                      ariaInvalid={!!errors.location}
                      ariaDescribedBy={errors.location ? 'location-error' : undefined}
                      emptyMessage="Không tìm thấy tỉnh/thành phố phù hợp."
                    />
                    {errors.location && <p id="location-error" className="text-red-500 text-xs mt-1">{errors.location}</p>}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox" checked={form.is_negotiable}
                    onChange={(e) => setField('is_negotiable', e.target.checked)}
                    className="h-4 w-4 border-neutral-300"
                  />
                  Có thể thương lượng giá
                </label>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Bước 5 — HÌNH ẢNH
                </h2>
                <div>
                  <label htmlFor="images" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Hình ảnh * (tối đa {MAX_IMAGES} ảnh, JPEG/PNG/WebP, mỗi ảnh tối đa 5MB)
                  </label>
                  <input
                    id="images" type="file" multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
                    aria-invalid={!!errors.images}
                    className={`w-full border ${errClass('images')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none file:mr-3 file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-1.5 file:text-xs file:uppercase file:font-mono`}
                  />
                  {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
                  {imageError && <p role="alert" className="text-red-500 text-xs mt-1">{imageError}</p>}
                </div>
                {images.length > 0 && (
                  <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {images.map((img, i) => (
                      <li key={img.previewUrl} className="relative border border-neutral-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.previewUrl} alt={`Ảnh sản phẩm ${i + 1}${i === 0 ? ' (ảnh chính)' : ''}`} className="aspect-square w-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-neutral-900 text-white text-[9px] font-mono uppercase px-1.5 py-0.5">Ảnh chính</span>
                        )}
                        <button
                          type="button" onClick={() => removeImage(i)}
                          aria-label={`Xóa ảnh ${i + 1}`}
                          className="absolute top-1 right-1 bg-white/90 border border-neutral-300 text-neutral-700 text-xs h-5 w-5 flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Step 6 */}
            {step === 6 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Bước 6 — KIỂM TRA & ĐĂNG BÁN
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Tên sản phẩm</dt><dd className="text-neutral-900">{form.name}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Danh mục</dt><dd className="text-neutral-900">{leafCategories.find((c) => c.slug === form.category_slug)?.name || form.category_slug}</dd></div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase text-neutral-400">Thương hiệu</dt>
                    <dd className="text-neutral-900">
                      {displayBrand}
                      {brandIsUnverified && (
                        <p className="mt-1 text-xs font-normal leading-5 text-amber-700">
                          Thương hiệu do người bán khai báo, chưa được StyleHub xác minh.
                        </p>
                      )}
                    </dd>
                  </div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Tình trạng</dt><dd className="text-neutral-900">{formatCondition(form.condition)}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Kích thước</dt><dd className="text-neutral-900">{sizeOptions.find((s) => s.value === form.size)?.label || form.size}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Giá bán</dt><dd className="text-neutral-900">{Number(form.price).toLocaleString('vi-VN')}đ{form.sale_price ? ` (giảm còn: ${Number(form.sale_price).toLocaleString('vi-VN')}đ)` : ''}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Số lượng</dt><dd className="text-neutral-900">{form.stock}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Tỉnh/Thành phố</dt><dd className="text-neutral-900">{form.location}{form.is_negotiable ? ' · Có thể thương lượng' : ''}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-mono text-[10px] uppercase text-neutral-400">Mô tả</dt><dd className="text-neutral-900 whitespace-pre-wrap">{form.description}</dd></div>
                  <div className="sm:col-span-2 border-t border-neutral-100 pt-4">
                    <dt className="font-mono text-[10px] uppercase text-neutral-400">PHÂN LOẠI SẢN PHẨM · Người bán cung cấp</dt>
                    <dd className="mt-1 text-neutral-900">{lifecycleOption?.previewLabel || 'Chưa xác định'}</dd>
                    {form.product_journey.material && form.product_journey.lifecycle_type !== 'not_specified' && (
                      <dd className="mt-1 text-neutral-600">Chất liệu: {form.product_journey.material}</dd>
                    )}
                    {form.product_journey.repair_history && form.product_journey.lifecycle_type === 'repaired' && (
                      <dd className="mt-1 whitespace-pre-wrap text-neutral-600">Đã sửa: {form.product_journey.repair_history}</dd>
                    )}
                    {form.product_journey.upcycle_details && form.product_journey.lifecycle_type === 'upcycled' && (
                      <dd className="mt-1 whitespace-pre-wrap text-neutral-600">Tái thiết kế: {form.product_journey.upcycle_details}</dd>
                    )}
                    {form.product_journey.product_story && form.product_journey.lifecycle_type !== 'not_specified' && (
                      <dd className="mt-1 whitespace-pre-wrap text-neutral-600">Câu chuyện: {form.product_journey.product_story}</dd>
                    )}
                    {form.product_journey.reuse_packaging && form.product_journey.lifecycle_type !== 'not_specified' && (
                      <dd className="mt-1 text-neutral-600">Dự định sử dụng lại bao bì phù hợp khi giao hàng.</dd>
                    )}
                  </div>
                </dl>
                <div>
                  <p className="font-mono text-[10px] uppercase text-neutral-400 mb-2">Hình ảnh ({images.length})</p>
                  <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <li key={img.previewUrl}><img src={img.previewUrl} alt={`Ảnh sản phẩm ${i + 1}`} className="aspect-square w-full object-cover border border-neutral-200" /></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step navigation */}
            <div className="pt-6 mt-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between">
              <div>
                {step > 1 && (
                  <Button data-testid="sell-back" variant="outline" type="button" onClick={goBack} disabled={isSubmitting} className="font-mono text-xs uppercase tracking-wider">
                    &larr; Quay lại
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {step === 1 && (
                  <Button data-testid="sell-clear-draft" variant="outline" type="button" onClick={clearDraft} disabled={isSubmitting} className="font-mono text-xs uppercase tracking-wider text-neutral-500">
                    Xóa bản nháp
                  </Button>
                )}
                {step < 6 && (
                  <Button data-testid="sell-next" type="button" onClick={goNext} className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white">
                    Tiếp tục &rarr;
                  </Button>
                )}
                {step === 6 && (
                  <Button
                    data-testid="sell-publish"
                    type="button" onClick={handlePublish} disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white"
                  >
                    {isSubmitting ? 'Đang đăng…' : 'Đăng sản phẩm'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview & Tips */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="sticky top-24">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-3">XEM TRƯỚC TRỰC TIẾP</h3>
            <div className="pointer-events-none">
              <ProductCard product={previewProduct} />
            </div>
            <div className="mt-3 border-t border-neutral-200 pt-3" data-testid="sell-product-journey-preview">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">PHÂN LOẠI SẢN PHẨM</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{lifecycleOption?.previewLabel || 'Chưa xác định'}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">Thông tin do người bán cung cấp, chưa được StyleHub kiểm định.</p>
            </div>

            <div className="mt-8 border border-neutral-200 bg-neutral-50 p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">Mẹo cho người bán</h3>
              <ul className="text-xs text-neutral-600 leading-relaxed space-y-3 list-disc list-inside">
                <li>Chụp ảnh rõ nét dưới ánh sáng tự nhiên.</li>
                <li>Mô tả tình trạng sản phẩm trung thực.</li>
                <li>Ghi rõ số đo và thông tin kích thước.</li>
                <li>Đặt giá hợp lý theo thị trường, tính bằng VNĐ.</li>
                <li>Chọn hình thức giao nhận an toàn.</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link href={ROUTES.PROFILE} className="text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-900 text-center block py-2 border border-transparent hover:border-neutral-200">
                &larr; Quay lại trang cá nhân
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};
