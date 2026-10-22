import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { GridRail } from "@/components/home/grid/grid-rail"
import { GridSlot } from "@/components/home/grid/grid-slot"
import { RevealText } from "@/components/motion/reveal-text"
import { ArrowLink } from "@/components/site/arrow-link"
import { Eyebrow } from "@/components/site/section-heading"
import { Button } from "@/components/ui/button"
import { brandName, isCar, isInStock, isPreorder, products, scaleHref, sortProducts } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"

const GRID_SIZE = 6
const ALL_CARS = "/collections/slot-cars"

/** Featured cars first (then new, then in stock), up to six grid slots. */
function gridCars(): Product[] {
  return sortProducts(products.filter(isCar), "featured").slice(0, GRID_SIZE)
}

/**
 * The Starting Grid — the featured cars lined up as grid slots P1–P6. On wide
 * screens with a mouse the section pins and the grid rolls past sideways as
 * you scroll; elsewhere it is a swipeable carousel.
 */
export function StartingGrid() {
  const cars = gridCars()
  if (!cars.length) return null

  return (
    <section id="starting-grid" aria-label="The starting grid" className="relative bg-carbon-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ivory-100/14 to-transparent" />
      <GridRail
        label={`Featured slot cars, grid positions 1 to ${cars.length}`}
        sectors={cars.map((car, i) => ({ label: `P${i + 1}`, name: car.name }))}
        intro={<GridIntro count={cars.length} />}
        outro={<GridOutro />}
      >
        {cars.map((car, i) => (
          <GridSlot key={car.slug} car={car} position={i + 1} />
        ))}
      </GridRail>
    </section>
  )
}

const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"]

function GridIntro({ count }: { count: number }) {
  return (
    <div className="max-w-xl">
      <Eyebrow index={3}>The starting grid</Eyebrow>
      <RevealText
        as="h2"
        text="Pick your pole sitter"
        className="mt-5 font-wide text-headline font-black uppercase text-balance pointer-fine:lg:motion-safe:text-[clamp(2.75rem,4.4vw,4.5rem)] [&>span]:inline"
      />
      <p className="mt-6 max-w-md text-base leading-relaxed text-pretty text-muted-foreground md:text-[1.0625rem]">
        {COUNT_WORDS[count] ?? count} featured {count === 1 ? "car" : "cars"}, gridded up from pole. Every slot is one click from your cart — or open it for the full spec
        sheet.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
        <ArrowLink href={ALL_CARS}>Shop all slot cars</ArrowLink>
      </div>
      <p aria-hidden="true" className="mt-14 hidden items-center gap-4 label-mono text-smoke-500 pointer-fine:lg:motion-safe:flex">
        <span className="relative h-px w-14 overflow-hidden bg-smoke-600/60">
          <span className="absolute inset-y-0 left-0 w-1/2 animate-sweep bg-volt" />
        </span>
        Scroll to run the grid
      </p>
    </div>
  )
}

function GridOutro() {
  const cars = products.filter(isCar)
  const inStock = cars.filter(isInStock)
  const makers = new Set(cars.map((c) => c.brand))
  const count = (pred: (p: Product) => boolean) => cars.filter(pred).length
  const links = [
    { label: "New arrivals", href: "/collections/new-arrivals", n: count((p) => Boolean(p.isNew)) },
    { label: "Pre-orders", href: "/collections/pre-orders", n: count(isPreorder) },
    { label: "1:32 cars", href: scaleHref("1:32", "slot-cars"), n: count((p) => p.scales.includes("1:32")) },
    { label: "1:24 cars", href: scaleHref("1:24", "slot-cars"), n: count((p) => p.scales.includes("1:24")) },
  ].filter((l) => l.n > 0)
  const topMakers = [...makers].slice(0, 3).map(brandName)
  const stats = [
    { label: "Cars", value: cars.length },
    { label: "In stock", value: inStock.length },
    { label: "Makers", value: makers.size },
  ]

  return (
    <li data-grid-outro className="shrink-0 snap-start">
      <div className="relative isolate flex h-full w-[min(86vw,25rem)] flex-col justify-between gap-8 overflow-hidden rounded-lg border border-hairline bg-carbon-900 p-6 sm:w-[min(62vw,34rem)] sm:p-8 lg:h-(--panel-h) lg:w-(--outro-w) lg:p-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-checker opacity-[0.05] [--checker-size:22px] [mask-image:radial-gradient(120%_70%_at_100%_0%,#000,transparent_70%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_20%_100%,rgb(255_210_63/0.07),transparent_70%)]" />
        <div>
          <p className="label-mono text-smoke-400">Chequered flag</p>
          <h3 className="mt-5 font-wide text-[clamp(2rem,3.4vw,3.25rem)] leading-[0.9] font-black tracking-[-0.03em] uppercase">The full field</h3>
          <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
            {inStock.length >= 10
              ? `${inStock.length} cars from ${makers.size} makers ready to ship — filter by scale, brand, series and era.`
              : `Every car we stock from ${topMakers.join(", ")}${makers.size > 3 ? " and more" : ""} — filter by scale, brand, series and era.`}
          </p>
        </div>
        <dl className="grid grid-cols-3 border-y border-hairline">
          {stats.map((s) => (
            <div key={s.label} className="border-l border-hairline py-5 pl-4 first:border-l-0 first:pl-0">
              <dt className="label-mono text-smoke-500">{s.label}</dt>
              <dd className="mt-3 font-wide text-[clamp(1.75rem,2.6vw,2.5rem)] leading-none font-black tracking-[-0.03em] tabular">{String(s.value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-6">
          <Button variant="volt" size="lg" asChild className="self-start">
            <Link href={ALL_CARS}>
              Shop all slot cars
              <ArrowRight />
            </Link>
          </Button>
          {links.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="More ways into the cars">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-ivory-100/14 px-4 text-sm text-ivory-100/90 transition-colors hover:border-ivory-100/40 hover:bg-ivory-100/[0.04] focus-visible:border-volt"
                  >
                    {l.label}
                    <span className="font-mono text-[0.6875rem] text-smoke-500 tabular">{l.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}
