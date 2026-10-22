"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Heart, Search, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { useHeader } from "@/components/layout/header/header-context"
import { useCart, useCartCount, useHydrated } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Phones: icon over a mono micro-label (every control keeps a text label). Desktop: inline. */
const ACTION = cn(
  "group/act relative flex h-12 min-w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-sm px-1 text-ivory-100 outline-none select-none",
  "transition-[background-color,color,transform] duration-300 hover:bg-white/[0.05] active:scale-[0.96] focus-visible:outline-offset-[-2px]",
  "lg:h-11 lg:flex-row lg:gap-2 lg:px-3"
)
const MICRO = "font-mono text-[0.5rem] leading-none tracking-[0.16em] text-smoke-400 uppercase lg:hidden"
const INLINE = "hidden font-semiwide text-[0.6875rem] font-bold tracking-[0.11em] text-ivory-100/85 uppercase lg:inline"

export function HeaderActions() {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 md:ml-0 lg:gap-1.5">
      <SearchTrigger />
      <GarageLink />
      <CartButton />
      <MenuTrigger />
    </div>
  )
}

function SearchTrigger() {
  const { mobileSearchOpen, setMobileSearchOpen } = useHeader()
  return (
    <button type="button" aria-haspopup="dialog" aria-expanded={mobileSearchOpen} onClick={() => setMobileSearchOpen(true)} className={cn(ACTION, "md:hidden")}>
      <Search aria-hidden="true" className="size-[1.125rem]" />
      <span className={MICRO}>Search</span>
    </button>
  )
}

function GarageLink() {
  const hydrated = useHydrated()
  const saved = useGarage((s) => s.saved.length)
  const n = hydrated ? saved : 0
  return (
    <Link href="/garage" aria-label={n ? `My Garage, ${pluralize(n, "saved item")}` : "My Garage"} className={ACTION}>
      <span className="relative">
        <Heart aria-hidden="true" className={cn("size-[1.125rem] transition-[color,fill] duration-300", n > 0 && "fill-signal text-signal")} />
        {hydrated && <CountBubble n={n} className="lg:hidden" />}
      </span>
      <span className={MICRO}>Garage</span>
      <span className={INLINE}>
        Garage
        {n > 0 && <span className="ml-1.5 font-mono font-medium tracking-normal text-smoke-400 tabular">{n}</span>}
      </span>
    </Link>
  )
}

function CartButton() {
  const hydrated = useHydrated()
  const count = useCartCount()
  const openCart = useCart((s) => s.open)
  const isOpen = useCart((s) => s.isOpen)
  const [announcement, setAnnouncement] = useState("")
  const n = hydrated ? count : 0

  // Announce changes the shopper makes — not the cart loading from storage.
  useEffect(
    () =>
      useCart.subscribe((state, prev) => {
        if (!useCart.persist.hasHydrated()) return
        const next = state.lines.reduce((sum, l) => sum + l.qty, 0)
        const before = prev.lines.reduce((sum, l) => sum + l.qty, 0)
        if (next !== before) setAnnouncement(next ? `Cart updated, ${pluralize(next, "item")}` : "Cart is empty")
      }),
    []
  )

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Cart, ${pluralize(n, "item")}`}
        className={cn(ACTION, "lg:border lg:border-white/12 lg:bg-white/[0.03] lg:pr-3.5 lg:hover:border-white/30 lg:hover:bg-white/[0.06]")}
      >
        <span className="relative">
          {hydrated ? (
            // Mounted only once the stored cart is known, so loading it never "bumps".
            <AnimatePresence initial={false}>
              <motion.span
                key={n}
                initial={{ y: -4, rotate: -12 }}
                animate={{ y: 0, rotate: 0, transition: { type: "spring", stiffness: 520, damping: 14 } }}
                className="block"
              >
                <ShoppingBag aria-hidden="true" className="size-[1.125rem]" />
              </motion.span>
            </AnimatePresence>
          ) : (
            <ShoppingBag aria-hidden="true" className="size-[1.125rem]" />
          )}
          {hydrated && <CountBubble n={n} className="lg:hidden" />}
          {hydrated && <Pulse n={n} />}
        </span>
        <span className={MICRO}>Cart</span>
        <span className={cn(INLINE, "items-baseline gap-1 lg:inline-flex")}>
          Cart
          <span className="inline-flex items-baseline font-mono font-medium tracking-normal text-smoke-400">
            (
            <span className="relative inline-flex h-[1.2em] min-w-[1ch] justify-center overflow-hidden tabular">
              {hydrated && (
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={n}
                    initial={{ y: "110%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1, transition: { duration: 0.55, ease: EASE_OUT_EXPO } }}
                    exit={{ y: "-110%", opacity: 0, transition: { duration: 0.3, ease: EASE_OUT_EXPO } }}
                    className={cn("block", n > 0 && "text-volt")}
                  >
                    {n}
                  </motion.span>
                </AnimatePresence>
              )}
            </span>
            )
          </span>
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}

/** A volt ring that ripples out of the bag whenever the count changes. */
function Pulse({ n }: { n: number }) {
  return (
    <AnimatePresence initial={false}>
      <motion.span
        key={n}
        aria-hidden="true"
        initial={{ scale: 0.6, opacity: 0.85 }}
        animate={{ scale: 2.4, opacity: 0, transition: { duration: 0.9, ease: EASE_OUT_EXPO } }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
        className="pointer-events-none absolute inset-0 m-auto size-5 rounded-full border border-volt"
      />
    </AnimatePresence>
  )
}

function CountBubble({ n, className }: { n: number; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {n > 0 && (
        <motion.span
          key={n}
          aria-hidden="true"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 600, damping: 22 } }}
          exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
          className={cn(
            "absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-volt px-1 font-mono text-[0.5625rem] leading-none font-semibold text-carbon-900 tabular",
            className
          )}
        >
          {n > 99 ? "99+" : n}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function MenuTrigger() {
  const { mobileMenuOpen, setMobileMenuOpen } = useHeader()
  return (
    <button type="button" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className={cn(ACTION, "lg:hidden")}>
      <span aria-hidden="true" className="flex h-[1.125rem] w-[1.125rem] flex-col items-end justify-center gap-[5px]">
        <span className="h-[1.5px] w-full rounded-full bg-current" />
        <span className="h-[1.5px] w-3/5 rounded-full bg-current transition-[width] duration-500 ease-out-expo group-hover/act:w-full" />
      </span>
      <span className={MICRO}>Menu</span>
    </button>
  )
}
