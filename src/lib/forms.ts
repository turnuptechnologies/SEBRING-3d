import type { FieldErrors, FieldValues, Resolver } from "react-hook-form"
import type { z } from "zod"

/**
 * Minimal zod → react-hook-form resolver (avoids the @hookform/resolvers peer
 * conflict). Supports nested paths: errors land at `a.b.c`.
 */
export function zodResolver<TInput extends FieldValues, TOutput extends FieldValues>(schema: z.ZodType<TOutput, TInput>): Resolver<TInput, unknown, TOutput> {
  return async (values) => {
    const result = await schema.safeParseAsync(values)
    if (result.success) return { values: result.data, errors: {} }

    const errors: Record<string, unknown> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.map(String)
      if (!path.length) continue
      let node = errors
      for (let i = 0; i < path.length - 1; i++) {
        node[path[i]] = (node[path[i]] as Record<string, unknown>) ?? {}
        node = node[path[i]] as Record<string, unknown>
      }
      const leaf = path[path.length - 1]
      if (!node[leaf]) node[leaf] = { type: issue.code, message: issue.message }
    }
    return { values: {}, errors: errors as FieldErrors<TInput> }
  }
}

/** Server-action friendly result shape shared by every form on the site. */
export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}
