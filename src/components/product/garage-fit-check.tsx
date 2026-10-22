"use client"

import { Check, Minus, Warehouse } from "lucide-react"
import Link from "next/link"

import { useStoresReady } from "@/components/product/use-stores-ready"
import { productHref } from "@/components/site/product-card"
import { brandName, fitsAnyCar, getProducts, isCar } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useGarage } from "@/lib/commerce/garage-store"
import { cn } from "@/lib/utils"

/** "Does it fit my cars?" — checks the part against every car saved in My Garage. */
export function GarageFitCheck({ product }: { product: Product }) {
  const hydrated = useStoresReady()
  const saved = useGarage((s) => s.saved)
  const cars = hydrated ? getProducts(saved).filter(isCar) : []
  const fitting = cars.filter((c) => fitsAnyCar(product, [c.slug])).length

  return (
    <div className="rounded-lg border border-hairline bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2.5 font-semiwide text-base font-bold tracking-[-0.01em]">
          <Warehouse className="size-[1.1rem] text-foreground/70" aria-hidden="true" />
          Check your garage
        </h3>
        {cars.length > 0 && (
          <span className="label-mono text-[0.625rem] text-muted-foreground tabular">
            {fitting}/{cars.length} fit
          </span>
        )}
      </div>

      {!hydrated ? (
        <div className="mt-5 space-y-2" aria-hidden="true">
          <div className="h-11 rounded-sm bg-muted skeleton-shimmer" />
          <div className="h-11 rounded-sm bg-muted skeleton-shimmer" />
        </div>
      ) : cars.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground text-pretty">
          Save the cars you race to{" "}
          <Link href="/garage" className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-volt">
            My Garage
          </Link>{" "}
          and we’ll check every part against them — here and across the shop.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
          {cars.map((car) => {
            const ok = fitsAnyCar(product, [car.slug])
            return (
              <li key={car.slug} className="flex items-center gap-3 py-3">
                <span
                  className={cn("grid size-6 shrink-0 place-items-center rounded-full", ok ? "bg-go/14 text-go" : "bg-foreground/[0.06] text-foreground/40")}
                  aria-hidden="true"
                >
                  {ok ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
                </span>
                <Link href={productHref(car)} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  <span className="text-muted-foreground">{brandName(car.brand)} </span>
                  {car.name}
                </Link>
                <span className={cn("shrink-0 label-mono text-[0.625rem]", ok ? "text-go" : "text-muted-foreground")}>{ok ? "Fits" : "Not listed"}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
