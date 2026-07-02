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
      <div className="flex h-full w-full items-center justify-center bg-neutral-100">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
          No photos yet
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={imgRef} src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
};
