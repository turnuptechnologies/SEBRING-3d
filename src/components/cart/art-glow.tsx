import type { Product } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

/** A product's signature colour: the car's livery base, or the part's main colour. */
export const artColor = (p: Product) => (p.art.kind === "car" ? p.art.livery.base : p.art.color)

/**
 * Soft studio bounce light in the product's own colour, placed behind its
 * render (or placeholder) so small thumbnails read at a glance.
 */
export function ArtGlow({ product, className, strength = 22 }: { product: Product; className?: string; strength?: number }) {
  const color = artColor(product)
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ backgroundImage: `radial-gradient(58% 52% at 50% 62%, color-mix(in oklab, ${color} ${strength}%, transparent), transparent 74%)` }}
    />
  )
}
