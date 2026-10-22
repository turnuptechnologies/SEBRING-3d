import {
  brandHref,
  brandName,
  brands,
  categories,
  categoryHref,
  categoryLabel,
  facetCounts,
  filterProducts,
  getProduct,
  matchesFilters,
  products,
  scales,
  sortProducts,
  subcategories,
  subcategoryHref,
  subcategoryLabel,
  tokenize,
  type FacetCounts,
  type ListingState,
} from "@/lib/catalog"
import type {
  Brand,
  BrandSlug,
  CategorySlug,
  Collection,
  Product,
  ProductAttributes,
  ProductFilters,
  Scale,
  SubcategorySlug,
} from "@/lib/catalog/types"
import { formatPrice } from "@/lib/format"

/* ---------------------------------------------------------------------------
 * Listing configuration — what a listing page is and which facets it offers.
 * Plain JSON so a Server Component can hand it to the client listing.
 * ------------------------------------------------------------------------- */

export type FacetKey = Collection["facets"][number]

/**
 * category   — one category (subcategory tiles + brand row)
 * parts      — the parts hub (grouped type tiles, fit finder, parts brands)
 * collection — curated / cross-category sets (category chips)
 * brand      — a brand landing (category chips, brand fixed)
 * search     — site search (query drives membership)
 */
export type ListingKind = "category" | "parts" | "collection" | "brand" | "search"

export interface ListingConfig {
  /** Route the listing lives on — URL state is written here. */
  pathname: string
  kind: ListingKind
  /** Membership filter. Never shown as a removable chip. */
  base: ProductFilters
  facets: FacetKey[]
  /** Human label used in copy: "Slot Cars", "Slot.it", "the catalog". */
  label: string
  category?: CategorySlug
  brand?: BrandSlug
}

export const PAGE_SIZE = 24
const MAX_PAGES = 40

export type Operation = NonNullable<ProductAttributes["operation"]>
export type Build = NonNullable<ProductAttributes["build"]>

export const OPERATION_OPTIONS: { value: Operation; label: string; hint: string }[] = [
  { value: "Analog", label: "Analog", hint: "One car per lane — classic racing" },
  { value: "Digital", label: "Digital", hint: "Lane changing, several cars per lane" },
  { value: "Digital-ready", label: "Digital-ready", hint: "Races analog, takes a digital chip" },
]

export const BUILD_OPTIONS: { value: Build; label: string; hint: string }[] = [
  { value: "RTR", label: "Ready to run", hint: "Out of the box and onto the track" },
  { value: "Kit", label: "Kit", hint: "Assemble it yourself" },
  { value: "White kit", label: "White kit", hint: "Unpainted — your livery, your rules" },
]

export const AVAILABILITY_OPTIONS = [
  { key: "inStock", label: "In stock", hint: "Ships today if ordered by 2 pm ET" },
  { key: "onSale", label: "On sale", hint: "Marked-down pricing" },
  { key: "isNew", label: "New arrivals", hint: "Just landed at Sebring" },
  { key: "preorder", label: "Pre-order", hint: "Reserve before stock lands" },
] as const satisfies readonly { key: keyof ProductFilters; label: string; hint: string }[]

export type AvailabilityKey = (typeof AVAILABILITY_OPTIONS)[number]["key"]

const CATEGORY_SLUGS = new Set<string>(categories.map((c) => c.slug))
const SUBCATEGORY_SLUGS = new Set<string>(subcategories.map((s) => s.slug))
const BRAND_SLUGS = new Set<string>(brands.map((b) => b.slug))
const SCALE_VALUES = new Set<string>(["1:32", "1:24", "1:43", "HO"])
const OPERATION_VALUES = new Set<string>(OPERATION_OPTIONS.map((o) => o.value))
const BUILD_VALUES = new Set<string>(BUILD_OPTIONS.map((o) => o.value))

const only = <T extends string>(list: readonly string[] | undefined, allowed: Set<string>) => {
  const out = [...new Set((list ?? []).filter((v) => allowed.has(v)))] as T[]
  return out.length ? out : undefined
}

const cleanPrice = (v: number | undefined) => (v == null || !Number.isFinite(v) || v < 0 ? undefined : Math.round(v * 100) / 100)

/**
 * Drops unknown values and anything the listing's base already fixes, so a
 * hand-edited URL can never produce phantom chips or impossible states.
 */
export function sanitizeListing(state: ListingState, config: ListingConfig): ListingState {
  const f = state.filters
  const base = config.base
  let priceMin = cleanPrice(f.priceMin)
  let priceMax = cleanPrice(f.priceMax)
  if (priceMin != null && priceMax != null && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin]
  const fits = (f.fitsCars ?? []).filter((slug) => getProduct(slug)?.category === "slot-cars")
  const filters: ProductFilters = {
    q: f.q?.trim().slice(0, 80) || undefined,
    categories: base.categories?.length === 1 ? undefined : only<CategorySlug>(f.categories, CATEGORY_SLUGS),
    subcategories: only<SubcategorySlug>(f.subcategories, SUBCATEGORY_SLUGS),
    brands: base.brands?.length ? undefined : only<BrandSlug>(f.brands, BRAND_SLUGS),
    scales: only<Scale>(f.scales, SCALE_VALUES),
    priceMin,
    priceMax,
    inStock: f.inStock || undefined,
    onSale: base.onSale ? undefined : f.onSale || undefined,
    isNew: base.isNew ? undefined : f.isNew || undefined,
    preorder: base.preorder ? undefined : f.preorder || undefined,
    operation: base.operation?.length ? undefined : only<Operation>(f.operation, OPERATION_VALUES),
    build: only<Build>(f.build, BUILD_VALUES),
    fitsCars: fits.length ? [...new Set(fits)] : undefined,
  }
  return { filters, sort: state.sort, page: Math.min(Math.max(1, Math.floor(state.page) || 1), MAX_PAGES) }
}

/** The empty user state for a listing. */
export const EMPTY_STATE: ListingState = { filters: {}, sort: "featured", page: 1 }

/* ---------------------------------------------------------------------------
 * Derived data
 * ------------------------------------------------------------------------- */

export function baseProductsFor(config: ListingConfig): Product[] {
  return filterProducts(products, config.base)
}

export interface ListingCounts extends FacetCounts {
  categories: Partial<Record<CategorySlug, number>>
  isNew: number
  preorder: number
  /** Results if "Fits my garage" were switched on (null when no cars are saved). */
  fits: number | null
}

/** Disjunctive counts for every facet, including the groups facetCounts() leaves out. */
export function listingCounts(base: readonly Product[], f: ProductFilters, garageCars: readonly string[]): ListingCounts {
  const core = facetCounts(base, f)
  const categoriesCount: Partial<Record<CategorySlug, number>> = {}
  const withoutCategory = { ...f, categories: undefined }
  for (const p of base) if (matchesFilters(p, withoutCategory)) categoriesCount[p.category] = (categoriesCount[p.category] ?? 0) + 1
  const countWith = (patch: ProductFilters) => base.filter((p) => matchesFilters(p, { ...f, ...patch })).length
  return {
    ...core,
    categories: categoriesCount,
    isNew: countWith({ isNew: true }),
    preorder: countWith({ preorder: true }),
    fits: garageCars.length ? countWith({ fitsCars: [...garageCars] }) : null,
  }
}

export function resultsFor(base: readonly Product[], state: ListingState): Product[] {
  return sortProducts(filterProducts(base, state.filters), state.sort, state.filters.q)
}

/** Options that exist anywhere in the listing's base set, in taxonomy order. */
export function presentOptions(base: readonly Product[]) {
  const subs = new Set(base.map((p) => p.subcategory))
  const cats = new Set(base.map((p) => p.category))
  const brandSet = new Set(base.map((p) => p.brand))
  const scaleSet = new Set(base.flatMap((p) => p.scales))
  const ops = new Set(base.map((p) => p.attributes?.operation).filter(Boolean))
  const builds = new Set(base.map((p) => p.attributes?.build).filter(Boolean))
  const order: Scale[] = ["1:32", "1:24", "1:43", "HO"]
  return {
    categories: categories.filter((c) => cats.has(c.slug)),
    subcategories: subcategories.filter((s) => subs.has(s.slug)),
    brands: brands.filter((b) => brandSet.has(b.slug)).sort((a, b) => a.name.localeCompare(b.name)),
    scales: order.filter((s) => scaleSet.has(s)),
    operation: OPERATION_OPTIONS.filter((o) => ops.has(o.value)),
    build: BUILD_OPTIONS.filter((o) => builds.has(o.value)),
  }
}

export const scaleDescription = (s: Scale) => scales.find((x) => x.value === s)?.description

export const BRAND_GROUPS: { value: Brand["group"]; label: string; description: string }[] = [
  { value: "cars", label: "Car makers", description: "Ready-to-run racers, collector liveries and kits." },
  { value: "parts", label: "Parts & tuning", description: "Motors, tires, wheels, gears and the upgrades between them." },
  { value: "electronics", label: "Controllers & electronics", description: "Hand controllers, power and race electronics." },
]

export const brandGroupLabel = (group: Brand["group"]) => BRAND_GROUPS.find((g) => g.value === group)?.label ?? "Brands"

export interface HeaderStat {
  label: string
  value: string
  /** Whole numbers count up the first time they are seen. */
  count?: number
  /** Read label first ("From $8.99") instead of value first ("61 products"). */
  labelFirst?: boolean
}

/** Telemetry strip for listing headers: products · brands (or types) · scales · from-price. */
export function headerStats(list: readonly Product[], second: "brands" | "types" = "brands"): HeaderStat[] {
  if (!list.length) return []
  const opts = presentOptions(list)
  const secondCount = second === "brands" ? opts.brands.length : opts.subcategories.length
  return [
    { label: list.length === 1 ? "Product" : "Products", value: String(list.length), count: list.length },
    { label: second === "brands" ? "Brands" : "Types", value: String(secondCount), count: secondCount },
    { label: opts.scales.length === 1 ? "Scale" : "Scales", value: opts.scales.join(" · ") || "—" },
    { label: "From", value: formatPrice(Math.min(...list.map((p) => p.price))), labelFirst: true },
  ]
}

/** Garage items that are cars (the "Fits my garage" source). */
export const garageCarSlugs = (saved: readonly string[]) => saved.filter((slug) => getProduct(slug)?.category === "slot-cars")

/* ---------------------------------------------------------------------------
 * Mutations — every helper returns a fresh state with pagination reset.
 * ------------------------------------------------------------------------- */

export type ListFacet = "categories" | "subcategories" | "brands" | "scales" | "operation" | "build" | "fitsCars"

export function toggleIn(state: ListingState, key: ListFacet, value: string): ListingState {
  const current = (state.filters[key] ?? []) as string[]
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  return withFilters(state, { [key]: next.length ? next : undefined })
}

/** Quick-filter rows focus on one value; choosing the only active value clears the group. */
export function quickSelect(state: ListingState, key: ListFacet, value: string): ListingState {
  const current = (state.filters[key] ?? []) as string[]
  const isOnly = current.length === 1 && current[0] === value
  return withFilters(state, { [key]: isOnly ? undefined : [value] })
}

export function withFilters(state: ListingState, patch: ProductFilters): ListingState {
  return { ...state, filters: { ...state.filters, ...patch }, page: 1 }
}

export function clearFilters(state: ListingState, keepQuery = false): ListingState {
  return { filters: keepQuery && state.filters.q ? { q: state.filters.q } : {}, sort: state.sort, page: 1 }
}

/* ---------------------------------------------------------------------------
 * Active-filter chips
 * ------------------------------------------------------------------------- */

export interface FilterChip {
  id: string
  /** Group label shown dimmed before the value: "Brand", "Price". */
  group: string
  label: string
  next: ListingState
}

const fitsLabel = (slugs: readonly string[]) => {
  if (slugs.length !== 1) return `${slugs.length} cars`
  const car = getProduct(slugs[0])
  return car ? (car.vehicle ? `${car.vehicle.make} ${car.vehicle.model}` : car.name) : "1 car"
}

const OPERATION_LABEL = Object.fromEntries(OPERATION_OPTIONS.map((o) => [o.value, o.label]))
const BUILD_LABEL = Object.fromEntries(BUILD_OPTIONS.map((o) => [o.value, o.label]))

export function filterChips(state: ListingState, opts: { includeQuery?: boolean } = {}): FilterChip[] {
  const f = state.filters
  const chips: FilterChip[] = []
  const list = (key: ListFacet, group: string, label: (v: string) => string) => {
    for (const v of (f[key] ?? []) as string[]) chips.push({ id: `${key}:${v}`, group, label: label(v), next: toggleIn(state, key, v) })
  }
  if (opts.includeQuery !== false && f.q) chips.push({ id: "q", group: "Search", label: `“${f.q}”`, next: withFilters(state, { q: undefined }) })
  list("categories", "Category", (v) => categoryLabel(v as CategorySlug))
  list("subcategories", "Type", (v) => subcategoryLabel(v as SubcategorySlug))
  list("brands", "Brand", (v) => brandName(v as BrandSlug))
  list("scales", "Scale", (v) => v)
  if (f.priceMin != null || f.priceMax != null) {
    const label =
      f.priceMin != null && f.priceMax != null
        ? `${formatPrice(f.priceMin, { round: true })} – ${formatPrice(f.priceMax, { round: true })}`
        : f.priceMin != null
          ? `From ${formatPrice(f.priceMin, { round: true })}`
          : `Up to ${formatPrice(f.priceMax!, { round: true })}`
    chips.push({ id: "price", group: "Price", label, next: withFilters(state, { priceMin: undefined, priceMax: undefined }) })
  }
  for (const o of AVAILABILITY_OPTIONS) if (f[o.key]) chips.push({ id: o.key, group: "Show", label: o.label, next: withFilters(state, { [o.key]: undefined }) })
  list("operation", "Operation", (v) => OPERATION_LABEL[v] ?? v)
  list("build", "Build", (v) => BUILD_LABEL[v] ?? v)
  if (f.fitsCars?.length) chips.push({ id: "fits", group: "Fits", label: fitsLabel(f.fitsCars), next: withFilters(state, { fitsCars: undefined }) })
  return chips
}

/* ---------------------------------------------------------------------------
 * Search → department shortcuts ("Jump to Tires", "Slot.it")
 * ------------------------------------------------------------------------- */

export interface TaxonomyMatch {
  id: string
  kind: "Category" | "Type" | "Brand"
  label: string
  /** Parent context, e.g. the category of a type. */
  context?: string
  href: string
  count: number
}

const STOP_WORDS = new Set(["and", "the", "for", "with", "set", "kit", "new", "car", "cars", "parts", "part"])
const compact = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** Categories, types and brands whose names match the query — only ones with products. */
export function taxonomyMatches(query: string, limit = 6): TaxonomyMatch[] {
  const tokens = tokenize(query)
    .map(compact)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t))
  if (!tokens.length) return []
  const wordHit = (label: string) => words(label).some((w) => tokens.some((t) => w.startsWith(t) || (t.length >= 5 && t.startsWith(w) && w.length >= 4)))
  const count = (f: ProductFilters) => filterProducts(products, f).length
  const out: TaxonomyMatch[] = []
  for (const s of subcategories) {
    if (!wordHit(s.label)) continue
    const n = count({ subcategories: [s.slug] })
    if (n) out.push({ id: `type:${s.slug}`, kind: "Type", label: s.label, context: categoryLabel(s.category), href: subcategoryHref(s.slug), count: n })
  }
  for (const c of categories) {
    if (!wordHit(c.label) || out.some((m) => m.context === c.label)) continue
    const n = count({ categories: [c.slug] })
    if (n) out.push({ id: `cat:${c.slug}`, kind: "Category", label: c.label, href: categoryHref(c.slug), count: n })
  }
  for (const b of brands) {
    const name = compact(b.name)
    if (!tokens.some((t) => name.startsWith(t) || (t.length >= 4 && t.startsWith(name)))) continue
    const n = count({ brands: [b.slug] })
    if (n) out.push({ id: `brand:${b.slug}`, kind: "Brand", label: b.name, context: b.country, href: brandHref(b.slug), count: n })
  }
  return out.slice(0, limit)
}

/* ---------------------------------------------------------------------------
 * Price slider scale — quadratic when the range is wide, so $8 tires and
 * $400 race sets can share one slider without the cheap end collapsing.
 * ------------------------------------------------------------------------- */

export const SLIDER_STEPS = 1000

export function priceScale(min: number, max: number) {
  const span = Math.max(max - min, 1)
  const exp = max / Math.max(min, 1) > 8 ? 2 : 1
  return {
    toPrice: (t: number) => Math.round(min + span * Math.pow(Math.min(Math.max(t, 0), SLIDER_STEPS) / SLIDER_STEPS, exp)),
    toPos: (price: number) => Math.round(SLIDER_STEPS * Math.pow(Math.min(Math.max((price - min) / span, 0), 1), 1 / exp)),
  }
}

/** Product counts per slider bucket (positions are in slider space). */
export function priceHistogram(base: readonly Product[], min: number, max: number, buckets = 28): number[] {
  const { toPos } = priceScale(min, max)
  const out = new Array<number>(buckets).fill(0)
  for (const p of base) out[Math.min(buckets - 1, Math.floor((toPos(p.price) / SLIDER_STEPS) * buckets))]++
  return out
}
