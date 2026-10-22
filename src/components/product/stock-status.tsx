import { shipsLabel, stockHeadline, type StockState } from "@/components/product/product-facts"
import { commerce } from "@/lib/site"
import { cn } from "@/lib/utils"

const DOT: Record<StockState["kind"], string> = {
  "in-stock": "bg-go",
  low: "bg-caution",
  preorder: "bg-volt",
  "sold-out": "bg-smoke-500",
}

const HEADLINE: Record<StockState["kind"], string> = {
  "in-stock": "text-go",
  low: "text-caution",
  preorder: "text-volt light:text-carbon-900",
  "sold-out": "text-foreground",
}

function detail(s: StockState) {
  switch (s.kind) {
    case "in-stock":
    case "low":
      return commerce.processing
    case "preorder":
      return `Ships ${shipsLabel(s.ships)}. We dispatch the day stock lands.`
    case "sold-out":
      return "Join the list and we’ll email you the moment it’s back."
  }
}

/** The fixed stock vocabulary, with a status light. */
export function StockStatus({ state, compact = false, className }: { state: StockState; compact?: boolean; className?: string }) {
  const live = state.kind === "in-stock" || state.kind === "low"
  return (
    <p className={cn("flex items-start gap-3 text-sm leading-snug", className)}>
      <span className="relative mt-[0.3rem] flex size-2 shrink-0" aria-hidden="true">
        {live && <span className={cn("absolute inset-0 rounded-full opacity-60 animate-live", DOT[state.kind])} />}
        <span className={cn("relative size-2 rounded-full", DOT[state.kind])} />
      </span>
      <span className="min-w-0">
        <span className={cn("font-semibold", HEADLINE[state.kind])}>{stockHeadline(state)}</span>
        {!compact && <span className="text-muted-foreground"> — {detail(state)}</span>}
      </span>
    </p>
  )
}
