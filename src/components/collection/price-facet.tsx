"use client"

import { useId, useState, type KeyboardEvent } from "react"

import { useListing } from "@/components/collection/listing-context"
import { SLIDER_STEPS, priceHistogram, priceScale, withFilters } from "@/components/collection/listing-model"
import { Slider } from "@/components/ui/slider"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Dual-thumb price range over a product histogram, with exact number inputs. */
export function PriceFacet() {
  const { state, counts, base, commit } = useListing()
  const [lo, hi] = counts.priceRange
  const scale = priceScale(lo, hi)
  const minValue = Math.max(lo, Math.min(state.filters.priceMin ?? lo, hi))
  const maxValue = Math.min(hi, Math.max(state.filters.priceMax ?? hi, lo))
  const [drag, setDrag] = useState<[number, number] | null>(null)
  const pos: [number, number] = drag ?? [scale.toPos(minValue), scale.toPos(maxValue)]
  const shown: [number, number] = drag ? [scale.toPrice(drag[0]), scale.toPrice(drag[1])] : [minValue, maxValue]
  const bars = priceHistogram(base, lo, hi)
  const peak = Math.max(1, ...bars)
  // A distribution only says something once there is enough to distribute.
  const showBars = base.length >= 8

  if (hi - lo < 1) {
    return <p className="pb-2 text-sm text-muted-foreground">Everything here is {formatPrice(lo)}.</p>
  }

  const apply = (min: number, max: number) => {
    const a = Math.max(lo, Math.min(min, max))
    const b = Math.min(hi, Math.max(min, max))
    commit(withFilters(state, { priceMin: a <= lo ? undefined : a, priceMax: b >= hi ? undefined : b }))
  }

  return (
    <div className="pb-3">
      <div aria-hidden="true" className={cn("flex h-10 items-end gap-[2px] px-[9px]", !showBars && "hidden")}>
        {bars.map((n, i) => {
          const center = ((i + 0.5) / bars.length) * SLIDER_STEPS
          const inRange = center >= pos[0] && center <= pos[1]
          return (
            <span
              key={i}
              className={cn("flex-1 rounded-t-[1px] transition-colors duration-300", inRange ? "bg-foreground/40" : "bg-foreground/10")}
              style={{ height: n ? `${Math.max(10, (n / peak) * 100)}%` : "2px" }}
            />
          )
        })}
      </div>
      <Slider
        min={0}
        max={SLIDER_STEPS}
        step={1}
        minStepsBetweenThumbs={8}
        value={pos}
        onValueChange={(v) => setDrag([v[0], v[1]])}
        onValueCommit={(v) => {
          setDrag(null)
          apply(scale.toPrice(v[0]), scale.toPrice(v[1]))
        }}
        aria-label="Price range"
        className={cn(
          "py-3",
          "[&_[data-slot=slider-track]]:h-[2px] [&_[data-slot=slider-track]]:bg-foreground/12",
          "[&_[data-slot=slider-range]]:bg-volt",
          "[&_[data-slot=slider-thumb]]:size-[18px] [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-volt [&_[data-slot=slider-thumb]]:bg-carbon-900",
          "[&_[data-slot=slider-thumb]]:shadow-[0_0_0_4px_rgb(11_11_15/0.9)] [&_[data-slot=slider-thumb]]:after:-inset-[13px]",
          "[&_[data-slot=slider-thumb]]:hover:ring-4 [&_[data-slot=slider-thumb]]:hover:ring-volt/20 [&_[data-slot=slider-thumb]]:focus-visible:ring-4 [&_[data-slot=slider-thumb]]:focus-visible:ring-volt/35"
        )}
      />
      <div className="mt-2 flex items-center gap-2">
        <PriceInput label="Minimum price" value={shown[0]} min={lo} max={hi} onCommit={(v) => apply(v, maxValue)} />
        <span aria-hidden="true" className="h-px w-3 shrink-0 bg-foreground/25" />
        <PriceInput label="Maximum price" value={shown[1]} min={lo} max={hi} onCommit={(v) => apply(minValue, v)} />
      </div>
    </div>
  )
}

function PriceInput({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (v: number) => void }) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)

  const commitDraft = () => {
    if (draft == null) return
    const n = Number(draft.replace(/[^0-9.]/g, ""))
    setDraft(null)
    if (draft.trim() !== "" && Number.isFinite(n) && Math.round(n) !== value) onCommit(Math.round(n))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitDraft()
    } else if (e.key === "Escape") {
      setDraft(null)
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs text-muted-foreground">
        $
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={draft ?? String(value)}
        min={min}
        max={max}
        onFocus={(e) => {
          setDraft(String(value))
          e.currentTarget.select()
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-sm border border-input bg-foreground/[0.03] pr-2 pl-6 font-mono text-sm tabular outline-none transition-colors pointer-fine:h-9 hover:border-foreground/30 focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/25"
      />
    </div>
  )
}
