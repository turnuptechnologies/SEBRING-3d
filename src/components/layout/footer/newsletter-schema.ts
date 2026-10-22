import { z } from "zod"

/** Optional topics a subscriber can opt into. Map these to ESP segments / tags. */
export const NEWSLETTER_INTERESTS = [
  { value: "cars", label: "Slot cars" },
  { value: "parts", label: "Parts & upgrades" },
  { value: "track", label: "Track & sets" },
  { value: "preorders", label: "Pre-orders" },
] as const

export type NewsletterInterest = (typeof NEWSLETTER_INTERESTS)[number]["value"]

const interestValues = NEWSLETTER_INTERESTS.map((i) => i.value) as [NewsletterInterest, ...NewsletterInterest[]]

/** Shared by the footer form (client validation) and the server action (authoritative). */
export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("That doesn’t look like a complete email address.")),
  interests: z.array(z.enum(interestValues)).max(interestValues.length),
  /** Honeypot — hidden from people, irresistible to bots. Checked before validation. */
  botcheck: z.string().optional(),
})

export type NewsletterInput = z.input<typeof newsletterSchema>
export type NewsletterValues = z.output<typeof newsletterSchema>

export interface NewsletterSignupData {
  email: string
  /** "existing" when the address was already on the list. */
  status: "subscribed" | "existing"
  interests: NewsletterInterest[]
}
