"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ArrowRight, ShoppingBag, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dialog as SheetPrimitive } from "radix-ui"
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react"

import { removeWithUndo } from "@/components/cart/cart-actions"
import { CartEmptyState } from "@/components/cart/cart-empty"
import { CartLineItem } from "@/components/cart/cart-line"
import { useCartView } from "@/components/cart/cart-rows"
import { CartUpsell } from "@/components/cart/cart-upsell"
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter"
import { OrderTotals } from "@/components/cart/order-totals"
import { PromoField } from "@/components/cart/promo-field"
import { EASE_OUT_EXPO } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Sheet } from "@/components/ui/sheet"
import { useCart, useCartCount } from "@/lib/commerce/cart-store"
import { indexLabel, pluralize } from "@/lib/format"
import { commerce } from "@/lib/site"

interface Flash {
  slug: string
  /** Bumps on every add, so re-adding the same item replays the highlight. */
  n: number
}

/**
 * Highlights whatever was just added. Subscribed for the shell's lifetime, so
 * the add that opens the drawer is caught too; cleared when the drawer closes.
 */
function useAddFlash() {
  const [flash, setFlash] = useState<Flash | null>(null)
  useEffect(
    () =>
      useCart.subscribe((s, prev) => {
        if (prev.isOpen && !s.isOpen) return setFlash(null)
        const slug = s.lastAdded
        if (!slug) return
        const now = s.lines.find((l) => l.slug === slug)?.qty ?? 0
        const before = prev.lines.find((l) => l.slug === slug)?.qty ?? 0
        if (now > before) setFlash((f) => ({ slug, n: (f?.n ?? 0) + 1 }))
      }),
    []
  )
  return flash
}

/** Closes the drawer when the route changes (back/forward, or any link). */
function CloseOnNavigate() {
  const pathname = usePathname()
  const last = useRef(pathname)
  useEffect(() => {
    if (last.current === pathname) return
    last.current = pathname
    useCart.getState().close()
  }, [pathname])
  return null
}

/** Global slide-in cart — mounted once by SiteShell, driven by useCart().isOpen. */
export function CartSheet() {
  const isOpen = useCart((s) => s.isOpen)
  const setOpen = useCart((s) => s.setOpen)
  const flash = useAddFlash()
  const closeRef = useRef<HTMLButtonElement>(null)

  // The shell can be hidden by <Activity>; never return to a drawer left open.
  useLayoutEffect(() => {
    return () => useCart.getState().setOpen(false)
  }, [])

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <Suspense fallback={null}>
        <CloseOnNavigate />
      </Suspense>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-carbon-950/70 backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-open:duration-500 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-300" />
        <SheetPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            closeRef.current?.focus({ preventScroll: true })
          }}
          className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col border-l border-hairline bg-carbon-900 shadow-[-40px_0_80px_-20px_rgb(0_0_0/0.75)] outline-none ease-out-expo data-open:animate-in data-open:slide-in-from-right data-open:duration-500 data-closed:animate-out data-closed:slide-out-to-right data-closed:duration-300 sm:w-[27.5rem] lg:w-[29rem]"
        >
          <CartDrawerBody flash={flash} closeRef={closeRef} />
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </Sheet>
  )
}

function CartDrawerBody({ flash, closeRef }: { flash: Flash | null; closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const { ready, rows, totals, unavailable } = useCartView()
  const count = useCartCount()
  const close = useCart((s) => s.close)
  const scrollRef = useRef<HTMLDivElement>(null)
  const openedWith = useRef(flash)

  // Opened by an add: bring that line into view (adds made inside the drawer don't scroll).
  useEffect(() => {
    const slug = openedWith.current?.slug
    if (!slug) return
    scrollRef.current?.querySelector(`[data-line="${CSS.escape(slug)}"]`)?.scrollIntoView({ block: "nearest" })
  }, [])

  const empty = ready && rows.length === 0

  return (
    <>
      <header className="relative flex h-16 shrink-0 items-center justify-between gap-4 border-b border-hairline pr-3 pl-5 sm:h-[4.5rem] sm:pl-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-volt/60 via-volt/10 to-transparent" />
        <div className="flex min-w-0 items-baseline gap-3">
          <ShoppingBag className="size-4 shrink-0 self-center text-volt" aria-hidden="true" />
          <SheetPrimitive.Title className="font-wide text-lg leading-none font-black tracking-[-0.02em] uppercase">Your cart</SheetPrimitive.Title>
          {ready && (
            <span className="label-mono text-[0.625rem] text-muted-foreground tabular">
              <span aria-hidden="true">{indexLabel(count)} · </span>
              {pluralize(count, "item")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Kbd className="hidden h-6 rounded-[3px] border border-hairline bg-transparent px-1.5 font-mono text-[0.625rem] tracking-[0.1em] pointer-fine:inline-flex">ESC</Kbd>
          <SheetPrimitive.Close asChild>
            <Button ref={closeRef} variant="ghost" size="icon" className="rounded-full" aria-label="Close cart">
              <X className="size-5" />
            </Button>
          </SheetPrimitive.Close>
        </div>
      </header>
      <SheetPrimitive.Description className="sr-only">Review your items, change quantities, add a promo code and check out.</SheetPrimitive.Description>

      {!ready ? (
        <DrawerSkeleton />
      ) : empty ? (
        <div data-lenis-prevent className="flex flex-1 flex-col justify-center overflow-y-auto overscroll-contain">
          <CartEmptyState variant="drawer" onNavigate={close} />
        </div>
      ) : (
        <>
          <div className="shrink-0 border-b border-hairline bg-carbon-850/50 px-5 py-4 sm:px-6">
            <FreeShippingMeter totals={totals} />
          </div>

          <div ref={scrollRef} data-lenis-prevent className="relative flex-1 overflow-y-auto overscroll-contain">
            {unavailable.length > 0 && (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-sm border border-signal/30 bg-signal/[0.06] p-3 text-xs leading-snug text-ivory-200 sm:mx-6" role="status">
                <AlertTriangle className="mt-px size-4 shrink-0 text-signal" aria-hidden="true" />
                <p className="flex-1">
                  {unavailable.length === 1 ? "One item sold out" : `${unavailable.length} items sold out`} since you added {unavailable.length === 1 ? "it" : "them"}.
                  <button type="button" onClick={() => unavailable.forEach((r) => removeWithUndo(r.slug))} className="ml-1 font-semibold text-foreground underline underline-offset-2">
                    Remove
                  </button>
                </p>
              </div>
            )}

            <ul className="divide-y divide-hairline px-5 sm:px-6" aria-label="Items in your cart">
              <AnimatePresence initial={false}>
                {rows.map((row) => (
                  <motion.li
                    key={row.slug}
                    layout="position"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.3, ease: EASE_OUT_EXPO } }}
                    transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
                  >
                    <CartLineItem row={row} flash={flash?.slug === row.slug ? flash.n : undefined} onNavigate={close} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <CartUpsell variant="drawer" onNavigate={close} className="mt-2 border-t border-hairline px-5 pt-6 pb-8 sm:px-6" />
          </div>

          <footer className="shrink-0 border-t border-hairline bg-carbon-850/90 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6">
            <PromoField collapsible />
            <OrderTotals totals={totals} variant="drawer" className="mt-3 border-t border-hairline pt-4" />
            <p className="mt-2 text-xs text-muted-foreground">Shipping and tax are calculated at checkout.</p>
            <div className="mt-4 grid gap-2.5">
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout" onNavigate={close}>
                  Checkout
                  <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/cart" onNavigate={close}>
                  View cart
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-center font-mono text-[0.5625rem] tracking-[0.2em] text-muted-foreground/80 uppercase">
              {commerce.returnWindowDays}-day returns · Tracked shipping · Same-day dispatch
            </p>
          </footer>
        </>
      )}
    </>
  )
}

function DrawerSkeleton() {
  return (
    <div className="flex-1 space-y-6 px-5 py-6 sm:px-6" aria-hidden="true">
      <div className="h-3 w-2/3 rounded-sm bg-muted skeleton-shimmer" />
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="aspect-[4/3] w-[5.75rem] rounded-md bg-muted skeleton-shimmer" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-2.5 w-1/3 rounded-sm bg-muted" />
            <div className="h-3.5 w-4/5 rounded-sm bg-muted" />
            <div className="h-3 w-1/4 rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
