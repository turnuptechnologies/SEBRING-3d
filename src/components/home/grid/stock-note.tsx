import { isInStock, isLowStock, isPreorder } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

/** The fixed stock vocabulary: In stock · Only N left · Pre-order · Sold out. */
export function StockNote({ product, className }: { product: Product; className?: string }) {
  const base = cn("inline-flex items-center gap-2 label-mono", className)
  if (!isInStock(product)) return <span className={cn(base, "text-smoke-400")}>Sold out</span>
  if (isPreorder(product))
    return (
      <span className={cn(base, "text-volt light:text-carbon-900")}>
        <Dot className="bg-volt" />
        Pre-order
      </span>
    )
  if (isLowStock(product))
    return (
      <span className={cn(base, "text-caution")}>
        <Dot className="bg-caution" pulse />
        Only {product.stock} left
      </span>
    )
  return (
    <span className={cn(base, "text-smoke-400")}>
      <Dot className="bg-go" pulse />
      In stock
    </span>
  )
}

function Dot({ className, pulse = false }: { className: string; pulse?: boolean }) {
  return (
    <span className="relative flex size-1.5" aria-hidden="true">
      {pulse && <span className={cn("absolute inset-0 animate-live rounded-full opacity-60", className)} />}
      <span className={cn("relative size-1.5 rounded-full", className)} />
    </span>
  )
}
