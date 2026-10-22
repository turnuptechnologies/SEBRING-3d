import { getProduct } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { commerce, type ShippingMethod } from "@/lib/site"

/**
 * Single source of truth for money. The cart drawer, cart page, checkout and
 * the server-side order action all call `computeTotals`, so the numbers a
 * shopper sees are exactly the numbers the order is placed with.
 */

export interface CartLineInput {
  slug: string
  qty: number
}

export interface PricedLine {
  product: Product
  qty: number
  unitPrice: number
  lineTotal: number
  /** Quantity was reduced to what is in stock / allowed per line. */
  adjusted: boolean
}

export type PromoDefinition = (typeof commerce.promoCodes)[keyof typeof commerce.promoCodes]

export interface AppliedPromo {
  code: string
  label: string
  type: PromoDefinition["type"]
}

export interface Totals {
  lines: PricedLine[]
  itemCount: number
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  shippingMethod: ShippingMethod
  freeShippingThreshold: number
  /** How much more to spend for free standard shipping (0 when qualified). */
  freeShippingRemaining: number
  qualifiesForFreeShipping: boolean
  promo: AppliedPromo | null
  promoError: string | null
  /** Slugs that no longer exist in the catalog and were dropped. */
  missing: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function maxQtyFor(product: Product) {
  return Math.max(0, Math.min(product.stock, commerce.maxQtyPerLine))
}

export function normalizePromoCode(code: string | null | undefined) {
  return (code ?? "").trim().toUpperCase().replace(/\s+/g, "")
}

/** Validates a promo code against a subtotal. Returns the promo or a human error. */
export function resolvePromo(code: string | null | undefined, subtotal: number): { promo: AppliedPromo | null; error: string | null } {
  const normalized = normalizePromoCode(code)
  if (!normalized) return { promo: null, error: null }
  const def = (commerce.promoCodes as Record<string, PromoDefinition>)[normalized]
  if (!def) return { promo: null, error: "That code isn’t valid. Check the spelling and try again." }
  if ("minSubtotal" in def && subtotal < def.minSubtotal) {
    return { promo: null, error: `${normalized} needs a subtotal of $${def.minSubtotal} or more.` }
  }
  return { promo: { code: normalized, label: def.label, type: def.type }, error: null }
}

export function computeTotals(
  input: readonly CartLineInput[],
  opts: { shippingMethod?: ShippingMethod; promoCode?: string | null } = {}
): Totals {
  const shippingMethod = opts.shippingMethod ?? "standard"
  const missing: string[] = []
  const lines: PricedLine[] = []

  for (const line of input) {
    const product = getProduct(line.slug)
    if (!product) {
      missing.push(line.slug)
      continue
    }
    const allowed = maxQtyFor(product)
    const qty = Math.min(Math.max(0, Math.floor(line.qty)), allowed)
    if (qty <= 0) continue
    lines.push({ product, qty, unitPrice: product.price, lineTotal: round2(product.price * qty), adjusted: qty !== line.qty })
  }

  const itemCount = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = round2(lines.reduce((n, l) => n + l.lineTotal, 0))

  const { promo, error: promoError } = resolvePromo(opts.promoCode, subtotal)
  let discount = 0
  if (promo) {
    const def = (commerce.promoCodes as Record<string, PromoDefinition>)[promo.code]
    if (def.type === "percent") discount = round2((subtotal * def.value) / 100)
    if (def.type === "fixed") discount = Math.min(def.value, subtotal)
  }
  const discounted = Math.max(0, subtotal - discount)

  const threshold = commerce.freeShippingThreshold
  const qualifiesForFreeShipping = discounted >= threshold || promo?.type === "free-shipping"
  let shipping = 0
  if (itemCount > 0) {
    if (shippingMethod === "pickup") shipping = 0
    else if (shippingMethod === "express") shipping = commerce.shippingRates.express.price
    else shipping = qualifiesForFreeShipping ? 0 : commerce.shippingRates.standard.price
  }

  const tax = round2(discounted * commerce.taxRate)
  const total = round2(discounted + shipping + tax)

  return {
    lines,
    itemCount,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    shippingMethod,
    freeShippingThreshold: threshold,
    freeShippingRemaining: qualifiesForFreeShipping ? 0 : round2(Math.max(0, threshold - discounted)),
    qualifiesForFreeShipping,
    promo,
    promoError,
    missing,
  }
}
