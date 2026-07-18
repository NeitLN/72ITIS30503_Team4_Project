'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { ProductCard } from '../product/ProductCard';
import { Product } from '../../types/product';
import { useAuth } from '../../hooks/useAuth';
import { getCategoryTree } from '../../lib/catalog';
import { Category } from '../../types/category';
import { getBrands, BrandOption } from '../../lib/brands';
import { createListing } from '../../lib/products';
import { formatCondition } from '../../lib/format';

type FormState = {
  name: string;
  description: string;
  category_slug: string;
  brand_slug: string;
  condition: string;
  size: string;
  price: string;
  sale_price: string;
  stock: string;
  location: string;
  is_negotiable: boolean;
};

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  category_slug: '',
  brand_slug: '',
  condition: '',
  size: '',
  price: '',
  sale_price: '',
  stock: '1',
  location: 'Ho Chi Minh City',
  is_negotiable: false,
};

const CONDITIONS = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'like_new', label: 'Like new' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const SHOE_SIZES = ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'One Size'];
const LOCATIONS = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Bien Hoa', 'Nha Trang', 'Hue'];
const SHOE_LIKE_CATEGORIES = new Set(['shoes', 'slides']);
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DRAFT_KEY = 'stylehub:sell-draft-v2';

const STEP_LABELS = [
  'Basic details',
  'Category & brand',
  'Condition & size',
  'Pricing & logistics',
  'Photos',
  'Review & publish',
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

  const submitLockRef = useRef(false); // synchronous guard against rapid double-clicks

  // ---- Load categories & brands from the real backend ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCategoryTree();
        if (!cancelled) setCategories(res.data || []);
      } catch {
        if (!cancelled) setCategoriesError('Could not load categories. Please refresh the page.');
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
        if (saved) setForm({ ...INITIAL_FORM, ...JSON.parse(saved) });
      } catch {
        // ignore corrupt draft
      }
      setDraftLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
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

  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = Object.keys(fieldErrors)[0];
    if (first) {
      document.getElementById(first)?.focus();
    }
  };

  const isShoeLike = SHOE_LIKE_CATEGORIES.has(form.category_slug);
  const sizeOptions = isShoeLike ? SHOE_SIZES : CLOTHING_SIZES;

  const validateStep = (targetStep: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (targetStep === 1) {
      const name = form.name.trim();
      if (!name || name.length < 3) e.name = 'Add a listing title (at least 3 characters).';
      else if (name.length > 120) e.name = 'Title must be under 120 characters.';
      else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) e.name = 'Title must contain more than just symbols.';
      const description = form.description.trim();
      if (!description || description.length < 10) e.description = 'Describe the item in at least 10 characters.';
      else if (description.length > 2000) e.description = 'Description must be under 2000 characters.';
    }
    if (targetStep === 2) {
      if (!form.category_slug) e.category_slug = 'Choose a category.';
    }
    if (targetStep === 3) {
      if (!form.condition) e.condition = 'Choose the item condition.';
      if (!form.size) e.size = 'Choose a size.';
    }
    if (targetStep === 4) {
      const price = Number(form.price);
      if (!form.price || !Number.isFinite(price) || price <= 0) e.price = 'Enter a valid VNĐ price greater than 0.';
      else if (price > 500_000_000) e.price = 'Price is unreasonably high for a C2C listing.';
      if (form.sale_price) {
        const sale = Number(form.sale_price);
        if (!Number.isFinite(sale) || sale <= 0) e.sale_price = 'Sale price must be greater than 0.';
        else if (Number.isFinite(price) && sale >= price) e.sale_price = 'Sale price must be less than the regular price.';
      }
      const stock = Number(form.stock);
      if (!Number.isInteger(stock) || stock < 1) e.stock = 'Stock must be a whole number of at least 1.';
      if (!form.location.trim()) e.location = 'Location is required.';
    }
    if (targetStep === 5) {
      if (images.length === 0) e.images = 'Add at least one photo.';
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
        setImageError(`A maximum of ${MAX_IMAGES} photos is allowed.`);
        break;
      }
      if (!ALLOWED_MIME.has(file.type)) {
        setImageError(`"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(`"${file.name}" is larger than 5MB.`);
        continue;
      }
      if (file.size === 0) {
        setImageError(`"${file.name}" appears to be empty or corrupt.`);
        continue;
      }
      const key = `${file.name}:${file.size}`;
      if (existingKeys.has(key)) {
        setImageError(`"${file.name}" was already added.`);
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
    setStatusMessage('Publishing your listing…');

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('category_slug', form.category_slug);
    fd.append('brand_slug', form.brand_slug);
    fd.append('condition', form.condition);
    fd.append('size', form.size);
    fd.append('price', form.price);
    if (form.sale_price) fd.append('sale_price', form.sale_price);
    fd.append('stock', form.stock);
    fd.append('location', form.location.trim());
    fd.append('is_negotiable', String(form.is_negotiable));
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
        setStatusMessage('Listing published successfully.');
        localStorage.removeItem(DRAFT_KEY);
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        router.push(ROUTES.PRODUCT(res.data.slug));
        return;
      }
      setSubmitError(res.error.message || 'Failed to publish listing.');
      if (res.error.details) setErrors((prev) => ({ ...prev, ...res.error.details }));
      setStatusMessage('Publishing failed. Please review the errors below.');
      submitLockRef.current = false;
      setIsSubmitting(false);
    } catch {
      setSubmitError('Network error — the backend may be offline. Your details were not lost.');
      setStatusMessage('Publishing failed due to a network error.');
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ---- Auth gate ----
  if (!isHydrated) {
    return <Container className="py-16 text-center animate-pulse">Loading selling tools…</Container>;
  }
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Sign in to sell
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            You need a StyleHub account to publish a listing. Log in or create an account to continue — you&apos;ll
            come right back here.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.SELL}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Log in
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.SELL}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const previewProduct: Product = {
    id: 'draft',
    slug: '#',
    name: form.name || 'Untitled listing',
    price: Number(form.price) || 0,
    sale_price: form.sale_price ? Number(form.sale_price) : null,
    condition: form.condition || 'good',
    size: form.size || 'One size',
    location: form.location,
    status: 'active',
    thumbnail_url: images[0]?.previewUrl,
    brand: form.brand_slug ? { name: brands.find((b) => b.slug === form.brand_slug)?.name } : undefined,
    category: form.category_slug ? { name: leafCategories.find((c) => c.slug === form.category_slug)?.name } : undefined,
  };

  const errClass = (field: string) => (errors[field] ? 'border-red-500' : 'border-neutral-300');

  return (
    <Container className="py-10 sm:py-16">
      <div aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Step indicator */}
      <ol className="mb-8 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest">
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
                  Step 1 — Basic details
                </h2>
                <div>
                  <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Listing title *</label>
                  <input
                    id="name" type="text" value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g., Vintage Levi's 501 Denim Jacket"
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined}
                    className={`w-full border ${errClass('name')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="description" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Description *</label>
                  <textarea
                    id="description"
                    value={form.description} onChange={(e) => setField('description', e.target.value)}
                    placeholder="Describe the item, including any flaws, measurements, or styling tips."
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
                  Step 2 — Category & brand
                </h2>
                {categoriesError && <p className="text-red-500 text-xs">{categoriesError}</p>}
                <div>
                  <label htmlFor="category_slug" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Category *</label>
                  <select
                    id="category_slug"
                    value={form.category_slug} onChange={(e) => setField('category_slug', e.target.value)}
                    disabled={categoriesLoading} aria-invalid={!!errors.category_slug}
                    className={`w-full border ${errClass('category_slug')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50`}
                  >
                    <option value="">{categoriesLoading ? 'Loading categories…' : 'Select category'}</option>
                    {leafCategories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                  {errors.category_slug && <p className="text-red-500 text-xs mt-1">{errors.category_slug}</p>}
                  {!categoriesLoading && leafCategories.length === 0 && !categoriesError && (
                    <p className="text-xs text-neutral-500 mt-1">No categories are available right now.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="brand_slug" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Brand</label>
                  <select
                    id="brand_slug" value={form.brand_slug} onChange={(e) => setField('brand_slug', e.target.value)}
                    disabled={brandsLoading}
                    className="w-full border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">{brandsLoading ? 'Loading brands…' : 'No Brand / Independent'}</option>
                    {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Step 3 — Condition & size
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="condition" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Condition *</label>
                    <select
                      id="condition"
                      value={form.condition} onChange={(e) => setField('condition', e.target.value)}
                      aria-invalid={!!errors.condition}
                      className={`w-full border ${errClass('condition')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    >
                      <option value="">Select condition</option>
                      {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
                  </div>
                  <div>
                    <label htmlFor="size" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Size *</label>
                    <select
                      id="size"
                      value={form.size} onChange={(e) => setField('size', e.target.value)}
                      aria-invalid={!!errors.size}
                      className={`w-full border ${errClass('size')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    >
                      <option value="">Select size</option>
                      {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
                    {isShoeLike && <p className="text-[10px] text-neutral-500 mt-1 uppercase font-mono tracking-wide">Footwear uses EU sizing.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Step 4 — Pricing & logistics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="price" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Price (VNĐ) *</label>
                    <input
                      id="price" type="number" min="1" value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      placeholder="0" aria-invalid={!!errors.price}
                      className={`w-full border ${errClass('price')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  </div>
                  <div>
                    <label htmlFor="sale_price" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Sale price (optional)</label>
                    <input
                      id="sale_price" type="number" min="1" value={form.sale_price}
                      onChange={(e) => setField('sale_price', e.target.value)}
                      placeholder="Leave blank for no discount" aria-invalid={!!errors.sale_price}
                      className={`w-full border ${errClass('sale_price')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    />
                    {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price}</p>}
                  </div>
                  <div>
                    <label htmlFor="stock" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Stock *</label>
                    <input
                      id="stock" type="number" min="1" value={form.stock}
                      onChange={(e) => setField('stock', e.target.value)}
                      aria-invalid={!!errors.stock}
                      className={`w-full border ${errClass('stock')} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    />
                    {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                  </div>
                  <div>
                    <label htmlFor="location" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Location *</label>
                    <select
                      id="location"
                      value={form.location} onChange={(e) => setField('location', e.target.value)}
                      aria-invalid={!!errors.location}
                      className={`w-full border ${errClass('location')} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                    >
                      {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox" checked={form.is_negotiable}
                    onChange={(e) => setField('is_negotiable', e.target.checked)}
                    className="h-4 w-4 border-neutral-300"
                  />
                  Price is negotiable
                </label>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-2">
                  Step 5 — Photos
                </h2>
                <div>
                  <label htmlFor="images" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Photos * (up to {MAX_IMAGES}, JPEG/PNG/WebP, max 5MB each)
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
                        <img src={img.previewUrl} alt={`Listing photo ${i + 1}${i === 0 ? ' (primary)' : ''}`} className="aspect-square w-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-neutral-900 text-white text-[9px] font-mono uppercase px-1.5 py-0.5">Primary</span>
                        )}
                        <button
                          type="button" onClick={() => removeImage(i)}
                          aria-label={`Remove photo ${i + 1}`}
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
                  Step 6 — Review & publish
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Title</dt><dd className="text-neutral-900">{form.name}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Category</dt><dd className="text-neutral-900">{leafCategories.find((c) => c.slug === form.category_slug)?.name || form.category_slug}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Brand</dt><dd className="text-neutral-900">{brands.find((b) => b.slug === form.brand_slug)?.name || 'No Brand / Independent'}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Condition</dt><dd className="text-neutral-900">{formatCondition(form.condition)}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Size</dt><dd className="text-neutral-900">{form.size}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Price</dt><dd className="text-neutral-900">{Number(form.price).toLocaleString('vi-VN')} VNĐ{form.sale_price ? ` (sale: ${Number(form.sale_price).toLocaleString('vi-VN')} VNĐ)` : ''}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Stock</dt><dd className="text-neutral-900">{form.stock}</dd></div>
                  <div><dt className="font-mono text-[10px] uppercase text-neutral-400">Location</dt><dd className="text-neutral-900">{form.location}{form.is_negotiable ? ' · Negotiable' : ''}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-mono text-[10px] uppercase text-neutral-400">Description</dt><dd className="text-neutral-900 whitespace-pre-wrap">{form.description}</dd></div>
                </dl>
                <div>
                  <p className="font-mono text-[10px] uppercase text-neutral-400 mb-2">Photos ({images.length})</p>
                  <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <li key={img.previewUrl}><img src={img.previewUrl} alt={`Listing photo ${i + 1}`} className="aspect-square w-full object-cover border border-neutral-200" /></li>
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
                    &larr; Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {step === 1 && (
                  <Button data-testid="sell-clear-draft" variant="outline" type="button" onClick={clearDraft} disabled={isSubmitting} className="font-mono text-xs uppercase tracking-wider text-neutral-500">
                    Clear draft
                  </Button>
                )}
                {step < 6 && (
                  <Button data-testid="sell-next" type="button" onClick={goNext} className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white">
                    Next &rarr;
                  </Button>
                )}
                {step === 6 && (
                  <Button
                    data-testid="sell-publish"
                    type="button" onClick={handlePublish} disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white"
                  >
                    {isSubmitting ? 'Publishing…' : 'Publish listing'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview & Tips */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="sticky top-24">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-3">Live preview</h3>
            <div className="pointer-events-none">
              <ProductCard product={previewProduct} />
            </div>

            <div className="mt-8 border border-neutral-200 bg-neutral-50 p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">Seller tips</h3>
              <ul className="text-xs text-neutral-600 leading-relaxed space-y-3 list-disc list-inside">
                <li>Use clear photos in natural light.</li>
                <li>Mention the condition honestly.</li>
                <li>Add sizing details and measurements.</li>
                <li>Set a fair market price in VNĐ.</li>
                <li>Choose safe pickup or shipping.</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link href={ROUTES.PROFILE} className="text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-900 text-center block py-2 border border-transparent hover:border-neutral-200">
                &larr; Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};
