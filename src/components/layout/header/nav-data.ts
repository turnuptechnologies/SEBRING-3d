import type { LucideIcon } from "lucide-react"
import { BadgePercent, BookOpen, CalendarClock, Cpu, Heart, ScanSearch, Sparkles, Tag } from "lucide-react"

import { CATEGORY_ICONS, SUBCATEGORY_ICONS } from "@/components/site/category-icon"
import {
  brandName,
  categories,
  categoryHref,
  collectionProducts,
  filterProducts,
  getCategory,
  getCollection,
  getProduct,
  getSubcategory,
  isInStock,
  listingHref,
  mergeFilters,
  products,
  scales,
  sortProducts,
  subcategoryHref,
} from "@/lib/catalog"
import type { BrandSlug, CategorySlug, Product, ProductFilters, SubcategorySlug } from "@/lib/catalog/types"
import { discountPercent } from "@/lib/format"
import { primaryNav } from "@/lib/site"

/**
 * Navigation model shared by the mega menus, the mobile menu and search.
 * Every link carries the exact count its listing will show, and links that
 * would lead to an empty shelf are dropped.
 */

export type MenuKey = (typeof primaryNav)[number]["menu"]

export interface NavLink {
  label: string
  href: string
  count: number
  icon?: LucideIcon
}

export interface NavGroup {
  title: string
  links: NavLink[]
  all: NavLink
}

export interface HelpLink {
  label: string
  href: string
  description: string
  icon: LucideIcon
}

const countIn = (collection: string, user: ProductFilters = {}) =>
  filterProducts(products, mergeFilters(getCollection(collection)?.base ?? {}, user)).length

/** A filtered listing — the URL goes through the shared listing codec. */
export function listingLink(collection: string, user: ProductFilters, label: string, icon?: LucideIcon): NavLink {
  return { label, href: listingHref(`/collections/${collection}`, { filters: user }), count: countIn(collection, user), icon }
}

export function subcategoryLink(slug: SubcategorySlug): NavLink {
  const sub = getSubcategory(slug)
  return {
    label: sub?.label ?? slug,
    href: subcategoryHref(slug),
    count: sub ? countIn(sub.category, { subcategories: [slug] }) : 0,
    icon: SUBCATEGORY_ICONS[slug],
  }
}

export function categoryLink(slug: CategorySlug, label?: string): NavLink {
  return { label: label ?? getCategory(slug)?.label ?? slug, href: categoryHref(slug), count: countIn(slug), icon: CATEGORY_ICONS[slug] }
}

export const nonEmpty = (links: NavLink[]) => links.filter((l) => l.count > 0)

/** Same URL as `productHref`, which lives in a client module and can't run in the server panels. */
export const productPath = (p: Pick<Product, "slug">) => `/products/${p.slug}`

function brandLinks(collection: string, list: readonly Product[], limit: number): NavLink[] {
  const counts = new Map<BrandSlug, number>()
  for (const p of list) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
  return [...counts]
    .sort((a, b) => b[1] - a[1] || brandName(a[0]).localeCompare(brandName(b[0])))
    .slice(0, limit)
    .map(([slug]) => listingLink(collection, { brands: [slug] }, brandName(slug)))
}

/** Deterministic pick: the top "featured" item, preferring what can ship today. */
function pickFeatured(list: readonly Product[]): Product | undefined {
  return sortProducts(list.filter(isInStock), "featured")[0] ?? sortProducts(list, "featured")[0]
}

const inCategory = (...slugs: CategorySlug[]) => products.filter((p) => slugs.includes(p.category))

/* ---------------------------------------------------------------------------
 * Menus
 * ------------------------------------------------------------------------- */

export const FIT_LINKS: HelpLink[] = [
  { label: "Fit check", href: "/contact?topic=fit-check", description: "Tell us your car — we confirm what fits before it ships.", icon: ScanSearch },
  { label: "My Garage", href: "/garage", description: "Save your cars, then filter every parts list to what fits them.", icon: Heart },
  { label: "Tech guides", href: "/tech", description: "Gearing, tires, magnets and set-up, explained by racers.", icon: BookOpen },
]

export const PLUG_GUIDE = { label: "Which plug does my track use?", href: "/tech#plugs" }

/** Connector families covered by the plug guide. */
export const PLUG_TYPES = ["Carrera", "Scalextric", "Alligator clips", "Banana plugs"] as const

export interface SlotCarsMenu {
  all: NavLink
  byClass: NavLink[]
  scales: NavLink[]
  quick: NavLink[]
  brands: NavLink[]
  featured?: Product
}

export interface PartsMenu {
  all: NavLink
  groups: NavGroup[]
  brands: NavLink[]
  fit: HelpLink[]
}

export interface TrackMenu {
  all: NavLink
  links: NavLink[]
  digital: NavLink
  featured?: Product
}

export interface ControllersMenu {
  all: NavLink
  links: NavLink[]
  featured?: Product
}

export interface SaleMenu {
  all: NavLink
  byCategory: NavLink[]
  bands: NavLink[]
  featured?: Product
}

let slotCarsCache: SlotCarsMenu | undefined
export function slotCarsMenu(): SlotCarsMenu {
  if (slotCarsCache) return slotCarsCache
  const cars = inCategory("slot-cars")
  slotCarsCache = {
    all: categoryLink("slot-cars", "All slot cars"),
    byClass: nonEmpty((getCategory("slot-cars")?.subcategories ?? []).map(subcategoryLink)),
    scales: nonEmpty(scales.map((s) => listingLink("slot-cars", { scales: [s.value] }, s.label))),
    quick: nonEmpty([
      listingLink("slot-cars", { isNew: true }, "New arrivals", Sparkles),
      listingLink("slot-cars", { preorder: true }, "Pre-orders", CalendarClock),
      listingLink("slot-cars", { operation: ["Digital", "Digital-ready"] }, "Digital & digital-ready", Cpu),
      listingLink("slot-cars", { onSale: true }, "Sale cars", BadgePercent),
      listingLink("slot-cars", { priceMax: 50 }, "Under $50", Tag),
    ]),
    brands: brandLinks("slot-cars", cars, 6),
    featured: pickFeatured(cars),
  }
  return slotCarsCache
}

let partsCache: PartsMenu | undefined
export function partsMenu(): PartsMenu {
  if (partsCache) return partsCache
  const group = (slug: CategorySlug, allLabel: string): NavGroup => ({
    title: getCategory(slug)?.label ?? slug,
    links: nonEmpty((getCategory(slug)?.subcategories ?? []).map(subcategoryLink)),
    all: categoryLink(slug, allLabel),
  })
  partsCache = {
    all: { ...listingLink("parts", {}, "All parts & upgrades"), icon: CATEGORY_ICONS["chassis-motors"] },
    groups: [group("chassis-motors", "All chassis & motors"), group("tires-magnets-axles", "All tires, magnets & axles")],
    brands: brandLinks("parts", inCategory("chassis-motors", "tires-magnets-axles"), 8),
    fit: FIT_LINKS,
  }
  return partsCache
}

let trackCache: TrackMenu | undefined
export function trackMenu(): TrackMenu {
  if (trackCache) return trackCache
  const items = inCategory("track-sets")
  const sets = items.filter((p) => p.subcategory === "race-sets")
  trackCache = {
    all: categoryLink("track-sets", "All track & sets"),
    links: nonEmpty((["race-sets", "track-pieces", "timing", "trackside"] as const).map(subcategoryLink)),
    digital: listingLink("digital", {}, "Digital racing", Cpu),
    featured: pickFeatured(sets) ?? pickFeatured(items),
  }
  return trackCache
}

let controllersCache: ControllersMenu | undefined
export function controllersMenu(): ControllersMenu {
  if (controllersCache) return controllersCache
  const items = inCategory("controllers-power")
  controllersCache = {
    all: categoryLink("controllers-power", "All controllers & power"),
    links: nonEmpty((getCategory("controllers-power")?.subcategories ?? []).map(subcategoryLink)),
    featured: pickFeatured(items.filter((p) => p.subcategory === "controllers")) ?? pickFeatured(items),
  }
  return controllersCache
}

let saleCache: SaleMenu | undefined
export function saleMenu(): SaleMenu {
  if (saleCache) return saleCache
  const sale = collectionProducts("sale")
  const off = (p: Product) => discountPercent(p.price, p.compareAtPrice)
  saleCache = {
    all: { ...listingLink("sale", {}, "Shop the full sale"), icon: BadgePercent },
    byCategory: nonEmpty(categories.map((c) => listingLink("sale", { categories: [c.slug] }, c.label, CATEGORY_ICONS[c.slug]))),
    bands: nonEmpty([
      listingLink("sale", { priceMax: 25 }, "Under $25"),
      listingLink("sale", { priceMin: 25, priceMax: 75 }, "$25 – $75"),
      listingLink("sale", { priceMin: 75 }, "$75 & up"),
    ]),
    featured: [...sale].filter(isInStock).sort((a, b) => off(b) - off(a) || a.slug.localeCompare(b.slug))[0],
  }
  return saleCache
}

/** Item count for each top-level menu (shown next to the trigger). */
export function menuTotal(key: MenuKey): number {
  switch (key) {
    case "slot-cars":
      return slotCarsMenu().all.count
    case "parts":
      return partsMenu().all.count
    case "track-sets":
      return trackMenu().all.count
    case "controllers-power":
      return controllersMenu().all.count
    case "sale":
      return saleMenu().all.count
  }
}

/* ---------------------------------------------------------------------------
 * Current section (drives the active indicator)
 * ------------------------------------------------------------------------- */

const SECTION_BY_CATEGORY: Record<CategorySlug, MenuKey> = {
  "slot-cars": "slot-cars",
  "chassis-motors": "parts",
  "tires-magnets-axles": "parts",
  "track-sets": "track-sets",
  "controllers-power": "controllers-power",
}

const SECTION_BY_COLLECTION: Record<string, MenuKey> = {
  "slot-cars": "slot-cars",
  parts: "parts",
  "chassis-motors": "parts",
  "tires-magnets-axles": "parts",
  "track-sets": "track-sets",
  digital: "track-sets",
  "controllers-power": "controllers-power",
  sale: "sale",
}

export type Section = MenuKey | "brands" | "raceway"

export function sectionFor(pathname: string): Section | null {
  const [, root, slug] = pathname.split("/")
  if (root === "collections" && slug) return SECTION_BY_COLLECTION[slug] ?? null
  if (root === "products" && slug) {
    const p = getProduct(slug)
    return p ? SECTION_BY_CATEGORY[p.category] : null
  }
  if (root === "brands") return "brands"
  if (root === "raceway") return "raceway"
  return null
}
