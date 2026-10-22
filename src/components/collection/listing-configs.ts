import type { FacetKey, ListingConfig, ListingKind } from "@/components/collection/listing-model"
import type { Crumb } from "@/components/site/breadcrumbs"
import { brandName, filterProducts, products } from "@/lib/catalog"
import type { Brand, Collection, Product } from "@/lib/catalog/types"
import { site } from "@/lib/site"

const PART_TREES = new Set(["chassis-motors", "tires-magnets-axles"])

const kindFor = (c: Collection): ListingKind =>
  c.slug === "parts" ? "parts" : c.base.categories?.length === 1 && Object.keys(c.base).length === 1 ? "category" : "collection"

export function collectionListing(c: Collection): ListingConfig {
  const kind = kindFor(c)
  return {
    pathname: `/collections/${c.slug}`,
    kind,
    base: c.base,
    facets: c.facets,
    label: c.slug === "all" ? "the catalog" : c.title,
    category: kind === "category" ? c.base.categories?.[0] : undefined,
  }
}

export function collectionCrumbs(c: Collection): Crumb[] {
  if (c.slug === "all") return [{ label: c.title }]
  const shop: Crumb = { label: "Shop", href: "/collections/all" }
  if (PART_TREES.has(c.slug)) return [shop, { label: "Parts & Upgrades", href: "/collections/parts" }, { label: c.title }]
  return [shop, { label: c.title }]
}

export function brandListing(b: Brand, list: readonly Product[]): ListingConfig {
  const facets: FacetKey[] = ["subcategory", "scale", "price", "availability"]
  if (list.some((p) => p.attributes?.operation)) facets.push("operation")
  if (list.some((p) => p.attributes?.build)) facets.push("build")
  if (list.some((p) => p.fits)) facets.push("fits")
  return { pathname: `/brands/${b.slug}`, kind: "brand", base: { brands: [b.slug] }, facets, label: b.name, brand: b.slug }
}

export const brandProducts = (b: Brand) => filterProducts(products, { brands: [b.slug] })

export const SEARCH_LISTING: ListingConfig = {
  pathname: "/search",
  kind: "search",
  base: {},
  facets: ["subcategory", "brand", "scale", "price", "availability", "operation", "build"],
  label: "the catalog",
}

/** schema.org ItemList for the default (unfiltered) order of a listing. */
export function itemListJsonLd(list: readonly Product[], name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: list.length,
    itemListElement: list.slice(0, 24).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}/products/${p.slug}`,
      name: `${brandName(p.brand)} ${p.name}`,
    })),
  }
}
