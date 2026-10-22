import { z } from "zod"

import { ZIP_PATTERN } from "@/app/(site)/checkout/schema"

/*
 * DEMO MODE card handling. Everything here runs in the browser only: the
 * values are validated locally and are never included in the order request.
 */

export type CardBrand = "Visa" | "Mastercard" | "Amex" | "Discover" | "Card"

export const digitsOnly = (value: string) => value.replace(/\D/g, "")

export function cardBrand(value: string): CardBrand | null {
  const d = digitsOnly(value)
  if (!d) return null
  if (d.startsWith("4")) return "Visa"
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return "Mastercard"
  if (/^3[47]/.test(d)) return "Amex"
  if (/^(6011|65|64[4-9]|622)/.test(d)) return "Discover"
  return "Card"
}

/** Luhn mod-10 checksum. */
export function luhn(digits: string) {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48
    if (double) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    double = !double
  }
  return digits.length > 0 && sum % 10 === 0
}

/** 4242 4242 4242 4242 · Amex 3782 822463 10005 */
export function formatCardNumber(value: string) {
  const d = digitsOnly(value).slice(0, 19)
  if (cardBrand(d) === "Amex") return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(" ")
  return d.replace(/(\d{4})(?=\d)/g, "$1 ")
}

/** "4" → "04", "1229" → "12 / 29". The separator only appears with the third digit, so backspace never fights it. */
export function formatExpiry(value: string) {
  let d = digitsOnly(value).slice(0, 4)
  if (d.length === 1 && d > "1") d = `0${d}`
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d
}

export const cvcLength = (brand: CardBrand | null) => (brand === "Amex" ? 4 : 3)

function expiryError(value: string): string | null {
  const d = digitsOnly(value)
  if (d.length !== 4) return "Enter the expiry date as MM / YY."
  const month = Number(d.slice(0, 2))
  const year = 2000 + Number(d.slice(2))
  if (month < 1 || month > 12) return "Check the month — it should be 01 to 12."
  const now = new Date()
  if (new Date(year, month, 1) <= now) return "This card has expired."
  if (year > now.getFullYear() + 20) return "Check the year on your card."
  return null
}

export const paymentSchema = z
  .object({
    cardNumber: z.string(),
    cardName: z.string().trim().max(80),
    expiry: z.string(),
    cvc: z.string(),
    billingSame: z.boolean(),
    billingZip: z.string().trim().max(10),
  })
  .superRefine((v, ctx) => {
    const issue = (path: keyof typeof v, message: string) => ctx.addIssue({ code: "custom", path: [path], message })
    const number = digitsOnly(v.cardNumber)
    const brand = cardBrand(number)
    if (!number) issue("cardNumber", "Enter your card number.")
    else if (number.length < (brand === "Amex" ? 15 : 13) || !luhn(number)) issue("cardNumber", "That card number isn’t valid — check the digits.")
    if (!v.cardName) issue("cardName", "Enter the name shown on the card.")
    const expiry = expiryError(v.expiry)
    if (expiry) issue("expiry", expiry)
    const need = cvcLength(brand)
    if (digitsOnly(v.cvc).length !== need) issue("cvc", `Enter the ${need}-digit code on the ${brand === "Amex" ? "front" : "back"} of the card.`)
    if (!v.billingSame && !ZIP_PATTERN.test(v.billingZip)) issue("billingZip", "Enter the 5-digit ZIP for this card.")
  })

export type PaymentInput = z.input<typeof paymentSchema>
export type PaymentValues = z.output<typeof paymentSchema>

/** The only payment detail kept after checkout (for the confirmation page). */
export function paymentSummary(values: PaymentInput) {
  const number = digitsOnly(values.cardNumber)
  return { brand: cardBrand(number) ?? "Card", last4: number.slice(-4) }
}
