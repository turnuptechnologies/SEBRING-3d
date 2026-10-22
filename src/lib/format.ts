import type { Scale } from "@/lib/catalog/types"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const usdRound = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

/** $94.99 — or $95 with `round`. */
export function formatPrice(amount: number, opts: { round?: boolean } = {}) {
  return (opts.round ? usdRound : usd).format(amount)
}

/** Whole-number discount percentage, e.g. 17 for $74.99 vs $89.99. */
export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0
  return Math.round(((compareAt - price) / compareAt) * 100)
}

/** "1:32" · "1:32 / 1:24" · "All scales" */
export function formatScales(scales: readonly Scale[]) {
  if (scales.length === 0) return "All scales"
  if (scales.length >= 3) return "Multi-scale"
  return scales.join(" / ")
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "Sep 18, 2026" from an ISO date string — deterministic, no Date.now(). */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)))
}

/** Zero-padded index label used in section eyebrows: 1 → "01". */
export const indexLabel = (n: number) => String(n).padStart(2, "0")
