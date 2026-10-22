import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { collectionCrumbs, collectionListing, itemListJsonLd } from "@/components/collection/listing-configs"
import { ListingHeader } from "@/components/collection/listing-header"
import { headerStats } from "@/components/collection/listing-model"
import { HeaderSkeleton, ListingSkeleton } from "@/components/collection/listing-skeleton"
import { ListingView } from "@/components/collection/listing-view"
import { collectionProducts, collections, getCategory, getCollection, sortProducts } from "@/lib/catalog"

type Params = Promise<{ slug: string }>

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const collection = getCollection(slug)
  if (!collection) return { title: "Collection not found", robots: { index: false } }
  const url = `/collections/${collection.slug}`
  return {
    title: collection.slug === "all" ? "Shop slot cars, parts & track" : collection.title,
    description: collection.description,
    alternates: { canonical: url },
    openGraph: { title: collection.title, description: collection.description, url },
  }
}

export default function CollectionPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <ListingSkeleton kind="collection" />
        </>
      }
    >
      <CollectionRoute params={params} />
    </Suspense>
  )
}

async function CollectionRoute({ params }: { params: Params }) {
  const { slug } = await params
  const collection = getCollection(slug)
  if (!collection) notFound()

  const config = collectionListing(collection)
  const list = sortProducts(collectionProducts(collection))
  const tiles = config.category ? (getCategory(config.category)?.subcategories.length ?? 6) : 6

  return (
    <>
      <ListingHeader
        crumbs={collectionCrumbs(collection)}
        eyebrow={collection.eyebrow}
        title={collection.title}
        description={collection.description}
        stats={headerStats(list)}
      />
      <Suspense fallback={<ListingSkeleton kind={config.kind} tiles={tiles} />}>
        <ListingView config={config} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(list, collection.title)) }} />
    </>
  )
}
