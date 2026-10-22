"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Heart, Search, X } from "lucide-react"
import Link from "next/link"
import { useId, useState, type ReactNode } from "react"

import { useListing } from "@/components/collection/listing-context"
import {
  AVAILABILITY_OPTIONS,
  clearFilters,
  scaleDescription,
  toggleIn,
  withFilters,
  type FacetKey,
  type ListFacet,
} from "@/components/collection/listing-model"
import { PriceFacet } from "@/components/collection/price-facet"
import { EASE_OUT_EXPO } from "@/components/motion"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { categoryLabel } from "@/lib/catalog"
import type { CategorySlug } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

const ORDER: FacetKey[] = ["fits", "subcategory", "brand", "scale", "price", "availability", "operation", "build"]

/** Every facet group the listing offers — shared by the desktop sidebar and the mobile sheet. */
export function FacetPanel({ variant = "sidebar" }: { variant?: "sidebar" | "sheet" }) {
  const { config, options } = useListing()
  const facets = ORDER.filter((f) => config.facets.includes(f))

  return (
    <div className={cn(variant === "sheet" && "px-5")}>
      {facets.map((facet) => {
        switch (facet) {
          case "fits":
            return <FitsGroup key={facet} />
          case "subcategory":
            return options.subcategories.length > 1 ? <TypeGroup key={facet} /> : null
          case "brand":
            return !config.brand && options.brands.length > 1 ? <BrandGroup key={facet} /> : null
          case "scale":
            return options.scales.length > 1 ? <ScaleGroup key={facet} /> : null
          case "price":
            return <PriceGroup key={facet} />
          case "availability":
            return <AvailabilityGroup key={facet} />
          case "operation":
            return options.operation.length > 1 ? <OperationGroup key={facet} /> : null
          case "build":
            return options.build.length > 1 ? <BuildGroup key={facet} /> : null
        }
      })}
    </div>
  )
}

/* Groups ------------------------------------------------------------------- */

function TypeGroup() {
  const { state, counts, options, config } = useListing()
  const selected = state.filters.subcategories ?? []
  const spansCategories = new Set(options.subcategories.map((s) => s.category)).size > 1
  const rows = options.subcategories.map((s) => ({
    value: s.slug,
    label: s.label,
    group: spansCategories ? categoryLabel(s.category as CategorySlug) : undefined,
    count: counts.subcategories[s.slug] ?? 0,
  }))
  return (
    <FacetGroup title="Type" active={selected.length}>
      <OptionList facet="subcategories" rows={rows} selected={selected} limit={config.kind === "category" ? 10 : 7} />
    </FacetGroup>
  )
}

function BrandGroup() {
  const { state, counts, options } = useListing()
  const selected = state.filters.brands ?? []
  const rows = options.brands.map((b) => ({ value: b.slug, label: b.name, count: counts.brands[b.slug] ?? 0, hint: b.country }))
  return (
    <FacetGroup title="Brand" active={selected.length}>
      <OptionList facet="brands" rows={rows} selected={selected} limit={8} searchable={rows.length > 8} searchLabel="Find a brand" />
    </FacetGroup>
  )
}

function ScaleGroup() {
  const { state, counts, options } = useListing()
  const selected = state.filters.scales ?? []
  const rows = options.scales.map((s) => ({ value: s, label: s, count: counts.scales[s] ?? 0, hint: scaleDescription(s) }))
  return (
    <FacetGroup title="Scale" active={selected.length}>
      <OptionList facet="scales" rows={rows} selected={selected} showHints />
    </FacetGroup>
  )
}

function OperationGroup() {
  const { state, counts, options } = useListing()
  const selected = state.filters.operation ?? []
  const rows = options.operation.map((o) => ({ value: o.value, label: o.label, count: counts.operation[o.value] ?? 0, hint: o.hint }))
  return (
    <FacetGroup title="Operation" active={selected.length}>
      <OptionList facet="operation" rows={rows} selected={selected} showHints />
    </FacetGroup>
  )
}

function BuildGroup() {
  const { state, counts, options } = useListing()
  const selected = state.filters.build ?? []
  const rows = options.build.map((o) => ({ value: o.value, label: o.label, count: counts.build[o.value] ?? 0, hint: o.hint }))
  return (
    <FacetGroup title="Build" active={selected.length}>
      <OptionList facet="build" rows={rows} selected={selected} showHints />
    </FacetGroup>
  )
}

function AvailabilityGroup() {
  const { state, counts, commit, config } = useListing()
  const f = state.filters
  const rows = AVAILABILITY_OPTIONS.filter((o) => !config.base[o.key]).map((o) => ({
    ...o,
    count: o.key === "inStock" ? counts.inStock : o.key === "onSale" ? counts.onSale : o.key === "isNew" ? counts.isNew : counts.preorder,
  }))
  const active = rows.filter((r) => f[r.key]).length
  return (
    <FacetGroup title="Availability" active={active}>
      <ul className="space-y-0.5 pb-2">
        {rows.map((r) => (
          <li key={r.key}>
            <SwitchRow
              label={r.label}
              hint={r.hint}
              count={r.count}
              checked={Boolean(f[r.key])}
              onCheckedChange={(on) => commit(withFilters(state, { [r.key]: on || undefined }))}
            />
          </li>
        ))}
      </ul>
    </FacetGroup>
  )
}

function FitsGroup() {
  const { state, counts, commit, garageCars, hydrated } = useListing()
  const on = Boolean(state.filters.fitsCars?.length)
  return (
    <FacetGroup title="Fits my garage" active={on ? 1 : 0}>
      <div className="pb-3">
        {garageCars.length > 0 || on ? (
          <SwitchRow
            label="Only parts that fit"
            hint={
              on && state.filters.fitsCars
                ? `Matching ${state.filters.fitsCars.length === 1 ? "1 car" : `${state.filters.fitsCars.length} cars`} by brand and scale`
                : `Your ${garageCars.length === 1 ? "saved car" : `${garageCars.length} saved cars`} — matched by brand and scale`
            }
            count={on ? undefined : (counts.fits ?? undefined)}
            checked={on}
            onCheckedChange={(next) => commit(withFilters(state, { fitsCars: next ? garageCars : undefined }))}
          />
        ) : (
          <div className="rounded-md border border-dashed border-foreground/14 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Heart className="size-3.5 text-signal" aria-hidden="true" />
              {hydrated ? "No cars in your garage yet" : "Checking your garage…"}
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground text-pretty">
              Tap the heart on any car to save it. Parts listings can then show only what fits the cars you race.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[0.8125rem]">
              <Link href="/collections/slot-cars" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-volt">
                Browse slot cars
              </Link>
              <Link href="/garage" className="text-muted-foreground underline decoration-foreground/20 underline-offset-4 hover:text-foreground">
                My garage
              </Link>
            </div>
          </div>
        )}
      </div>
    </FacetGroup>
  )
}

function PriceGroup() {
  const { state } = useListing()
  const active = state.filters.priceMin != null || state.filters.priceMax != null ? 1 : 0
  return (
    <FacetGroup title="Price" active={active}>
      <PriceFacet />
    </FacetGroup>
  )
}

/* Building blocks ---------------------------------------------------------- */

export function FacetGroup({ title, active, children, defaultOpen = true }: { title: string; active?: number; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="border-b border-hairline last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="group/fh flex min-h-13 w-full items-center gap-3 py-3 text-left outline-none focus-visible:text-volt"
        >
          <span className="label-mono text-[0.6875rem] text-foreground">{title}</span>
          {active ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-volt px-1 font-mono text-[0.625rem] leading-none font-semibold text-carbon-900 tabular">
              {active}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn("ml-auto size-4 text-muted-foreground transition-transform duration-500 ease-out-expo group-hover/fh:text-foreground", open && "rotate-180")}
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

interface OptionRowData {
  value: string
  label: string
  count: number
  hint?: string
  group?: string
}

function OptionList({
  facet,
  rows,
  selected,
  limit,
  searchable = false,
  searchLabel = "Search",
  showHints = false,
}: {
  facet: ListFacet
  rows: OptionRowData[]
  selected: readonly string[]
  limit?: number
  searchable?: boolean
  searchLabel?: string
  showHints?: boolean
}) {
  const { state, commit } = useListing()
  const [expanded, setExpanded] = useState(false)
  const [term, setTerm] = useState("")
  const inputId = useId()
  const needle = term.trim().toLowerCase()
  const matching = needle ? rows.filter((r) => r.label.toLowerCase().includes(needle)) : rows
  const collapsible = !needle && limit != null && rows.length > limit + 1
  const visible = collapsible && !expanded ? matching.filter((r, i) => i < limit || selected.includes(r.value)) : matching
  const hidden = matching.length - visible.length
  const withHeadings = visible.map((r, i) => ({ ...r, heading: r.group && r.group !== visible[i - 1]?.group ? r.group : undefined }))

  return (
    <div className="pb-3">
      {searchable && (
        <div className="relative mb-2">
          <label htmlFor={inputId} className="sr-only">
            {searchLabel}
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id={inputId}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchLabel}
            autoComplete="off"
            className="h-11 w-full rounded-sm border border-input bg-foreground/[0.03] pr-9 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground pointer-fine:h-9 hover:border-foreground/30 focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear brand search"
              className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground pointer-fine:size-7"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
      <ul className="space-y-px">
        {withHeadings.map((r) => (
          <li key={r.value}>
            {r.heading && <p className="pt-3 pb-1.5 label-mono text-[0.5625rem] text-muted-foreground/80 first:pt-1">{r.heading}</p>}
            <CheckRow
              label={r.label}
              hint={showHints ? r.hint : undefined}
              count={r.count}
              checked={selected.includes(r.value)}
              onToggle={() => commit(toggleIn(state, facet, r.value))}
            />
          </li>
        ))}
      </ul>
      {needle && matching.length === 0 && <p className="py-2 text-sm text-muted-foreground">No match for “{term}”.</p>}
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[0.8125rem] font-medium text-foreground/80 underline decoration-foreground/25 underline-offset-4 outline-none pointer-fine:min-h-8 hover:text-foreground hover:decoration-volt focus-visible:text-volt"
        >
          {expanded ? "Show fewer" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  )
}

function CheckRow({ label, hint, count, checked, onToggle }: { label: string; hint?: string; count: number; checked: boolean; onToggle: () => void }) {
  const id = useId()
  const disabled = count === 0 && !checked
  return (
    <label
      htmlFor={id}
      className={cn(
        "group/row -mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 transition-colors pointer-fine:min-h-9",
        "hover:bg-foreground/[0.04] has-[:focus-visible]:bg-foreground/[0.05]",
        disabled && "cursor-default opacity-40 hover:bg-transparent"
      )}
    >
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={onToggle} className="border-foreground/30 after:hidden" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm transition-colors", checked ? "font-medium text-foreground" : "text-foreground/80 group-hover/row:text-foreground")}>{label}</span>
        {hint && <span className="text-xs leading-snug text-muted-foreground text-pretty">{hint}</span>}
      </span>
      <span className={cn("font-mono text-xs tabular", checked ? "text-foreground" : "text-muted-foreground")}>{count}</span>
    </label>
  )
}

function SwitchRow({
  label,
  hint,
  count,
  checked,
  onCheckedChange,
}: {
  label: string
  hint?: string
  count?: number
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = useId()
  const disabled = count === 0 && !checked
  return (
    <label
      htmlFor={id}
      className={cn(
        "group/row -mx-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-foreground/[0.04] has-[:focus-visible]:bg-foreground/[0.05]",
        disabled && "cursor-default opacity-40 hover:bg-transparent"
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm", checked ? "font-medium text-foreground" : "text-foreground/85")}>{label}</span>
        {hint && <span className="text-xs leading-snug text-muted-foreground text-pretty">{hint}</span>}
      </span>
      {count != null && <span className="font-mono text-xs text-muted-foreground tabular">{count}</span>}
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="after:hidden" />
    </label>
  )
}

/** Panel heading with the active count and a Clear all. */
export function FacetPanelHeader({ className }: { className?: string }) {
  const { chips, state, commit } = useListing()
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <p className="flex items-center gap-2.5 font-semiwide text-xs font-bold tracking-[0.12em] uppercase">
        Filters
        {chips.length > 0 && <span className="font-mono text-[0.6875rem] font-medium tracking-normal text-muted-foreground tabular">({chips.length})</span>}
      </p>
      {chips.length > 0 && (
        <button
          type="button"
          onClick={() => commit(clearFilters(state, true))}
          className="min-h-9 text-[0.8125rem] font-medium text-muted-foreground underline decoration-foreground/20 underline-offset-4 outline-none hover:text-foreground hover:decoration-volt focus-visible:text-volt"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
