"use client"

import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react"
import Link from "next/link"
import { useRef, useState, type UIEvent } from "react"
import { toast } from "sonner"

import { ArtGlow } from "@/components/cart/art-glow"
import { Price } from "@/components/site/price"
import { productHref } from "@/components/site/product-card"
import { ProductImage } from "@/components/site/product-image"
import { Button } from "@/components/ui/button"
import { brandName, compatibleParts, fitsAnyCar, getProduct, isCar, isInStock, isPart, products } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useCart, type CartLine } from "@/lib/commerce/cart-store"
import { maxQtyFor } from "@/lib/commerce/pricing"
import { formatScales } from "@/lib/format"
import { cn } from "@/lib/utils"

/** "Kept" slugs stay in the list after being added here, so a card never vanishes under the pointer. */
export function upsellFor(lines: readonly CartLine[], limit: number, keep: ReadonlySet<string> = new Set()) {
  const inCart = new Set(lines.map((l) => l.slug))
  let car: Product | undefined
  for (let i = lines.length - 1; i >= 0 && !car; i--) {
    const p = getProduct(lines[i].slug)
    if (p && isCar(p)) car = p
  }
  const eligible = (p: Product) => keep.has(p.slug) || (!inCart.has(p.slug) && isInStock(p) && maxQtyFor(p) > 0)
  const fits = car ? compatibleParts(car, 24).filter(eligible) : []
  if (car && fits.length) return { car, items: fits.slice(0, limit) }
  const parts = products.filter((p) => isPart(p) && eligible(p))
  return { car: undefined, items: [...parts.filter((p) => p.isFeatured), ...parts.filter((p) => !p.isFeatured)].slice(0, limit) }
}

const carName = (car: Product) => (car.vehicle ? `${car.vehicle.make} ${car.vehicle.model}` : car.name)

interface CartUpsellProps {
  variant?: "drawer" | "page"
  onNavigate?: () => void
  className?: string
}

export function CartUpsell({ variant = "drawer", onNavigate, className }: CartUpsellProps) {
  const lines = useCart((s) => s.lines)
  const add = useCart((s) => s.add)
  const [addedHere, setAddedHere] = useState<ReadonlySet<string>>(new Set())
  const { car, items } = upsellFor(lines, variant === "drawer" ? 8 : 6, addedHere)
  const scroller = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const inCart = new Set(lines.map((l) => l.slug))

  if (!items.length) return null

  const onAdd = (p: Product) => {
    const result = add(p.slug, 1)
    if (result.ok) {
      setAddedHere((s) => new Set(s).add(p.slug))
      if (variant === "page") toast.success("Added to your cart", { description: p.name })
    } else if (result.reason === "max") {
      toast.info("You already have the most we can ship of this one.")
    } else {
      toast.error("Sorry — that one just sold out.")
    }
  }

  const onScroll = (e: UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  const page = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" })

  const eyebrow = car ? "Fits your car" : "Pit-lane picks"
  const title = car ? `Upgrades for your ${carName(car)}` : "Popular upgrades"
  const headingId = `upsell-${variant}`

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 label-mono text-[0.625rem] text-muted-foreground">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
            {eyebrow}
          </p>
          <h3 id={headingId} className={cn("mt-2.5 font-semiwide font-bold tracking-[-0.01em] text-balance", variant === "drawer" ? "text-[0.9375rem]" : "text-title uppercase font-wide font-black")}>
            {title}
          </h3>
        </div>
        {variant === "drawer" && items.length > 2 && (
          <div className="flex shrink-0 gap-1.5">
            <Button variant="outline" size="icon-sm" className="rounded-full touch:hidden" onClick={() => page(-1)} disabled={edges.start} aria-label="Previous upgrades">
              <ArrowLeft />
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-full touch:hidden" onClick={() => page(1)} disabled={edges.end} aria-label="More upgrades">
              <ArrowRight />
            </Button>
          </div>
        )}
      </div>

      {variant === "drawer" ? (
        <ul
          ref={scroller}
          onScroll={onScroll}
          data-lenis-prevent
          className="-mx-5 mt-4 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6"
        >
          {items.map((p) => (
            <li key={p.slug} className="w-[10.25rem] shrink-0 snap-start">
              <UpsellCard product={p} car={car} added={inCart.has(p.slug)} onAdd={() => onAdd(p)} onNavigate={onNavigate} compact />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {items.map((p) => (
            <li key={p.slug}>
              <UpsellCard product={p} car={car} added={inCart.has(p.slug)} onAdd={() => onAdd(p)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface UpsellCardProps {
  product: Product
  car?: Product
  added: boolean
  onAdd: () => void
  onNavigate?: () => void
  compact?: boolean
}

function UpsellCard({ product, car, added, onAdd, onNavigate, compact = false }: UpsellCardProps) {
  const href = productHref(product)
  const directFit = car ? fitsAnyCar(product, [car.slug]) : false
  return (
    <article className="group/up relative flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-card transition-[border-color,transform] duration-500 ease-out-expo hover:-translate-y-0.5 hover:border-foreground/18">
      <Link href={href} onNavigate={onNavigate} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden bg-spotlight [&_[role=img]>span]:hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-40 [--grid-size:16px] mask-fade-b" />
        <ArtGlow product={product} />
        <div className="absolute inset-[8%] transition-transform duration-700 ease-out-expo group-hover/up:scale-[1.05]">
          <ProductImage product={product} sizes={compact ? "164px" : "(min-width: 1024px) 22vw, 45vw"} />
        </div>
        {directFit && (
          <span className="absolute top-2 left-2 rounded-[3px] bg-carbon-900/80 px-1.5 py-1 label-mono text-[0.5625rem] leading-none text-volt ring-1 ring-volt/25 backdrop-blur-md">Direct fit</span>
        )}
      </Link>
      <div className={cn("flex flex-1 flex-col", compact ? "gap-1 p-3" : "gap-1.5 p-4")}>
        <p className="truncate label-mono text-[0.5625rem] text-muted-foreground">
          {brandName(product.brand)}
          {!compact && ` · ${formatScales(product.scales)}`}
        </p>
        <h4 className={cn("font-semiwide leading-snug font-semibold tracking-[-0.01em]", compact ? "text-[0.8125rem]" : "text-sm sm:text-[0.9375rem]")}>
          <Link href={href} onNavigate={onNavigate} className="line-clamp-2 transition-colors hover:text-volt">
            {product.name}
          </Link>
        </h4>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price price={product.price} compareAt={product.compareAtPrice} size="sm" className={cn(compact && "[&>span:nth-child(2)]:hidden")} />
          {compact ? (
            <button
              type="button"
              onClick={onAdd}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-sm border transition-[background-color,border-color,color] duration-300 touch:size-11",
                added ? "border-volt/50 bg-volt/10 text-volt" : "border-foreground/20 text-foreground hover:border-volt hover:bg-volt hover:text-carbon-900"
              )}
              aria-label={added ? `${product.name} is in your cart — add another` : `Add ${product.name} to cart`}
            >
              {added ? <Check className="size-4" /> : <Plus className="size-4" />}
            </button>
          ) : (
            <Button size="sm" variant={added ? "outline" : "default"} onClick={onAdd} className="shrink-0 touch:h-11" aria-label={added ? `${product.name} is in your cart — add another` : `Add ${product.name} to cart`}>
              {added ? <Check /> : <Plus />}
              {added ? "In cart" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
