"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react"
import { useLayoutEffect, useRef, useState, type RefObject } from "react"

import { useListing } from "@/components/collection/listing-context"
import { clearFilters, type FilterChip } from "@/components/collection/listing-model"
import { EASE_OUT_EXPO } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SORT_OPTIONS } from "@/lib/catalog"
import type { SortKey } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

/* Result count -------------------------------------------------------------- */

/** Odometer-style number: rolls up when it grows, down when it shrinks. */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const [prev, setPrev] = useState(value)
  const [direction, setDirection] = useState(1)
  if (prev !== value) {
    setDirection(value > prev ? 1 : -1)
    setPrev(value)
  }
  return (
    <span aria-hidden="true" className={cn("relative inline-flex overflow-hidden tabular", className)}>
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={{
            enter: (d: number) => ({ y: d > 0 ? "70%" : "-70%", opacity: 0, filter: "blur(3px)" }),
            center: { y: "0%", opacity: 1, filter: "blur(0px)" },
            exit: (d: number) => ({ y: d > 0 ? "-70%" : "70%", opacity: 0, filter: "blur(3px)" }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function ResultsStatus({ statusRef }: { statusRef?: RefObject<HTMLParagraphElement | null> }) {
  const { results, config, state, base } = useListing()
  const total = results.length
  const noun = total === 1 ? "product" : "products"
  const q = state.filters.q
  const spoken =
    config.kind === "search" && q ? `${total} ${total === 1 ? "result" : "results"} for ${q}` : `${total} ${noun}${total !== base.length ? ` of ${base.length}` : ""}`
  return (
    <p ref={statusRef} tabIndex={-1} className="flex items-baseline gap-2 outline-none">
      <span className="font-semiwide text-[1.35rem] leading-none font-bold tracking-[-0.02em] sm:text-2xl">
        <RollingNumber value={total} />
      </span>
      <span aria-hidden="true" className="label-mono text-[0.625rem] text-muted-foreground">
        {config.kind === "search" && q ? (total === 1 ? "result" : "results") : noun}
        {total !== base.length && config.kind !== "search" && <span className="text-foreground/35"> / {base.length}</span>}
      </span>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {spoken}
      </span>
    </p>
  )
}

/* Sort ---------------------------------------------------------------------- */

export function SortSelect({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { state, commit, config } = useListing()
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => () => setOpen(false), [])
  const labelFor = (value: SortKey, label: string) => (value === "featured" && config.kind === "search" && state.filters.q ? "Best match" : label)
  return (
    <Select open={open} onOpenChange={setOpen} value={state.sort} onValueChange={(v) => commit({ ...state, sort: v as SortKey, page: 1 })}>
      <SelectTrigger
        aria-label="Sort products"
        className={cn(
          "h-11 gap-2 rounded-sm border-foreground/14 bg-transparent pr-2.5 pl-3 text-sm pointer-fine:h-9 dark:bg-transparent dark:hover:bg-foreground/[0.04]",
          "hover:border-foreground/35 focus-visible:border-volt focus-visible:ring-volt/25 data-[state=open]:border-foreground/40",
          className
        )}
      >
        {compact ? <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <span className="label-mono text-[0.625rem] text-muted-foreground">Sort</span>}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" sideOffset={6} className="min-w-52 rounded-md border border-hairline bg-carbon-800/95 p-1 backdrop-blur-xl">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="min-h-10 rounded-sm px-3 text-sm pointer-fine:min-h-8 focus:bg-foreground/[0.07]">
            {labelFor(o.value, o.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* Filters button ------------------------------------------------------------ */

export function FiltersButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { chips } = useListing()
  return (
    <Button variant="outline" onClick={onClick} className={cn("h-11 gap-2 px-4 pointer-fine:h-9", className)} aria-haspopup="dialog">
      <SlidersHorizontal aria-hidden="true" />
      Filters
      {chips.length > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-volt px-1.5 font-mono text-[0.6875rem] leading-none font-semibold tracking-normal text-carbon-900 tabular">
          {chips.length}
        </span>
      )}
      <span className="sr-only">{chips.length ? `, ${chips.length} active` : ""}</span>
    </Button>
  )
}

/* Active filter chips ------------------------------------------------------- */

export function ActiveFilters({ statusRef, className }: { statusRef?: RefObject<HTMLParagraphElement | null>; className?: string }) {
  const { chips, commit, state } = useListing()
  const listRef = useRef<HTMLUListElement>(null)

  const focusAfter = (id: string | null) => {
    window.requestAnimationFrame(() => {
      const target = id ? listRef.current?.querySelector<HTMLElement>(`[data-chip-id="${CSS.escape(id)}"]`) : null
      ;(target ?? statusRef?.current)?.focus({ preventScroll: true })
    })
  }

  const remove = (chip: FilterChip, index: number) => {
    const neighbour = chips[index + 1] ?? chips[index - 1]
    commit(chip.next)
    focusAfter(neighbour?.id ?? null)
  }

  const clearAll = () => {
    commit(clearFilters(state, true))
    focusAfter(null)
  }

  if (!chips.length) return null
  return (
    <div className={cn("-mx-[clamp(1rem,4vw,3.5rem)] sm:mx-0", className)}>
      <ul
        ref={listRef}
        aria-label="Active filters"
        className="flex gap-2 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] py-0.5 scrollbar-none sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((chip, i) => (
            <motion.li
              key={chip.id}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
              className="shrink-0"
            >
              <button
                type="button"
                data-chip-id={chip.id}
                onClick={() => remove(chip, i)}
                aria-label={`Remove filter ${chip.group}: ${chip.label}`}
                className="group/chip inline-flex h-11 items-center gap-2 rounded-sm border border-foreground/14 bg-foreground/[0.04] pr-2 pl-3 text-[0.8125rem] whitespace-nowrap outline-none transition-colors pointer-fine:h-8 hover:border-foreground/35 hover:bg-foreground/[0.07] focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30"
              >
                <span className="label-mono text-[0.5625rem] text-muted-foreground">{chip.group}</span>
                <span className="font-medium text-foreground">{chip.label}</span>
                <X aria-hidden="true" className="size-3.5 text-muted-foreground transition-colors group-hover/chip:text-signal" />
              </button>
            </motion.li>
          ))}
          {chips.length > 1 && (
            <motion.li key="__clear" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="shrink-0">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-11 items-center px-2 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground underline decoration-foreground/20 underline-offset-4 outline-none pointer-fine:h-8 hover:text-foreground hover:decoration-volt focus-visible:text-volt"
              >
                Clear all
              </button>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>
    </div>
  )
}
