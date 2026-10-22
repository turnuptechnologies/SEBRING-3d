"use server"

import { notifySchema } from "@/components/product/notify-schema"
import { stockState } from "@/components/product/product-facts"
import { getProduct } from "@/lib/catalog"
import { fieldErrorsFrom, type ActionResult } from "@/lib/forms"

const maskEmail = (email: string) => email.replace(/^(.).*?(@.*)$/, "$1•••$2")

/**
 * "Notify me" for sold-out products.
 * SAMPLE: there is no email provider yet — the request is validated and logged.
 * Wire this to the store's ESP / back-in-stock list before launch.
 */
export async function requestRestockAlert(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = notifySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted field and try again.", fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const { email, slug, website } = parsed.data
  // Bots fill the hidden field: answer like a success so they learn nothing.
  if (website) return { ok: true, message: "You’re on the list.", data: { email } }

  const product = getProduct(slug)
  if (!product) return { ok: false, message: "We couldn’t find that product. Refresh the page and try again." }
  if (stockState(product).kind !== "sold-out") {
    return { ok: false, message: "Good news — it’s available right now. Refresh the page to add it to your cart." }
  }

  console.info(`[restock-alert] ${product.sku} ${product.slug} ← ${maskEmail(email)}`)
  return { ok: true, message: `You’re on the list. We’ll email ${email} the moment it’s back.`, data: { email } }
}
