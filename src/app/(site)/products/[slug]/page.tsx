import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { productPath } from "@/components/product/product-facts"
import { ProductPageSkeleton } from "@/components/product/product-skeleton"
import { ProductView } from "@/components/product/product-view"
import { brandName, getProduct, primaryImage, products } from "@/lib/catalog"
import { site } from "@/lib/site"

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) return { title: "Product not found", robots: { index: false, follow: true } }

  const title = `${product.name} — ${brandName(product.brand)}`
  const image = primaryImage(product)
  const images = image ? [{ url: image.src, width: 1600, height: 1200, alt: image.alt }] : undefined
  return {
    title,
    description: product.summary,
    alternates: { canonical: productPath(product) },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_US",
      url: productPath(product),
      title,
      description: product.summary,
      images,
    },
    twitter: { card: "summary_large_image", title, description: product.summary, images: image ? [image.src] : undefined },
  }
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  )
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) notFound()
  return <ProductView product={product} />
}
