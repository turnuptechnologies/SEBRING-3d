"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ArrowUpRight, Check, CircleCheck, Heart, MapPin, MessagesSquare, RotateCcw, ShoppingBag, Timer, Truck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CopyValue } from "@/components/product/copy-value"
import { NotifyForm } from "@/components/product/notify-form"
import { fitCheckHref, specChips, statusBadges } from "@/components/product/product-facts"
import { usePurchase } from "@/components/product/purchase-context"
import { StockStatus } from "@/components/product/stock-status"
import { useStoresReady } from "@/components/product/use-stores-ready"
import { Price } from "@/components/site/price"
import { QuantityStepper } from "@/components/site/quantity-stepper"
import { Button } from "@/components/ui/button"
import { brandHref, brandName, fitsAnyCar, getProducts, isCar } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useCart, useCartTotals } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { formatPrice, formatScales, pluralize } from "@/lib/format"
import { commerce, site } from "@/lib/site"
import { cn } from "@/lib/utils"

export function BuyBox({ upgradeCount }: { upgradeCount: number }) {
  const { product, stock } = usePurchase()
  const soldOut = stock.kind === "sold-out"
  const badges = statusBadges(product)
  const chips = specChips(product)

  return (
    <div className="@container flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <Link
          href={brandHref(product.brand)}
          className="group/brand inline-flex h-8 items-center gap-1.5 label-mono text-foreground/85 transition-colors hover:text-volt touch:h-10"
        >
          {brandName(product.brand)}
          <ArrowUpRight className="size-3 transition-transform duration-300 ease-out-expo group-hover/brand:translate-x-0.5 group-hover/brand:-translate-y-0.5" aria-hidden="true" />
          <span className="sr-only">— shop all {brandName(product.brand)}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4">
          <CopyValue label="SKU" value={product.sku} />
          {product.mpn && <CopyValue label="MPN" value={product.mpn} />}
        </div>
      </div>

      <h1 className="mt-4 font-wide text-[length:clamp(1.9rem,8.6cqw,3.15rem)] leading-[0.94] font-black tracking-[-0.035em] text-balance uppercase">
        {product.name}
      </h1>
      <p className="mt-4 max-w-[52ch] text-[0.98rem] leading-relaxed text-muted-foreground text-pretty">{product.summary}</p>

      {(badges.length > 0 || chips.length > 0) && (
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Product attributes">
          {badges.map((b) => (
            <li key={b.label}>
              <span
                className={cn(
                  "inline-flex h-7 items-center rounded-[3px] px-2.5 label-mono text-[0.625rem] font-semibold",
                  b.tone === "volt" && "bg-volt text-carbon-900",
                  b.tone === "signal" && "bg-signal text-white",
                  b.tone === "outline" && "text-volt ring-1 ring-volt/50 ring-inset"
                )}
              >
                {b.label}
              </span>
            </li>
          ))}
          {chips.map((c) => (
            <li key={c.label}>
              {c.href ? (
                <Link
                  href={c.href}
                  title={c.title}
                  className="inline-flex h-7 items-center rounded-[3px] px-2.5 label-mono text-[0.625rem] text-foreground/75 ring-1 ring-foreground/14 transition-[color,box-shadow] ring-inset hover:text-foreground hover:ring-foreground/40 touch:h-9"
                >
                  {c.label}
                  {c.title && <span className="sr-only"> — {c.title}</span>}
                </Link>
              ) : (
                <span className="inline-flex h-7 items-center rounded-[3px] px-2.5 label-mono text-[0.625rem] text-foreground/55 ring-1 ring-foreground/8 ring-inset touch:h-9">{c.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-7 border-t border-hairline pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <Price price={product.price} compareAt={product.compareAtPrice} size="lg" showSaving className="[&>span:first-child]:text-[2rem]" />
          <span className="label-mono text-[0.625rem] text-subtle">{commerce.currency} · Tax at checkout</span>
        </div>
        <StockStatus state={stock} className="mt-4" />
      </div>

      {soldOut ? <SoldOutBlock /> : <PurchaseControls />}

      <FitSummary product={product} upgradeCount={upgradeCount} />

      <Link
        href={fitCheckHref(product)}
        className="group/fit mt-3 flex items-center gap-4 rounded-lg border border-hairline bg-card/60 p-4 transition-[border-color,background-color] duration-300 hover:border-foreground/22 hover:bg-card"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-foreground/80" aria-hidden="true">
          <MessagesSquare className="size-[1.1rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semiwide text-sm font-bold tracking-[-0.01em]">Not sure it fits? Ask the Sebring crew</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Tell us your car — we’ll confirm before you buy.</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-foreground/50 transition-transform duration-500 ease-out-expo group-hover/fit:translate-x-1 group-hover/fit:text-foreground" aria-hidden="true" />
      </Link>

      <ShippingPerks product={product} />
    </div>
  )
}

function SoldOutBlock() {
  const { product, registerCta } = usePurchase()
  return (
    <div ref={registerCta} id="notify" className="mt-6 scroll-mt-32">
      <NotifyForm product={product} />
      <div className="mt-3 flex">
        <SaveButton product={product} long className="flex-1" />
      </div>
    </div>
  )
}

function PurchaseControls() {
  const { product, stock, max, qty, setQty, justAdded, addToCart, buyNow, registerCta } = usePurchase()
  const hydrated = useStoresReady()
  const inCart = useCart((s) => s.lines.find((l) => l.slug === product.slug)?.qty ?? 0)
  const openCart = useCart((s) => s.open)
  const remaining = Math.max(0, max - (hydrated ? inCart : 0))
  const preorder = stock.kind === "preorder"

  return (
    <div ref={registerCta} className="mt-6 scroll-mt-32">
      <div className="flex gap-3">
        <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, max)} label={`Quantity of ${product.name}`} className="shrink-0" />
        <Button size="lg" onClick={addToCart} className="h-12 min-w-0 flex-1 overflow-hidden" aria-label={`${preorder ? "Pre-order" : "Add to cart"}: ${qty} × ${product.name}`}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 group-hover/button:animate-sweep group-hover/button:opacity-100" />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={justAdded ? "added" : "idle"}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              {justAdded ? <Check /> : <ShoppingBag />}
              {justAdded ? "Added to cart" : preorder ? "Pre-order now" : "Add to cart"}
            </motion.span>
          </AnimatePresence>
          <span className="ml-1 hidden font-mono text-[0.7rem] font-medium tracking-[0.04em] opacity-60 @[22rem]:inline tabular">{formatPrice(product.price * qty)}</span>
        </Button>
      </div>
      <div className="mt-3 flex gap-3">
        <Button variant="outline" size="lg" onClick={buyNow} className="h-12 flex-1">
          Buy now
          <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-1" />
        </Button>
        <SaveButton product={product} />
      </div>
      <p className="mt-3 min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {hydrated && inCart > 0 ? (
          <>
            {inCart} already in your cart{remaining === 0 ? " — the most we can ship" : ""} ·{" "}
            <button type="button" onClick={openCart} className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-volt">
              View cart
            </button>
          </>
        ) : max <= 5 ? (
          `Limit ${max} per order while stock lasts.`
        ) : (
          `Up to ${max} per order.`
        )}
      </p>
    </div>
  )
}

function SaveButton({ product, long = false, className }: { product: Product; long?: boolean; className?: string }) {
  const hydrated = useStoresReady()
  const saved = useGarage((s) => s.saved.includes(product.slug))
  const toggleSaved = useGarage((s) => s.toggleSaved)
  const router = useRouter()
  const isSaved = hydrated && saved

  const onToggle = () => {
    const nowSaved = toggleSaved(product.slug)
    toast(nowSaved ? "Saved to your garage" : "Removed from your garage", {
      description: product.name,
      action: nowSaved ? { label: "View garage", onClick: () => router.push("/garage") } : undefined,
    })
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onToggle}
      aria-pressed={isSaved}
      className={cn("h-12 px-5", isSaved && "border-signal/40 text-signal hover:border-signal/70", className)}
    >
      <Heart className={cn("transition-transform duration-300", isSaved && "scale-110 fill-current")} />
      {isSaved ? (long ? "Saved to garage" : "Saved") : long ? "Save to garage" : "Save"}
      {!long && <span className="sr-only"> to garage</span>}
    </Button>
  )
}

function FitSummary({ product, upgradeCount }: { product: Product; upgradeCount: number }) {
  const { showDetails } = usePurchase()
  const hydrated = useStoresReady()
  const saved = useGarage((s) => s.saved)

  if (isCar(product)) {
    if (!upgradeCount) return null
    return (
      <button
        type="button"
        onClick={() => showDetails("fitment")}
        className="group/fs mt-7 flex w-full items-center gap-4 border-t border-hairline pt-5 text-left"
      >
        <span className="font-wide text-[1.75rem] leading-none font-black tracking-[-0.04em] text-volt tabular">{upgradeCount}</span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold text-foreground">{upgradeCount === 1 ? "Upgrade or spare fits this car" : "Upgrades & spares fit this car"}</span>
          <span className="block text-muted-foreground">Motors, tires, gears and more — matched by brand and scale.</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 label-mono text-[0.625rem] text-foreground/70 transition-colors group-hover/fs:text-volt">
          See fitment
          <ArrowRight className="size-3 transition-transform duration-500 ease-out-expo group-hover/fs:translate-x-0.5" aria-hidden="true" />
        </span>
      </button>
    )
  }

  if (!product.fits) return null
  const myCars = hydrated ? getProducts(saved).filter(isCar) : []
  const fitsMine = myCars.filter((car) => fitsAnyCar(product, [car.slug]))

  return (
    <div className="mt-7 border-t border-hairline pt-5">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-foreground">
            Fits {product.fits.brands.slice(0, 4).map(brandName).join(", ")}
            {product.fits.brands.length > 4 ? ` +${product.fits.brands.length - 4} more` : ""} · {formatScales(product.fits.scales)}
          </p>
          {product.fits.note && <p className="mt-0.5 text-muted-foreground">{product.fits.note}</p>}
          {fitsMine.length > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-[3px] bg-go/10 px-2 py-1 text-xs font-medium text-go">
              <Check className="size-3" aria-hidden="true" />
              Fits your {fitsMine[0].name}
              {fitsMine.length > 1 ? ` + ${pluralize(fitsMine.length - 1, "more car")}` : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => showDetails("fitment")}
          className="group/fs inline-flex h-8 shrink-0 items-center gap-1.5 label-mono text-[0.625rem] text-foreground/70 transition-colors hover:text-volt touch:h-11"
        >
          Fitment
          <ArrowRight className="size-3 transition-transform duration-500 ease-out-expo group-hover/fs:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function ShippingPerks({ product }: { product: Product }) {
  const { qty, stock } = usePurchase()
  const hydrated = useStoresReady()
  const totals = useCartTotals()
  const threshold = commerce.freeShippingThreshold
  const inCart = hydrated && totals.lines.some((l) => l.product.slug === product.slug)
  const projected = (hydrated ? totals.subtotal - totals.discount : 0) + product.price * qty

  let shippingLine = `Free tracked shipping on orders over ${formatPrice(threshold, { round: true })}`
  if (stock.kind !== "sold-out") {
    if (hydrated && totals.qualifiesForFreeShipping) shippingLine = "Your order already ships free"
    else if (projected >= threshold) shippingLine = inCart || (hydrated && totals.itemCount) ? "Add this and your order ships free" : "This one ships free"
    else if (hydrated) shippingLine = `Add ${formatPrice(threshold - projected)} more for free tracked shipping`
  }

  const perks = [
    { icon: Truck, title: shippingLine, detail: `${commerce.shippingRates.standard.carrier} · ${commerce.shippingRates.standard.eta}` },
    { icon: Timer, title: "Same-day dispatch", detail: commerce.processing },
    { icon: RotateCcw, title: `${commerce.returnWindowDays}-day returns`, detail: "Changed your mind? Send it back unused." },
    { icon: MapPin, title: `Raceway pickup in ${site.address.city}, ${site.address.region}`, detail: commerce.shippingRates.pickup.eta },
  ]

  return (
    <ul className="mt-7 grid gap-x-6 gap-y-4 border-t border-hairline pt-6 @[30rem]:grid-cols-2">
      {perks.map(({ icon: Icon, title, detail }) => (
        <li key={detail} className="flex gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-foreground/55" aria-hidden="true" />
          <span className="min-w-0 text-sm leading-snug">
            <span className="block font-medium text-foreground">{title}</span>
            <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">{detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
