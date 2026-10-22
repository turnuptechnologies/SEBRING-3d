"use client"

import { useEffect } from "react"

import { useStoresReady } from "@/components/cart/use-stores-ready"
import { getProduct } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useCart, useCartTotals } from "@/lib/commerce/cart-store"
import { maxQtyFor, type PricedLine, type Totals } from "@/lib/commerce/pricing"

export interface CartRow {
  slug: string
  /** Quantity stored in the cart (may exceed `max` if stock dropped since it was added). */
  qty: number
  product: Product
  /** Highest quantity this line can be set to (stock and per-line cap). 0 = sold out. */
  max: number
  /** Present when the line counts toward totals. */
  priced?: PricedLine
  /** Sold out since it was added — excluded from totals until removed. */
  unavailable: boolean
}

export interface CartView {
  /** False until the persisted cart has loaded — render skeletons, never the empty state. */
  ready: boolean
  rows: CartRow[]
  totals: Totals
  unavailable: CartRow[]
}

/**
 * The cart joined with the catalog: one row per stored line, priced by
 * `computeTotals`. Lines whose product left the catalog are dropped.
 */
export function useCartView(): CartView {
  const ready = useStoresReady()
  const lines = useCart((s) => s.lines)
  const remove = useCart((s) => s.remove)
  const totals = useCartTotals()

  const rows: CartRow[] = []
  for (const line of lines) {
    const product = getProduct(line.slug)
    if (!product) continue
    const max = maxQtyFor(product)
    rows.push({
      slug: line.slug,
      qty: line.qty,
      product,
      max,
      priced: totals.lines.find((p) => p.product.slug === line.slug),
      unavailable: max <= 0,
    })
  }

  const missingKey = totals.missing.join(",")
  useEffect(() => {
    if (!ready || !missingKey) return
    for (const slug of missingKey.split(",")) remove(slug)
  }, [ready, missingKey, remove])

  return { ready, rows, totals, unavailable: rows.filter((r) => r.unavailable) }
}
