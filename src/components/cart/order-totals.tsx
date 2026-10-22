"use client"

import { AnimatePresence, motion } from "framer-motion"
import type { ReactNode } from "react"

import { EASE_OUT_EXPO } from "@/components/motion"
import type { Totals } from "@/lib/commerce/pricing"
import { formatPrice, pluralize } from "@/lib/format"
import { commerce } from "@/lib/site"
import { cn } from "@/lib/utils"

interface OrderTotalsProps {
  totals: Totals
  /** drawer: items, discount and subtotal · full: shipping, tax and the order total too. */
  variant?: "drawer" | "full"
  className?: string
}

export function OrderTotals({ totals, variant = "full", className }: OrderTotalsProps) {
  const discounted = Math.max(0, totals.subtotal - totals.discount)
  const rate = commerce.shippingRates[totals.shippingMethod]
  const full = variant === "full"
  const showItems = full || totals.discount > 0

  return (
    <dl className={cn("text-sm", className)}>
      <div className="space-y-2.5">
        {showItems && <Row label={full ? `Subtotal · ${pluralize(totals.itemCount, "item")}` : `Items · ${totals.itemCount}`} value={formatPrice(totals.subtotal)} />}
        {totals.discount > 0 && totals.promo && (
          <Row
            label={
              <>
                Discount <span className="ml-1 font-mono text-[0.6875rem] tracking-[0.12em] text-volt">{totals.promo.code}</span>
              </>
            }
            value={`−${formatPrice(totals.discount)}`}
            valueClassName="text-volt"
          />
        )}
        {full && (
          <>
            <Row
              label={`Shipping · ${rate.label}`}
              value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
              valueClassName={totals.shipping === 0 ? "text-volt" : undefined}
            />
            <Row label={`Estimated tax · ${Math.round(commerce.taxRate * 1000) / 10}%`} value={formatPrice(totals.tax)} />
          </>
        )}
      </div>
      <div className={cn("flex items-baseline justify-between gap-4", showItems && "mt-4 border-t border-hairline pt-4")}>
        <dt className="font-semiwide text-xs font-bold tracking-[0.12em] uppercase">{full ? "Total" : "Subtotal"}</dt>
        <dd className="flex items-baseline gap-2">
          {full && <span className="label-mono text-[0.625rem] text-muted-foreground">{commerce.currency}</span>}
          <AnimatedAmount value={full ? totals.total : discounted} className={full ? "text-[1.75rem]" : "text-xl"} />
        </dd>
      </div>
    </dl>
  )
}

function Row({ label, value, valueClassName }: { label: ReactNode; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium text-foreground tabular", valueClassName)}>{value}</dd>
    </div>
  )
}

/** Odometer-style roll between values; the plain figure is what assistive tech reads. */
export function AnimatedAmount({ value, className }: { value: number; className?: string }) {
  const text = formatPrice(value)
  return (
    <span className={cn("relative inline-flex font-semiwide leading-none font-bold tracking-[-0.02em] tabular", className)}>
      <span className="sr-only" aria-live="polite">
        {text}
      </span>
      <span aria-hidden="true" className="relative inline-flex overflow-hidden py-[0.08em]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="inline-block"
            initial={{ y: "70%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-70%", opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
