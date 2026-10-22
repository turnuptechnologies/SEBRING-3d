"use client"

import { animate, createDrawable, stagger } from "animejs"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { SUBCATEGORY_ICONS } from "@/components/site/category-icon"
import type { SubcategorySlug } from "@/lib/catalog/types"
import { indexLabel, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface PartType {
  slug: SubcategorySlug
  label: string
  href: string
  count: number
  description: string
}

/** Where each part type's callout sits on the drawing (viewBox 1000 × 600). */
const CALLOUTS: Partial<Record<SubcategorySlug, { marker: [number, number]; anchor: [number, number] }>> = {
  motors: { marker: [566, 112], anchor: [566, 262] },
  "gears-pinions": { marker: [636, 520], anchor: [700, 330] },
  tires: { marker: [838, 64], anchor: [762, 120] },
  wheels: { marker: [214, 548], anchor: [292, 470] },
  magnets: { marker: [440, 112], anchor: [440, 266] },
  "axles-bushings": { marker: [388, 520], anchor: [300, 400] },
  "guides-braid": { marker: [92, 196], anchor: [150, 284] },
  "chassis-pods": { marker: [520, 520], anchor: [520, 386] },
  "tools-care": { marker: [770, 566], anchor: [828, 552] },
}

/**
 * "Know the car, shop the part": a blueprint of a 1:32 chassis next to the
 * part-type index. Pointing at a type lights that part on the drawing; the
 * index rows are the real links (with live counts), the drawing is a mouse shortcut.
 */
export function PartsExplorer({ types }: { types: PartType[] }) {
  const [active, setActive] = useState<SubcategorySlug | null>(null)
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  const current = types.find((t) => t.slug === active)

  // Hidden by <Activity>: forget the hover so the drawing is neutral on return.
  useLayoutEffect(() => () => setActive(null), [])

  // Draw the blueprint in when it first scrolls into view.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const box = svg.getBoundingClientRect()
    if (box.top < window.innerHeight && box.bottom > 0) return
    const lines = createDrawable(svg.querySelectorAll("[data-draw]"))
    const fades = svg.querySelectorAll<SVGElement>("[data-fade]")
    fades.forEach((el) => (el.style.opacity = "0"))
    let anims: Array<{ revert: () => unknown }> = []
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        anims = [
          animate(lines, { draw: ["0 0", "0 1"], duration: 1400, delay: stagger(18), ease: "inOutQuart" }),
          animate(fades, { opacity: [0, 1], duration: 700, delay: stagger(40, { start: 700 }), ease: "outQuad" }),
        ]
      },
      { threshold: 0.35 }
    )
    io.observe(svg)
    return () => {
      io.disconnect()
      anims.forEach((a) => a.revert())
      lines.forEach((l) => l.setAttribute("draw", "0 1"))
      fades.forEach((el) => (el.style.opacity = ""))
    }
  }, [])

  const part = (slug: SubcategorySlug) => {
    const type = types.find((t) => t.slug === slug)
    return {
      "data-part": slug,
      className: cn(
        "transition-opacity duration-500 ease-out-expo",
        active && active !== slug && "opacity-30",
        active === slug && "[&_[data-hl]]:fill-volt",
        type && "cursor-pointer"
      ),
      ...(type && {
        onPointerEnter: () => setActive(slug),
        onPointerLeave: () => setActive(null),
        onClick: () => router.push(type.href),
      }),
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* Blueprint */}
      <div className="relative isolate overflow-hidden rounded-lg border border-hairline bg-card lg:col-span-8" onPointerLeave={() => setActive(null)}>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hairline-grid opacity-70 [--grid-size:24px]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hairline-grid [--grid-size:120px]" />
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5 sm:px-6">
          <p className="label-mono text-muted-foreground">Dwg 01 · Chassis layout</p>
          <p className="label-mono text-muted-foreground">Ref. 1:32 GT</p>
        </div>
        <svg
          ref={svgRef}
          viewBox="0 0 1000 600"
          className="block h-auto w-full text-carbon-900"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <defs>
            <pattern id="parts-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0V9" stroke="currentColor" strokeWidth="1.1" opacity="0.38" />
            </pattern>
          </defs>

          {/* Centre line + dimensions */}
          <g strokeWidth="1" opacity="0.45" data-fade>
            <path d="M84 300H914" strokeDasharray="14 6 3 6" />
            <path d="M118 44V70M870 44V70M118 57H870" />
            <path d="M300 566V592M720 566V592M300 579H720" />
            <path d="M944 104H962M944 496H962M953 104V496" />
          </g>
          <g data-fade className="fill-carbon-900 stroke-none font-mono text-[13px] tracking-[0.18em]" opacity="0.7">
            <text x="494" y="38" textAnchor="middle">LENGTH 152 MM</text>
            <text x="510" y="600" textAnchor="middle" dominantBaseline="text-after-edge">WHEELBASE 84</text>
            <text x="976" y="300" textAnchor="middle" transform="rotate(90 976 300)">TRACK 78</text>
          </g>

          {/* Chassis */}
          <g {...part("chassis-pods")}>
            <path
              data-draw
              data-hl
              className="fill-ivory-50 transition-[fill] duration-300"
              strokeWidth="2.25"
              d="M118 262 176 236 196 210 250 206H350L372 214H620L650 200H780L818 214 862 236 870 262V338L862 364 818 386 780 400H650L620 386H372L350 394H250L196 390 176 364 118 338Z"
            />
            <path data-draw strokeWidth="1.1" opacity="0.5" d="M384 236H604M384 364H604M664 222H770M664 378H770" />
            <circle data-draw cx="236" cy="300" r="7" strokeWidth="1.2" />
            <circle data-draw cx="838" cy="300" r="7" strokeWidth="1.2" />
            <circle data-draw cx="620" cy="236" r="5" strokeWidth="1.2" />
            <circle data-draw cx="620" cy="364" r="5" strokeWidth="1.2" />
          </g>

          {/* Axles + bushings */}
          <g {...part("axles-bushings")}>
            <path data-draw strokeWidth="4" d="M300 164V436M720 166V434" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="292" y="198" width="16" height="14" rx="2" strokeWidth="1.6" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="292" y="388" width="16" height="14" rx="2" strokeWidth="1.6" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="712" y="192" width="16" height="14" rx="2" strokeWidth="1.6" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="712" y="394" width="16" height="14" rx="2" strokeWidth="1.6" />
          </g>

          {/* Tires (hatched rubber) */}
          <g {...part("tires")}>
            {[
              [266, 118, 68, 46],
              [266, 436, 68, 46],
              [678, 104, 84, 62],
              [678, 434, 84, 62],
            ].map(([x, y, w, h]) => (
              <rect key={`${x}-${y}`} data-draw data-hl x={x} y={y} width={w} height={h} rx="10" strokeWidth="2.25" fill="url(#parts-hatch)" className="transition-[fill] duration-300" />
            ))}
          </g>

          {/* Wheels / hubs */}
          <g {...part("wheels")}>
            {[
              [282, 128, 36, 26],
              [282, 446, 36, 26],
              [696, 116, 48, 38],
              [696, 446, 48, 38],
            ].map(([x, y, w, h]) => (
              <g key={`${x}-${y}`}>
                <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x={x} y={y} width={w} height={h} rx="4" strokeWidth="1.8" />
                <path data-draw strokeWidth="1" opacity="0.7" d={`M${x + w / 2} ${y + 4}V${y + h - 4}M${x + 5} ${y + h / 2}H${x + w - 5}`} />
              </g>
            ))}
          </g>

          {/* Guide + braid + lead wire */}
          <g {...part("guides-braid")}>
            <path data-draw className="stroke-copper" strokeWidth="1.6" d="M190 284C300 262 430 246 494 270M190 316C300 338 430 354 494 330" />
            <rect data-draw data-hl className="fill-copper/50 transition-[fill] duration-300" x="134" y="279" width="54" height="9" rx="2" strokeWidth="1.4" />
            <rect data-draw data-hl className="fill-copper/50 transition-[fill] duration-300" x="134" y="312" width="54" height="9" rx="2" strokeWidth="1.4" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="124" y="292" width="74" height="16" rx="6" strokeWidth="2" />
            <circle data-draw cx="182" cy="300" r="13" strokeWidth="1.6" />
          </g>

          {/* Magnet */}
          <g {...part("magnets")}>
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="408" y="266" width="64" height="68" rx="4" strokeWidth="2.25" />
            <path strokeWidth="1" opacity="0.6" d="M440 270V330" strokeDasharray="4 4" />
            <g data-fade className="fill-carbon-900 stroke-none font-mono text-[15px]" opacity="0.75">
              <text x="424" y="306" textAnchor="middle">N</text>
              <text x="456" y="306" textAnchor="middle">S</text>
            </g>
          </g>

          {/* Motor */}
          <g {...part("motors")}>
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="500" y="262" width="140" height="88" rx="12" strokeWidth="2.25" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="484" y="276" width="18" height="60" rx="3" strokeWidth="1.8" />
            <path data-draw strokeWidth="1.1" opacity="0.6" d="M524 266V346M616 266V346" />
            <path data-draw strokeWidth="1.6" d="M490 270V258M490 342V354" />
            <path data-draw strokeWidth="3" d="M640 306H676" />
          </g>

          {/* Gears */}
          <g {...part("gears-pinions")}>
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="672" y="294" width="24" height="24" rx="3" strokeWidth="1.8" />
            <path data-draw strokeWidth="1" d="M676 294V318M681 294V318M686 294V318M691 294V318" opacity="0.6" />
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="688" y="318" width="64" height="13" rx="2" strokeWidth="1.8" />
            <path data-draw strokeWidth="1" d="M694 318V312M702 318V312M710 318V312M718 318V312M726 318V312M734 318V312M742 318V312" />
          </g>

          {/* Tools */}
          <g {...part("tools-care")}>
            <rect data-draw data-hl className="fill-ivory-50 transition-[fill] duration-300" x="812" y="542" width="78" height="20" rx="10" strokeWidth="1.8" />
            <path data-draw strokeWidth="1" opacity="0.6" d="M826 546V558M838 546V558M850 546V558" />
            <path data-draw strokeWidth="3" d="M890 552H944" />
            <path data-draw strokeWidth="1.8" d="M944 546 956 552 944 558Z" />
          </g>

          {/* Callouts */}
          {types.map((t, i) => {
            const c = CALLOUTS[t.slug]
            if (!c) return null
            const on = active === t.slug
            return (
              <g key={t.slug} data-fade className="transition-opacity duration-300" opacity={active && !on ? 0.35 : 1}>
                <path d={`M${c.marker[0]} ${c.marker[1]}L${c.anchor[0]} ${c.anchor[1]}`} strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
                <circle cx={c.anchor[0]} cy={c.anchor[1]} r="3.5" className="fill-carbon-900 stroke-none" />
                <circle cx={c.marker[0]} cy={c.marker[1]} r="17" strokeWidth="1.4" className={cn("transition-[fill] duration-300", on ? "fill-carbon-900" : "fill-ivory-50")} />
                <text
                  x={c.marker[0]}
                  y={c.marker[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn("stroke-none font-mono text-[13px] tracking-[0.06em] transition-[fill] duration-300", on ? "fill-volt" : "fill-carbon-900")}
                >
                  {indexLabel(i + 1)}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Caption: what you're pointing at */}
        <div className="flex min-h-[4.5rem] items-center gap-4 border-t border-hairline px-5 py-4 sm:px-6" aria-hidden="true">
          {current ? (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-carbon-900 font-mono text-xs text-volt">{indexLabel(types.indexOf(current) + 1)}</span>
              <p className="min-w-0 text-sm leading-snug text-pretty">
                <span className="font-semiwide font-bold tracking-[-0.01em]">{current.label}</span>
                <span className="text-muted-foreground"> — {current.description}</span>
              </p>
              <span className="ml-auto hidden shrink-0 label-mono text-muted-foreground sm:block">{pluralize(current.count, "item")}</span>
            </>
          ) : (
            <p className="label-mono text-muted-foreground">
              <span className="pointer-fine:hidden">Tap a part type to shop it</span>
              <span className="hidden pointer-fine:inline">Point at a part type to find it on the chassis</span>
            </p>
          )}
        </div>
      </div>

      {/* Part-type index: the quick chips */}
      <nav aria-label="Shop parts by type" className="lg:col-span-4">
        <div className="flex items-baseline justify-between border-b border-foreground/80 pb-3">
          <p className="label-mono">Part types</p>
          <p className="label-mono text-muted-foreground tabular">{indexLabel(types.length)}</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-1">
          {types.map((t, i) => (
            <PartRow key={t.slug} type={t} index={i} active={active === t.slug} onActive={setActive} />
          ))}
        </ul>
      </nav>
    </div>
  )
}

function PartRow({ type, index, active, onActive }: { type: PartType; index: number; active: boolean; onActive: (slug: SubcategorySlug | null) => void }) {
  const Icon = SUBCATEGORY_ICONS[type.slug]
  return (
    <li className="border-b border-hairline">
      <Link
        href={type.href}
        onPointerEnter={() => onActive(type.slug)}
        onPointerLeave={() => onActive(null)}
        onFocus={() => onActive(type.slug)}
        onBlur={() => onActive(null)}
        className={cn(
          "group/row relative flex min-h-14 items-center gap-3 py-2 pr-1 outline-none transition-colors duration-300",
          "focus-visible:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
        )}
      >
        <span
          className={cn(
            "grid h-6 min-w-8 place-items-center rounded-full font-mono text-[0.6875rem] tabular transition-colors duration-300",
            active ? "bg-carbon-900 text-volt" : "bg-foreground/[0.06] text-muted-foreground"
          )}
        >
          {indexLabel(index + 1)}
        </span>
        <Icon className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semiwide text-[0.9375rem] font-semibold tracking-[-0.01em]">{type.label}</span>
        <Count>{type.count}</Count>
        <ArrowUpRight
          className={cn(
            "size-4 shrink-0 transition-all duration-500 ease-out-expo max-lg:hidden",
            active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
          )}
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

function Count({ children }: { children: ReactNode }) {
  return <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">{children}</span>
}
