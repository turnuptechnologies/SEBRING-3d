"use client"

import { motion } from "framer-motion"
import { Heart, Trash2 } from "lucide-react"
import Link from "next/link"

import { ArtGlow } from "@/components/cart/art-glow"
import { removeWithUndo, saveForLater } from "@/components/cart/cart-actions"
import type { CartRow } from "@/components/cart/cart-rows"
import { HudCorners } from "@/components/site/hud-corners"
import { Price } from "@/components/site/price"
import { productHref } from "@/components/site/product-card"
import { ProductImage } from "@/components/site/product-image"
import { QuantityStepper } from "@/components/site/quantity-stepper"
import { brandName, isLowStock } from "@/lib/catalog"
import { useCart } from "@/lib/commerce/cart-store"
import { formatPrice, formatScales } from "@/lib/format"
import { cn } from "@/lib/utils"

type Tone = "muted" | "caution" | "signal" | "volt"

/** The fixed stock vocabulary, phrased for a line already in the cart. */
export function lineNote(row: CartRow): { tone: Tone; text: string } | null {
  const { product, qty, max, unavailable } = row
  if (unavailable) return { tone: "signal", text: "Sold out — remove to check out" }
  if (qty > max) return { tone: "caution", text: `Reduced to ${max} — that’s all we have` }
  if (product.preorder) return { tone: "volt", text: `Pre-order · ships ${product.preorder.ships}` }
  if (qty >= max && max === product.stock) return { tone: "caution", text: max === 1 ? "Last one in stock" : `That’s all ${max} we have` }
  if (qty >= max) return { tone: "muted", text: `Limit ${max} per order` }
  if (isLowStock(product)) return { tone: "caution", text: `Only ${product.stock} left` }
  return null
}

const TONE: Record<Tone, string> = {
  muted: "text-muted-foreground",
  caution: "text-caution",
  signal: "text-signal",
  volt: "text-volt",
}

interface CartLineItemProps {
  row: CartRow
  variant?: "drawer" | "page"
  /** Changes every time this line is (re-)added — replays the highlight. */
  flash?: number
  /** Called when one of the line's links navigates (closes the drawer). */
  onNavigate?: () => void
}

export function CartLineItem({ row, variant = "drawer", flash, onNavigate }: CartLineItemProps) {
  const setQty = useCart((s) => s.setQty)
  const { product, slug, max, unavailable } = row
  const href = productHref(product)
  const qty = Math.min(row.qty, Math.max(max, 1))
  const note = lineNote(row)
  const page = variant === "page"
  const lineTotal = row.priced?.lineTotal ?? 0

  const thumb = (
    <Link
      href={href}
      onNavigate={onNavigate}
      tabIndex={-1}
      aria-hidden="true"
      className={cn(
        "group/thumb relative block shrink-0 self-start overflow-hidden rounded-md border border-hairline bg-carbon-800 bg-spotlight",
        "[&_[role=img]>span]:hidden",
        page ? "aspect-[4/3] w-28 sm:w-40" : "aspect-[4/3] w-[5.75rem]"
      )}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-40 [--grid-size:14px] mask-fade-b" />
      <ArtGlow product={product} />
      <div className={cn("absolute transition-transform duration-700 ease-out-expo group-hover/line:scale-[1.05]", page ? "inset-[7%]" : "inset-[6%]")}>
        <ProductImage product={product} sizes={page ? "160px" : "96px"} />
      </div>
      {page && <HudCorners size={10} inset={6} className="opacity-0 transition-opacity duration-500 group-hover/line:opacity-100" />}
    </Link>
  )

  const stepper = unavailable ? (
    <span className="inline-flex h-9 items-center rounded-sm border border-dashed border-signal/40 px-3 label-mono text-[0.625rem] text-signal">Sold out</span>
  ) : (
    <QuantityStepper
      value={qty}
      max={max}
      onChange={(n) => setQty(slug, n)}
      size="sm"
      label={`Quantity, ${product.name}`}
      className="bg-carbon-850/60 touch:[&>button]:h-11 touch:[&>input]:h-11"
    />
  )

  const removeButton = (
    <button
      type="button"
      onClick={() => removeWithUndo(slug)}
      className={cn(
        "grid shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-signal/10 hover:text-signal",
        page ? "hidden" : "size-9 touch:size-11"
      )}
      aria-label={`Remove ${product.name} from cart`}
    >
      <Trash2 className="size-4" />
    </button>
  )

  return (
    <div data-line={slug} className={cn("group/line relative isolate flex gap-4", page ? "py-6 sm:gap-6" : "py-5")}>
      {flash ? (
        <motion.span
          key={flash}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -inset-x-5 -z-10 bg-gradient-to-r from-volt/[0.11] via-volt/[0.04] to-transparent sm:-inset-x-6"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.6, delay: 0.5, ease: "easeOut" }}
        />
      ) : null}
      {flash ? (
        <motion.span
          key={`bar-${flash}`}
          aria-hidden="true"
          className="absolute top-5 bottom-5 -left-5 w-0.5 origin-top bg-volt sm:-left-6"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}

      {thumb}

      <div className={cn("min-w-0 flex-1", page && "md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_8.5rem_7.5rem] md:items-start md:gap-6")}>
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2 label-mono text-[0.625rem] text-muted-foreground">
                <span className="truncate">
                  {brandName(product.brand)} · {formatScales(product.scales)}
                  {page && <span className="hidden sm:inline"> · {product.sku}</span>}
                </span>
                {flash ? <span className="shrink-0 text-volt">Just added</span> : null}
              </p>
              <h3 className={cn("mt-1.5 font-semiwide leading-snug font-semibold tracking-[-0.01em] text-balance", page ? "text-base sm:text-lg" : "text-[0.9375rem]")}>
                <Link href={href} onNavigate={onNavigate} className="line-clamp-2 rounded-[2px] transition-colors hover:text-volt focus-visible:outline-offset-2">
                  {product.name}
                </Link>
              </h3>
            </div>
            {removeButton}
          </div>
          <div className={cn("mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1", page && "md:hidden")}>
            <Price price={product.price} compareAt={product.compareAtPrice} size="sm" />
          </div>
          {note && <p className={cn("mt-1.5 text-xs font-medium", TONE[note.tone])}>{note.text}</p>}
          {page && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => saveForLater(slug)}
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline touch:min-h-11"
              >
                <Heart className="size-3.5" aria-hidden="true" />
                Save for later
              </button>
              <button
                type="button"
                onClick={() => removeWithUndo(slug)}
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-signal hover:underline touch:min-h-11"
                aria-label={`Remove ${product.name} from cart`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </button>
            </div>
          )}
        </div>

        {page && (
          <div className="hidden pt-6 md:block">
            <span className="sr-only">Unit price </span>
            <Price price={product.price} compareAt={product.compareAtPrice} size="sm" className="flex-col gap-y-0.5" />
          </div>
        )}

        <div className={cn("mt-3 flex items-center justify-between gap-3", page && "md:mt-5 md:block")}>
          {stepper}
          <p className={cn("font-semiwide text-[0.9375rem] font-bold tracking-[-0.01em] tabular", page && "md:hidden", unavailable && "text-muted-foreground line-through")}>
            <span className="sr-only">Line total </span>
            {formatPrice(unavailable ? product.price * row.qty : lineTotal)}
          </p>
        </div>

        {page && (
          <p className={cn("hidden pt-6 text-right font-semiwide text-lg font-bold tracking-[-0.01em] tabular md:block", unavailable && "text-muted-foreground line-through")}>
            <span className="sr-only">Line total </span>
            {formatPrice(unavailable ? product.price * row.qty : lineTotal)}
          </p>
        )}
      </div>
    </div>
  )
}
