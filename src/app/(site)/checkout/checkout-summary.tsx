"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ChevronDown, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useId, useLayoutEffect, useState } from "react"

import { ArtGlow } from "@/components/cart/art-glow"
import type { CartView } from "@/components/cart/cart-rows"
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter"
import { AnimatedAmount, OrderTotals } from "@/components/cart/order-totals"
import { PromoField } from "@/components/cart/promo-field"
import { EASE_OUT_EXPO } from "@/components/motion"
import { ProductImage } from "@/components/site/product-image"
import { brandName } from "@/lib/catalog"
import { formatPrice, formatScales, pluralize } from "@/lib/format"
import { commerce } from "@/lib/site"
import { cn } from "@/lib/utils"

interface SummaryProps {
  view: CartView
  /** Per-line messages from the server (stock changed). */
  lineErrors?: Record<string, string>
}

function SummaryBody({ view, lineErrors = {} }: SummaryProps) {
  const { rows, totals } = view
  const showMeter = totals.shippingMethod === "standard" && !totals.qualifiesForFreeShipping
  return (
    <>
      <ul className="divide-y divide-hairline" aria-label="Items in your order">
        {rows.map((row) => {
          const error = lineErrors[`lines.${row.slug}`]
          return (
            <li key={row.slug} className="flex gap-3.5 py-4 first:pt-0">
              <div className="relative shrink-0">
                <div className="relative aspect-[4/3] w-[4.5rem] overflow-hidden rounded-md border border-hairline bg-carbon-800 bg-spotlight [&_[role=img]>span]:hidden">
                  <ArtGlow product={row.product} />
                  <div className="absolute inset-[6%]">
                    <ProductImage product={row.product} sizes="72px" />
                  </div>
                </div>
                <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-ivory-100 px-1.5 font-mono text-[0.625rem] font-semibold text-carbon-900 tabular">
                  <span className="sr-only">Quantity </span>
                  {Math.min(row.qty, Math.max(row.max, 1))}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate label-mono text-[0.5625rem] text-muted-foreground">
                  {brandName(row.product.brand)} · {formatScales(row.product.scales)}
                </p>
                <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug font-medium">{row.product.name}</p>
                {row.unavailable && <p className="mt-1 text-xs font-medium text-signal">Sold out — not included</p>}
                {row.product.preorder && !row.unavailable && <p className="mt-1 text-xs text-volt">Pre-order · ships {row.product.preorder.ships}</p>}
                {error && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-caution" role="status">
                    <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                )}
              </div>
              <p className={cn("shrink-0 text-[0.8125rem] font-semibold tabular", row.unavailable && "text-muted-foreground line-through")}>
                {formatPrice(row.priced?.lineTotal ?? row.product.price * row.qty)}
              </p>
            </li>
          )
        })}
      </ul>

      <PromoField className="mt-5 border-t border-hairline pt-5" />
      {showMeter && <FreeShippingMeter totals={totals} className="mt-5 rounded-md border border-hairline bg-carbon-850/60 p-4" />}
      <OrderTotals totals={totals} className="mt-5 border-t border-hairline pt-5" />
    </>
  )
}

/** Desktop: sticky card beside the steps. */
export function CheckoutSummary({ view, lineErrors }: SummaryProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="relative overflow-hidden rounded-lg border border-hairline bg-card p-6 shadow-card">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/50 to-transparent" />
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="font-semiwide text-sm font-bold tracking-[0.12em] uppercase">
          Order summary
        </h2>
        <Link href="/cart" className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
          Edit cart
        </Link>
      </div>
      <SummaryBody view={view} lineErrors={lineErrors} />
      <p className="mt-6 border-t border-hairline pt-4 text-center font-mono text-[0.5625rem] leading-relaxed tracking-[0.18em] text-muted-foreground/80 uppercase">
        {commerce.returnWindowDays}-day returns · Tracked shipping · {commerce.paymentMethods.slice(0, 4).join(" · ")}
      </p>
    </section>
  )
}

/** Mobile: a bar with the total that folds the full summary open. */
export function CheckoutSummaryMobile({ view, lineErrors }: SummaryProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useLayoutEffect(() => {
    return () => setOpen(false)
  }, [])

  return (
    <section aria-label="Order summary" className="overflow-hidden rounded-lg border border-hairline bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
      >
        <ShoppingBag className="size-4 shrink-0 text-volt" aria-hidden="true" />
        <span className="flex-1 text-sm font-medium">
          {open ? "Hide" : "Show"} order summary
          <span className="ml-2 text-xs text-muted-foreground">{pluralize(view.totals.itemCount, "item")}</span>
        </span>
        <AnimatedAmount value={view.totals.total} className="text-base" />
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out-expo", open && "rotate-180")} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <div className="border-t border-hairline px-4 pt-5 pb-5">
              <SummaryBody view={view} lineErrors={lineErrors} />
              <Link href="/cart" className="mt-4 inline-flex min-h-11 items-center text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Edit cart
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
