"use client"

import { Check, Heart, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ViewTransition, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { HudCorners } from "@/components/site/hud-corners"
import { Price } from "@/components/site/price"
import { ProductImage } from "@/components/site/product-image"
import { Button } from "@/components/ui/button"
import { brandName, isInStock, isLowStock, isOnSale, productImages } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useCart, useHydrated } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { discountPercent, formatScales } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface ProductCardProps {
  product: Product
  /** next/image sizes for the card's media. */
  sizes?: string
  eager?: boolean
  /**
   * Give the image a shared view-transition name so it morphs into the product
   * page. Only enable where each product appears once on the page.
   */
  morph?: boolean
  className?: string
}

export const productHref = (p: Product) => `/products/${p.slug}`

export function ProductCard({ product, sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw", eager = false, morph = false, className }: ProductCardProps) {
  const add = useCart((s) => s.add)
  const hydrated = useHydrated()
  const saved = useGarage((s) => s.saved.includes(product.slug))
  const toggleSaved = useGarage((s) => s.toggleSaved)
  const [justAdded, setJustAdded] = useState(false)
  const router = useRouter()

  const href = productHref(product)
  const inStock = isInStock(product)
  const off = discountPercent(product.price, product.compareAtPrice)
  const hasAlt = productImages(product).length > 1
  const altView = product.art.kind === "car" ? "side" : "alt"

  const onBuy = () => {
    const result = add(product.slug, 1, { open: true })
    if (result.ok) {
      setJustAdded(true)
      window.setTimeout(() => setJustAdded(false), 1600)
    } else if (result.reason === "max") {
      toast.info("You already have the maximum we can ship of this item.")
    } else {
      toast.error("Sorry — that one just sold out.")
    }
  }

  const onSave = () => {
    const nowSaved = toggleSaved(product.slug)
    toast(nowSaved ? "Saved to your garage" : "Removed from your garage", {
      description: product.name,
      action: nowSaved ? { label: "View garage", onClick: () => router.push("/garage") } : undefined,
    })
  }

  const image = (
    <div className="absolute inset-[6%] transition-transform duration-700 ease-out-expo group-hover/card:scale-[1.045]">
      <ProductImage product={product} sizes={sizes} eager={eager} className={cn(hasAlt && "transition-opacity duration-500 pointer-fine:group-hover/card:opacity-0")} />
      {hasAlt && (
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-fine:group-hover/card:opacity-100">
          <ProductImage product={product} view={altView} sizes={sizes} />
        </div>
      )}
    </div>
  )

  return (
    <article
      className={cn(
        "group/card relative isolate flex flex-col overflow-hidden rounded-lg border border-hairline bg-card text-card-foreground",
        "transition-[border-color,box-shadow,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:border-foreground/18 hover:shadow-lift",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-spotlight">
        <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-50 [--grid-size:26px] mask-fade-b" />
        {morph ? (
          <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
            {image}
          </ViewTransition>
        ) : (
          image
        )}
        <HudCorners className="opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />

        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          {!inStock && <Badge tone="muted">Sold out</Badge>}
          {product.isNew && inStock && <Badge tone="volt">New</Badge>}
          {isOnSale(product) && <Badge tone="signal">−{off}%</Badge>}
          {isLowStock(product) && <Badge tone="caution">Only {product.stock} left</Badge>}
        </div>

        <button
          type="button"
          onClick={onSave}
          aria-pressed={hydrated ? saved : false}
          aria-label={saved ? `Remove ${product.name} from your garage` : `Save ${product.name} to your garage`}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 grid size-9 place-items-center rounded-full border border-hairline bg-background/60 backdrop-blur-md transition-all duration-300",
            "hover:border-foreground/30 hover:bg-background/80 focus-visible:outline-offset-1",
            hydrated && saved ? "text-signal" : "text-foreground/70"
          )}
        >
          <Heart className={cn("size-4 transition-transform duration-300", hydrated && saved && "scale-110 fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 label-mono text-muted-foreground">
          <span className="truncate">{brandName(product.brand)}</span>
          <span className="shrink-0">{formatScales(product.scales)}</span>
        </div>

        <h3 className="font-semiwide text-[0.98rem] leading-snug font-semibold tracking-[-0.01em] text-balance">
          <Link href={href} className="line-clamp-2 outline-none after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:underline">
            {product.name}
          </Link>
        </h3>

        {product.fits && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            Fits {product.fits.brands.slice(0, 3).map(brandName).join(", ")}
            {product.fits.brands.length > 3 ? " +" : ""} · {formatScales(product.fits.scales)}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <Price price={product.price} compareAt={product.compareAtPrice} />
          {inStock ? (
            <Button size="sm" onClick={onBuy} className="relative z-10" aria-label={`Buy now: ${product.name}`}>
              {justAdded ? <Check /> : <ShoppingBag />}
              {justAdded ? "Added" : "Buy now"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="relative z-10">
              <Link href={`${href}#notify`}>Notify me</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function Badge({ tone, children }: { tone: "volt" | "signal" | "caution" | "muted"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "label-mono rounded-[3px] px-2 py-1.5 text-[0.625rem] leading-none font-semibold",
        tone === "volt" && "bg-volt text-carbon-900",
        tone === "signal" && "bg-signal text-white",
        tone === "caution" && "bg-carbon-900/80 text-caution backdrop-blur-md ring-1 ring-caution/30",
        tone === "muted" && "bg-carbon-900/80 text-ivory-200 backdrop-blur-md ring-1 ring-white/10"
      )}
    >
      {children}
    </span>
  )
}

/** Grid-sized skeleton that matches ProductCard's footprint. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-hairline bg-card", className)} aria-hidden="true">
      <div className="aspect-[4/3] skeleton-shimmer bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-2.5 w-1/3 rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="flex items-center justify-between pt-3">
          <div className="h-5 w-16 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
