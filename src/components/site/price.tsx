import { discountPercent, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PriceProps {
  price: number
  compareAt?: number
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showSaving?: boolean
}

const SIZES = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-[2.5rem] leading-none",
}

/** Price with optional strike-through compare-at and saving badge. */
export function Price({ price, compareAt, size = "md", className, showSaving = false }: PriceProps) {
  const off = discountPercent(price, compareAt)
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-1", className)} data-price>
      <span className={cn("font-semiwide font-bold tracking-[-0.02em] tabular", SIZES[size], off > 0 && "text-signal light:text-signal-600")}>
        <span className="sr-only">{off > 0 ? "Sale price " : "Price "}</span>
        {formatPrice(price)}
      </span>
      {off > 0 && compareAt && (
        <>
          <span className="text-sm text-muted-foreground line-through decoration-1 tabular">
            <span className="sr-only">Was </span>
            {formatPrice(compareAt)}
          </span>
          {showSaving && <span className="label-mono rounded-[3px] bg-signal/14 px-1.5 py-1 text-signal">Save {off}%</span>}
        </>
      )}
    </span>
  )
}
