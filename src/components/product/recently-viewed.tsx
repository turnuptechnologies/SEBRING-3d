"use client"

import { useEffect } from "react"

import { useStoresReady } from "@/components/product/use-stores-ready"
import { ProductRail } from "@/components/site/product-rail"
import { SectionHeading } from "@/components/site/section-heading"
import { getProducts } from "@/lib/catalog"
import { useHydrated } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"

/** Records this view, then shows the shopper's other recent products (client-only — it lives in localStorage). */
export function RecentlyViewed({ current, index }: { current: string; index?: number }) {
  const hydrated = useHydrated()
  const ready = useStoresReady()
  const recent = useGarage((s) => s.recent)
  const trackView = useGarage((s) => s.trackView)

  // Track only after the persisted garage has loaded, or rehydration would overwrite it.
  useEffect(() => {
    if (hydrated) trackView(current)
  }, [hydrated, current, trackView])

  if (!ready) return null
  const items = getProducts(recent.filter((slug) => slug !== current)).slice(0, 10)
  if (!items.length) return null

  return (
    <section className="border-t border-hairline">
      <div className="container-site py-16 md:py-24">
        <ProductRail
          products={items}
          label="Recently viewed"
          header={<SectionHeading eyebrow="Pick up where you left off" index={index} title="Recently viewed" />}
        />
      </div>
    </section>
  )
}
