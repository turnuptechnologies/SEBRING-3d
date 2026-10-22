import { ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

import { ArrowLink } from "@/components/site/arrow-link"
import { HudCorners } from "@/components/site/hud-corners"
import { Price } from "@/components/site/price"
import { ProductImage } from "@/components/site/product-image"
import { Eyebrow } from "@/components/site/section-heading"
import { productPath, type HelpLink, type NavLink } from "@/components/layout/header/nav-data"
import { brandName, isLowStock, isPreorder } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { discountPercent, formatScales } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Mega-menu atoms. Server components: the panels ship as HTML and the client
 * nav only toggles them. Columns stagger in when their panel opens
 * (the panel wrapper carries `group/panel` + `data-state`).
 */

const REVEAL =
  "translate-y-2 opacity-0 transition-[opacity,transform] duration-500 ease-out-expo group-data-[state=open]/panel:translate-y-0 group-data-[state=open]/panel:opacity-100 group-data-[state=open]/panel:[transition-delay:calc(var(--i,0)*55ms_+_70ms)]"

const order = (i: number) => ({ "--i": i }) as CSSProperties

export function PanelGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-x-10 gap-y-7 pt-9 pb-7 xl:gap-x-14">{children}</div>
}

export function PanelColumn({
  index,
  title,
  i,
  className,
  children,
}: {
  index: number
  title: string
  i: number
  className?: string
  children: ReactNode
}) {
  return (
    <div style={order(i)} className={cn("min-w-0", REVEAL, className)}>
      <Eyebrow index={index} className="mb-4 text-smoke-500">
        {title}
      </Eyebrow>
      {children}
    </div>
  )
}

export function PanelCell({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <div style={order(i)} className={cn("min-w-0", REVEAL, className)}>
      {children}
    </div>
  )
}

const Count = ({ n, className }: { n: number; className?: string }) => (
  <span className={cn("font-mono text-[0.6875rem] tracking-normal text-smoke-500 tabular", className)}>
    {n}
    <span className="sr-only"> products</span>
  </span>
)

/** One destination per row: icon · label · live count, with a pit-lane tick on hover. */
export function RowLink({ link, tone }: { link: NavLink; tone?: "sale" }) {
  const Icon = link.icon
  return (
    <Link
      href={link.href}
      className={cn(
        "group/row relative -mx-3 flex min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-[0.9375rem] leading-tight text-ivory-100/80 outline-none",
        "transition-[background-color,color] duration-300 hover:bg-white/[0.045] hover:text-ivory-50 focus-visible:bg-white/[0.06] focus-visible:text-ivory-50 focus-visible:outline-offset-0"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 scale-y-0 rounded-full transition-transform duration-300 ease-out-expo group-hover/row:scale-y-100 group-focus-visible/row:scale-y-100",
          tone === "sale" ? "bg-signal" : "bg-volt"
        )}
      />
      {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-smoke-500 transition-colors duration-300 group-hover/row:text-ivory-100" />}
      <span className="min-w-0 flex-1 truncate transition-transform duration-500 ease-out-expo group-hover/row:translate-x-0.5">{link.label}</span>
      <Count n={link.count} className="transition-colors duration-300 group-hover/row:text-smoke-300" />
    </Link>
  )
}

export function RowList({ links, tone, empty }: { links: NavLink[]; tone?: "sale"; empty?: ReactNode }) {
  if (!links.length) return <>{empty}</>
  return (
    <ul className="flex flex-col">
      {links.map((l) => (
        <li key={l.href}>
          <RowLink link={l} tone={tone} />
        </li>
      ))}
    </ul>
  )
}

/** Big chamfered scale badges — scale is a filter, never a separate tree. */
export function ScalePills({ links, noun = "cars" }: { links: NavLink[]; noun?: string }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className={cn(
              "group/pill relative flex h-[4.75rem] flex-col justify-between bg-white/[0.045] px-3.5 py-3 outline-none chamfer [--chamfer:9px]",
              "transition-[background-color,color] duration-300 ease-out-expo hover:bg-volt hover:text-carbon-900 focus-visible:bg-volt focus-visible:text-carbon-900"
            )}
          >
            <span className="font-wide text-[1.375rem] leading-none font-black tracking-[-0.035em]">{l.label}</span>
            <span className="label-mono text-[0.5625rem] text-smoke-500 transition-colors duration-300 group-hover/pill:text-carbon-900/70 group-focus-visible/pill:text-carbon-900/70">
              {l.count} {noun}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Brand shortcuts inside a department (they filter the department, not a supplier tree). */
export function BrandRow({ title, links }: { title: string; links: NavLink[] }) {
  if (!links.length) return null
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5">
      <span className="mr-3 label-mono text-smoke-500">{title}</span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="group/brand inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 font-semiwide text-[0.6875rem] font-bold tracking-[0.08em] text-ivory-100/70 uppercase outline-none transition-colors duration-300 hover:bg-white/[0.05] hover:text-ivory-50 focus-visible:bg-white/[0.06] focus-visible:text-ivory-50"
        >
          {l.label}
          <Count n={l.count} className="text-[0.5625rem] group-hover/brand:text-smoke-300" />
        </Link>
      ))}
    </div>
  )
}

export function PanelFooter({ all, children }: { all: NavLink; children?: ReactNode }) {
  return (
    <PanelCell i={4} className="col-span-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-hairline pt-5">
      <ArrowLink href={all.href} className="text-ivory-50">
        {all.label}
        <span className="ml-2 font-mono font-normal tracking-normal text-smoke-500">{all.count}</span>
      </ArrowLink>
      {children}
    </PanelCell>
  )
}

function stockLine(p: Product) {
  if (p.stock <= 0) return { text: "Sold out", tone: "text-smoke-400" }
  if (isPreorder(p)) return { text: `Pre-order · ships ${p.preorder?.ships}`, tone: "text-volt" }
  if (isLowStock(p)) return { text: `Only ${p.stock} left`, tone: "text-caution" }
  return { text: "In stock", tone: "text-go" }
}

/** Editorial product card — the one image in each panel. */
export function FeaturedProduct({ product: p, eyebrow }: { product: Product; eyebrow: string }) {
  const off = discountPercent(p.price, p.compareAtPrice)
  const stock = stockLine(p)
  return (
    <Link
      href={productPath(p)}
      className="group/feat relative flex h-full min-h-[19rem] flex-col overflow-hidden rounded-lg border border-hairline bg-carbon-850 shadow-card outline-none transition-[border-color,box-shadow] duration-500 ease-out-expo hover:border-white/20 hover:shadow-lift focus-visible:border-volt/70"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-spotlight">
        <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-60 [--grid-size:26px] mask-fade-b" />
        <div className="absolute inset-[7%] transition-transform duration-700 ease-out-expo group-hover/feat:scale-[1.045]">
          <ProductImage product={p} sizes="(min-width: 1440px) 500px, 36vw" />
        </div>
        <HudCorners className="opacity-0 transition-opacity duration-500 group-hover/feat:opacity-100" />
        <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
          <span className="rounded-[3px] bg-carbon-900/80 px-2 py-1.5 label-mono text-[0.5625rem] text-volt ring-1 ring-volt/25 backdrop-blur-md">{eyebrow}</span>
          {off > 0 && <span className="rounded-[3px] bg-signal px-2 py-1.5 label-mono text-[0.5625rem] font-semibold text-white">−{off}%</span>}
        </div>
      </div>
      <div className="flex items-end justify-between gap-5 border-t border-hairline p-5">
        <div className="min-w-0">
          <p className="truncate label-mono text-[0.625rem] text-smoke-500">
            {brandName(p.brand)} · {formatScales(p.scales)} · <span className={stock.tone}>{stock.text}</span>
          </p>
          <p className="mt-2 line-clamp-2 font-semiwide text-[1.0625rem] leading-snug font-semibold tracking-[-0.01em] text-balance text-ivory-50">{p.name}</p>
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" className="mt-2.5" />
        </div>
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center bg-white/[0.06] text-ivory-50 chamfer [--chamfer:8px] transition-[background-color,color] duration-300 group-hover/feat:bg-volt group-hover/feat:text-carbon-900"
        >
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover/feat:translate-x-0.5 group-hover/feat:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}

/** Shown in the featured slot when a department has nothing in stock to feature yet. */
export function FeaturedFallback({ title, copy, href, cta, icon: Icon }: { title: string; copy: string; href: string; cta: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="group/feat relative flex h-full min-h-[19rem] flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-carbon-850 p-6 outline-none transition-[border-color] duration-500 hover:border-white/20 focus-visible:border-volt/70"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-70 [--grid-size:30px] mask-fade-b" />
      <HudCorners className="opacity-60" />
      <Icon aria-hidden="true" className="relative size-12 text-smoke-500 transition-colors duration-500 group-hover/feat:text-volt" strokeWidth={1.25} />
      <div className="relative">
        <p className="font-wide text-xl leading-none font-black tracking-[-0.03em] text-ivory-50 uppercase">{title}</p>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-pretty text-smoke-400">{copy}</p>
        <span className="mt-5 inline-flex items-center gap-2 font-semiwide text-xs font-bold tracking-[0.1em] text-ivory-50 uppercase">
          {cta}
          <ArrowRight className="size-3.5 transition-transform duration-500 ease-out-expo group-hover/feat:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}

/** Framed info card (fit help, digital hub, plug guide). */
export function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative h-full overflow-hidden rounded-lg border border-hairline bg-carbon-850/80 p-6", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hairline-grid opacity-50 [--grid-size:30px] mask-fade-b" />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  )
}

export function HelpTiles({ links }: { links: HelpLink[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {links.map(({ label, href, description, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group/tile flex h-full flex-col gap-3 rounded-md border border-white/[0.08] bg-carbon-900/70 p-4 outline-none transition-[border-color,background-color] duration-300 hover:border-volt/50 hover:bg-carbon-800 focus-visible:border-volt"
          >
            <span className="flex items-center justify-between">
              <Icon aria-hidden="true" className="size-[1.125rem] text-volt" />
              <ArrowUpRight aria-hidden="true" className="size-3.5 text-smoke-500 transition-[color,transform] duration-500 ease-out-expo group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:text-ivory-50" />
            </span>
            <span className="font-semiwide text-[0.8125rem] font-bold tracking-[0.06em] text-ivory-50 uppercase">{label}</span>
            <span className="text-[0.8125rem] leading-snug text-pretty text-smoke-400">{description}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="max-w-[15rem] text-sm leading-relaxed text-pretty text-smoke-400">{children}</p>
}
