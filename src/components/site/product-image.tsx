import Image from "next/image"

import { primaryImage, productImages } from "@/lib/catalog"
import type { Product, ProductView } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

interface ProductImageProps {
  product: Product
  view?: ProductView
  /** next/image `sizes` — required for good srcsets. */
  sizes: string
  /** Above-the-fold images: eager + high fetch priority. */
  eager?: boolean
  className?: string
}

/**
 * A product render (transparent WebP from the 3D studio) filling its
 * positioned parent. Falls back to a branded silhouette until renders exist.
 */
export function ProductImage({ product, view, sizes, eager = false, className }: ProductImageProps) {
  const img = view ? productImages(product).find((i) => i.view === view) ?? primaryImage(product) : primaryImage(product)
  if (!img) return <ProductPlaceholder product={product} className={className} />
  return (
    <Image
      src={img.src}
      alt={img.alt}
      fill
      sizes={sizes}
      quality={80}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      className={cn("object-contain", className)}
      draggable={false}
    />
  )
}

/** Branded placeholder: a technical outline of a slot car or a part. */
export function ProductPlaceholder({ product, className }: { product: Product; className?: string }) {
  const isCarArt = product.art.kind === "car"
  return (
    <div className={cn("absolute inset-0 grid place-items-center", className)} role="img" aria-label={product.name}>
      <svg viewBox="0 0 200 120" className="w-[62%] text-foreground/18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isCarArt ? (
          <>
            <path d="M14 82c0-8 4-13 12-15l26-6c8-2 14-6 20-11l8-7c5-4 11-6 17-6h20c9 0 17 4 22 11l7 10c3 4 7 6 12 7l10 2c8 1 12 7 12 14v7" />
            <path d="M14 82h22m30 0h62m30 0h20" />
            <circle cx="51" cy="82" r="14" />
            <circle cx="143" cy="82" r="14" />
            <path d="M84 44h30l10 13H74z" opacity=".6" />
          </>
        ) : (
          <>
            <circle cx="100" cy="60" r="34" />
            <circle cx="100" cy="60" r="14" />
            <path d="M100 18v-8M100 110v-8M58 60h-8M150 60h-8" />
          </>
        )}
      </svg>
      <span className="absolute bottom-3 left-3 label-mono text-foreground/30">Render pending</span>
    </div>
  )
}
