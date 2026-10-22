"use server"

import { newsletterSchema, type NewsletterInput, type NewsletterSignupData } from "@/components/layout/footer/newsletter-schema"
import { fieldErrorsFrom, type ActionResult } from "@/lib/forms"

/**
 * Simulated audience for this server process. It only exists so the flow
 * behaves like the real thing (duplicates are recognised) — it is not storage.
 */
const simulatedAudience = new Set<string>()

/**
 * "Get new-arrival emails" signup used by the site footer.
 *
 * TODO(newsletter): replace the simulation with the store's email platform:
 *   - Klaviyo: POST https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs
 *     (header `Authorization: Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`,
 *     list id in KLAVIYO_LIST_ID, interests as profile properties), or
 *   - Mailchimp: PUT /3.0/lists/{MAILCHIMP_LIST_ID}/members/{md5(lowercased email)}
 *     with `status_if_new: "pending"` (double opt-in) and `interests` as tags.
 *   Treat the platform's "already a member" response as `status: "existing"`,
 *   keep API keys server-only, and add rate limiting (per IP) before launch.
 */
export async function newsletterSignup(input: NewsletterInput): Promise<ActionResult<NewsletterSignupData>> {
  // Honeypot filled → almost certainly a bot. Report success so it learns nothing, and drop it.
  if (typeof input?.botcheck === "string" && input.botcheck.trim() !== "") {
    return { ok: true, message: "Thanks — you’re on the list.", data: { email: "", status: "subscribed", interests: [] } }
  }

  const parsed = newsletterSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Please check your email address.", fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const { email, interests } = parsed.data

  // Simulated network round-trip to the email platform.
  await new Promise((resolve) => setTimeout(resolve, 700))

  if (simulatedAudience.has(email)) {
    return { ok: true, message: "You’re already on the list.", data: { email, status: "existing", interests } }
  }
  simulatedAudience.add(email)
  return { ok: true, message: "You’re on the list.", data: { email, status: "subscribed", interests } }
}
