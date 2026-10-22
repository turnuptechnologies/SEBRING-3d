"use client"

import { MapPin, Truck, Zap, type LucideIcon } from "lucide-react"
import { useId } from "react"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCart } from "@/lib/commerce/cart-store"
import { computeTotals } from "@/lib/commerce/pricing"
import { formatPrice } from "@/lib/format"
import { commerce, formatAddress, type ShippingMethod } from "@/lib/site"
import { cn } from "@/lib/utils"

export const SHIPPING_METHODS = Object.keys(commerce.shippingRates) as ShippingMethod[]

const ICONS: Record<ShippingMethod, LucideIcon> = { standard: Truck, express: Zap, pickup: MapPin }

/** What each method costs for the current cart — priced by computeTotals, never re-implemented. */
export function useShippingQuotes() {
  const lines = useCart((s) => s.lines)
  const promoCode = useCart((s) => s.promoCode)
  return SHIPPING_METHODS.map((method) => {
    const t = computeTotals(lines, { promoCode, shippingMethod: method })
    return { method, rate: commerce.shippingRates[method], price: t.shipping, qualifies: t.qualifiesForFreeShipping }
  })
}

interface ShippingOptionsProps {
  value: ShippingMethod
  onChange: (method: ShippingMethod) => void
  /** compact: cart summary estimate · cards: checkout delivery step */
  variant?: "compact" | "cards"
  labelledBy?: string
  invalid?: boolean
  className?: string
}

export function ShippingOptions({ value, onChange, variant = "compact", labelledBy, invalid, className }: ShippingOptionsProps) {
  const quotes = useShippingQuotes()
  const baseId = useId()
  const cards = variant === "cards"

  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as ShippingMethod)}
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      className={cn(cards ? "gap-3" : "gap-2", className)}
    >
      {quotes.map(({ method, rate, price, qualifies }) => {
        const id = `${baseId}-${method}`
        const Icon = ICONS[method]
        return (
          <label
            key={method}
            htmlFor={id}
            className={cn(
              "group/ship relative flex cursor-pointer items-start rounded-md border border-hairline bg-carbon-850/60 transition-[border-color,background-color,box-shadow] duration-300",
              "hover:border-foreground/25 has-[[data-state=checked]]:border-volt/55 has-[[data-state=checked]]:bg-volt/[0.035]",
              "has-[:focus-visible]:shadow-[0_0_0_3px_rgb(255_210_63/0.18)]",
              cards ? "gap-4 p-4 sm:p-5" : "gap-3 px-3.5 py-3"
            )}
          >
            <RadioGroupItem id={id} value={method} className={cn("shrink-0 border-foreground/30", cards ? "mt-1" : "mt-0.5")} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className={cn("flex items-center gap-2 font-semiwide font-bold tracking-[0.02em]", cards ? "text-[0.9375rem]" : "text-[0.8125rem]")}>
                  {cards && <Icon className="size-4 text-muted-foreground transition-colors group-has-[[data-state=checked]]/ship:text-volt" aria-hidden="true" />}
                  {rate.label}
                </span>
                <span className={cn("shrink-0 font-semiwide font-bold tabular", cards ? "text-[0.9375rem]" : "text-[0.8125rem]", price === 0 && "text-volt")}>
                  {price === 0 ? "Free" : formatPrice(price)}
                </span>
              </span>
              <span className={cn("mt-1 block leading-snug text-muted-foreground", cards ? "text-[0.8125rem]" : "text-xs")}>
                {rate.eta}
                {cards && <span className="text-foreground/30"> · </span>}
                {cards && rate.carrier}
              </span>
              {method === "standard" && !qualifies && (
                <span className="mt-1.5 block text-xs text-ivory-300">Free on orders over {formatPrice(commerce.freeShippingThreshold, { round: true })}</span>
              )}
              {method === "pickup" && cards && <span className="mt-1.5 block text-xs text-ivory-300">{formatAddress()}</span>}
            </span>
          </label>
        )
      })}
    </RadioGroup>
  )
}
