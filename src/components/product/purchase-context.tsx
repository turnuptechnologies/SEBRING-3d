"use client"

import { useLenis } from "lenis/react"
import { useRouter } from "next/navigation"
import { createContext, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { stockState, type StockState } from "@/components/product/product-facts"
import type { Product } from "@/lib/catalog/types"
import { useCart, type AddResult } from "@/lib/commerce/cart-store"
import { maxQtyFor } from "@/lib/commerce/pricing"

export type DetailsTab = "overview" | "specs" | "fitment" | "shipping"
export const DETAILS_TABS: { value: DetailsTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "specs", label: "Specs" },
  { value: "fitment", label: "Fitment" },
  { value: "shipping", label: "Shipping & returns" },
]

interface PurchaseContextValue {
  product: Product
  stock: StockState
  max: number
  qty: number
  setQty: (qty: number) => void
  /** True for ~2s after a successful add — drives the "Added" button state. */
  justAdded: boolean
  addToCart: () => AddResult
  buyNow: () => void
  /** Polite live-region message for assistive tech. */
  announcement: string
  /** The main CTA block (watched by the sticky buy bar). */
  ctaEl: HTMLElement | null
  registerCta: (el: HTMLElement | null) => void
  tab: DetailsTab
  setTab: (tab: DetailsTab) => void
  registerDetails: (el: HTMLElement | null) => void
  /** Switch the details tab and scroll it into view. */
  showDetails: (tab: DetailsTab) => void
  /** Scroll to the main CTA (sold-out → the notify form) and focus it. */
  focusCta: () => void
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null)

export function usePurchase() {
  const ctx = use(PurchaseContext)
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>")
  return ctx
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function PurchaseProvider({ product, children }: { product: Product; children: ReactNode }) {
  const add = useCart((s) => s.add)
  const router = useRouter()
  const lenis = useLenis()

  const stock = stockState(product)
  const max = maxQtyFor(product)
  const [qty, setQtyState] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [ctaEl, registerCta] = useState<HTMLElement | null>(null)
  const [detailsEl, registerDetails] = useState<HTMLElement | null>(null)
  const [tab, setTab] = useState<DetailsTab>("overview")
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Activity hides this page instead of unmounting it: drop transient feedback.
  useLayoutEffect(
    () => () => {
      setJustAdded(false)
      setAnnouncement("")
    },
    []
  )

  const setQty = (next: number) => setQtyState(Math.min(Math.max(1, Math.round(next) || 1), Math.max(1, max)))

  // Lenis is only mounted when motion is allowed; otherwise fall back to native scrolling (targets carry scroll-margin).
  const scrollToEl = (el: HTMLElement, offset = -104) => {
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 })
    else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })
  }

  const addToCart = () => {
    const result = add(product.slug, qty, { open: true })
    if (result.ok) {
      setJustAdded(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setJustAdded(false), 2000)
      setAnnouncement(`Added ${qty} × ${product.name} to your cart.`)
      if (result.capped) toast.info(`You now have ${result.qty} in your cart — the most we can ship of this one.`)
    } else if (result.reason === "max") {
      toast.info("You already have the maximum we can ship of this item in your cart.")
    } else if (result.reason === "sold-out") {
      toast.error("Sorry — that one just sold out.")
    } else {
      toast.error("We couldn’t add that item. Refresh the page and try again.")
    }
    return result
  }

  const buyNow = () => {
    const result = add(product.slug, qty, { open: false })
    if (result.ok || result.reason === "max") {
      setAnnouncement("Taking you to checkout.")
      router.push("/checkout")
    } else {
      toast.error(result.reason === "sold-out" ? "Sorry — that one just sold out." : "We couldn’t add that item. Refresh the page and try again.")
    }
  }

  const showDetails = (next: DetailsTab) => {
    setTab(next)
    if (detailsEl) scrollToEl(detailsEl, -88)
  }

  const focusCta = () => {
    if (!ctaEl) return
    scrollToEl(ctaEl, -140)
    const target = ctaEl.querySelector<HTMLElement>("input[type=email], button")
    window.setTimeout(() => target?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 700)
  }

  const value: PurchaseContextValue = {
    product,
    stock,
    max,
    qty,
    setQty,
    justAdded,
    addToCart,
    buyNow,
    announcement,
    ctaEl,
    registerCta,
    tab,
    setTab,
    registerDetails,
    showDetails,
    focusCta,
  }

  return (
    <PurchaseContext value={value}>
      {children}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </PurchaseContext>
  )
}
