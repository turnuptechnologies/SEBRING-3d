"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Plus, Tag, X } from "lucide-react"
import { useId, useLayoutEffect, useState, type FormEvent } from "react"

import { EASE_OUT_EXPO } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { useCart, useCartTotals } from "@/lib/commerce/cart-store"
import { cn } from "@/lib/utils"

interface PromoFieldProps {
  /** Start folded behind an "Add a promo code" toggle (drawer). */
  collapsible?: boolean
  className?: string
}

/** Promo code entry → applied chip. Never nest inside another <form>. */
export function PromoField({ collapsible = false, className }: PromoFieldProps) {
  const promoCode = useCart((s) => s.promoCode)
  const applyPromo = useCart((s) => s.applyPromo)
  const removePromo = useCart((s) => s.removePromo)
  const totals = useCartTotals()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(!collapsible)
  const inputId = useId()
  const errorId = `${inputId}-error`

  // Pages stay mounted (hidden) by Activity — don't greet a returning shopper with a stale error.
  useLayoutEffect(() => {
    return () => setError(null)
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const result = applyPromo(value)
    if (result.ok) {
      setValue("")
      setError(null)
    } else {
      setError(result.message)
    }
  }

  if (promoCode) {
    const active = totals.promo?.code === promoCode ? totals.promo : null
    return (
      <div className={className}>
        <div
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-sm border border-dashed px-3 py-2",
            active ? "border-volt/45 bg-volt/[0.05]" : "border-caution/45 bg-caution/[0.05]"
          )}
        >
          <Tag className={cn("size-3.5 shrink-0", active ? "text-volt" : "text-caution")} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm leading-tight">
            <span className={cn("mr-2 font-mono text-xs font-semibold tracking-[0.14em]", active ? "text-volt" : "text-caution")}>{promoCode}</span>
            <span className="text-ivory-200">{active ? active.label : "Not applied"}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              removePromo()
              setError(null)
            }}
            className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground touch:size-11"
            aria-label={`Remove promo code ${promoCode}`}
          >
            <X className="size-4" />
          </button>
        </div>
        {!active && totals.promoError && (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-caution" role="status">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {totals.promoError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`${inputId}-panel`}
          className="group/promo flex min-h-11 w-full items-center gap-2.5 text-left text-sm text-ivory-200 transition-colors hover:text-foreground"
        >
          <Tag className="size-3.5 text-muted-foreground transition-colors group-hover/promo:text-volt" aria-hidden="true" />
          <span className="flex-1">Add a promo code</span>
          <Plus className={cn("size-4 text-muted-foreground transition-transform duration-500 ease-out-expo", expanded && "rotate-45")} aria-hidden="true" />
        </button>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`${inputId}-panel`}
            key="panel"
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <form onSubmit={onSubmit} className={cn("flex gap-2", collapsible && "pt-1 pb-1")} noValidate>
              <label htmlFor={inputId} className="sr-only">
                Promo code
              </label>
              <input
                id={inputId}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="Promo code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(
                  "h-11 min-w-0 flex-1 rounded-sm border border-input bg-carbon-850 px-3.5 font-mono text-sm tracking-[0.14em] text-foreground uppercase outline-none",
                  "transition-[border-color,box-shadow] duration-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-smoke-500 placeholder:normal-case",
                  "hover:border-foreground/25 focus-visible:border-volt/70 focus-visible:shadow-[0_0_0_3px_rgb(255_210_63/0.14)] focus-visible:outline-none",
                  "aria-invalid:border-signal/70 aria-invalid:shadow-[0_0_0_3px_rgb(255_75_58/0.12)]"
                )}
              />
              <Button type="submit" variant="outline" className="h-11 px-5" disabled={!value.trim()}>
                Apply
              </Button>
            </form>
            {error && (
              <p id={errorId} role="alert" className="mt-2 text-xs leading-snug text-signal">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
