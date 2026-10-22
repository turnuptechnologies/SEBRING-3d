import { z } from "zod"

import { isStateCode } from "@/app/(site)/checkout/us-states"
import { commerce, type ShippingMethod } from "@/lib/site"

/**
 * Checkout contracts shared by the client forms and the placeOrder action.
 * Card details are deliberately absent: they are validated in the browser
 * (see payment.ts) and never leave it.
 */

const METHODS = Object.keys(commerce.shippingRates) as [ShippingMethod, ...ShippingMethod[]]
export const ZIP_PATTERN = /^\d{5}(-\d{4})?$/

export const contactSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Enter your email address." })
    .max(254, { error: "That email is too long." })
    .pipe(z.email({ error: "That email doesn’t look right — check for typos." })),
  newsletter: z.boolean(),
})

/** Flat on purpose: every rule runs in one pass, so all errors show at once. */
export const deliverySchema = z
  .object({
    method: z.enum(METHODS),
    firstName: z.string().trim().max(60),
    lastName: z.string().trim().max(60),
    address1: z.string().trim().max(120),
    address2: z.string().trim().max(120),
    city: z.string().trim().max(80),
    state: z.string().trim().max(2),
    zip: z.string().trim().max(10),
    phone: z.string().trim().max(24),
  })
  .superRefine((v, ctx) => {
    const issue = (path: keyof typeof v, message: string) => ctx.addIssue({ code: "custom", path: [path], message })
    if (!v.firstName) issue("firstName", "Enter your first name.")
    if (!v.lastName) issue("lastName", "Enter your last name.")
    if (v.method !== "pickup") {
      if (!v.address1) issue("address1", "Enter your street address.")
      if (!v.city) issue("city", "Enter your city.")
      if (!v.state) issue("state", "Choose your state.")
      else if (!isStateCode(v.state)) issue("state", "Choose a US state.")
      if (!v.zip) issue("zip", "Enter your ZIP code.")
      else if (!ZIP_PATTERN.test(v.zip)) issue("zip", "Use a 5-digit ZIP, like 33870.")
    }
    if (v.phone) {
      const digits = v.phone.replace(/\D/g, "")
      if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) issue("phone", "Enter a 10-digit US number, or leave it blank.")
    }
  })

export const orderLineSchema = z.strictObject({
  slug: z.string().min(1).max(160),
  qty: z.number().int().min(1).max(commerce.maxQtyPerLine),
})

/** What the client sends to placeOrder — references and choices only, never prices or card data. */
export const orderRequestSchema = z.strictObject({
  contact: contactSchema,
  delivery: deliverySchema,
  promoCode: z.string().trim().max(32).nullable(),
  lines: z.array(orderLineSchema).min(1, { error: "Your cart is empty." }).max(60),
  /** The total the shopper saw — used only to refuse an order whose price changed, never to charge. */
  expectedTotal: z.number().nonnegative().finite(),
})

export type ContactInput = z.input<typeof contactSchema>
export type ContactValues = z.output<typeof contactSchema>
export type DeliveryInput = z.input<typeof deliverySchema>
export type DeliveryValues = z.output<typeof deliverySchema>
export type OrderRequest = z.input<typeof orderRequestSchema>

export interface OrderLineSnapshot {
  slug: string
  sku: string
  name: string
  brand: string
  scales: string
  qty: number
  unitPrice: number
  lineTotal: number
  preorderShips?: string
}

export interface OrderConfirmation {
  orderId: string
  /** ISO timestamp from the server. */
  placedAt: string
  contact: ContactValues
  shipping: {
    method: ShippingMethod
    label: string
    eta: string
    carrier: string
    name: string
    phone?: string
    address: { line1: string; line2?: string; city: string; state: string; zip: string } | null
  }
  totals: {
    lines: OrderLineSnapshot[]
    itemCount: number
    subtotal: number
    discount: number
    shipping: number
    tax: number
    total: number
    currency: string
    promo: { code: string; label: string } | null
  }
}

/** What the browser keeps in sessionStorage for the confirmation page. */
export interface StoredOrder extends OrderConfirmation {
  /** Card brand and last four only — added client-side, never sent to the server. */
  payment: { brand: string; last4: string } | null
}
