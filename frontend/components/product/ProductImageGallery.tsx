'use client';

import { useState } from 'react';
import { ProductImage } from '../../types/product';
import { ListingImage } from '../marketplace/ListingImage';

interface ProductImageGalleryProps {
  images: ProductImage[];
  fallbackUrl?: string | null;
  alt: string;
}

export const ProductImageGallery = ({ images, fallbackUrl, alt }: ProductImageGalleryProps) => {
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const urls = sorted.map((img) => img.image_url).filter(Boolean);
  if (urls.length === 0 && fallbackUrl) urls.push(fallbackUrl);

  const [selected, setSelected] = useState(0);
  const current = urls[selected] ?? urls[0] ?? null;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden border border-neutral-200 bg-neutral-100">
        <ListingImage src={current} alt={alt} className="h-full w-full object-cover" />
      </div>
      {urls.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`View photo ${i + 1} of ${urls.length}`}
              aria-current={i === selected}
              className={`aspect-square overflow-hidden border bg-neutral-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                i === selected ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <ListingImage src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
