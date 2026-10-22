import {
  brandHref,
  brandName,
  categoryLabel,
  isLowStock,
  isOnSale,
  listingHref,
  subcategoryHref,
  subcategoryLabel,
} from "@/lib/catalog"
import type { Product, ProductAttributes, ProductView } from "@/lib/catalog/types"
import { maxQtyFor } from "@/lib/commerce/pricing"
import { formatDate } from "@/lib/format"
import { site } from "@/lib/site"

/* ---------------------------------------------------------------------------
 * Stock vocabulary — In stock · Only N left · Pre-order · Sold out
 * ------------------------------------------------------------------------- */

export type StockState =
  | { kind: "in-stock" }
  | { kind: "low"; left: number }
  | { kind: "preorder"; ships: string }
  | { kind: "sold-out" }

export function stockState(p: Product): StockState {
  if (maxQtyFor(p) <= 0) return { kind: "sold-out" }
  if (p.preorder) return { kind: "preorder", ships: p.preorder.ships }
  if (isLowStock(p)) return { kind: "low", left: p.stock }
  return { kind: "in-stock" }
}

export function stockHeadline(s: StockState) {
  switch (s.kind) {
    case "in-stock":
      return "In stock"
    case "low":
      return `Only ${s.left} left`
    case "preorder":
      return "Pre-order"
    case "sold-out":
      return "Sold out"
  }
}

/** schema.org availability for the Offer. */
export function schemaAvailability(s: StockState) {
  switch (s.kind) {
    case "in-stock":
      return "https://schema.org/InStock"
    case "low":
      return "https://schema.org/LimitedAvailability"
    case "preorder":
      return "https://schema.org/PreOrder"
    case "sold-out":
      return "https://schema.org/OutOfStock"
  }
}

export const shipsLabel = (iso: string) => formatDate(iso)

/* ---------------------------------------------------------------------------
 * Image views
 * ------------------------------------------------------------------------- */

export const VIEW_SHORT: Record<ProductView, string> = {
  hero: "Front ¾",
  side: "Side",
  rear: "Rear ¾",
  top: "Top",
  detail: "Detail",
  alt: "Alt angle",
}

export const VIEW_LONG: Record<ProductView, string> = {
  hero: "Three-quarter front",
  side: "Side profile",
  rear: "Three-quarter rear",
  top: "Top view",
  detail: "Close-up detail",
  alt: "Alternate angle",
}

/* ---------------------------------------------------------------------------
 * Chips under the title — scale, build and operation link to filtered listings
 * ------------------------------------------------------------------------- */

export interface StatusBadge {
  label: string
  tone: "volt" | "signal" | "outline"
}

/** New · Sale · Pre-order. The sale percentage lives next to the price, so the chip stays short. */
export function statusBadges(p: Product): StatusBadge[] {
  const out: StatusBadge[] = []
  if (p.isNew) out.push({ label: "New", tone: "volt" })
  if (isOnSale(p)) out.push({ label: "Sale", tone: "signal" })
  if (p.preorder) out.push({ label: "Pre-order", tone: "outline" })
  return out
}

export interface SpecChip {
  label: string
  /** Screen-reader context, e.g. "Shop all 1:32 slot cars". */
  title?: string
  href?: string
}

export function specChips(p: Product): SpecChip[] {
  const base = `/collections/${p.category}`
  const plural = categoryLabel(p.category).toLowerCase()
  const chips: SpecChip[] = p.scales.map((s) => ({
    label: s,
    title: `Shop all ${s} ${plural}`,
    href: listingHref(base, { filters: { scales: [s] } }),
  }))
  const a = p.attributes
  if (a?.build) chips.push({ label: a.build, title: `Shop ${a.build} ${plural}`, href: listingHref(base, { filters: { build: [a.build] } }) })
  if (a?.operation) chips.push({ label: a.operation, title: `Shop ${a.operation} ${plural}`, href: listingHref(base, { filters: { operation: [a.operation] } }) })
  if (a?.motorLayout) chips.push({ label: a.motorLayout })
  if (a?.canType) chips.push({ label: a.canType })
  if (a?.trackSystem) chips.push({ label: a.trackSystem })
  return chips
}

/* ---------------------------------------------------------------------------
 * Spec sheet
 * ------------------------------------------------------------------------- */

export interface SpecRow {
  label: string
  value: string
  href?: string
  mono?: boolean
  /** Livery colour swatches (hex). */
  swatches?: string[]
}

export interface SpecGroup {
  title: string
  rows: SpecRow[]
}

const ATTRIBUTE_LABELS: Record<keyof ProductAttributes, string> = {
  build: "Build",
  operation: "Operation",
  motorLayout: "Motor layout",
  canType: "Can type",
  axle: "Axle",
  gearType: "Gear type",
  trackSystem: "Track system",
  plug: "Connection",
}

const BUILD_LABEL: Record<NonNullable<ProductAttributes["build"]>, string> = {
  RTR: "Ready to run (RTR)",
  Kit: "Kit",
  "White kit": "White kit (unpainted)",
}

const PATTERN_LABEL: Record<string, string> = {
  solid: "Solid",
  "center-stripes": "Centre stripes",
  "side-stripe": "Side stripe",
  split: "Split",
  sash: "Sash",
  chevron: "Chevron",
  hoop: "Hoop",
  fade: "Fade",
}

export function specGroups(p: Product): SpecGroup[] {
  const general: SpecRow[] = [
    { label: "Brand", value: brandName(p.brand), href: brandHref(p.brand) },
    { label: "Category", value: `${categoryLabel(p.category)} / ${subcategoryLabel(p.subcategory)}`, href: subcategoryHref(p.subcategory) },
    { label: p.scales.length > 1 ? "Scales" : "Scale", value: p.scales.join(" / ") || "All scales" },
    { label: "SKU", value: p.sku, mono: true },
  ]
  if (p.mpn) general.push({ label: "Maker part no.", value: p.mpn, mono: true })
  general.push({ label: "Released", value: formatDate(p.releasedAt) })

  const seen = new Set(general.map((r) => r.label.toLowerCase()))
  seen.add("scale")
  seen.add("scales")
  const technical: SpecRow[] = []
  const push = (row: SpecRow) => {
    const key = row.label.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    technical.push(row)
  }
  for (const s of p.specs) push({ label: s.label, value: s.value })

  const a = p.attributes ?? {}
  const v = p.vehicle
  if (!a.build && v) push({ label: "Build", value: v.readyToRun ? BUILD_LABEL.RTR : "Kit" })
  if (!a.operation && v?.digital) push({ label: "Operation", value: "Digital" })
  for (const key of Object.keys(ATTRIBUTE_LABELS) as (keyof ProductAttributes)[]) {
    const value = a[key]
    if (!value) continue
    push({ label: ATTRIBUTE_LABELS[key], value: key === "build" ? BUILD_LABEL[value as keyof typeof BUILD_LABEL] ?? value : value })
  }

  const groups: SpecGroup[] = [{ title: "Product", rows: general }]
  if (technical.length) groups.push({ title: "Technical", rows: technical })

  if (v) {
    const vehicle: SpecRow[] = [
      { label: "Make", value: v.make },
      { label: "Model", value: v.model },
      { label: "Year", value: String(v.year) },
      { label: "Series", value: v.series },
      { label: "Era", value: v.era },
    ]
    if (p.art.kind === "car") {
      const l = p.art.livery
      vehicle.push({ label: "Livery", value: `#${l.number} · ${PATTERN_LABEL[l.pattern] ?? l.pattern}`, swatches: [l.base, l.secondary, l.accent] })
    }
    groups.push({ title: "The car", rows: vehicle })
  }
  return groups
}

/** The four figures racers scan first — shown in the telemetry strip. */
export function keySpecs(p: Product, limit = 4) {
  return p.specs.slice(0, limit)
}

/* ---------------------------------------------------------------------------
 * URLs
 * ------------------------------------------------------------------------- */

export const absoluteUrl = (path: string) => new URL(path, site.url).toString()

/** Same as productHref() — duplicated because that one lives in a client module and can't be called on the server. */
export const productPath = (p: Pick<Product, "slug">) => `/products/${p.slug}`

export const fitCheckHref = (p: Product) => `/contact?topic=fit-check&product=${encodeURIComponent(p.slug)}`

/** "Shop cars this fits" — slot cars from the brands and scales a part fits. */
export const carsThisFitsHref = (p: Product) =>
  p.fits ? listingHref("/collections/slot-cars", { filters: { brands: p.fits.brands, scales: p.fits.scales } }) : "/collections/slot-cars"

/** Every part that fits a given car (the listing's "fits" facet). */
export const partsForCarHref = (p: Product) => listingHref("/collections/parts", { filters: { fitsCars: [p.slug] } })
