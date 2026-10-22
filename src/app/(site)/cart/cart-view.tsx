"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ArrowRight, LifeBuoy, RotateCcw, Truck } from "lucide-react"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import { removeWithUndo } from "@/components/cart/cart-actions"
import { CartEmptyState } from "@/components/cart/cart-empty"
import { CartLineItem } from "@/components/cart/cart-line"
import { useCartView } from "@/components/cart/cart-rows"
import { CartUpsell } from "@/components/cart/cart-upsell"
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter"
import { AnimatedAmount, OrderTotals } from "@/components/cart/order-totals"
import { PromoField } from "@/components/cart/promo-field"
import { ShippingOptions } from "@/components/cart/shipping-options"
import { EASE_OUT_EXPO } from "@/components/motion"
import { ArrowLink } from "@/components/site/arrow-link"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { ProductRail } from "@/components/site/product-rail"
import { Eyebrow, SectionHeading } from "@/components/site/section-heading"
import { Button } from "@/components/ui/button"
import { getProducts } from "@/lib/catalog"
import { useCart, useCartCount } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { formatPrice, indexLabel, pluralize } from "@/lib/format"
import { commerce } from "@/lib/site"
import { cn } from "@/lib/utils"

export function CartView() {
  const { ready, rows, totals, unavailable } = useCartView()
  const count = useCartCount()
  const shippingMethod = useCart((s) => s.shippingMethod)
  const setShippingMethod = useCart((s) => s.setShippingMethod)
  const recent = getProducts(useGarage((s) => s.recent))
  const ids = useId()
  const hasItems = ready && rows.length > 0

  const checkoutRef = useRef<HTMLAnchorElement>(null)
  const [summaryVisible, setSummaryVisible] = useState(true)
  useEffect(() => {
    const el = checkoutRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setSummaryVisible(entry.isIntersecting), { rootMargin: "0px 0px -40px 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [hasItems])

  const clearCart = () => {
    const { lines, promoCode, clear } = useCart.getState()
    clear()
    toast("Cart cleared", {
      description: pluralize(lines.reduce((n, l) => n + l.qty, 0), "item") + " removed",
      duration: 7000,
      action: { label: "Undo", onClick: () => useCart.setState({ lines, promoCode }) },
    })
  }

  return (
    <div className="relative overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-hairline-grid opacity-70 [--grid-size:72px] mask-fade-b" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-56 left-1/2 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-volt/[0.045] blur-3xl" />

      <div className="relative container-site pt-8 pb-24 md:pt-10 md:pb-32">
        <Breadcrumbs items={[{ label: "Cart" }]} />

        <header className="mt-10 grid gap-8 md:mt-14 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <Eyebrow>{hasItems ? "Review & check out" : "Cart"}</Eyebrow>
            <h1 className="mt-5 font-wide text-headline font-black uppercase">
              Your cart
              {hasItems && (
                <sup className="ml-3 align-[0.9em] font-mono text-sm font-medium tracking-[0.12em] text-volt sm:text-base">
                  <span className="sr-only">, </span>
                  {indexLabel(count)}
                  <span className="sr-only"> {count === 1 ? "item" : "items"}</span>
                </sup>
              )}
            </h1>
          </div>
          {hasItems && (
            <div className="lg:col-span-5">
              <FreeShippingMeter totals={totals} className="rounded-lg border border-hairline bg-card/80 p-5 backdrop-blur-md" />
            </div>
          )}
        </header>

        {!ready ? (
          <CartPageSkeleton />
        ) : !hasItems ? (
          <>
            <div className="mt-10 rounded-lg border border-dashed border-foreground/12 bg-card/40">
              <CartEmptyState variant="page" />
            </div>
            {recent.length > 0 && (
              <ProductRail
                products={recent}
                label="Recently viewed"
                className="mt-24"
                header={<SectionHeading eyebrow="Pick up where you left off" title="Recently viewed" />}
              />
            )}
          </>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-20 xl:gap-x-16">
            <section aria-labelledby={`${ids}-items`} className="lg:col-span-8 lg:row-start-1">
              <h2 id={`${ids}-items`} className="sr-only">
                Items in your cart
              </h2>
              <div className="hidden grid-cols-[10rem_minmax(0,1fr)_7.5rem_8.5rem_7.5rem] gap-6 border-b border-hairline pb-3 label-mono text-[0.625rem] text-muted-foreground md:grid">
                <span className="col-span-2">Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span className="text-right">Total</span>
              </div>

              {unavailable.length > 0 && (
                <div className="mt-4 flex items-start gap-3 rounded-sm border border-signal/30 bg-signal/[0.06] p-4 text-sm text-ivory-200" role="status">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
                  <p className="flex-1">
                    {unavailable.length === 1 ? "One item" : `${unavailable.length} items`} sold out since you added {unavailable.length === 1 ? "it" : "them"} and won’t be included in your order.{" "}
                    <button type="button" onClick={() => unavailable.forEach((r) => removeWithUndo(r.slug))} className="font-semibold text-foreground underline underline-offset-2">
                      Remove sold-out items
                    </button>
                  </p>
                </div>
              )}

              <ul className="divide-y divide-hairline border-b border-hairline">
                <AnimatePresence initial={false}>
                  {rows.map((row) => (
                    <motion.li
                      key={row.slug}
                      layout="position"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 48, transition: { duration: 0.3, ease: EASE_OUT_EXPO } }}
                      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                    >
                      <CartLineItem row={row} variant="page" />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <ArrowLink href="/collections/all">Continue shopping</ArrowLink>
                <button type="button" onClick={clearCart} className="min-h-11 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-signal hover:underline">
                  Clear cart
                </button>
              </div>
            </section>

            <aside aria-labelledby={`${ids}-summary`} className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
              <div className="space-y-4 lg:sticky lg:top-28">
                <div className="relative overflow-hidden rounded-lg border border-hairline bg-card p-5 shadow-card sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/50 to-transparent" />
                  <h2 id={`${ids}-summary`} className="font-semiwide text-sm font-bold tracking-[0.12em] uppercase">
                    Order summary
                  </h2>

                  <div className="mt-6">
                    <p id={`${ids}-ship`} className="label-mono text-[0.625rem] text-muted-foreground">
                      Delivery estimate
                    </p>
                    <ShippingOptions value={shippingMethod} onChange={setShippingMethod} labelledBy={`${ids}-ship`} className="mt-3" />
                  </div>

                  <PromoField className="mt-6" />

                  <OrderTotals totals={totals} className="mt-6 border-t border-hairline pt-5" />

                  <Button asChild size="lg" className="mt-6 w-full">
                    <Link ref={checkoutRef} href="/checkout">
                      Checkout
                      <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-1" />
                    </Link>
                  </Button>
                  <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">{commerce.processing}</p>
                </div>

                <TrustList />

                <p className="px-1 text-center font-mono text-[0.5625rem] leading-relaxed tracking-[0.18em] text-muted-foreground/80 uppercase">
                  We accept {commerce.paymentMethods.join(" · ")}
                </p>
              </div>
            </aside>

            <CartUpsell variant="page" className="border-t border-hairline pt-14 lg:col-span-8 lg:row-start-2 lg:self-start" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {hasItems && !summaryVisible && (
          <motion.div
            key="mobile-checkout"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-carbon-900/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
          >
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="label-mono text-[0.5625rem] text-muted-foreground">Total · {pluralize(totals.itemCount, "item")}</p>
                <AnimatedAmount value={totals.total} className="mt-1 text-lg" />
              </div>
              <Button asChild className="shrink-0">
                <Link href="/checkout" tabIndex={-1}>
                  Checkout
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrustList() {
  const items = [
    { icon: Truck, title: `Free tracked shipping over ${formatPrice(commerce.freeShippingThreshold, { round: true })}`, body: commerce.processing },
    { icon: RotateCcw, title: `${commerce.returnWindowDays}-day returns`, body: `Changed your mind? Send it back within ${commerce.returnWindowDays} days.`, href: "/shipping-returns" },
    { icon: LifeBuoy, title: "Not sure it fits?", body: "Ask the crew before you buy — we’ll check it against your car.", href: "/contact?topic=fit-check" },
  ]
  return (
    <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-card/50">
      {items.map(({ icon: Icon, title, body, href }) => (
        <li key={title} className="flex gap-3.5 p-4">
          <Icon className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden="true" />
          <div className="min-w-0 text-[0.8125rem] leading-snug">
            <p className="font-medium text-foreground">
              {href ? (
                <Link href={href} className="underline-offset-4 hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </p>
            <p className="mt-0.5 text-muted-foreground">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CartPageSkeleton() {
  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-12" aria-hidden="true">
      <div className="space-y-8 lg:col-span-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("flex gap-6 border-b border-hairline pb-8", i === 2 && "opacity-50")}>
            <div className="aspect-[4/3] w-28 rounded-md bg-muted skeleton-shimmer sm:w-40" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-2.5 w-1/4 rounded-sm bg-muted" />
              <div className="h-4 w-2/3 rounded-sm bg-muted" />
              <div className="h-9 w-28 rounded-sm bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-[28rem] rounded-lg border border-hairline bg-card lg:col-span-4" />
    </div>
  )
}
