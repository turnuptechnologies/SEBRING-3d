"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, LayoutGrid } from "lucide-react"
import type { ReactNode } from "react"

import { FilterLink } from "@/components/collection/filter-link"
import { useListing } from "@/components/collection/listing-context"
import { quickSelect, scaleDescription, withFilters } from "@/components/collection/listing-model"
import { EASE_OUT_EXPO } from "@/components/motion"
import { CATEGORY_ICONS, SUBCATEGORY_ICONS } from "@/components/site/category-icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getSubcategory, type ListingState } from "@/lib/catalog"
import type { Subcategory } from "@/lib/catalog/types"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
 * Type tiles — the subcategory row at the top of a category.
 * ------------------------------------------------------------------------- */

export function SubcategoryTiles() {
  const { config, state, counts, options } = useListing()
  const selected = state.filters.subcategories ?? []
  const subs = options.subcategories
  if (subs.length < 2) return null
  const all = subs.reduce((n, s) => n + (counts.subcategories[s.slug] ?? 0), 0)

  return (
    <nav aria-label={`${config.label} by type`} className="-mx-[clamp(1rem,4vw,3.5rem)] lg:mx-0">
      <ul className="flex snap-x snap-mandatory scroll-px-[clamp(1rem,4vw,3.5rem)] gap-2.5 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] pb-1 scrollbar-none lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
        <li className={TILE_ITEM}>
          <TypeTile
            index="00"
            icon={<LayoutGrid />}
            label={`All ${config.label}`}
            count={all}
            share={1}
            active={selected.length === 0}
            next={withFilters(state, { subcategories: undefined })}
          />
        </li>
        {subs.map((s, i) => (
          <li key={s.slug} className={TILE_ITEM}>
            <TypeTile
              index={indexLabel(i + 1)}
              icon={iconFor(s)}
              label={s.label}
              count={counts.subcategories[s.slug] ?? 0}
              share={all ? (counts.subcategories[s.slug] ?? 0) / all : 0}
              active={selected.includes(s.slug)}
              next={quickSelect(state, "subcategories", s.slug)}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}

const TILE_ITEM = "w-[9.5rem] shrink-0 snap-start lg:w-auto lg:min-w-[8.5rem] lg:max-w-[13.5rem] lg:flex-1"

const iconFor = (s: Subcategory) => {
  const Icon = SUBCATEGORY_ICONS[s.slug]
  return <Icon />
}

interface TypeTileProps {
  index: string
  icon: ReactNode
  label: string
  count: number
  /** 0–1 share of the listing, drawn as a telemetry bar. */
  share: number
  active: boolean
  next: ListingState
  compact?: boolean
}

export function TypeTile({ index, icon, label, count, share, active, next, compact = false }: TypeTileProps) {
  const disabled = count === 0 && !active
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className={cn("label-mono text-[0.625rem] transition-colors", active ? "text-volt" : "text-muted-foreground")}>{index}</span>
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full transition-all duration-500 ease-out-expo [&_svg]:size-[15px]",
            active ? "bg-volt text-carbon-900" : "text-foreground/45 group-hover/tile:-rotate-12 group-hover/tile:text-foreground"
          )}
        >
          {active ? <Check strokeWidth={3} className="!size-3.5" /> : icon}
        </span>
      </span>
      <span className="mt-auto block">
        <span className={cn("block font-semiwide text-[0.78rem] leading-[1.15] font-bold tracking-[0.015em] uppercase text-balance", compact && "text-[0.74rem]")}>{label}</span>
        <span className="mt-2 flex items-center gap-2.5">
          <span className="font-mono text-[0.6875rem] text-muted-foreground tabular">{count}</span>
          <span aria-hidden="true" className="relative h-px flex-1 overflow-hidden bg-foreground/10">
            <span
              className={cn("absolute inset-y-0 left-0 origin-left transition-[width,background-color] duration-700 ease-out-expo", active ? "bg-volt" : "bg-foreground/40")}
              style={{ width: `${Math.round(share * 100)}%` }}
            />
          </span>
        </span>
      </span>
    </>
  )

  const classes = cn(
    "group/tile relative flex h-full flex-col gap-5 overflow-hidden rounded-lg border bg-card p-3.5 outline-none sm:p-4",
    compact ? "min-h-[6.25rem]" : "min-h-[7.25rem]",
    "transition-[border-color,background-color,transform,box-shadow] duration-500 ease-out-expo focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border-volt/55 bg-[linear-gradient(180deg,rgb(255_210_63/0.07),transparent_70%)] shadow-[inset_0_1px_0_rgb(255_210_63/0.25)]"
      : "border-hairline hover:-translate-y-0.5 hover:border-foreground/22 hover:bg-carbon-750",
    disabled && "pointer-events-none opacity-40"
  )

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true">
        {body}
        <span className="sr-only">— no matches with the current filters</span>
      </span>
    )
  }
  return (
    <FilterLink next={next} aria-current={active ? "true" : undefined} className={classes}>
      {body}
      <span className="sr-only">
        {count} {count === 1 ? "product" : "products"}
      </span>
    </FilterLink>
  )
}

/* ---------------------------------------------------------------------------
 * Chips — category row, brand row, scale pills.
 * ------------------------------------------------------------------------- */

interface QuickChipProps {
  label: ReactNode
  count?: number
  active: boolean
  next: ListingState
  icon?: ReactNode
  hint?: string
}

export function QuickChip({ label, count, active, next, icon, hint }: QuickChipProps) {
  const disabled = count === 0 && !active
  const classes = cn(
    "group/chip inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-sm border px-3.5 outline-none pointer-fine:h-9",
    "font-semiwide text-[0.6875rem] font-bold tracking-[0.08em] whitespace-nowrap uppercase",
    "transition-[background-color,border-color,color] duration-300 focus-visible:ring-2 focus-visible:ring-ring",
    active ? "border-ivory-100 bg-ivory-100 text-carbon-900" : "border-foreground/14 text-foreground/85 hover:border-foreground/40 hover:text-foreground",
    disabled && "pointer-events-none border-foreground/8 opacity-40",
    "[&_svg]:size-3.5 [&_svg]:shrink-0"
  )
  const inner = (
    <>
      {icon && <span className={cn(active ? "text-carbon-900/70" : "text-foreground/45 group-hover/chip:text-foreground")}>{icon}</span>}
      <span>{label}</span>
      {count != null && <span className={cn("font-mono font-medium tracking-normal tabular", active ? "text-carbon-900/55" : "text-muted-foreground")}>{count}</span>}
    </>
  )
  const chip = disabled ? (
    <span className={classes} aria-disabled="true">
      {inner}
    </span>
  ) : (
    <FilterLink next={next} aria-current={active ? "true" : undefined} className={classes}>
      {inner}
    </FilterLink>
  )
  if (!hint) return chip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-60 text-pretty">
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}

function ChipRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="hidden shrink-0 label-mono text-[0.625rem] text-muted-foreground sm:block">{label}</span>
      <div className="-mx-[clamp(1rem,4vw,3.5rem)] min-w-0 flex-1 sm:mx-0">
        <div className="flex snap-x snap-mandatory scroll-px-[clamp(1rem,4vw,3.5rem)] gap-2 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] py-0.5 scrollbar-none sm:scroll-px-0 sm:px-0">{children}</div>
      </div>
    </div>
  )
}

export function CategoryChips() {
  const { state, counts, options, config } = useListing()
  if (options.categories.length < 2) return null
  const selected = state.filters.categories ?? []
  const all = options.categories.reduce((n, c) => n + (counts.categories[c.slug] ?? 0), 0)
  return (
    <nav aria-label={`${config.label} by category`}>
      <ChipRow label="Category">
        <QuickChip label="All" count={all} active={selected.length === 0} next={withFilters(state, { categories: undefined })} />
        {options.categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug]
          return (
            <QuickChip
              key={c.slug}
              icon={<Icon />}
              label={c.label}
              count={counts.categories[c.slug] ?? 0}
              active={selected.includes(c.slug)}
              next={quickSelect(state, "categories", c.slug)}
            />
          )
        })}
      </ChipRow>
    </nav>
  )
}

export function BrandRow({ label = "Brands", limit = 10 }: { label?: string; limit?: number }) {
  const { state, counts, options } = useListing()
  if (options.brands.length < 2) return null
  const selected = state.filters.brands ?? []
  const ranked = [...options.brands]
    .sort((a, b) => (counts.brands[b.slug] ?? 0) - (counts.brands[a.slug] ?? 0) || a.name.localeCompare(b.name))
    .filter((b, i) => i < limit || selected.includes(b.slug))
  return (
    <nav aria-label={label}>
      <ChipRow label={label}>
        {ranked.map((b) => (
          <QuickChip
            key={b.slug}
            label={b.name}
            count={counts.brands[b.slug] ?? 0}
            active={selected.includes(b.slug)}
            next={quickSelect(state, "brands", b.slug)}
            hint={b.blurb}
          />
        ))}
      </ChipRow>
    </nav>
  )
}

export function ScalePills({ className }: { className?: string }) {
  const { state, counts, options } = useListing()
  if (!options.scales.length) return null
  const selected = state.filters.scales ?? []
  return (
    <nav aria-label="Scale" className={className}>
      <ChipRow label="Scale">
        <QuickChip label="All scales" active={selected.length === 0} next={withFilters(state, { scales: undefined })} />
        {options.scales.map((s) => (
          <QuickChip
            key={s}
            label={s}
            count={counts.scales[s] ?? 0}
            active={selected.includes(s)}
            next={quickSelect(state, "scales", s)}
            hint={scaleDescription(s)}
          />
        ))}
      </ChipRow>
    </nav>
  )
}

/** When exactly one type is in focus, say what it is — the landing context for subcategory links. */
export function SubcategoryContext() {
  const { state } = useListing()
  const only = state.filters.subcategories?.length === 1 ? getSubcategory(state.filters.subcategories[0]) : undefined
  return (
    <AnimatePresence initial={false} mode="wait">
      {only && (
        <motion.p
          key={only.slug}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground"
        >
          <span className="font-semiwide text-xs font-bold tracking-[0.08em] text-foreground uppercase">{only.label}</span>
          <span className="text-pretty">{only.description}</span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}
