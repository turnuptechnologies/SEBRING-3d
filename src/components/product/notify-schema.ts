import { z } from "zod"

/** Back-in-stock alert — validated in the browser and again in the server action. */
export const notifySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Enter your email address." })
    .max(254, { error: "That email is too long." })
    .pipe(z.email({ error: "That email doesn’t look right — check for typos." })),
  slug: z.string().trim().min(1).max(160),
  /** Honeypot — humans never see or fill it. */
  website: z.string().max(200).optional(),
})

export type NotifyInput = z.input<typeof notifySchema>
export type NotifyValues = z.output<typeof notifySchema>
