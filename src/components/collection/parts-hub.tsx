"use client"

import { ChevronsUpDown, Heart, MessageSquareText, X } from "lucide-react"
import Link from "next/link"
import { useLayoutEffect, useState } from "react"

import { useListing } from "@/components/collection/listing-context"
import { quickSelect, withFilters } from "@/components/collection/listing-model"
import { BrandRow, TypeTile } from "@/components/collection/quick-filters"
import { ArrowLink } from "@/components/site/arrow-link"
import { CATEGORY_ICONS, SUBCATEGORY_ICONS } from "@/components/site/category-icon"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { brandName, categories, categoryHref, getProduct, isCar, products } from "@/lib/catalog"
import type { BrandSlug, CategorySlug, Product } from "@/lib/catalog/types"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const HUB_CATEGORIES: CategorySlug[] = ["chassis-motors", "tires-magnets-axles"]

/** Top of /collections/parts: the two part trees as type tiles, fitment, and the parts makers. */
export function PartsHub() {
  const { state, counts, options } = useListing()
  const selected = state.filters.subcategories ?? []
  const present = new Set(options.subcategories.map((s) => s.slug))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {categories
          .filter((c) => HUB_CATEGORIES.includes(c.slug))
          .map((cat, ci) => {
            const Icon = CATEGORY_ICONS[cat.slug]
            const subs = cat.subcategories.filter((s) => present.has(s))
            const total = subs.reduce((n, s) => n + (counts.subcategories[s] ?? 0), 0)
            return (
              <section key={cat.slug} aria-labelledby={`hub-${cat.slug}`} className="rounded-lg border border-hairline bg-carbon-850/70 p-3 sm:p-4">
                <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pt-1 pb-4">
                  <h2 id={`hub-${cat.slug}`} className="flex items-center gap-3 font-semiwide text-[0.8125rem] font-bold tracking-[0.06em] uppercase">
                    <span className="grid size-8 place-items-center rounded-full border border-foreground/12 text-foreground/70">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    {cat.label}
                    <span className="font-mono text-[0.6875rem] font-medium tracking-normal text-muted-foreground tabular">{total}</span>
                  </h2>
                  <ArrowLink href={categoryHref(cat.slug)} className="text-[0.625rem] text-muted-foreground hover:text-foreground">
                    Shop {cat.shortLabel.toLowerCase()} only
                  </ArrowLink>
                </header>
                {subs.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5">
                    {subs.map((slug, i) => {
                      const sub = options.subcategories.find((s) => s.slug === slug)!
                      const SubIcon = SUBCATEGORY_ICONS[slug]
                      return (
                        <li key={slug}>
                          <TypeTile
                            compact
                            index={`${ci + 1}.${indexLabel(i + 1)}`}
                            icon={<SubIcon />}
                            label={sub.label}
                            count={counts.subcategories[slug] ?? 0}
                            share={total ? (counts.subcategories[slug] ?? 0) / total : 0}
                            active={selected.includes(slug)}
                            next={quickSelect(state, "subcategories", slug)}
                          />
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="px-1 pb-2 text-sm text-muted-foreground">New stock for this tree is on the way.</p>
                )}
              </section>
            )
          })}
      </div>
      <FitFinder />
      <BrandRow label="Parts brands" limit={12} />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Fit finder
 * ------------------------------------------------------------------------- */

const carLabel = (car: Product) => (car.vehicle ? `${car.vehicle.make} ${car.vehicle.model}` : car.name)

export function FitFinder() {
  const { state, commit, garageCars, counts } = useListing()
  const fits = state.filters.fitsCars ?? []
  const garageOn = fits.length > 0 && fits.length === garageCars.length && fits.every((s) => garageCars.includes(s))
  const pickedCar = fits.length === 1 ? getProduct(fits[0]) : undefined

  return (
    <section aria-labelledby="fit-finder-title" className="relative overflow-hidden rounded-lg border border-hairline bg-card">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-checker opacity-80 [--checker-size:6px] [--checker-a:var(--color-ivory-100)] [--checker-b:var(--color-carbon-900)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_100%_0%,rgb(255_210_63/0.07),transparent_60%)]" />
      <div className="relative grid gap-5 py-5 pr-5 pl-7 sm:py-6 sm:pr-6 sm:pl-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
        <div>
          <p className="label-mono text-[0.625rem] text-volt">Fitment</p>
          <h2 id="fit-finder-title" className="mt-2 font-wide text-[1.35rem] leading-none font-black tracking-[-0.02em] uppercase sm:text-2xl">
            Find parts that fit
          </h2>
          <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted-foreground text-pretty">
            Pick your car — we’ll show only the motors, tires and hop-ups made for its brand and scale.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CarPicker
            value={pickedCar?.slug}
            onSelect={(slug) => commit(withFilters(state, { fitsCars: slug ? [slug] : undefined }))}
          />
          {garageCars.length > 0 ? (
            <Button
              variant={garageOn ? "ivory" : "outline"}
              size="lg"
              aria-pressed={garageOn}
              onClick={() => commit(withFilters(state, { fitsCars: garageOn ? undefined : garageCars }))}
              className="h-12 px-5"
            >
              <Heart className={cn(garageOn && "fill-current")} aria-hidden="true" />
              My garage
              <span className="font-mono text-[0.6875rem] font-medium tracking-normal opacity-70 tabular">{garageOn ? garageCars.length : (counts.fits ?? 0)}</span>
            </Button>
          ) : (
            <p className="max-w-[13rem] text-xs leading-snug text-muted-foreground sm:pl-2">Or tap ♥ on your cars and filter by My Garage.</p>
          )}
        </div>
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline py-3 pr-5 pl-7 text-[0.8125rem] sm:pl-9">
        {fits.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-foreground">
            <span className="size-1.5 rounded-full bg-go" aria-hidden="true" />
            Showing parts that fit{" "}
            <strong className="font-semibold">{pickedCar ? `${brandName(pickedCar.brand)} ${carLabel(pickedCar)} (${pickedCar.scales.join(", ")})` : `${fits.length} cars in your garage`}</strong>
            <button
              type="button"
              onClick={() => commit(withFilters(state, { fitsCars: undefined }))}
              className="inline-flex min-h-9 items-center gap-1 px-1 text-muted-foreground underline decoration-foreground/20 underline-offset-4 outline-none hover:text-foreground focus-visible:text-volt"
            >
              <X className="size-3" aria-hidden="true" />
              Clear
            </button>
          </p>
        ) : (
          <p className="text-muted-foreground">Fitment is matched by car brand and scale — check the notes on each part.</p>
        )}
        <Link
          href="/contact?topic=fit-check"
          className="inline-flex min-h-9 items-center gap-2 font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-volt"
        >
          <MessageSquareText className="size-3.5 text-muted-foreground" aria-hidden="true" />
          Car not listed? Ask for a fit check
        </Link>
      </div>
    </section>
  )
}

function CarPicker({ value, onSelect }: { value?: string; onSelect: (slug: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => () => setOpen(false), [])
  const cars = products.filter(isCar)
  const byBrand = new Map<BrandSlug, Product[]>()
  for (const car of cars) byBrand.set(car.brand, [...(byBrand.get(car.brand) ?? []), car])
  const groups = [...byBrand.entries()].sort((a, b) => brandName(a[0]).localeCompare(brandName(b[0])))
  const current = value ? getProduct(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={current ? `Your car: ${carLabel(current)}. Change car` : "Choose your car"}
          className={cn(
            "group/pick flex h-12 min-w-0 items-center gap-3 rounded-sm border bg-background/50 pr-3 pl-4 text-left outline-none transition-colors sm:w-72",
            "border-foreground/18 hover:border-foreground/40 focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30 data-[state=open]:border-foreground/45"
          )}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="label-mono text-[0.5625rem] text-muted-foreground">Your car</span>
            <span className={cn("mt-1 truncate text-sm", current ? "font-medium text-foreground" : "text-foreground/70")}>
              {current ? carLabel(current) : "Choose make & model"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] border border-hairline bg-carbon-800/95 p-0 backdrop-blur-xl">
        <Command className="bg-transparent" loop>
          <CommandInput placeholder="Search make, model or brand…" className="h-9" />
          <CommandList className="max-h-80">
            <CommandEmpty className="px-4 py-6 text-sm text-muted-foreground">
              Not here?{" "}
              <Link href="/contact?topic=fit-check" className="text-foreground underline underline-offset-4">
                Ask for a fit check
              </Link>
            </CommandEmpty>
            {groups.map(([brand, list]) => (
              <CommandGroup key={brand} heading={brandName(brand)}>
                {list.map((car) => (
                  <CommandItem
                    key={car.slug}
                    value={`${car.slug} ${carLabel(car)} ${brandName(car.brand)} ${car.vehicle?.series ?? ""}`}
                    data-checked={car.slug === value}
                    onSelect={() => {
                      onSelect(car.slug === value ? undefined : car.slug)
                      setOpen(false)
                    }}
                    className="min-h-11 gap-3 px-2.5 pointer-fine:min-h-9 [&>svg:last-child]:text-volt"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-foreground">{carLabel(car)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {car.vehicle?.year ? `${car.vehicle.year} · ` : ""}
                        {car.scales.join(" / ")}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        {value && (
          <div className="border-t border-hairline p-1">
            <button
              type="button"
              onClick={() => {
                onSelect(undefined)
                setOpen(false)
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-sm px-2.5 text-sm text-muted-foreground outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:bg-foreground/[0.06]"
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear car
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
