"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Heart, Plus, ShoppingBag, Trash2, Wrench, X } from "lucide-react"
import Link from "next/link"
import { useId, useState } from "react"
import { toast } from "sonner"

import { ArtGlow } from "@/components/cart/art-glow"
import { useStoresReady } from "@/components/cart/use-stores-ready"
import { EASE_OUT_EXPO } from "@/components/motion"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { HudCorners } from "@/components/site/hud-corners"
import { ProductCard, ProductCardSkeleton, productHref } from "@/components/site/product-card"
import { ProductImage } from "@/components/site/product-image"
import { ProductRail } from "@/components/site/product-rail"
import { Eyebrow, SectionHeading } from "@/components/site/section-heading"
import { Button } from "@/components/ui/button"
import { brandName, collectionProducts, fitsAnyCar, getProducts, isCar, isInStock, isPart } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useCart } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { maxQtyFor } from "@/lib/commerce/pricing"
import { formatScales, indexLabel, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"

type Filter = "all" | "cars" | "parts" | "other"

const FILTERS: { value: Filter; label: string; test: (p: Product) => boolean }[] = [
  { value: "all", label: "All", test: () => true },
  { value: "cars", label: "Cars", test: isCar },
  { value: "parts", label: "Parts", test: isPart },
  { value: "other", label: "Track & more", test: (p) => !isCar(p) && !isPart(p) },
]

const fitsHref = (cars: readonly Product[]) => `/collections/parts?fits=${cars.map((c) => c.slug).join(",")}`

export function GarageView() {
  const ready = useStoresReady()
  const savedSlugs = useGarage((s) => s.saved)
  const recentSlugs = useGarage((s) => s.recent)
  const saved = getProducts(savedSlugs)
  const recent = getProducts(recentSlugs)
  const cars = saved.filter(isCar)
  const nothing = ready && saved.length === 0 && recent.length === 0

  return (
    <div className="relative overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-hairline-grid opacity-70 [--grid-size:72px] mask-fade-b" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-64 right-[-10%] h-[34rem] w-[52rem] rounded-full bg-volt/[0.04] blur-3xl" />

      <div className="relative container-site pt-8 pb-24 md:pt-10 md:pb-32">
        <Breadcrumbs items={[{ label: "My Garage" }]} />

        <header className="mt-10 grid gap-10 md:mt-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>Saved on this device</Eyebrow>
            <h1 className="mt-5 font-wide text-display font-black uppercase">My garage</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground md:text-[1.0625rem]">
              The cars you race, the parts you’re eyeing and everything you looked at last. Park your cars here and we’ll show the upgrades that fit them.
            </p>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-card/70 backdrop-blur-md lg:col-span-5">
            {[
              { label: "Saved", value: saved.length },
              { label: "Cars", value: cars.length },
              { label: "Viewed", value: recent.length },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-5 sm:px-6">
                <dt className="label-mono text-[0.625rem] text-muted-foreground">{stat.label}</dt>
                <dd className="mt-3 font-wide text-[2rem] leading-none font-black tracking-[-0.03em] tabular sm:text-[2.5rem]">
                  {ready ? indexLabel(stat.value) : <span className="inline-block h-[0.8em] w-[1.6em] rounded-sm bg-muted skeleton-shimmer align-middle" aria-hidden="true" />}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {!ready ? (
          <div className="mt-20 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : nothing ? (
          <GarageEmpty />
        ) : (
          <>
            <MyCars cars={cars} />
            <SavedItems saved={saved} />
            <section aria-label="Recently viewed" className="mt-24 md:mt-32">
              {recent.length > 0 ? (
                <ProductRail
                  products={recent}
                  label="Recently viewed products"
                  header={<SectionHeading index={3} eyebrow="Recently viewed" title="Pick up where you left off" />}
                />
              ) : (
                <>
                  <SectionHeading index={3} eyebrow="Recently viewed" title="Pick up where you left off" />
                  <p className="mt-6 text-sm text-muted-foreground">Products you look at will line up here.</p>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * My cars — saved slot cars, each a bay with "Shop parts that fit"
 * ------------------------------------------------------------------------- */

function MyCars({ cars }: { cars: Product[] }) {
  const parts = collectionProducts("parts")
  const fitCount = (car: Product) => parts.filter((p) => fitsAnyCar(p, [car.slug])).length
  const total = parts.filter((p) => fitsAnyCar(p, cars.map((c) => c.slug))).length

  const remove = (car: Product) => {
    const before = useGarage.getState().saved
    const index = before.indexOf(car.slug)
    useGarage.getState().removeSaved(car.slug)
    toast("Removed from your garage", {
      description: car.name,
      action: {
        label: "Undo",
        onClick: () =>
          useGarage.setState((s) => (s.saved.includes(car.slug) ? s : { saved: [...s.saved.slice(0, index), car.slug, ...s.saved.slice(index)] })),
      },
    })
  }

  return (
    <section aria-labelledby="garage-cars" className="mt-20 md:mt-28">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <Eyebrow index={1}>My cars</Eyebrow>
          <h2 id="garage-cars" className="mt-4 font-wide text-headline font-black uppercase text-balance">
            The cars you race
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
            Every saved slot car parks here. Shop the motors, tires, gears and magnets that fit them — matched on brand and scale.
          </p>
        </div>
        {cars.length > 0 && total > 0 && (
          <Button asChild size="lg" className="shrink-0">
            <Link href={fitsHref(cars)}>
              <Wrench />
              Parts that fit {cars.length > 1 ? `all ${cars.length} cars` : "my car"}
            </Link>
          </Button>
        )}
      </div>

      {cars.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-6 rounded-lg border border-dashed border-foreground/15 bg-card/40 p-6 sm:flex-row sm:items-center sm:p-8">
          <BayArt className="w-40 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semiwide text-lg font-bold">Park the cars you own</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Tap the heart on any slot car to save it. We’ll use it to filter parts that fit — including the “Fits my garage” switch on every parts listing.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/collections/slot-cars">
              Browse slot cars
              <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {cars.map((car, i) => {
              const count = fitCount(car)
              const scale = car.scales[0]
              return (
                <motion.li
                  key={car.slug}
                  layout="position"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                >
                  <article className="group/bay relative flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-card transition-[border-color,box-shadow] duration-500 ease-out-expo hover:border-foreground/18 hover:shadow-lift">
                    <div className="relative aspect-[16/10] overflow-hidden bg-spotlight [&_[role=img]>span]:hidden">
                      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-50 [--grid-size:28px] mask-fade-b" />
                      <ArtGlow product={car} strength={18} />
                      <div aria-hidden="true" className="absolute inset-x-[10%] bottom-[13%] h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
                      <div className="absolute inset-[8%] transition-transform duration-700 ease-out-expo group-hover/bay:scale-[1.04]">
                        <ProductImage product={car} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw" />
                      </div>
                      <HudCorners inset={12} className="opacity-50 transition-opacity duration-500 group-hover/bay:opacity-100" />
                      <span className="absolute top-6 left-7 z-[2] label-mono text-[0.625rem] text-volt">Bay {indexLabel(i + 1)}</span>
                      <span className="absolute top-6 right-7 z-[2] label-mono text-[0.625rem] text-foreground/60">{formatScales(car.scales)}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <p className="label-mono text-[0.625rem] text-muted-foreground">
                        {brandName(car.brand)}
                        {car.vehicle && ` · ${car.vehicle.series} · ${car.vehicle.year}`}
                      </p>
                      <h3 className="mt-2 font-semiwide text-lg leading-snug font-semibold tracking-[-0.01em] text-balance">
                        <Link href={productHref(car)} className="transition-colors hover:text-volt">
                          {car.name}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {count > 0 ? `${count} ${count === 1 ? "part fits" : "upgrades and spares fit"} this car` : `No direct-fit parts listed yet — browse ${scale} parts instead`}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                        <Button asChild size="sm" variant={count > 0 ? "default" : "outline"} className="touch:h-11">
                          <Link href={count > 0 ? fitsHref([car]) : `/collections/parts?scale=${encodeURIComponent(scale)}`}>
                            {count > 0 ? "Shop parts that fit" : `Shop ${scale} parts`}
                            <ArrowRight />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(car)} className="text-muted-foreground hover:text-foreground touch:h-11" aria-label={`Remove ${car.name} from my cars`}>
                          <X />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </article>
                </motion.li>
              )
            })}
            <motion.li key="open-bay" layout="position" className={cn(cars.length % 3 === 0 && "xl:hidden", cars.length % 2 === 0 && "sm:max-xl:hidden")}>
              <Link
                href="/collections/slot-cars"
                className="group/open relative flex h-full min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-foreground/15 p-8 text-center transition-[border-color,background-color] duration-500 ease-out-expo hover:border-volt/50 hover:bg-volt/[0.025]"
              >
                <span className="label-mono text-[0.625rem] text-muted-foreground">Bay {indexLabel(cars.length + 1)} · Open</span>
                <span className="grid size-12 place-items-center rounded-full border border-hairline text-ivory-200 transition-[border-color,color,transform] duration-500 ease-out-expo group-hover/open:scale-105 group-hover/open:border-volt group-hover/open:text-volt">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
                <span className="font-semiwide text-base font-bold">Park another car</span>
                <span className="max-w-[16rem] text-sm text-muted-foreground">Save any slot car with the heart and it gets a bay here.</span>
              </Link>
            </motion.li>
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Saved items — every saved product, filterable, with bulk actions
 * ------------------------------------------------------------------------- */

function SavedItems({ saved }: { saved: Product[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const add = useCart((s) => s.add)
  const clearSaved = useGarage((s) => s.clearSaved)
  const headingId = useId()

  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, saved.filter(f.test).length])) as Record<Filter, number>
  const active = counts[filter] > 0 ? filter : "all"
  const shown = saved.filter(FILTERS.find((f) => f.value === active)!.test)
  const buyable = shown.filter((p) => isInStock(p) && maxQtyFor(p) > 0)

  const addAll = () => {
    let added = 0
    for (const p of buyable) if (add(p.slug, 1).ok) added++
    if (added > 0) {
      useCart.getState().open()
      toast.success(`Added ${pluralize(added, "item")} to your cart`)
    } else {
      toast.info("Everything here is already in your cart at the most we can ship.")
    }
  }

  const clearAll = () => {
    const before = useGarage.getState().saved
    clearSaved()
    toast("Saved items cleared", {
      description: `${pluralize(before.length, "item")} removed from your garage`,
      duration: 7000,
      action: { label: "Undo", onClick: () => useGarage.setState({ saved: before }) },
    })
  }

  return (
    <section aria-labelledby={headingId} className="mt-24 md:mt-32">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow index={2}>Saved</Eyebrow>
          <h2 id={headingId} className="mt-4 font-wide text-headline font-black uppercase">
            Saved for later
          </h2>
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {buyable.length > 0 && (
              <Button onClick={addAll} variant="outline">
                <ShoppingBag />
                Add {active === "all" ? "all" : FILTERS.find((f) => f.value === active)!.label.toLowerCase()} to cart
              </Button>
            )}
            <Button onClick={clearAll} variant="ghost" className="text-muted-foreground hover:text-signal">
              <Trash2 />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {saved.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-5 rounded-lg border border-dashed border-foreground/15 bg-card/40 p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-hairline bg-carbon-800 text-signal">
            <Heart className="size-5" aria-hidden="true" />
          </span>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            Nothing saved yet. Tap the heart on any car, part or set and it waits here until you’re ready.
          </p>
          <Button asChild variant="outline">
            <Link href="/collections/all">Browse the catalog</Link>
          </Button>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Filter saved items" className="mt-8 flex flex-wrap gap-2">
            {FILTERS.filter((f) => f.value === "all" || counts[f.value] > 0).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active === f.value}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[0.8125rem] font-medium transition-[background-color,border-color,color] duration-300 touch:min-h-11",
                  active === f.value ? "border-volt bg-volt text-carbon-900" : "border-hairline text-ivory-200 hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {f.label}
                <span className={cn("font-mono text-[0.6875rem] tabular", active === f.value ? "text-carbon-900/70" : "text-muted-foreground")}>{counts[f.value]}</span>
              </button>
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Showing {pluralize(shown.length, "saved item")}
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((p) => (
                <motion.li
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                >
                  <ProductCard product={p} className="h-full" sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 48vw, 92vw" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Empty garage
 * ------------------------------------------------------------------------- */

function GarageEmpty() {
  const steps = [
    { title: "Save with the heart", body: "Tap the heart on any car, part or set. It parks here — no account needed." },
    { title: "Park the cars you race", body: "Saved slot cars unlock parts that fit them, matched on brand and scale." },
    { title: "Pick up where you left off", body: "Everything you viewed lines up here, so the part you meant to buy is one tap away." },
  ]
  return (
    <section aria-labelledby="garage-empty" className="mt-16 overflow-hidden rounded-lg border border-dashed border-foreground/12 bg-card/40 md:mt-20">
      <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:items-center lg:gap-12 lg:p-14">
        <div className="lg:col-span-5">
          <BayArt className="w-full max-w-sm" />
        </div>
        <div className="lg:col-span-7">
          <p className="label-mono text-[0.625rem] text-muted-foreground">Bay 01 · 02 · 03 — empty</p>
          <h2 id="garage-empty" className="mt-4 font-wide text-headline font-black uppercase text-balance">
            Your garage is empty
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">
            Save the cars you own and the parts you want. They’ll wait here on this device until you’re ready to race.
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/collections/slot-cars">
                Shop slot cars
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/collections/parts">Shop parts</Link>
            </Button>
          </div>
        </div>
      </div>
      <ol className="grid border-t border-hairline md:grid-cols-3 md:divide-x md:divide-hairline">
        {steps.map((s, i) => (
          <li key={s.title} className={cn("p-6 sm:p-8", i > 0 && "border-t border-hairline md:border-t-0")}>
            <p className="font-mono text-xs text-volt">{indexLabel(i + 1)}</p>
            <h3 className="mt-3 font-semiwide text-base font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Three chamfered garage bays seen from above; the first holds a car outline. */
function BayArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" className={className} fill="none" aria-hidden="true">
      <path d="M0 138H240" stroke="#f3efe6" strokeOpacity=".12" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${12 + i * 76} 18)`}>
          <path d="M8 0H64V112L56 120H0V8Z" stroke={i === 0 ? "#ffd23f" : "#f3efe6"} strokeOpacity={i === 0 ? 0.9 : 0.18} strokeWidth="1.2" strokeDasharray={i === 0 ? undefined : "4 4"} />
          <text x="32" y="-6" textAnchor="middle" fill={i === 0 ? "#ffd23f" : "#a6a3ad"} fillOpacity={i === 0 ? 1 : 0.6} fontFamily="var(--font-geist-mono), monospace" fontSize="7" letterSpacing="1.4">
            {`BAY ${indexLabel(i + 1)}`}
          </text>
        </g>
      ))}
      <g transform="translate(26 34)" stroke="#f3efe6" strokeOpacity=".5" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 4c-7 0-11 4-11 11v58c0 8 4 13 11 13h8c7 0 11-5 11-13V15c0-7-4-11-11-11z" />
        <path d="M11 30h22M13 56h18" strokeOpacity=".35" />
        <rect x="2" y="14" width="5" height="13" rx="1.5" />
        <rect x="37" y="14" width="5" height="13" rx="1.5" />
        <rect x="2" y="60" width="5" height="14" rx="1.5" />
        <rect x="37" y="60" width="5" height="14" rx="1.5" />
      </g>
    </svg>
  )
}
