'use client';

import { useEffect, useRef, useState } from 'react';

interface ListingImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/** Listing photo that degrades to a labelled placeholder when missing or broken. */
export const ListingImage = ({ src, alt, className = '' }: ListingImageProps) => {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Images that 404 before hydration never fire onError — catch them on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-neutral-100 border border-neutral-200 ${className}`}>
        <div className="text-center p-2">
          <svg className="w-8 h-8 mx-auto text-neutral-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
            Không có ảnh
          </span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      ref={imgRef} 
      src={src} 
      alt={alt || 'Tin đăng StyleHub'}
      className={className} 
      onError={() => setFailed(true)} 
      loading="lazy"
      decoding="async"
    />
  );
};
