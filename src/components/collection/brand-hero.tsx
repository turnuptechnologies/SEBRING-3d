import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { brandGroupLabel } from "@/components/collection/listing-model"
import { HudCorners } from "@/components/site/hud-corners"
import { brands, filterProducts, isInStock, products } from "@/lib/catalog"
import type { Brand, Product } from "@/lib/catalog/types"
import { formatPrice } from "@/lib/format"

/** The brand landing's right-hand "spec sheet" — facts only, from catalog data. */
export function BrandSpec({ brand, list }: { brand: Brand; list: readonly Product[] }) {
  const prices = list.map((p) => p.price)
  const rows = [
    { label: "Origin", value: brand.country },
    { label: "Builds", value: brandGroupLabel(brand.group) },
    { label: "Scales", value: brand.scales.join(" · ") },
    { label: "In stock", value: list.length ? `${list.filter(isInStock).length} of ${list.length}` : "Restocking" },
    ...(prices.length ? [{ label: "Range", value: prices.length > 1 ? `${formatPrice(Math.min(...prices))} – ${formatPrice(Math.max(...prices))}` : formatPrice(prices[0]) }] : []),
  ]
  return (
    <div className="relative ml-auto w-full max-w-[22rem] rounded-lg border border-hairline bg-carbon-850/75 p-5 backdrop-blur-md">
      <HudCorners size={12} inset={8} className="opacity-60" />
      <p className="flex items-center justify-between label-mono text-[0.5625rem] text-muted-foreground">
        <span>Spec sheet</span>
        <span className="text-foreground/40">{brand.name}</span>
      </p>
      <dl className="mt-4 divide-y divide-hairline">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="label-mono text-[0.5625rem] text-muted-foreground">{r.label}</dt>
            <dd className="text-right text-sm font-medium text-foreground tabular">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** "More car makers" — sideways navigation to sibling brands. */
export function RelatedBrands({ brand }: { brand: Brand }) {
  const siblings = brands.filter((b) => b.group === brand.group && b.slug !== brand.slug).sort((a, b) => a.name.localeCompare(b.name))
  if (!siblings.length) return null
  return (
    <section aria-labelledby="related-brands" className="border-t border-hairline">
      <div className="container-site py-14 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="related-brands" className="font-wide text-[clamp(1.35rem,2.2vw,1.9rem)] leading-none font-black tracking-[-0.025em] uppercase">
            More {brandGroupLabel(brand.group).toLowerCase()}
          </h2>
          <Link href="/brands" className="text-sm text-muted-foreground underline decoration-foreground/20 underline-offset-4 hover:text-foreground hover:decoration-volt">
            All brands
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2">
          {siblings.map((b) => {
            const count = filterProducts(products, { brands: [b.slug] }).length
            return (
              <li key={b.slug}>
                <Link
                  href={`/brands/${b.slug}`}
                  className="group/rb inline-flex h-12 items-center gap-3 rounded-sm border border-foreground/12 pr-3 pl-4 outline-none transition-colors hover:border-foreground/35 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-semiwide text-xs font-bold tracking-[0.06em] uppercase">{b.name}</span>
                  <span className="font-mono text-[0.6875rem] text-muted-foreground tabular">{count}</span>
                  <ArrowUpRight aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform group-hover/rb:translate-x-0.5 group-hover/rb:-translate-y-0.5" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
