import type { Metadata } from "next"

import { BrandDirectory, type BrandEntry } from "@/components/collection/brand-directory"
import { brandProducts } from "@/components/collection/listing-configs"
import { ListingHeader } from "@/components/collection/listing-header"
import { brands, categories, isInStock, products } from "@/lib/catalog"
import type { CategorySlug } from "@/lib/catalog/types"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Slot car brands",
  description: "Carrera, Scalextric, Slot.it, NSR and every other maker we stock — cars, parts, tires and controllers, sorted by what they build.",
  alternates: { canonical: "/brands" },
}

const MIX_LABEL: Record<CategorySlug, string> = {
  "slot-cars": "Cars",
  "chassis-motors": "Chassis & motors",
  "tires-magnets-axles": "Tires & axles",
  "controllers-power": "Controllers",
  "track-sets": "Track",
}

export default function BrandsPage() {
  const entries: BrandEntry[] = [...brands]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => {
      const list = brandProducts(b)
      return {
        slug: b.slug,
        name: b.name,
        group: b.group,
        country: b.country,
        blurb: b.blurb,
        scales: b.scales,
        count: list.length,
        inStock: list.filter(isInStock).length,
        mix: categories
          .map((c) => ({ category: c.slug, label: MIX_LABEL[c.slug], count: list.filter((p) => p.category === c.slug).length }))
          .filter((m) => m.count > 0),
      }
    })
  const countries = new Set(brands.map((b) => b.country)).size

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Brands",
    itemListElement: entries.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/brands/${b.slug}`, name: b.name })),
  }

  return (
    <>
      <ListingHeader
        crumbs={[{ label: "Brands" }]}
        eyebrow="Every maker on the grid"
        title="Brands"
        description="The makers we stock, sorted by what they build — from ready-to-run cars to the motors, tires and controllers that make them quicker."
        stats={[
          { label: "Brands", value: String(brands.length), count: brands.length },
          { label: "Countries", value: String(countries), count: countries },
          { label: "Products", value: String(products.length), count: products.length },
        ]}
      />
      <BrandDirectory entries={entries} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
