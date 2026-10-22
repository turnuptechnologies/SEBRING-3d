"use client"

import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { ArrowUpRight, Search, X } from "lucide-react"
import Link from "next/link"
import { useId, useState } from "react"

import { BRAND_GROUPS } from "@/components/collection/listing-model"
import { EASE_OUT_EXPO } from "@/components/motion"
import { HudCorners } from "@/components/site/hud-corners"
import type { Brand, BrandSlug, CategorySlug, Scale } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

export interface BrandEntry {
  slug: BrandSlug
  name: string
  group: Brand["group"]
  country: string
  blurb: string
  scales: Scale[]
  count: number
  inStock: number
  mix: { category: CategorySlug; label: string; count: number }[]
}

/* Category tones for the mix bar — neutral metals, so volt stays the one accent. */
const MIX_TONE: Record<CategorySlug, string> = {
  "slot-cars": "bg-ivory-100",
  "chassis-motors": "bg-chrome/70",
  "tires-magnets-axles": "bg-copper/80",
  "controllers-power": "bg-smoke-500",
  "track-sets": "bg-smoke-600",
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const initial = (name: string) => name.trim().charAt(0).toUpperCase()

/** The /brands directory: grouped, A–Z within groups, with instant filtering. */
export function BrandDirectory({ entries }: { entries: BrandEntry[] }) {
  const [term, setTerm] = useState("")
  const [group, setGroup] = useState<Brand["group"] | "all">("all")
  const inputId = useId()
  const needle = term.trim().toLowerCase().replace(/[.\s-]/g, "")
  const matches = (b: BrandEntry) =>
    (group === "all" || b.group === group) &&
    (!needle || `${b.name} ${b.country} ${b.slug}`.toLowerCase().replace(/[.\s-]/g, "").includes(needle))
  const visible = entries.filter(matches)
  const firstForLetter = new Map<string, string>()
  for (const g of BRAND_GROUPS) for (const b of visible.filter((x) => x.group === g.value)) if (!firstForLetter.has(initial(b.name))) firstForLetter.set(initial(b.name), b.slug)

  return (
    <div className="container-site pt-8 pb-24 md:pt-10 md:pb-32">
      <div className="flex flex-col gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <label htmlFor={inputId} className="sr-only">
              Find a brand
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id={inputId}
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Find a brand or country"
              autoComplete="off"
              className="h-12 w-full rounded-sm border border-input bg-foreground/[0.03] pr-10 pl-10 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                aria-label="Clear brand search"
                className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-volt"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div role="group" aria-label="Brand type" className="-mx-[clamp(1rem,4vw,3.5rem)] flex gap-2 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] scrollbar-none sm:mx-0 sm:px-0">
            {[{ value: "all" as const, label: "All" }, ...BRAND_GROUPS].map((g) => {
              const active = group === g.value
              const n = g.value === "all" ? entries.length : entries.filter((b) => b.group === g.value).length
              return (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGroup(g.value)}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border px-3.5 font-semiwide text-[0.6875rem] font-bold tracking-[0.08em] whitespace-nowrap uppercase outline-none transition-colors pointer-fine:h-9",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-ivory-100 bg-ivory-100 text-carbon-900" : "border-foreground/14 text-foreground/85 hover:border-foreground/40"
                  )}
                >
                  {g.label}
                  <span className={cn("font-mono font-medium tracking-normal tabular", active ? "text-carbon-900/55" : "text-muted-foreground")}>{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        <nav aria-label="Brands A to Z" className="hidden xl:block">
          <ol className="flex items-center gap-0.5">
            {LETTERS.map((l) => {
              const target = firstForLetter.get(l)
              return (
                <li key={l}>
                  {target ? (
                    <a
                      href={`#brand-${target}`}
                      className="grid h-8 w-[1.375rem] place-items-center rounded-[3px] font-mono text-[0.6875rem] text-foreground outline-none transition-colors hover:bg-foreground/[0.08] hover:text-volt focus-visible:bg-foreground/[0.08]"
                    >
                      {l}
                    </a>
                  ) : (
                    <span aria-hidden="true" className="grid h-8 w-[1.375rem] place-items-center font-mono text-[0.6875rem] text-foreground/20">
                      {l}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "brand" : "brands"}
      </p>

      {visible.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-wide text-2xl font-black uppercase">No brand called “{term}”</p>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground text-pretty">
            We may still be able to get it — or search the catalog for the part instead.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
            <Link href={`/search?q=${encodeURIComponent(term)}`} className="font-medium underline decoration-foreground/30 underline-offset-4 hover:decoration-volt">
              Search products for “{term}”
            </Link>
            <Link href="/contact?topic=fit-check" className="text-muted-foreground underline decoration-foreground/20 underline-offset-4 hover:text-foreground">
              Ask the crew
            </Link>
          </div>
        </div>
      ) : (
        <LayoutGroup>
          {BRAND_GROUPS.map((g, gi) => {
            const list = visible.filter((b) => b.group === g.value)
            if (!list.length) return null
            return (
              <section key={g.value} aria-labelledby={`brands-${g.value}`} className="pt-12 md:pt-16">
                <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                  <div>
                    <p className="label-mono text-[0.625rem] text-muted-foreground">
                      <span className="text-volt">{String(gi + 1).padStart(2, "0")}</span> · {list.length} {list.length === 1 ? "brand" : "brands"}
                    </p>
                    <h2 id={`brands-${g.value}`} className="mt-3 font-wide text-[clamp(1.6rem,2.8vw,2.4rem)] leading-none font-black tracking-[-0.03em] uppercase">
                      {g.label}
                    </h2>
                  </div>
                  <p className="max-w-sm text-sm text-muted-foreground text-pretty">{g.description}</p>
                </header>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {list.map((b) => (
                      <motion.li
                        key={b.slug}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                        id={`brand-${b.slug}`}
                        className="scroll-mt-32"
                      >
                        <BrandCard brand={b} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            )
          })}
        </LayoutGroup>
      )}
    </div>
  )
}

function BrandCard({ brand: b }: { brand: BrandEntry }) {
  const total = b.mix.reduce((n, m) => n + m.count, 0)
  return (
    <Link
      href={`/brands/${b.slug}`}
      className={cn(
        "group/brand relative flex h-full min-h-[15.5rem] flex-col overflow-hidden rounded-lg border border-hairline bg-card p-5 outline-none sm:p-6",
        "transition-[border-color,transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-0 transition-opacity duration-700 [--grid-size:28px] [mask-image:radial-gradient(70%_80%_at_100%_0%,#000,transparent)] group-hover/brand:opacity-100" />
      <HudCorners className="opacity-0 transition-opacity duration-500 group-hover/brand:opacity-100" size={12} inset={8} />

      <div className="relative flex items-start justify-between gap-4">
        <span aria-hidden="true" className="chamfer grid size-11 place-items-center bg-foreground/[0.07] font-wide text-lg font-black text-foreground [--chamfer:8px] transition-colors duration-500 group-hover/brand:bg-volt group-hover/brand:text-carbon-900">
          {initial(b.name)}
        </span>
        <div className="text-right">
          <p className="font-semiwide text-2xl leading-none font-bold tracking-[-0.02em] tabular">{b.count}</p>
          <p className="mt-1.5 label-mono text-[0.5625rem] text-muted-foreground">{b.count === 1 ? "Product" : "Products"}</p>
        </div>
      </div>

      <div className="relative mt-6">
        <p className="label-mono text-[0.5625rem] text-muted-foreground">
          {b.country} · {b.scales.join(" / ")}
        </p>
        <h3 className="mt-2.5 font-wide text-[1.45rem] leading-[0.95] font-black tracking-[-0.03em] uppercase">{b.name}</h3>
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-muted-foreground text-pretty">{b.blurb}</p>
      </div>

      <div className="relative mt-auto pt-6">
        {total > 0 ? (
          <>
            <div aria-hidden="true" className="flex h-[3px] gap-px overflow-hidden rounded-full">
              {b.mix.map((m) => (
                <span key={m.category} className={cn("h-full", MIX_TONE[m.category])} style={{ flexGrow: m.count }} />
              ))}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-xs text-muted-foreground">{b.mix.map((m) => `${m.count} ${m.label.toLowerCase()}`).join(" · ")}</p>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-all duration-500 ease-out-expo group-hover/brand:translate-x-0.5 group-hover/brand:-translate-y-0.5 group-hover/brand:text-volt" />
            </div>
          </>
        ) : (
          <div className="flex items-end justify-between gap-3 border-t border-dashed border-foreground/12 pt-3">
            <p className="text-xs text-muted-foreground">Restocking — ask us to order a part</p>
            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/brand:text-foreground" />
          </div>
        )}
      </div>
      <span className="sr-only">
        , {b.count} {b.count === 1 ? "product" : "products"}
        {b.inStock ? `, ${b.inStock} in stock` : ""}
      </span>
    </Link>
  )
}
