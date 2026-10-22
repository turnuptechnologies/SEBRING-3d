import mediaManifest from "@/lib/catalog/media-manifest.json"
import { products } from "@/lib/catalog/products"
import { brandName, categoryLabel, getCollection, subcategoryLabel } from "@/lib/catalog/taxonomy"
import type {
  BrandSlug,
  CategorySlug,
  Collection,
  Product,
  ProductFilters,
  ProductView,
  Scale,
  SortKey,
  SubcategorySlug,
} from "@/lib/catalog/types"

export { products }
export * from "@/lib/catalog/taxonomy"

const bySlug = new Map(products.map((p) => [p.slug, p]))

export const getProduct = (slug: string) => bySlug.get(slug)
export const getProducts = (slugs: readonly string[]) => slugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p))

export const isOnSale = (p: Product) => Boolean(p.compareAtPrice && p.compareAtPrice > p.price)
export const isInStock = (p: Product) => p.stock > 0
export const isLowStock = (p: Product) => p.stock > 0 && p.stock <= 5
export const isPreorder = (p: Product) => Boolean(p.preorder)
export const isCar = (p: Product) => p.category === "slot-cars"
export const isPart = (p: Product) => p.category === "chassis-motors" || p.category === "tires-magnets-axles"

/* ---------------------------------------------------------------------------
 * Media — rendered images live at /products/<slug>/<view>.webp. The manifest
 * (written by scripts/render-media.mjs) lists which files actually exist.
 * ------------------------------------------------------------------------- */

const renderedViews = (mediaManifest as { items: Record<string, ProductView[]> }).items

export interface ProductImage {
  src: string
  view: ProductView
  alt: string
}

const VIEW_LABEL: Record<ProductView, string> = {
  hero: "three-quarter front view",
  side: "side profile",
  rear: "three-quarter rear view",
  top: "top view",
  detail: "close-up detail",
  alt: "alternate angle",
}

/** Rendered images for a product, primary first. Empty until the media pipeline has run. */
export function productImages(p: Product): ProductImage[] {
  const available = new Set(renderedViews[p.slug] ?? [])
  return p.views
    .filter((v) => available.has(v))
    .map((view) => ({ src: `/products/${p.slug}/${view}.webp`, view, alt: `${brandName(p.brand)} ${p.name} — ${VIEW_LABEL[view]}` }))
}

export const primaryImage = (p: Product): ProductImage | undefined => productImages(p)[0]

const renderedScenes = new Set((mediaManifest as { scenes?: string[] }).scenes ?? [])

/**
 * Composed 3D scenes (category tiles, hero poster…) rendered by the media
 * pipeline, see src/lib/three/scenes/registry.ts. Returns null until rendered,
 * so callers can show a designed fallback.
 */
export function sceneImage(id: string, out: string): string | null {
  return renderedScenes.has(id) ? `/${out}` : null
}

/* ---------------------------------------------------------------------------
 * Filtering, sorting, faceting
 * ------------------------------------------------------------------------- */

export function matchesFilters(p: Product, f: ProductFilters): boolean {
  if (f.categories?.length && !f.categories.includes(p.category)) return false
  if (f.subcategories?.length && !f.subcategories.includes(p.subcategory)) return false
  if (f.brands?.length && !f.brands.includes(p.brand)) return false
  if (f.scales?.length && !p.scales.some((s) => f.scales!.includes(s))) return false
  if (f.priceMin != null && p.price < f.priceMin) return false
  if (f.priceMax != null && p.price > f.priceMax) return false
  if (f.inStock && !isInStock(p)) return false
  if (f.onSale && !isOnSale(p)) return false
  if (f.isNew && !p.isNew) return false
  if (f.preorder && !isPreorder(p)) return false
  if (f.operation?.length && !(p.attributes?.operation && f.operation.includes(p.attributes.operation))) return false
  if (f.build?.length && !(p.attributes?.build && f.build.includes(p.attributes.build))) return false
  if (f.fitsCars?.length && !fitsAnyCar(p, f.fitsCars)) return false
  if (f.q && scoreProduct(p, tokenize(f.q)) <= 0) return false
  return true
}

/** True when a part's fitment covers at least one of the given cars (brand + scale). */
export function fitsAnyCar(part: Product, carSlugs: readonly string[]): boolean {
  if (!part.fits) return false
  return carSlugs.some((slug) => {
    const car = bySlug.get(slug)
    return Boolean(car && part.fits!.brands.includes(car.brand) && part.fits!.scales.some((s) => car.scales.includes(s)))
  })
}

/** Combines a collection's base filter with user filters (user narrows, never widens). */
export function mergeFilters(base: ProductFilters, user: ProductFilters): ProductFilters {
  const intersect = <T,>(a?: T[], b?: T[]) => (a?.length && b?.length ? a.filter((x) => b.includes(x)) : (b?.length ? b : a))
  return {
    ...base,
    ...user,
    categories: intersect(base.categories, user.categories),
    subcategories: intersect(base.subcategories, user.subcategories),
    brands: intersect(base.brands, user.brands),
    scales: intersect(base.scales, user.scales),
    operation: intersect(base.operation, user.operation),
    build: intersect(base.build, user.build),
    onSale: base.onSale || user.onSale,
    isNew: base.isNew || user.isNew,
    preorder: base.preorder || user.preorder,
  }
}

export function filterProducts(list: readonly Product[], f: ProductFilters): Product[] {
  return list.filter((p) => matchesFilters(p, f))
}

const featuredRank = (p: Product) => (p.isFeatured ? 0 : 1) + (p.isNew ? 0 : 0.5) + (isInStock(p) ? 0 : 2)

export function sortProducts(list: readonly Product[], sort: SortKey = "featured", query?: string): Product[] {
  const out = [...list]
  const tokens = query ? tokenize(query) : []
  switch (sort) {
    case "newest":
      return out.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
    case "price-asc":
      return out.sort((a, b) => a.price - b.price)
    case "price-desc":
      return out.sort((a, b) => b.price - a.price)
    case "name-asc":
      return out.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return out.sort((a, b) => {
        if (tokens.length) {
          const d = scoreProduct(b, tokens) - scoreProduct(a, tokens)
          if (d !== 0) return d
        }
        return featuredRank(a) - featuredRank(b) || b.releasedAt.localeCompare(a.releasedAt)
      })
  }
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A–Z" },
]

export interface FacetCounts {
  subcategories: Partial<Record<SubcategorySlug, number>>
  brands: Partial<Record<BrandSlug, number>>
  scales: Partial<Record<Scale, number>>
  operation: Partial<Record<string, number>>
  build: Partial<Record<string, number>>
  priceRange: [number, number]
  inStock: number
  onSale: number
}

/**
 * Facet counts in the standard "disjunctive" style: each group's counts ignore
 * that group's own selection, so shoppers always see how many alternatives exist.
 */
export function facetCounts(list: readonly Product[], f: ProductFilters): FacetCounts {
  const count = <K extends string>(without: ProductFilters, key: (p: Product) => K[]) => {
    const out: Partial<Record<K, number>> = {}
    for (const p of list) if (matchesFilters(p, without)) for (const k of key(p)) out[k] = (out[k] ?? 0) + 1
    return out
  }
  const prices = list.map((p) => p.price)
  return {
    subcategories: count({ ...f, subcategories: undefined }, (p) => [p.subcategory]),
    brands: count({ ...f, brands: undefined }, (p) => [p.brand]),
    scales: count({ ...f, scales: undefined }, (p) => p.scales),
    operation: count({ ...f, operation: undefined }, (p) => (p.attributes?.operation ? [p.attributes.operation] : [])),
    build: count({ ...f, build: undefined }, (p) => (p.attributes?.build ? [p.attributes.build] : [])),
    priceRange: prices.length ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))] : [0, 0],
    inStock: list.filter((p) => matchesFilters(p, { ...f, inStock: true })).length,
    onSale: list.filter((p) => matchesFilters(p, { ...f, onSale: true })).length,
  }
}

export function collectionProducts(collection: Collection | string): Product[] {
  const c = typeof collection === "string" ? getCollection(collection) : collection
  return c ? filterProducts(products, c.base) : []
}

/* ---------------------------------------------------------------------------
 * Search — tolerant, weighted, AND-across-tokens.
 * ------------------------------------------------------------------------- */

const SYNONYMS: Record<string, string> = {
  tyre: "tire",
  tyres: "tires",
  slotit: "slot-it",
  "slot.it": "slot-it",
  "1/32": "1:32",
  "132": "1:32",
  "1/24": "1:24",
  "124": "1:24",
  "1/43": "1:43",
  "143": "1:43",
  formula: "f1",
  "formula1": "f1",
  "formula-1": "f1",
  magnets: "magnet",
  controllers: "controller",
  motors: "motor",
  gears: "gear",
  pinions: "pinion",
  wheels: "wheel",
  axles: "axle",
  guides: "guide",
  sets: "set",
  cars: "car",
  bodies: "body",
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’'"“”]/g, "")

export function tokenize(q: string): string[] {
  return normalize(q)
    .replace(/[^a-z0-9:./\-\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter(Boolean)
    .map((t) => SYNONYMS[t] ?? t)
}

interface SearchDoc {
  name: string
  brand: string
  ids: string
  taxonomy: string
  tags: string
  vehicle: string
  body: string
}

const docs = new Map<string, SearchDoc>()
function docFor(p: Product): SearchDoc {
  let d = docs.get(p.slug)
  if (!d) {
    d = {
      name: normalize(p.name),
      brand: normalize(`${brandName(p.brand)} ${p.brand}`),
      ids: normalize(`${p.sku} ${p.mpn ?? ""}`),
      taxonomy: normalize(`${categoryLabel(p.category)} ${subcategoryLabel(p.subcategory)} ${p.subcategory} ${p.scales.join(" ")}`),
      tags: normalize(p.tags.join(" ")),
      vehicle: p.vehicle ? normalize(`${p.vehicle.make} ${p.vehicle.model} ${p.vehicle.year} ${p.vehicle.series} ${p.vehicle.era}`) : "",
      body: normalize(`${p.summary} ${p.highlights.join(" ")}`),
    }
    docs.set(p.slug, d)
  }
  return d
}

const WEIGHTS: Record<keyof SearchDoc, number> = { ids: 10, name: 7, brand: 6, vehicle: 5, tags: 4, taxonomy: 3, body: 1 }

/** 0 when any token is missing; otherwise a relevance score. */
export function scoreProduct(p: Product, tokens: readonly string[]): number {
  if (!tokens.length) return 1
  const d = docFor(p)
  let total = 0
  for (const t of tokens) {
    let best = 0
    for (const field of Object.keys(WEIGHTS) as (keyof SearchDoc)[]) {
      const text = d[field]
      if (!text) continue
      const idx = text.indexOf(t)
      if (idx === -1) continue
      const wordStart = idx === 0 || /[\s\-:/.(]/.test(text[idx - 1])
      best = Math.max(best, WEIGHTS[field] * (wordStart ? 1 : 0.45))
    }
    if (best === 0) return 0
    total += best
  }
  return total
}

export function searchProducts(query: string, limit?: number): Product[] {
  const tokens = tokenize(query)
  if (!tokens.length) return []
  const hits = products
    .map((p) => ({ p, s: scoreProduct(p, tokens) }))
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s || featuredRank(a.p) - featuredRank(b.p))
    .map((h) => h.p)
  return limit ? hits.slice(0, limit) : hits
}

export const POPULAR_SEARCHES = ["Slot.it", "1:32 GT", "Tires", "Motors", "Porsche", "Controller", "Magnets", "Race set"]

/* ---------------------------------------------------------------------------
 * Recommendations
 * ------------------------------------------------------------------------- */

export function relatedProducts(p: Product, limit = 8): Product[] {
  const score = (o: Product) =>
    (o.subcategory === p.subcategory ? 6 : 0) +
    (o.category === p.category ? 3 : 0) +
    (o.brand === p.brand ? 2 : 0) +
    (o.scales.some((s) => p.scales.includes(s)) ? 2 : 0) +
    (isInStock(o) ? 1 : 0) -
    Math.min(Math.abs(o.price - p.price) / 50, 2)
  return products
    .filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, s: score(o) }))
    .sort((a, b) => b.s - a.s || a.o.slug.localeCompare(b.o.slug))
    .slice(0, limit)
    .map((x) => x.o)
}

/** Upgrade parts that fit a car (brand + scale aware). */
export function compatibleParts(car: Product, limit = 8): Product[] {
  const parts = products.filter((p) => p.category !== "slot-cars" && p.fits)
  const fits = parts.filter((p) => p.fits!.brands.includes(car.brand) && p.fits!.scales.some((s) => car.scales.includes(s)))
  const sameScale = parts.filter((p) => !fits.includes(p) && p.fits!.scales.some((s) => car.scales.includes(s)))
  return [...fits, ...sameScale].slice(0, limit)
}

/* ---------------------------------------------------------------------------
 * URL <-> filters codec (shared by listings, search, menus and links)
 * ------------------------------------------------------------------------- */

export interface ListingState {
  filters: ProductFilters
  sort: SortKey
  page: number
}

const list = (v: string | null) => (v ? v.split(",").map((x) => decodeURIComponent(x.trim())).filter(Boolean) : undefined)
const num = (v: string | null) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined)

export function parseListingParams(sp: URLSearchParams | { get(name: string): string | null }): ListingState {
  const sort = (sp.get("sort") ?? "featured") as SortKey
  return {
    filters: {
      q: sp.get("q")?.trim() || undefined,
      categories: list(sp.get("category")) as CategorySlug[] | undefined,
      subcategories: list(sp.get("type")) as SubcategorySlug[] | undefined,
      brands: list(sp.get("brand")) as BrandSlug[] | undefined,
      scales: list(sp.get("scale")) as Scale[] | undefined,
      priceMin: num(sp.get("min")),
      priceMax: num(sp.get("max")),
      inStock: sp.get("stock") === "1" || undefined,
      onSale: sp.get("sale") === "1" || undefined,
      isNew: sp.get("new") === "1" || undefined,
      preorder: sp.get("preorder") === "1" || undefined,
      operation: list(sp.get("op")) as ProductFilters["operation"],
      build: list(sp.get("build")) as ProductFilters["build"],
      fitsCars: list(sp.get("fits")),
    },
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : "featured",
    page: Math.max(1, num(sp.get("page")) ?? 1),
  }
}

export function listingSearchParams({ filters: f, sort, page }: Partial<ListingState>): URLSearchParams {
  const sp = new URLSearchParams()
  if (f?.q) sp.set("q", f.q)
  if (f?.categories?.length) sp.set("category", f.categories.join(","))
  if (f?.subcategories?.length) sp.set("type", f.subcategories.join(","))
  if (f?.brands?.length) sp.set("brand", f.brands.join(","))
  if (f?.scales?.length) sp.set("scale", f.scales.join(","))
  if (f?.priceMin != null) sp.set("min", String(f.priceMin))
  if (f?.priceMax != null) sp.set("max", String(f.priceMax))
  if (f?.inStock) sp.set("stock", "1")
  if (f?.onSale) sp.set("sale", "1")
  if (f?.isNew) sp.set("new", "1")
  if (f?.preorder) sp.set("preorder", "1")
  if (f?.operation?.length) sp.set("op", f.operation.join(","))
  if (f?.build?.length) sp.set("build", f.build.join(","))
  if (f?.fitsCars?.length) sp.set("fits", f.fitsCars.join(","))
  if (sort && sort !== "featured") sp.set("sort", sort)
  if (page && page > 1) sp.set("page", String(page))
  return sp
}

export function listingHref(pathname: string, state: Partial<ListingState>) {
  const qs = listingSearchParams(state).toString()
  return qs ? `${pathname}?${qs}` : pathname
}
