// TEMPORARY QA route for the product page (deleted before hand-off).
import { BuyBox } from "@/components/product/buy-box"
import { ProductGallery } from "@/components/product/product-gallery"
import { PurchaseProvider } from "@/components/product/purchase-context"
import { StickyBuyBar } from "@/components/product/sticky-buy-bar"
import { brandName, getProduct, type ProductImage } from "@/lib/catalog"
import type { Product, ProductView } from "@/lib/catalog/types"

import { LAB_MEDIA } from "./lab-media"

const images = (p: Product, from = p.slug): ProductImage[] =>
  p.views
    .filter((v) => LAB_MEDIA[`${from}/${v}`])
    .map((view: ProductView) => ({ src: LAB_MEDIA[`${from}/${view}`], view, alt: `${brandName(p.brand)} ${p.name} — ${view}` }))

function Block({ id, product, from, upgrades = 0, sticky = false }: { id: string; product: Product; from?: string; upgrades?: number; sticky?: boolean }) {
  return (
    <section id={id} data-lab={id} className="container-site grid gap-8 border-b border-hairline py-12 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-16">
      <PurchaseProvider product={product}>
        <div className="lg:col-span-7">
          <ProductGallery product={product} images={images(product, from)} />
        </div>
        <div className="lg:col-span-5">
          <BuyBox upgradeCount={upgrades} />
        </div>
        {sticky && <StickyBuyBar />}
      </PurchaseProvider>
    </section>
  )
}

export default function GalleryLab() {
  const car = getProduct("porsche-962c-night-shift-12")!
  const motor = getProduct("slot-it-v12-4-21500-motor")!
  return (
    <div className="pb-40">
      <Block id="car" product={car} upgrades={2} sticky />
      <Block id="soldout" product={{ ...motor, stock: 0 }} />
      <Block id="preorder" from={car.slug} product={{ ...car, slug: "lab-preorder", stock: 3, isNew: false, compareAtPrice: 109.99, preorder: { ships: "2026-12-04" } }} upgrades={2} />
    </div>
  )
}
