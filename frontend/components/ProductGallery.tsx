"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/products";

export default function ProductGallery({
  images,
  productName,
  thumbnail,
}: {
  images: ProductImage[];
  productName: string;
  thumbnail: string;
}) {
  const gallery = images.length
    ? images
    : [{ id: "thumbnail", url: thumbnail, alt_text: productName, sort_order: 0, is_primary: true }];
  const [activeId, setActiveId] = useState(gallery[0].id);
  const active = gallery.find((image) => image.id === activeId) ?? gallery[0];

  return (
    <div className="product-gallery">
      <div className="gallery-main">
        <Image
          alt={active.alt_text ?? productName}
          className="gallery-main-image"
          fill
          priority
          sizes="(max-width: 850px) 100vw, 55vw"
          src={active.url}
        />
      </div>
      <div className="gallery-thumbnails" aria-label="Product images">
        {gallery.map((image) => (
          <button
            className={image.id === active.id ? "gallery-thumb active" : "gallery-thumb"}
            key={image.id}
            onClick={() => setActiveId(image.id)}
            type="button"
          >
            <Image alt="" fill sizes="90px" src={image.url} />
          </button>
        ))}
      </div>
    </div>
  );
}
