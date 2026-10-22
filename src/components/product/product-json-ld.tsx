import { absoluteUrl, productPath, schemaAvailability, stockState } from "@/components/product/product-facts"
import { brandName, categoryLabel, subcategoryLabel, type ProductImage } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { commerce, site } from "@/lib/site"

/** schema.org Product + Offer for rich results. */
export function ProductJsonLd({ product, images }: { product: Product; images: ProductImage[] }) {
  const url = absoluteUrl(productPath(product))
  const stock = stockState(product)
  const brand = brandName(product.brand)
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brand} ${product.name}`,
    description: product.summary,
    sku: product.sku,
    ...(product.mpn ? { mpn: product.mpn } : {}),
    brand: { "@type": "Brand", name: brand },
    category: `${categoryLabel(product.category)} > ${subcategoryLabel(product.subcategory)}`,
    ...(images.length ? { image: images.map((i) => absoluteUrl(i.src)) } : {}),
    url,
    releaseDate: product.releasedAt,
    offers: {
      "@type": "Offer",
      url,
      price: product.price.toFixed(2),
      priceCurrency: commerce.currency,
      availability: schemaAvailability(stock),
      ...(stock.kind === "preorder" ? { availabilityStarts: stock.ships } : {}),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: site.name, url: site.url },
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
}
