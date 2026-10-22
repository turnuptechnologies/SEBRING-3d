"use client"

import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

interface QuantityStepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max: number
  size?: "sm" | "md"
  label?: string
  className?: string
}

/** −  2  + stepper with keyboard support and live announcements. */
export function QuantityStepper({ value, onChange, min = 1, max, size = "md", label = "Quantity", className }: QuantityStepperProps) {
  const h = size === "sm" ? "h-9" : "h-12"
  const btn = cn("grid aspect-square place-items-center text-foreground/80 transition-colors hover:text-foreground disabled:opacity-30", h)
  return (
    <div className={cn("inline-flex items-center rounded-sm border border-input", className)} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))))
        }}
        className={cn("w-10 bg-transparent text-center font-mono text-sm tabular outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", h)}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
