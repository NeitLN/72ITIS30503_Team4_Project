'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { ProductCard } from '../product/ProductCard';
import { Product } from '../../types/product';

type SellDraft = {
  name: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  price: string;
  location: string;
  description: string;
  imageUrl: string;
};

const INITIAL_DRAFT: SellDraft = {
  name: '',
  brand: '',
  category: '',
  size: '',
  condition: '',
  price: '',
  location: 'Ho Chi Minh City',
  description: '',
  imageUrl: '',
};

const CATEGORIES = ['Hoodies', 'T-Shirts', 'Jackets', 'Pants', 'Shoes', 'Bags', 'Accessories'];
const BRANDS = ["DirtyCoins", "Levents", "Degrey", "Coolmate", "Ananas", "Biti's", "Nike", "Adidas", "Levi's", "Uniqlo", "Zara", "Other"];
const SIZES = ['One size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42', '43'];
const CONDITIONS = ['Brand new', 'New with tags', 'Like new', 'Excellent', 'Very good', 'Good', 'Fair'];
const LOCATIONS = ['Ho Chi Minh City', 'Ha Noi', 'Da Nang', 'Can Tho', 'Binh Duong', 'Dong Nai', 'Other'];

export const SellListingClient = () => {
  const [draft, setDraft] = useState<SellDraft>(INITIAL_DRAFT);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Avoid cascading renders by moving logic to a slightly delayed hydration
    const timer = setTimeout(() => {
      const saved = localStorage.getItem('stylehub:sell-draft');
      if (saved) {
        try {
          setDraft(JSON.parse(saved));
        } catch {
          // Ignore JSON parse error
        }
      }
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (field: keyof SellDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setShowSuccess(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem('stylehub:sell-draft', JSON.stringify(draft));
    alert('Draft saved locally for demo.');
  };

  const handleClearDraft = () => {
    localStorage.removeItem('stylehub:sell-draft');
    setDraft(INITIAL_DRAFT);
    setErrors({});
    setShowSuccess(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!draft.name.trim()) newErrors.name = 'Add a listing title.';
    if (!draft.category) newErrors.category = 'Choose a category.';
    if (!draft.condition) newErrors.condition = 'Choose the item condition.';
    if (!draft.price || isNaN(Number(draft.price)) || Number(draft.price) <= 0) newErrors.price = 'Enter a valid VNĐ price.';
    if (draft.description.length > 0 && draft.description.length < 20) newErrors.description = 'Add at least 20 characters about condition, fit, or styling.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = () => {
    if (validate()) {
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const previewProduct: Product = {
    id: 'draft',
    slug: '#',
    name: draft.name || 'Untitled listing',
    price: Number(draft.price) || 0,
    condition: draft.condition || 'New',
    size: draft.size || 'One size',
    location: draft.location,
    status: 'active',
    thumbnail_url: draft.imageUrl || undefined,
    brand: draft.brand ? { name: draft.brand } : undefined,
    category: draft.category ? { name: draft.category } : undefined,
    seller: {
      username: 'vietstyle',
      full_name: 'Võ Việt Tiến',
      location: 'Ho Chi Minh City, Vietnam',
      seller_rating: 4.9,
      is_verified_seller: true,
      sold_count: 24,
    }
  };

  if (!isHydrated) return <Container className="py-16 text-center animate-pulse">Loading selling tools...</Container>;

  return (
    <Container className="py-10 sm:py-16">
      {showSuccess && (
        <div className="mb-8 p-4 bg-neutral-950 text-white flex flex-col sm:flex-row justify-between items-center border border-neutral-900 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400 block mb-1">Success</span>
            <p className="font-bold text-sm">Demo listing created locally. This project does not publish real products.</p>
          </div>
          <Button variant="outline" className="mt-4 sm:mt-0 text-white border-white hover:bg-neutral-800" onClick={() => setShowSuccess(false)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left: Form */}
        <div className="lg:col-span-8">
          <div className="border border-neutral-200 bg-white p-6 sm:p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-6">
              Item Details
            </h2>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                  Listing Title *
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Vintage Levi's 501 Denim Jacket"
                  className={`w-full border ${errors.name ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={draft.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={`w-full border ${errors.category ? 'border-red-500' : 'border-neutral-300'} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Brand
                  </label>
                  <select
                    value={draft.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">No Brand / Independent</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Size
                  </label>
                  <select
                    value={draft.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">Select size</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Condition *
                  </label>
                  <select
                    value={draft.condition}
                    onChange={(e) => handleChange('condition', e.target.value)}
                    className={`w-full border ${errors.condition ? 'border-red-500' : 'border-neutral-300'} bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Price (VNĐ) *
                  </label>
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="0"
                    className={`w-full border ${errors.price ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    Location
                  </label>
                  <select
                    value={draft.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  >
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the item, including any flaws, measurements, or styling tips."
                  rows={4}
                  className={`w-full border ${errors.description ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                  Image URL (Optional Demo)
                </label>
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
                <p className="text-[10px] text-neutral-500 mt-1 uppercase font-mono tracking-wide">Image uploads are disabled in demo mode.</p>
              </div>

              <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-4 justify-end">
                <Button variant="outline" type="button" onClick={handleClearDraft} className="font-mono text-xs uppercase tracking-wider text-neutral-500">
                  Clear Draft
                </Button>
                <Button variant="secondary" type="button" onClick={handleSaveDraft} className="font-mono text-xs uppercase tracking-wider">
                  Save Draft
                </Button>
                <Button type="button" onClick={handlePublish} className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white">
                  Publish Demo Listing
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Preview & Tips */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          <div className="sticky top-24">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-3">
              Live Preview
            </h3>
            <div className="pointer-events-none">
              <ProductCard product={previewProduct} />
            </div>

            <div className="mt-8 border border-neutral-200 bg-neutral-50 p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">
                Seller Tips
              </h3>
              <ul className="text-xs text-neutral-600 leading-relaxed space-y-3 list-disc list-inside">
                <li>Use clear photos in natural light.</li>
                <li>Mention the condition honestly.</li>
                <li>Add sizing details and measurements.</li>
                <li>Set a fair market price in VNĐ.</li>
                <li>Choose safe pickup or shipping.</li>
              </ul>
            </div>

            <div className="mt-8 border border-neutral-200 bg-white p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">
                Trust & Safety
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                StyleHub demo does not process payments, verify identities, upload files, or create real product records. All drafts are stored locally.
              </p>
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
