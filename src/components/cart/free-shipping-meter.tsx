"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

import type { Totals } from "@/lib/commerce/pricing"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

const SPRING = { type: "spring", stiffness: 90, damping: 20, mass: 0.9 } as const

/**
 * "You're $X from free shipping" telemetry bar. Progress is measured on the
 * discounted subtotal — the same number pricing.ts qualifies against.
 */
export function FreeShippingMeter({ totals, className }: { totals: Totals; className?: string }) {
  const threshold = totals.freeShippingThreshold
  const spend = Math.max(0, totals.subtotal - totals.discount)
  const unlocked = totals.qualifiesForFreeShipping
  const progress = unlocked ? 1 : Math.min(1, spend / threshold)
  const viaPromo = unlocked && spend < threshold && totals.promo

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm leading-snug text-ivory-200" aria-live="polite">
          {unlocked ? (
            <span className="inline-flex items-center gap-2 font-medium text-foreground">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-volt text-carbon-900" aria-hidden="true">
                <Check className="size-2.5" strokeWidth={3.5} />
              </span>
              Free shipping unlocked{viaPromo ? ` with ${viaPromo.code}` : ""}
            </span>
          ) : (
            <>
              You’re <strong className="font-semibold text-foreground tabular">{formatPrice(totals.freeShippingRemaining)}</strong> from free shipping
            </>
          )}
        </p>
        <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground tabular" aria-hidden="true">
          {formatPrice(Math.min(spend, threshold), { round: true })}
          <span className="px-1 text-foreground/25">/</span>
          {formatPrice(threshold, { round: true })}
        </span>
      </div>

      <div
        className="relative mt-3 mr-1.5 h-3"
        role="progressbar"
        aria-label="Progress toward free shipping"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.round(Math.min(spend, threshold))}
        aria-valuetext={unlocked ? "Free shipping unlocked" : `${formatPrice(totals.freeShippingRemaining)} to go`}
      >
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden bg-foreground/[0.09]">
          <motion.div
            className="absolute inset-0 origin-left bg-gradient-to-r from-volt-600 via-volt to-volt-300"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={SPRING}
          />
          {unlocked && <div className="absolute inset-y-0 left-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
        </div>
        {[0.25, 0.5, 0.75].map((t) => (
          <span key={t} aria-hidden="true" className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-foreground/15" style={{ left: `${t * 100}%` }} />
        ))}
        <motion.div aria-hidden="true" className="absolute inset-0" initial={{ x: "0%" }} animate={{ x: `${progress * 100}%`, opacity: unlocked ? 0 : 1 }} transition={SPRING}>
          <span className="absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-volt shadow-[0_0_14px_3px_rgb(255_210_63/0.45)]" />
        </motion.div>
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 right-0 size-3 translate-x-1/2 -translate-y-1/2 bg-checker ring-1 transition-[box-shadow,opacity] duration-700 [--checker-size:6px]",
            unlocked ? "opacity-100 shadow-[0_0_16px_2px_rgb(255_210_63/0.4)] ring-volt/70" : "opacity-60 ring-foreground/20"
          )}
        />
      </div>
    </div>
  )
}
