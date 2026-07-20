'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Category } from '../../types/category';
import { formatCondition } from '../../lib/format';
import { LIFECYCLE_OPTIONS, getLifecycleOption, type LifecycleType } from '../../lib/productJourney';

interface ShopFiltersProps {
  categories: Category[];
  initialFilters: {
    search?: string;
    category?: string;
    condition?: string;
    brand?: string;
    lifecycle?: string;
    sort?: string;
    page?: string;
  };
}

const BRANDS = [
  { slug: 'dirtycoins', name: 'DirtyCoins' },
  { slug: 'levents', name: 'Levents' },
  { slug: 'degrey', name: 'Degrey' },
  { slug: 'coolmate', name: 'Coolmate' },
  { slug: 'bitis', name: "Biti's" },
  { slug: 'ananas', name: 'Ananas' },
  { slug: 'nike', name: 'Nike' },
  { slug: 'adidas', name: 'Adidas' },
  { slug: 'uniqlo', name: 'Uniqlo' },
  { slug: 'zara', name: 'Zara' },
  { slug: 'levis', name: "Levi's" },
];

const CONDITIONS = [
  { slug: 'new', name: formatCondition('new') },
  { slug: 'like_new', name: formatCondition('like_new') },
  { slug: 'used', name: formatCondition('used') },
];

export const ShopFilters = ({ categories, initialFilters }: ShopFiltersProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [prevSearchProp, setPrevSearchProp] = useState(initialFilters.search);
  const [search, setSearch] = useState(initialFilters.search || '');

  // Sync local input text when URL parameters change (e.g. filters are cleared) during render
  if (initialFilters.search !== prevSearchProp) {
    setPrevSearchProp(initialFilters.search);
    setSearch(initialFilters.search || '');
  }

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });

    // Remove page parameter when filters change to start fresh on page 1
    current.delete('page');

    const searchStr = current.toString();
    const query = searchStr ? `?${searchStr}` : '';

    startTransition(() => {
      router.push(`${pathname}${query}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({ search });
  };

  const handleSelectChange = (key: string, value: string) => {
    updateQueryParams({ [key]: value });
  };

  const handleClearSingle = (key: string) => {
    if (key === 'search') setSearch('');
    updateQueryParams({ [key]: null });
  };

  const handleClearAll = () => {
    setSearch('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    Boolean(initialFilters.search) ||
    Boolean(initialFilters.category) ||
    Boolean(initialFilters.condition) ||
    Boolean(initialFilters.brand) ||
    Boolean(initialFilters.lifecycle);

  const selectedCategoryName = categories.find((c) => c.slug === initialFilters.category)?.name;
  const selectedBrandName = BRANDS.find((b) => b.slug === initialFilters.brand)?.name;
  const selectedConditionName = CONDITIONS.find((c) => c.slug === initialFilters.condition)?.name;
  const selectedLifecycleName = getLifecycleOption(initialFilters.lifecycle as LifecycleType)?.previewLabel;

  return (
    <div className="mb-8 border-b border-neutral-200 pb-6">
      {/* Search & Filter Selectors */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg">
          <label htmlFor="search" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
            Từ khóa tìm kiếm
          </label>
          <div className="flex">
            <input
              type="text"
              id="search"
              placeholder="Tìm thương hiệu, hoodie, AF1..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-neutral-300 border-r-0 px-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-0 bg-white"
            />
            <button
              type="submit"
              disabled={isPending}
              className="border border-neutral-900 bg-neutral-900 px-6 py-2 font-mono text-xs uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Tìm kiếm
            </button>
          </div>
        </form>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-end">
          {/* Category Dropdown */}
          <div className="flex-1 sm:min-w-[140px]">
            <label htmlFor="category-select" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              Danh mục
            </label>
            <select
              id="category-select"
              value={initialFilters.category || ''}
              onChange={(e) => handleSelectChange('category', e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-800 uppercase tracking-wide focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lifecycle Dropdown */}
          <div className="flex-1 sm:min-w-[150px]">
            <label htmlFor="lifecycle-select" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              Hành trình sản phẩm
            </label>
            <select
              id="lifecycle-select"
              value={initialFilters.lifecycle || ''}
              onChange={(e) => handleSelectChange('lifecycle', e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-800 uppercase tracking-wide focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Tất cả hành trình</option>
              {LIFECYCLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.previewLabel}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex-1 sm:min-w-[135px]">
            <label htmlFor="sort-select" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              Sắp xếp
            </label>
            <select
              id="sort-select"
              value={initialFilters.sort || 'latest'}
              onChange={(e) => handleSelectChange('sort', e.target.value === 'latest' ? '' : e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-800 uppercase tracking-wide focus:border-neutral-900 focus:outline-none"
            >
              <option value="latest">Mới nhất</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
            </select>
          </div>

          {/* Brand Dropdown */}
          <div className="flex-1 sm:min-w-[140px]">
            <label htmlFor="brand-select" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              Thương hiệu
            </label>
            <select
              id="brand-select"
              value={initialFilters.brand || ''}
              onChange={(e) => handleSelectChange('brand', e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-800 uppercase tracking-wide focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Tất cả thương hiệu</option>
              {BRANDS.map((brand) => (
                <option key={brand.slug} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Dropdown */}
          <div className="flex-1 sm:min-w-[140px]">
            <label htmlFor="condition-select" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              Tình trạng
            </label>
            <select
              id="condition-select"
              value={initialFilters.condition || ''}
              onChange={(e) => handleSelectChange('condition', e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-800 uppercase tracking-wide focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Tất cả tình trạng</option>
              {CONDITIONS.map((cond) => (
                <option key={cond.slug} value={cond.slug}>
                  {cond.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state indicator */}
      {isPending && (
        <p className="mt-3 font-mono text-[10px] text-neutral-400 uppercase tracking-widest animate-pulse">
          Đang cập nhật tin đăng...
        </p>
      )}

      {/* Filter Chips & Clear Button */}
      {hasActiveFilters && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            Bộ lọc đang áp dụng:
          </span>

          {initialFilters.search && (
            <span className="inline-flex items-center gap-1.5 border border-neutral-900 bg-white px-2.5 py-1 font-mono text-[10px] text-neutral-900">
              Tìm kiếm: &quot;{initialFilters.search}&quot;
              <button
                type="button"
                onClick={() => handleClearSingle('search')}
                className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                aria-label="Xóa bộ lọc tìm kiếm"
              >
                ✕
              </button>
            </span>
          )}

          {initialFilters.category && (
            <span className="inline-flex items-center gap-1.5 border border-neutral-900 bg-white px-2.5 py-1 font-mono text-[10px] text-neutral-900">
              Danh mục: {selectedCategoryName || initialFilters.category}
              <button
                type="button"
                onClick={() => handleClearSingle('category')}
                className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                aria-label="Xóa bộ lọc danh mục"
              >
                ✕
              </button>
            </span>
          )}

          {initialFilters.brand && (
            <span className="inline-flex items-center gap-1.5 border border-neutral-900 bg-white px-2.5 py-1 font-mono text-[10px] text-neutral-900">
              Thương hiệu: {selectedBrandName || initialFilters.brand}
              <button
                type="button"
                onClick={() => handleClearSingle('brand')}
                className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                aria-label="Xóa bộ lọc thương hiệu"
              >
                ✕
              </button>
            </span>
          )}

          {initialFilters.condition && (
            <span className="inline-flex items-center gap-1.5 border border-neutral-900 bg-white px-2.5 py-1 font-mono text-[10px] text-neutral-900">
              Tình trạng: {selectedConditionName || initialFilters.condition}
              <button
                type="button"
                onClick={() => handleClearSingle('condition')}
                className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                aria-label="Xóa bộ lọc tình trạng"
              >
                ✕
              </button>
            </span>
          )}

          {initialFilters.lifecycle && (
            <span data-testid="lifecycle-filter-chip" className="inline-flex items-center gap-1.5 border border-neutral-900 bg-white px-2.5 py-1 font-mono text-[10px] text-neutral-900">
              Hành trình: {selectedLifecycleName || initialFilters.lifecycle}
              <button
                type="button"
                onClick={() => handleClearSingle('lifecycle')}
                className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                aria-label="Xóa bộ lọc hành trình sản phẩm"
              >
                ✕
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="font-mono text-[10px] uppercase tracking-wider text-red-800 hover:text-red-500 underline ml-2 cursor-pointer"
          >
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
};
