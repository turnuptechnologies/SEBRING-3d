"use server"

import { z } from "zod"

import { fieldErrorsFrom, type ActionResult } from "@/lib/forms"
import { events } from "@/lib/raceway"

const schema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  email: z.string().trim().pipe(z.email({ error: "Enter a valid email." })),
  phone: z.string().trim().max(24).optional(),
  rental: z.boolean(),
  notes: z.string().trim().max(500).optional(),
})

export type RegistrationInput = z.input<typeof schema>

/** Registers a racer for an event (SAMPLE — wire to the booking system / email before launch). */
export async function registerForEvent(input: RegistrationInput): Promise<ActionResult<{ eventId: string }>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) }
  const event = events.find((e) => e.id === parsed.data.eventId)
  if (!event) return { ok: false, message: "That event is no longer on the schedule." }
  if (event.spotsLeft <= 0) return { ok: false, message: "That event is full — join another night or ask to be waitlisted." }
  return { ok: true, message: `You’re on the grid for ${event.title}. We’ve emailed the details to ${parsed.data.email}.`, data: { eventId: event.id } }
}
