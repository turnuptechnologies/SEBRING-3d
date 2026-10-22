import { FeaturedTabs, type FeaturedTab } from "@/components/home/featured/featured-tabs"
import { SectionHeading } from "@/components/site/section-heading"
import { getSubcategory, isOnSale, listingHref, products, scaleHref, scales, sortProducts, subcategoryHref } from "@/lib/catalog"
import type { Product, SortKey, SubcategorySlug } from "@/lib/catalog/types"

const RAIL_LIMIT = 12

interface TabDef {
  id: string
  label: string
  description: string
  href: string
  hrefLabel: string
  match: (p: Product) => boolean
  sort?: SortKey
}

const subcategoryTab = (id: string, label: string, slug: SubcategorySlug): TabDef => ({
  id,
  label,
  description: getSubcategory(slug)?.description ?? "",
  href: subcategoryHref(slug),
  hrefLabel: `Shop all ${label}`,
  match: (p) => p.subcategory === slug,
})

const TABS: TabDef[] = [
  {
    id: "new",
    label: "New arrivals",
    description: "The latest cars to land at Sebring.",
    href: listingHref("/collections/new-arrivals", { filters: { categories: ["slot-cars"] } }),
    hrefLabel: "Shop all new cars",
    match: (p) => Boolean(p.isNew),
    sort: "newest",
  },
  subcategoryTab("gt", "GT & Sports", "gt-sports"),
  subcategoryTab("endurance", "Endurance", "endurance-prototypes"),
  subcategoryTab("classics", "Classics", "classics"),
  {
    id: "1-24",
    label: "1:24",
    description: scales.find((s) => s.value === "1:24")?.description ?? "",
    href: scaleHref("1:24", "slot-cars"),
    hrefLabel: "Shop all 1:24 cars",
    match: (p) => p.scales.includes("1:24"),
  },
  {
    id: "sale",
    label: "On sale",
    description: "Marked-down racers — while stock lasts.",
    href: listingHref("/collections/sale", { filters: { categories: ["slot-cars"] } }),
    hrefLabel: "Shop the car sale",
    match: isOnSale,
  },
]

/** Featured slot cars, one rail per tab; tabs with nothing to show are left out. */
export function FeaturedCars() {
  const cars = products.filter((p) => p.category === "slot-cars")
  const tabs: FeaturedTab[] = TABS.map(({ match, sort, ...tab }) => ({
    ...tab,
    slugs: sortProducts(cars.filter(match), sort ?? "featured")
      .slice(0, RAIL_LIMIT)
      .map((p) => p.slug),
  })).filter((t) => t.slugs.length > 0)
  const used = new Set(tabs.flatMap((t) => t.slugs))

  if (!tabs.length) return null

  return (
    <section aria-label="Featured slot cars" className="relative overflow-hidden border-b border-hairline py-24 md:py-32">
      <div className="container-site">
        <SectionHeading
          eyebrow="In the paddock"
          title="Slot cars"
          description="Racers across every era, from Sixties endurance icons to modern GT — each with live stock and one-click buy."
          action={{ label: "View all cars", href: "/collections/slot-cars" }}
        />
        <FeaturedTabs tabs={tabs} products={cars.filter((p) => used.has(p.slug))} className="mt-12 md:mt-14" />
      </div>
    </section>
  )
}
