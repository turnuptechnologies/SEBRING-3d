import { ArrowRight, Bell } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { BuyButton } from "@/components/home/grid/buy-button"
import { GridFloor } from "@/components/home/grid/grid-floor"
import { SlotParallax } from "@/components/home/grid/slot-parallax"
import { StockNote } from "@/components/home/grid/stock-note"
import { HudCorners } from "@/components/site/hud-corners"
import { Price } from "@/components/site/price"
import { ProductImage } from "@/components/site/product-image"
import { Button } from "@/components/ui/button"
import { brandName, isInStock, isOnSale, isPreorder, subcategoryLabel } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { discountPercent, formatScales } from "@/lib/format"
import { cn } from "@/lib/utils"

const IMAGE_SIZES = "(min-width: 1024px) 820px, (min-width: 640px) 62vw, 86vw"

/** Coarse aggregate speckle for the asphalt (the global grain is too fine on its own). */
const ASPHALT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .95 0 0 0 0 .94 0 0 0 0 .9 0 0 0 2.4 -1.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")"

/** Up to three telemetry specs; scale is already shown beside the brand. */
const keySpecs = (car: Product) => car.specs.filter((s) => s.label.toLowerCase() !== "scale").slice(0, 3)

/**
 * One grid slot: the car's side render parked in a painted grid box on night
 * asphalt, its position as a huge outlined numeral, and a one-click buy.
 * Stacked on small screens; full-bleed with an info bar from `lg`.
 */
export function GridSlot({ car, position }: { car: Product; position: number }) {
  const id = `grid-p${position}`
  // productHref lives in a client module; same route, computed server-side.
  const href = `/products/${car.slug}`
  const livery = car.art.kind === "car" ? car.art.livery : undefined
  const beam = livery?.headlights === "white" ? "#f3efe6" : "#ffd23f"
  const specs = keySpecs(car)
  const inStock = isInStock(car)
  const off = discountPercent(car.price, car.compareAtPrice)
  const telemetry = [car.vehicle?.year, car.attributes?.build, car.attributes?.operation].filter(Boolean).join(" · ")

  return (
    <li data-grid-slot className="shrink-0 snap-start">
      <article
        data-grid-card
        tabIndex={0}
        aria-labelledby={`${id}-pos ${id}-name`}
        className={cn(
          "group/slot relative isolate flex w-[min(86vw,25rem)] flex-col overflow-hidden rounded-lg border border-hairline bg-carbon-850 shadow-card outline-none",
          "transition-[border-color] duration-500 ease-out-expo hover:border-ivory-100/16 data-[active=true]:border-ivory-100/14",
          "after:pointer-events-none after:absolute after:inset-0 after:z-30 after:rounded-lg after:border-2 after:border-volt after:opacity-0 after:transition-opacity focus-visible:after:opacity-100",
          "sm:w-[min(62vw,34rem)] lg:h-(--panel-h) lg:w-(--panel-w)"
        )}
      >
        {/* Stage: everything inside sizes off the stage itself (container units). */}
        <div
          className={cn(
            "relative aspect-[4/3] w-full shrink-0 overflow-hidden [container-type:size] [--ground:63cqh]",
            "sm:aspect-[16/11] sm:[--ground:61cqh] lg:absolute lg:inset-0 lg:aspect-auto lg:[--ground:56cqh]"
          )}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(85%_70%_at_60%_0%,rgb(243_239_230/0.085),transparent_62%),linear-gradient(180deg,#14141a_0%,#0f0f14_50%,#09090d_100%)]"
          />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-size:260px]" style={{ backgroundImage: ASPHALT }} />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[calc(var(--ground)_-_8cqh)] h-[44cqh] bg-[linear-gradient(180deg,transparent,rgb(243_239_230/0.03)_22%,transparent)]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_45%,transparent_55%,rgb(0_0_0/0.5))]" />

          <SlotParallax factor={0.12} className="pointer-events-none absolute top-[3cqh] left-[3.5cqw] select-none">
            <span
              aria-hidden="true"
              className={cn(
                "block font-wide text-[44cqh] leading-[0.78] font-black tracking-[-0.06em] text-transparent",
                "[-webkit-text-stroke:1.25px_rgb(243_239_230/0.16)] transition-[-webkit-text-stroke-color] duration-700 ease-out-expo",
                "group-hover/slot:[-webkit-text-stroke-color:rgb(255_210_63/0.55)] group-data-[active=true]/slot:[-webkit-text-stroke-color:rgb(255_210_63/0.42)]"
              )}
            >
              P{position}
            </span>
          </SlotParallax>

          <SlotParallax
            factor={-0.045}
            className={cn(
              "absolute aspect-[4/3] w-(--img-w) [--img-w:min(88cqw,150cqh)]",
              "top-[calc(var(--ground)_-_0.48_*_var(--img-w))] left-[calc(54cqw_-_var(--img-w)/2)]",
              "lg:left-[calc(57cqw_-_var(--img-w)/2)] lg:[--img-w:min(74cqw,128cqh)]"
            )}
          >
            <GridFloor beam={beam} uid={id} />
            {/* Wet-track reflection: the render mirrored about its ground line. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 origin-[50%_64%] -scale-y-100 opacity-25 blur-[1.5px] [mask-image:linear-gradient(to_bottom,transparent_42%,#000_63.4%,transparent_64.2%)] [&_.label-mono]:hidden"
            >
              <ProductImage product={car} view="side" sizes={IMAGE_SIZES} />
            </div>
            <Link
              href={href}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-0 block transition-transform duration-700 ease-out-expo group-hover/slot:-translate-y-[1.2%] [&_.label-mono]:hidden"
            >
              <ProductImage product={car} view="side" sizes={IMAGE_SIZES} />
            </Link>
          </SlotParallax>

          <div className="absolute top-[5cqh] right-[4cqw] flex flex-col items-end gap-2 text-right">
            <div className="flex flex-wrap justify-end gap-1.5">
              {car.isNew && inStock && <Tag tone="volt">New</Tag>}
              {isOnSale(car) && <Tag tone="signal">−{off}%</Tag>}
              {isPreorder(car) && <Tag tone="outline">Pre-order</Tag>}
            </div>
            <p aria-hidden="true" className="hidden label-mono text-smoke-300 sm:block">
              {subcategoryLabel(car.subcategory)}
            </p>
            {telemetry && (
              <p aria-hidden="true" className="hidden label-mono text-smoke-500 sm:block">
                {telemetry}
              </p>
            )}
          </div>

          <HudCorners className="opacity-0 transition-opacity duration-500 group-focus-within/slot:opacity-100 group-hover/slot:opacity-100" />
        </div>

        {/* Info: below the stage on small screens, an over-the-floor bar from lg. */}
        <div
          className={cn(
            "relative z-10 flex flex-1 flex-col gap-5 border-t border-hairline p-5 sm:p-6",
            "lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex-none lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:border-0 lg:px-9 lg:pt-28 lg:pb-8",
            "lg:bg-[linear-gradient(to_top,var(--color-carbon-950)_20%,rgb(6_6_9/0.8)_55%,transparent)]"
          )}
        >
          <div className="min-w-0 lg:max-w-[36rem]">
            <p className="label-mono text-smoke-400">
              <span id={`${id}-pos`} className="text-volt">
                P{position}
              </span>
              <span aria-hidden="true" className="mx-2 text-smoke-600">
                /
              </span>
              {brandName(car.brand)} · {formatScales(car.scales)}
            </p>
            <h3
              id={`${id}-name`}
              className="mt-3 font-semiwide text-[1.25rem] leading-[1.12] font-bold tracking-[-0.015em] text-balance text-ivory-100 sm:text-2xl lg:text-[clamp(1.5rem,2.1vw,2.125rem)]"
            >
              {car.name}
            </h3>
            {specs.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-x-4 font-mono text-[0.6875rem] uppercase sm:grid-cols-3 sm:gap-x-5 lg:gap-x-8">
                {specs.map((s, i) => (
                  <div key={s.label} className={cn("min-w-0 border-l border-ivory-100/12 pl-3", i > 1 && "max-sm:hidden")}>
                    <dt className="truncate text-[0.625rem] tracking-[0.2em] text-smoke-500">{s.label}</dt>
                    <dd className="mt-1.5 leading-snug tracking-[0.04em] text-ivory-100/90">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-4 lg:mt-0 lg:shrink-0 lg:items-end">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:flex-col lg:items-end lg:gap-2.5">
              <Price price={car.price} compareAt={car.compareAtPrice} size="lg" className="text-ivory-100" />
              <StockNote product={car} />
            </div>
            <div className="flex gap-2">
              {inStock ? (
                <BuyButton slug={car.slug} name={car.name} preorder={isPreorder(car)} className="flex-1 lg:flex-none" />
              ) : (
                <Button variant="outline" asChild className="relative z-10 flex-1 lg:flex-none">
                  <Link href={`${href}#notify`} aria-label={`Notify me when ${car.name} is back`}>
                    <Bell />
                    Notify me
                  </Link>
                </Button>
              )}
              <Button variant="glass" asChild className="relative z-10">
                <Link href={href} aria-label={`View ${car.name}`}>
                  View
                  <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}

function Tag({ tone, children }: { tone: "volt" | "signal" | "outline"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "label-mono rounded-[3px] px-2 py-1.5 text-[0.625rem] leading-none font-semibold",
        tone === "volt" && "bg-volt text-carbon-900",
        tone === "signal" && "bg-signal text-white",
        tone === "outline" && "text-volt ring-1 ring-volt/50"
      )}
    >
      {children}
    </span>
  )
}
