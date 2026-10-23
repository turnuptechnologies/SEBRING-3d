"use server"

import { z } from "zod"

import { TOPICS } from "@/lib/contact-topics"
import { fieldErrorsFrom, type ActionResult } from "@/lib/forms"

const schema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  email: z.string().trim().pipe(z.email({ error: "Enter a valid email." })),
  phone: z.string().trim().max(24).optional(),
  topic: z.enum(TOPICS),
  product: z.string().trim().max(160).optional(),
  car: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, { error: "Tell us a little more (10+ characters)." }).max(4000),
  website: z.string().max(0).optional(), // honeypot
})

export type ContactInput = z.input<typeof schema>

/** Contact / fit-check request (SAMPLE — connect to email or a help desk before launch). */
export async function sendContact(input: ContactInput): Promise<ActionResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) }
  if (parsed.data.website) return { ok: true, message: "Thanks!" }
  const first = parsed.data.name.split(" ")[0]
  return { ok: true, message: `Thanks ${first} — the crew will reply to ${parsed.data.email} within one business day.` }
}
