"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Bell, Check, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useLayoutEffect, useState, type FocusEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { LiveryChip } from "@/components/home/hero/overlay/livery-chip"
import { Price } from "@/components/site/price"
import { productHref } from "@/components/site/product-card"
import { ProductImage } from "@/components/site/product-image"
import { Button } from "@/components/ui/button"
import { brandName, isInStock, isLowStock, isPreorder, primaryImage } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useCart } from "@/lib/commerce/cart-store"
import { formatScales, indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

interface NowOnTrackProps {
  cars: Product[]
  /** Index of the car the scene is showing. */
  active: number
  /** Extra control shown at the end of the header row (small screens). */
  control?: ReactNode
  className?: string
}

/**
 * Glass HUD card bound to the hero scene: the car on track right now, with a
 * one-click purchase. While the shopper points at or focuses the card it holds
 * on that car, so "Buy now" never changes under the cursor.
 */
export function NowOnTrack({ cars, active, control, className }: NowOnTrackProps) {
  const [held, setHeld] = useState<number | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const add = useCart((s) => s.add)

  // Hidden by <Activity>: drop the hold so the card follows the scene again on return.
  useLayoutEffect(() => () => setHeld(null), [])

  if (!cars.length) return null
  const index = (held ?? active) % cars.length
  const car = cars[index]
  const hold = () => setHeld((h) => h ?? index)
  const release = () => setHeld(null)
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) release()
  }

  const onBuy = () => {
    const result = add(car.slug, 1, { open: true })
    if (result.ok) {
      setAdded(car.slug)
      window.setTimeout(() => setAdded((s) => (s === car.slug ? null : s)), 1800)
    } else if (result.reason === "max") {
      toast.info("You already have the maximum we can ship of this car.")
    } else {
      toast.error("Sorry — that one just sold out.")
    }
  }

  const href = productHref(car)
  const inStock = isInStock(car)
  const justAdded = added === car.slug
  const preorder = isPreorder(car)
  const image = primaryImage(car)
  const buyLabel = `${preorder ? "Pre-order" : "Buy"} ${car.name} now`

  return (
    <aside
      aria-label="Now on track"
      onPointerEnter={(e) => e.pointerType === "mouse" && hold()}
      onPointerLeave={(e) => e.pointerType === "mouse" && release()}
      onFocus={hold}
      onBlur={onBlur}
      className={cn(
        "pointer-events-auto relative isolate overflow-hidden rounded-lg border border-white/12 bg-carbon-900/55 text-ivory-100 shadow-lift backdrop-blur-xl backdrop-saturate-150",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-3 max-sm:py-2 max-sm:pr-2 max-sm:pl-3">
        <p className="flex items-center gap-2 label-mono text-ivory-100">
          <span className="relative flex size-1.5" aria-hidden="true">
            <span className="absolute inset-0 animate-live rounded-full bg-volt" />
            <span className="relative size-1.5 rounded-full bg-volt" />
          </span>
          Now on track
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" aria-hidden="true">
            {cars.map((c, i) => (
              <span key={c.slug} className={cn("h-[3px] rounded-full transition-all duration-500 ease-out-expo", i === index ? "w-5 bg-volt" : "w-2 bg-white/22")} />
            ))}
          </span>
          <span className="label-mono text-smoke-400 tabular">
            <span className="sr-only">Car </span>
            {indexLabel(index + 1)}/{indexLabel(cars.length)}
          </span>
          {control}
        </div>
      </div>

      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={car.slug}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT_EXPO } }}
            exit={{ opacity: 0, x: -14, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
            className="w-full"
          >
            <div className="flex gap-4 p-4 max-sm:items-center max-sm:gap-3 max-sm:p-3">
              <Link
                href={href}
                tabIndex={-1}
                aria-hidden="true"
                className="group/thumb relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-md bg-carbon-800 ring-1 ring-white/10 max-sm:w-[4.5rem]"
              >
                {image ? (
                  <div className="absolute inset-[4%] transition-transform duration-500 ease-out-expo group-hover/thumb:scale-105">
                    <ProductImage product={car} sizes="112px" />
                  </div>
                ) : car.art.kind === "car" ? (
                  <LiveryChip livery={car.art.livery} className="transition-transform duration-700 ease-out-expo group-hover/thumb:scale-105" />
                ) : null}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate label-mono text-smoke-400 max-sm:text-[0.625rem]">
                  {brandName(car.brand)} · {formatScales(car.scales)}
                </p>
                <Link
                  href={href}
                  className="mt-1.5 line-clamp-2 min-h-[2.5em] font-semiwide text-[0.9375rem] leading-[1.25] font-semibold tracking-[-0.01em] text-balance decoration-volt/60 underline-offset-4 outline-none hover:underline focus-visible:underline max-sm:mt-1 max-sm:min-h-0 max-sm:line-clamp-1 max-sm:text-[0.8125rem]"
                >
                  {car.name}
                </Link>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 max-sm:pt-1">
                  <Price price={car.price} compareAt={car.compareAtPrice} size="md" className="max-sm:[&>span:first-child]:text-base" />
                  <StockNote product={car} />
                </div>
              </div>

              {/* Small screens: one compact row with the purchase button inline. */}
              <div className="shrink-0 sm:hidden">
                {inStock ? (
                  <Button size="sm" onClick={onBuy} className="h-11 px-3.5" aria-label={buyLabel}>
                    {justAdded ? <Check /> : <ShoppingBag />}
                    {justAdded ? "Added" : preorder ? "Pre-order" : "Buy"}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild className="h-11 border-white/20 px-3.5 text-ivory-100">
                    <Link href={`${href}#notify`} aria-label={`Notify me when ${car.name} is back`}>
                      <Bell />
                      Notify
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-4 max-sm:hidden">
              {inStock ? (
                <Button size="sm" onClick={onBuy} className="flex-1" aria-label={buyLabel}>
                  {justAdded ? <Check /> : <ShoppingBag />}
                  {justAdded ? "Added to cart" : preorder ? "Pre-order" : "Buy now"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild className="flex-1 border-white/20 text-ivory-100">
                  <Link href={`${href}#notify`} aria-label={`Notify me when ${car.name} is back`}>
                    <Bell />
                    Notify me
                  </Link>
                </Button>
              )}
              <Button size="sm" variant="glass" asChild>
                <Link href={href} aria-label={`View ${car.name}`}>
                  View car
                  <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  )
}

function StockNote({ product }: { product: Product }) {
  if (!isInStock(product)) return <span className="label-mono text-smoke-400">Sold out</span>
  if (isPreorder(product)) return <span className="label-mono text-volt">Pre-order</span>
  if (isLowStock(product))
    return (
      <span className="flex items-center gap-1.5 label-mono text-caution">
        <span className="size-1 rounded-full bg-caution" aria-hidden="true" />
        Only {product.stock} left
      </span>
    )
  return (
    <span className="flex items-center gap-1.5 label-mono text-smoke-400">
      <span className="size-1 rounded-full bg-go" aria-hidden="true" />
      In stock
    </span>
  )
}
