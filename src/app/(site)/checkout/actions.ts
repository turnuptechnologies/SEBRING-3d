"use server"

import { orderRequestSchema, type OrderConfirmation } from "@/app/(site)/checkout/schema"
import { brandName, getProduct } from "@/lib/catalog"
import { computeTotals, maxQtyFor } from "@/lib/commerce/pricing"
import { formatPrice, formatScales } from "@/lib/format"
import { fieldErrorsFrom, type ActionResult } from "@/lib/forms"
import { commerce } from "@/lib/site"

/**
 * Places a (demo) order. The request carries only references — slugs,
 * quantities, choices — so every price, discount, shipping and tax figure is
 * recomputed here from the catalog. No payment is taken and no card data is
 * accepted: the schema is strict, so an unexpected field fails the request.
 */
export async function placeOrder(input: unknown): Promise<ActionResult<OrderConfirmation>> {
  const parsed = orderRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Some of your details are missing or invalid. Check the highlighted steps and try again.", fieldErrors: fieldErrorsFrom(parsed.error) }
  }
  const { contact, delivery, promoCode, lines, expectedTotal } = parsed.data

  const merged = new Map<string, number>()
  for (const line of lines) merged.set(line.slug, (merged.get(line.slug) ?? 0) + line.qty)

  const problems: Record<string, string> = {}
  for (const [slug, qty] of merged) {
    const product = getProduct(slug)
    if (!product) {
      problems[`lines.${slug}`] = "This item is no longer available."
      continue
    }
    const max = maxQtyFor(product)
    if (max <= 0) problems[`lines.${slug}`] = `${product.name} just sold out.`
    else if (qty > max) problems[`lines.${slug}`] = max === 1 ? "Only 1 left — we’ve updated your cart." : `Only ${max} available — we’ve updated your cart.`
  }
  if (Object.keys(problems).length > 0) {
    return { ok: false, message: "Stock changed while you were checking out. We’ve updated your cart — review it and place your order again.", fieldErrors: problems }
  }

  const totals = computeTotals(
    [...merged].map(([slug, qty]) => ({ slug, qty })),
    { shippingMethod: delivery.method, promoCode }
  )
  if (totals.itemCount === 0) return { ok: false, message: "Your cart is empty." }
  if (Math.abs(totals.total - expectedTotal) > 0.009) {
    return { ok: false, message: `Your total is now ${formatPrice(totals.total)}. Check the updated summary, then place your order again.` }
  }

  const rate = commerce.shippingRates[delivery.method]
  const pickup = delivery.method === "pickup"

  return {
    ok: true,
    message: "Order placed.",
    data: {
      orderId: `SB-${Date.now().toString(36).toUpperCase()}`,
      placedAt: new Date().toISOString(),
      contact,
      shipping: {
        method: delivery.method,
        label: rate.label,
        eta: rate.eta,
        carrier: rate.carrier,
        name: `${delivery.firstName} ${delivery.lastName}`,
        phone: delivery.phone || undefined,
        address: pickup
          ? null
          : { line1: delivery.address1, line2: delivery.address2 || undefined, city: delivery.city, state: delivery.state, zip: delivery.zip },
      },
      totals: {
        lines: totals.lines.map((l) => ({
          slug: l.product.slug,
          sku: l.product.sku,
          name: l.product.name,
          brand: brandName(l.product.brand),
          scales: formatScales(l.product.scales),
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          preorderShips: l.product.preorder?.ships,
        })),
        itemCount: totals.itemCount,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        currency: commerce.currency,
        promo: totals.promo ? { code: totals.promo.code, label: totals.promo.label } : null,
      },
    },
  }
}
