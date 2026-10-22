import { ArrowRight, Check, MessagesSquare, PackageCheck, Store, Truck, Zap } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { GarageFitCheck } from "@/components/product/garage-fit-check"
import { carsThisFitsHref, fitCheckHref, partsForCarHref, specGroups, type SpecRow } from "@/components/product/product-facts"
import { ArrowLink } from "@/components/site/arrow-link"
import { ProductRail } from "@/components/site/product-rail"
import { Button } from "@/components/ui/button"
import { brandHref, brandName, isCar, isPart, scaleHref } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { formatPrice, indexLabel, pluralize } from "@/lib/format"
import { commerce, formatAddress } from "@/lib/site"
import { cn } from "@/lib/utils"

function PanelLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("label-mono text-muted-foreground", className)}>{children}</h3>
}

/* ---------------------------------------------------------------------------
 * 01 Overview
 * ------------------------------------------------------------------------- */

export function OverviewPanel({ product }: { product: Product }) {
  const [lead, ...rest] = product.description
  const v = product.vehicle
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        {lead && <p className="font-sans text-[clamp(1.2rem,1.6vw,1.5rem)] leading-[1.45] tracking-[-0.01em] text-foreground text-pretty">{lead}</p>}
        {rest.map((para) => (
          <p key={para.slice(0, 32)} className="mt-6 max-w-[62ch] text-base leading-relaxed text-muted-foreground text-pretty">
            {para}
          </p>
        ))}
        {v && (
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-4">
            {[
              { label: "Make", value: v.make },
              { label: "Year", value: String(v.year) },
              { label: "Series", value: v.series },
              { label: "Era", value: v.era },
            ].map((item) => (
              <div key={item.label} className="bg-background p-4 sm:p-5">
                <dt className="label-mono text-[0.625rem] text-muted-foreground">{item.label}</dt>
                <dd className="mt-2.5 font-semiwide text-lg font-bold tracking-[-0.02em]">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="lg:col-span-4 lg:col-start-9">
        <PanelLabel>Highlights</PanelLabel>
        <ul className="mt-5 border-t border-hairline">
          {product.highlights.map((h, i) => (
            <li key={h} className="flex items-baseline gap-4 border-b border-hairline py-4">
              <span className="font-mono text-[0.6875rem] text-volt tabular light:text-carbon-900">{indexLabel(i + 1)}</span>
              <span className="text-[0.95rem] leading-snug text-foreground">{h}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * 02 Specs
 * ------------------------------------------------------------------------- */

function SpecValue({ row }: { row: SpecRow }) {
  const body = (
    <>
      {row.swatches && (
        <span className="mr-2.5 inline-flex -space-x-1 align-middle" aria-hidden="true">
          {row.swatches.map((hex, i) => (
            <span key={`${hex}-${i}`} className="inline-block size-3.5 rounded-full ring-1 ring-background" style={{ backgroundColor: hex }} />
          ))}
        </span>
      )}
      <span className={cn(row.mono && "font-mono text-[0.8125rem] tracking-[0.04em]")}>{row.value}</span>
    </>
  )
  if (!row.href) return body
  return (
    <Link href={row.href} className="underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-volt hover:decoration-volt">
      {body}
    </Link>
  )
}

export function SpecsPanel({ product }: { product: Product }) {
  const groups = specGroups(product)
  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-x-16">
      {groups.map((g) => (
        <div key={g.title} className={cn(g.title === "Product" && "lg:row-span-2")}>
          <PanelLabel>{g.title}</PanelLabel>
          <dl className="mt-5 border-t border-hairline">
            {g.rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[minmax(7.5rem,38%)_1fr] gap-4 border-b border-hairline py-3.5 text-[0.9375rem]">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-foreground">
                  <SpecValue row={row} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * 03 Fitment
 * ------------------------------------------------------------------------- */

function FitCheckPrompt({ product, className }: { product: Product; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 rounded-lg border border-hairline bg-card p-6 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.06]" aria-hidden="true">
          <MessagesSquare className="size-[1.1rem]" />
        </span>
        <div>
          <p className="font-semiwide text-base font-bold tracking-[-0.01em]">Not sure it fits? Ask the Sebring crew</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">Send us your car or chassis and we’ll confirm fitment before you order.</p>
        </div>
      </div>
      <Button variant="outline" asChild className="shrink-0">
        <Link href={fitCheckHref(product)}>
          Ask for a fit check
          <ArrowRight />
        </Link>
      </Button>
    </div>
  )
}

function Chip({ href, children }: { href?: string; children: ReactNode }) {
  const cls = "inline-flex h-10 items-center rounded-sm px-4 font-semiwide text-[0.8125rem] font-semibold tracking-[0.02em] ring-1 ring-inset transition-[box-shadow,color]"
  return href ? (
    <Link href={href} className={cn(cls, "ring-foreground/16 hover:text-volt hover:ring-volt/60")}>
      {children}
    </Link>
  ) : (
    <span className={cn(cls, "text-foreground/70 ring-foreground/10")}>{children}</span>
  )
}

export function FitmentPanel({ product, upgrades }: { product: Product; upgrades: Product[] }) {
  if (isCar(product)) {
    return (
      <div className="space-y-10">
        {upgrades.length > 0 ? (
          <ProductRail
            products={upgrades}
            label={`Upgrades & spares for the ${product.name}`}
            header={
              <div>
                <PanelLabel>Matched to this car</PanelLabel>
                <p className="mt-3 font-wide text-title font-black uppercase">Upgrades &amp; spares for this car</p>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground text-pretty">
                  {pluralize(upgrades.length, "part")} chosen for {brandName(product.brand)} {product.scales.join(" / ")} — direct fits first, then universal {product.scales[0]} upgrades.
                </p>
              </div>
            }
          />
        ) : (
          <p className="text-muted-foreground">We’re still matching upgrade parts to this car.</p>
        )}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <ArrowLink href={partsForCarHref(product)}>Shop every part that fits</ArrowLink>
          <ArrowLink href={scaleHref(product.scales[0] ?? "1:32", "parts")}>All {product.scales[0]} parts</ArrowLink>
        </div>
        <FitCheckPrompt product={product} />
      </div>
    )
  }

  const fits = product.fits
  const a = product.attributes
  const compat: { label: string; value: string }[] = []
  if (a?.trackSystem) compat.push({ label: "Track system", value: a.trackSystem })
  if (a?.plug) compat.push({ label: "Connection", value: a.plug })
  if (a?.operation) compat.push({ label: "Operation", value: a.operation })
  if (a?.axle) compat.push({ label: "Axle", value: a.axle })
  if (a?.canType) compat.push({ label: "Can type", value: a.canType })

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      <div className="space-y-9 lg:col-span-7">
        {fits ? (
          <>
            <div>
              <PanelLabel>Fits these brands</PanelLabel>
              <div className="mt-4 flex flex-wrap gap-2">
                {fits.brands.map((b) => (
                  <Chip key={b} href={brandHref(b)}>
                    {brandName(b)}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <PanelLabel>Scale</PanelLabel>
              <div className="mt-4 flex flex-wrap gap-2">
                {fits.scales.map((s) => (
                  <Chip key={s} href={scaleHref(s, isPart(product) ? "parts" : "all")}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
            {fits.note && (
              <blockquote className="border-l-2 border-volt/70 pl-5 text-lg leading-snug text-foreground text-pretty light:border-carbon-900">
                {fits.note}
              </blockquote>
            )}
            <Button variant="outline" size="lg" asChild>
              <Link href={carsThisFitsHref(product)}>
                Shop cars this fits
                <ArrowRight />
              </Link>
            </Button>
          </>
        ) : (
          <div>
            <PanelLabel>Compatibility</PanelLabel>
            {compat.length > 0 ? (
              <dl className="mt-5 border-t border-hairline">
                {compat.map((row) => (
                  <div key={row.label} className="grid grid-cols-[minmax(7.5rem,38%)_1fr] gap-4 border-b border-hairline py-3.5 text-[0.9375rem]">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
                <div className="grid grid-cols-[minmax(7.5rem,38%)_1fr] gap-4 border-b border-hairline py-3.5 text-[0.9375rem]">
                  <dt className="text-muted-foreground">Scale</dt>
                  <dd>{product.scales.join(" / ") || "All scales"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
                Made for {product.scales.join(" / ") || "every scale"} racing. Tell us what you run and we’ll confirm it works with your set-up.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 lg:col-span-5">
        {fits && <GarageFitCheck product={product} />}
        <FitCheckPrompt product={product} className="sm:flex-col sm:items-start" />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * 04 Shipping & returns
 * ------------------------------------------------------------------------- */

export function ShippingPanel() {
  const r = commerce.shippingRates
  const methods = [
    {
      icon: Truck,
      title: r.standard.label,
      price: `${formatPrice(r.standard.price)} · free over ${formatPrice(commerce.freeShippingThreshold, { round: true })}`,
      eta: r.standard.eta,
      detail: r.standard.carrier,
    },
    { icon: Zap, title: r.express.label, price: formatPrice(r.express.price), eta: r.express.eta, detail: r.express.carrier },
    { icon: Store, title: r.pickup.label, price: "Free", eta: r.pickup.eta, detail: formatAddress() },
  ]
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        <PanelLabel>Delivery options</PanelLabel>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {methods.map(({ icon: Icon, title, price, eta, detail }) => (
            <li key={title} className="flex flex-col rounded-lg border border-hairline bg-card p-5">
              <Icon className="size-5 text-foreground/70" aria-hidden="true" />
              <p className="mt-5 font-semiwide text-base font-bold tracking-[-0.01em]">{title}</p>
              <p className="mt-1 text-sm text-foreground/85">{price}</p>
              <p className="mt-4 label-mono text-[0.625rem] leading-relaxed text-muted-foreground">{eta}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-center gap-2.5 text-sm text-muted-foreground">
          <Check className="size-4 text-go" aria-hidden="true" />
          {commerce.processing}
        </p>
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <PanelLabel>Returns</PanelLabel>
        <div className="mt-5 border-t border-hairline pt-6">
          <PackageCheck className="size-5 text-foreground/70" aria-hidden="true" />
          <p className="mt-5 font-wide text-title font-black uppercase">{commerce.returnWindowDays}-day returns</p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground text-pretty">
            Changed your mind? Return unused items in their original packaging within {commerce.returnWindowDays} days of delivery. Arrived damaged or not as
            described? Tell us and we’ll put it right.
          </p>
          <ArrowLink href="/shipping-returns" className="mt-6">
            Full shipping &amp; returns policy
          </ArrowLink>
        </div>
      </div>
    </div>
  )
}
