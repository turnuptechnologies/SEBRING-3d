"use client"

import { useEffect, useState } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { getProduct } from "@/lib/catalog"
import { maxQtyFor, normalizePromoCode, resolvePromo, computeTotals } from "@/lib/commerce/pricing"
import type { ShippingMethod } from "@/lib/site"

export interface CartLine {
  slug: string
  qty: number
}

export type AddResult =
  | { ok: true; qty: number; capped: boolean }
  | { ok: false; reason: "unknown" | "sold-out" | "max" }

interface CartState {
  lines: CartLine[]
  promoCode: string | null
  shippingMethod: ShippingMethod
  /** Drawer visibility — not persisted. */
  isOpen: boolean
  /** Slug of the most recently added item (drives the "added" highlight). */
  lastAdded: string | null

  add: (slug: string, qty?: number, opts?: { open?: boolean }) => AddResult
  setQty: (slug: string, qty: number) => void
  remove: (slug: string) => void
  clear: () => void
  applyPromo: (code: string) => { ok: boolean; message: string }
  removePromo: () => void
  setShippingMethod: (method: ShippingMethod) => void
  open: () => void
  close: () => void
  setOpen: (open: boolean) => void
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promoCode: null,
      shippingMethod: "standard",
      isOpen: false,
      lastAdded: null,

      add: (slug, qty = 1, opts = {}) => {
        const product = getProduct(slug)
        if (!product) return { ok: false, reason: "unknown" }
        const max = maxQtyFor(product)
        if (max <= 0) return { ok: false, reason: "sold-out" }
        const existing = get().lines.find((l) => l.slug === slug)
        const current = existing?.qty ?? 0
        if (current >= max) {
          if (opts.open) set({ isOpen: true })
          return { ok: false, reason: "max" }
        }
        const next = Math.min(current + Math.max(1, Math.floor(qty)), max)
        set((s) => ({
          lines: existing ? s.lines.map((l) => (l.slug === slug ? { ...l, qty: next } : l)) : [...s.lines, { slug, qty: next }],
          lastAdded: slug,
          isOpen: opts.open ?? s.isOpen,
        }))
        return { ok: true, qty: next, capped: next < current + qty }
      },

      setQty: (slug, qty) => {
        const product = getProduct(slug)
        if (!product) return get().remove(slug)
        const clamped = Math.min(Math.max(0, Math.floor(qty)), maxQtyFor(product))
        if (clamped <= 0) return get().remove(slug)
        set((s) => ({ lines: s.lines.map((l) => (l.slug === slug ? { ...l, qty: clamped } : l)) }))
      },

      remove: (slug) => set((s) => ({ lines: s.lines.filter((l) => l.slug !== slug), lastAdded: s.lastAdded === slug ? null : s.lastAdded })),

      clear: () => set({ lines: [], promoCode: null, lastAdded: null }),

      applyPromo: (code) => {
        const normalized = normalizePromoCode(code)
        const { subtotal } = computeTotals(get().lines)
        const { promo, error } = resolvePromo(normalized, subtotal)
        if (!promo) return { ok: false, message: error ?? "Enter a code." }
        set({ promoCode: promo.code })
        return { ok: true, message: `${promo.code} applied — ${promo.label}.` }
      },

      removePromo: () => set({ promoCode: null }),
      setShippingMethod: (shippingMethod) => set({ shippingMethod }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: "sebring-cart-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, promoCode: s.promoCode, shippingMethod: s.shippingMethod }),
      // Hydrated manually after mount (see useStoresHydration) so SSR markup matches the first client render.
      skipHydration: true,
    }
  )
)

/** Totals for the current cart — re-computed from the catalog every render. */
export function useCartTotals(overrides: { shippingMethod?: ShippingMethod } = {}) {
  const lines = useCart((s) => s.lines)
  const promoCode = useCart((s) => s.promoCode)
  const shippingMethod = useCart((s) => s.shippingMethod)
  return computeTotals(lines, { promoCode, shippingMethod: overrides.shippingMethod ?? shippingMethod })
}

export const useCartCount = () => useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0))

/* ---------------------------------------------------------------------------
 * Hydration — all persisted stores rehydrate together once, after mount.
 * ------------------------------------------------------------------------- */

let hydrated = false
const listeners = new Set<() => void>()

export function hydrateStores(rehydrators: Array<() => Promise<void> | void>) {
  if (hydrated) return
  Promise.all(rehydrators.map((r) => r())).then(() => {
    hydrated = true
    listeners.forEach((l) => l())
  })
}

/** False during SSR and the first client render; true once localStorage state is loaded. */
export function useHydrated() {
  const [ready, setReady] = useState(hydrated)
  useEffect(() => {
    if (hydrated) {
      setReady(true)
      return
    }
    const l = () => setReady(true)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  return ready
}
