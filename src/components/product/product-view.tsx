import { BuyBox } from "@/components/product/buy-box"
import { ShareButton } from "@/components/product/copy-value"
import { KeySpecs } from "@/components/product/key-specs"
import { ProductGallery } from "@/components/product/product-gallery"
import { ProductJsonLd } from "@/components/product/product-json-ld"
import { FitmentPanel, OverviewPanel, ShippingPanel, SpecsPanel } from "@/components/product/product-panels"
import { ProductTabs } from "@/components/product/product-tabs"
import { PurchaseProvider } from "@/components/product/purchase-context"
import { RecentlyViewed } from "@/components/product/recently-viewed"
import { StickyBuyBar } from "@/components/product/sticky-buy-bar"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { ProductRail } from "@/components/site/product-rail"
import { SectionHeading } from "@/components/site/section-heading"
import {
  brandName,
  categoryHref,
  categoryLabel,
  compatibleParts,
  isCar,
  productImages,
  relatedProducts,
  subcategoryHref,
  subcategoryLabel,
} from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { site } from "@/lib/site"

/** The product detail page body. */
export function ProductView({ product }: { product: Product }) {
  const images = productImages(product)
  const upgrades = isCar(product) ? compatibleParts(product, 12) : []
  const related = relatedProducts(product, 10)
  const subLabel = subcategoryLabel(product.subcategory)

  return (
    <PurchaseProvider product={product}>
      <ProductJsonLd product={product} images={images} />

      <div className="container-site flex items-start justify-between gap-4 pt-5 md:items-center md:pt-8">
        <Breadcrumbs
          baseUrl={site.url}
          className="min-w-0 pt-2.5 leading-relaxed md:pt-0 max-md:[&_li:last-child]:hidden max-md:[&_li:nth-last-child(2)>svg]:hidden"
          items={[
            { label: categoryLabel(product.category), href: categoryHref(product.category) },
            { label: subLabel, href: subcategoryHref(product.subcategory) },
            { label: product.name },
          ]}
        />
        <ShareButton title={`${brandName(product.brand)} ${product.name}`} />
      </div>

      <div className="container-site grid gap-8 pt-5 pb-16 md:pt-8 lg:grid-cols-12 lg:gap-x-10 lg:pb-24 xl:gap-x-16">
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-[calc(var(--header-h,4rem)+1.5rem)]">
            <ProductGallery product={product} images={images} />
          </div>
        </div>
        <div className="lg:col-span-5">
          <BuyBox upgradeCount={upgrades.length} />
        </div>
      </div>

      <KeySpecs product={product} />

      <ProductTabs
        title="The details"
        panels={{
          overview: <OverviewPanel product={product} />,
          specs: <SpecsPanel product={product} />,
          fitment: <FitmentPanel product={product} upgrades={upgrades} />,
          shipping: <ShippingPanel />,
        }}
      />

      {related.length > 0 && (
        <section className="border-t border-hairline">
          <div className="container-site py-16 md:py-24">
            <ProductRail
              products={related}
              label="You may also like"
              header={<SectionHeading eyebrow="Keep exploring" index={2} title="You may also like" />}
            />
          </div>
        </section>
      )}

      <RecentlyViewed current={product.slug} index={3} />

      {/* Room for the mobile quick-buy bar so it never covers the last content. */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <StickyBuyBar />
    </PurchaseProvider>
  )
}
