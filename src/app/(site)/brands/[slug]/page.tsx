import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BrandSpec, RelatedBrands } from "@/components/collection/brand-hero"
import { brandListing, brandProducts, itemListJsonLd } from "@/components/collection/listing-configs"
import { ListingHeader } from "@/components/collection/listing-header"
import { brandGroupLabel, headerStats } from "@/components/collection/listing-model"
import { HeaderSkeleton, ListingSkeleton } from "@/components/collection/listing-skeleton"
import { ListingView } from "@/components/collection/listing-view"
import { brands, getBrand, sortProducts } from "@/lib/catalog"

type Params = Promise<{ slug: string }>

export function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const brand = getBrand(slug)
  if (!brand) return { title: "Brand not found", robots: { index: false } }
  const title = brand.group === "cars" ? `${brand.name} slot cars & parts` : `${brand.name} slot car ${brand.group === "parts" ? "parts" : "controllers & electronics"}`
  return {
    title,
    description: `${brand.blurb} Shop ${brand.name} at Sebring — ${brand.scales.join(" & ")} scale, tracked shipping on every order.`,
    alternates: { canonical: `/brands/${brand.slug}` },
    openGraph: { title, description: brand.blurb, url: `/brands/${brand.slug}` },
  }
}

export default function BrandPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <ListingSkeleton kind="brand" />
        </>
      }
    >
      <BrandRoute params={params} />
    </Suspense>
  )
}

async function BrandRoute({ params }: { params: Params }) {
  const { slug } = await params
  const brand = getBrand(slug)
  if (!brand) notFound()

  const list = sortProducts(brandProducts(brand))
  const config = brandListing(brand, list)

  return (
    <>
      <ListingHeader
        crumbs={[{ label: "Brands", href: "/brands" }, { label: brand.name }]}
        eyebrow={`${brandGroupLabel(brand.group)} · ${brand.country}`}
        title={brand.name}
        description={brand.blurb}
        stats={headerStats(list, "types")}
        watermark={brand.name}
        aside={<BrandSpec brand={brand} list={list} />}
      />
      <Suspense fallback={<ListingSkeleton kind="brand" />}>
        <ListingView config={config} />
      </Suspense>
      <RelatedBrands brand={brand} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(list, `${brand.name} at Sebring`)) }} />
    </>
  )
}
