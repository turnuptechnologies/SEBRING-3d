"use client"

import { ArrowRight, ArrowUpRight, CornerDownLeft, History, ScanSearch, TrendingUp } from "lucide-react"
import Link from "next/link"
import type { MouseEvent, ReactNode } from "react"

import type { OptionGroup, SearchBox, SearchOption } from "@/components/layout/header/search/use-search-box"
import { Price } from "@/components/site/price"
import { ProductImage } from "@/components/site/product-image"
import { brandName, isLowStock, isPreorder } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { formatPrice, formatScales } from "@/lib/format"
import { cn } from "@/lib/utils"

type Variant = "popover" | "screen"

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Wraps word-start matches of the query in <mark>. */
export function Highlight({ text, marks }: { text: string; marks: string[] }) {
  if (!marks.length) return <>{text}</>
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${marks.map(escapeRe).join("|")})`, "giu")
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent text-volt">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function stockText(p: Product) {
  if (p.stock <= 0) return <span className="text-smoke-400">Sold out</span>
  if (isPreorder(p)) return <span className="text-volt">Pre-order</span>
  if (isLowStock(p)) return <span className="text-caution">Only {p.stock} left</span>
  return <span className="text-go">In stock</span>
}

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

/**
 * The listbox behind the header search (desktop popover and mobile screen).
 * Options are real links (middle-click works); the input keeps focus and
 * points at the active one with aria-activedescendant.
 */
export function SearchPanel({ box, variant }: { box: SearchBox; variant: Variant }) {
  const { model, results } = box
  const marks = results?.marks ?? []
  const main = model.groups.filter((g) => g.column === "main")
  const side = model.groups.filter((g) => g.column === "side")
  const screen = variant === "screen"

  return (
    <div className="flex min-h-0 flex-col">
      {model.state === "empty" && (
        <div className={cn("border-b border-hairline", screen ? "px-5 py-6" : "px-6 pt-6 pb-5")}>
          <p className="label-mono text-[0.625rem] text-smoke-500">No exact matches</p>
          <p className="mt-2 font-semiwide text-lg leading-snug font-semibold text-balance text-ivory-50">
            Nothing for &ldquo;<span className="text-volt">{box.query.trim()}</span>&rdquo; — yet.
          </p>
          <p className="mt-1.5 text-sm text-pretty text-smoke-400">Check the spelling, try a maker code or SKU, or start from a popular search.</p>
        </div>
      )}

      <div
        id={box.listboxId}
        role="listbox"
        aria-label="Search suggestions"
        className={cn("grid min-h-0", screen ? "gap-7 px-3 py-5" : "grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]")}
      >
        <div className={cn("min-w-0", !screen && "space-y-6 p-3 pt-5")}>
          {main.map((g) => (
            <Group key={g.id} group={g} box={box} marks={marks} variant={variant} />
          ))}
        </div>
        {side.length > 0 && (
          <div className={cn("min-w-0", !screen && "space-y-6 border-l border-hairline bg-white/[0.015] p-3 pt-5", screen && "space-y-7")}>
            {side.map((g) => (
              <Group key={g.id} group={g} box={box} marks={marks} variant={variant} />
            ))}
          </div>
        )}
        {model.footer && (
          <div className={cn(!screen && "col-span-2 border-t border-hairline p-2")}>
            <Option box={box} option={model.footer} index={model.flat.length - 1} className={cn("justify-between", screen ? "min-h-14 px-3" : "min-h-12 px-4")}>
              <span className="flex min-w-0 items-center gap-3">
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-volt" />
                <span className="truncate font-semiwide text-[0.8125rem] font-bold tracking-[0.06em] text-ivory-50 uppercase">
                  See all {model.footer.total} results for &ldquo;{model.footer.query}&rdquo;
                </span>
              </span>
              {!screen && <Kbd>↵</Kbd>}
            </Option>
          </div>
        )}
      </div>

      {!screen && (
        <div className="flex items-center justify-between gap-4 border-t border-hairline bg-carbon-950/40 px-5 py-2.5 label-mono text-[0.5625rem] text-smoke-500">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeft className="size-2.5" />
              </Kbd>
              Open
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Esc</Kbd> Close
            </span>
          </span>
          <span className="hidden xl:inline">Searches name, brand, SKU &amp; maker code</span>
        </div>
      )}
    </div>
  )
}

function Group({ group, box, marks, variant }: { group: OptionGroup; box: SearchBox; marks: string[]; variant: Variant }) {
  const headingId = `${box.listboxId}-${group.id}`
  const screen = variant === "screen"
  const chips = group.id === "popular"
  const list = group.options.filter((o) => o.kind !== "clear")
  const clear = group.options.find((o) => o.kind === "clear")
  const total = group.id === "products" ? box.results?.total : undefined

  return (
    <div role="group" aria-labelledby={headingId} className="relative">
      <div id={headingId} aria-hidden="true" className={cn("mb-2 flex h-6 items-center gap-2 label-mono text-[0.5625rem] text-smoke-500", screen ? "px-2" : "px-2.5")}>
        <span>{group.title}</span>
        {total != null && <span className="text-smoke-600 tabular">· {total}</span>}
      </div>
      {/* "Clear" is a real option (keyboard reachable) shown in the heading row. */}
      {clear && (
        <Option box={box} option={clear} index={group.start + list.length} className={cn("absolute top-0 right-1 h-6 px-2 label-mono text-[0.5625rem] text-smoke-400")}>
          Clear
        </Option>
      )}
      <div className={cn(chips ? cn("flex flex-wrap gap-1.5", screen ? "px-2" : "px-2.5") : "flex flex-col gap-0.5")}>
        {list.map((opt, i) => (
          <OptionRow key={opt.key} option={opt} index={group.start + i} box={box} marks={marks} variant={variant} />
        ))}
      </div>
    </div>
  )
}

function OptionRow({ option, index, box, marks, variant }: { option: SearchOption; index: number; box: SearchBox; marks: string[]; variant: Variant }) {
  const screen = variant === "screen"
  const row = cn("gap-3 px-2.5", screen ? "min-h-14" : "min-h-11")

  switch (option.kind) {
    case "product": {
      const p = option.product
      return (
        <Option box={box} option={option} index={index} label={`${p.name}, ${brandName(p.brand)}, ${formatPrice(p.price)}`} className={cn(row, "py-2")}>
          <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[4px] border border-hairline bg-spotlight [&_[role=img]>span]:hidden">
            <span aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-60 [--grid-size:10px]" />
            <ProductImage product={p} sizes="64px" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] leading-snug text-ivory-50">
              <Highlight text={p.name} marks={marks} />
            </span>
            <span className="mt-1 block truncate label-mono text-[0.5625rem] tracking-[0.16em] text-smoke-500">
              <Highlight text={brandName(p.brand)} marks={marks} /> · {formatScales(p.scales)} · {stockText(p)}
            </span>
          </span>
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" className="shrink-0 flex-col items-end gap-y-0 text-right" />
        </Option>
      )
    }
    case "type":
    case "department": {
      const Icon = option.hit.icon
      return (
        <Option box={box} option={option} index={index} label={`${option.hit.label}, ${option.hit.context}, ${option.hit.count} products`} className={row}>
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-white/[0.05] text-smoke-400 transition-colors group-aria-selected/opt:text-volt">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] text-ivory-50">
              <Highlight text={option.hit.label} marks={marks} />
            </span>
            <span className="block truncate label-mono text-[0.5625rem] tracking-[0.16em] text-smoke-500">{option.hit.context}</span>
          </span>
          <span className="font-mono text-[0.6875rem] text-smoke-500 tabular">{option.hit.count}</span>
        </Option>
      )
    }
    case "brand":
      return (
        <Option box={box} option={option} index={index} label={`${option.hit.label}, brand, ${option.hit.count} products`} className={row}>
          <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-white/10 font-wide text-[0.625rem] font-black tracking-[-0.02em] text-ivory-100 transition-colors group-aria-selected/opt:border-volt/50 group-aria-selected/opt:text-volt">
            {initials(option.hit.label)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] text-ivory-50">
              <Highlight text={option.hit.label} marks={marks} />
            </span>
            <span className="block truncate label-mono text-[0.5625rem] tracking-[0.16em] text-smoke-500">Brand · {option.hit.context}</span>
          </span>
          <span className="font-mono text-[0.6875rem] text-smoke-500 tabular">{option.hit.count}</span>
        </Option>
      )
    case "recent":
      return (
        <Option box={box} option={option} index={index} label={`Recent search: ${option.query}`} className={row}>
          <History aria-hidden="true" className="size-4 shrink-0 text-smoke-500" />
          <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ivory-100">{option.query}</span>
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-smoke-600 transition-colors group-aria-selected/opt:text-ivory-50" />
        </Option>
      )
    case "popular":
      return (
        <Option
          box={box}
          option={option}
          index={index}
          label={`Popular search: ${option.query}`}
          className={cn(
            "rounded-sm border border-white/10 px-3 text-[0.8125rem] text-ivory-100/85 aria-selected:border-volt/60 aria-selected:text-ivory-50",
            screen ? "h-11" : "h-9"
          )}
        >
          <TrendingUp aria-hidden="true" className="size-3.5 text-smoke-500 transition-colors group-aria-selected/opt:text-volt" />
          {option.query}
        </Option>
      )
    case "fit":
      return (
        <Option box={box} option={option} index={index} label="Not sure what fits? Ask the crew for a fit check" className={cn(row, "items-start py-3")}>
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-volt/12 text-volt">
            <ScanSearch aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semiwide text-[0.8125rem] font-bold tracking-[0.06em] text-ivory-50 uppercase">Ask for a fit check</span>
            <span className="mt-1 block text-[0.8125rem] leading-snug text-pretty text-smoke-400">Tell us your car or track — we&rsquo;ll find the part and confirm it fits.</span>
          </span>
        </Option>
      )
    default:
      return null
  }
}

function Option({
  box,
  option,
  index,
  label,
  className,
  children,
}: {
  box: SearchBox
  option: SearchOption
  index: number
  label?: string
  className?: string
  children: ReactNode
}) {
  const selected = box.active === index
  const common = {
    id: box.optionId(index),
    role: "option" as const,
    "aria-selected": selected,
    "aria-label": label,
    tabIndex: -1,
    onPointerMove: () => {
      if (!selected) box.setActive(index)
    },
    // Keep focus in the input when clicking an option.
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    className: cn(
      "group/opt relative flex w-full cursor-pointer items-center rounded-md text-left outline-none transition-[background-color,border-color,color] duration-200",
      "aria-selected:bg-white/[0.07] hover:bg-white/[0.045]",
      className
    ),
  }
  if (option.kind === "clear") {
    return (
      <div {...common} onClick={() => box.choose(option, "pointer")}>
        {children}
      </div>
    )
  }
  return (
    <Link {...common} href={option.href} onClick={() => box.choose(option, "pointer")}>
      {children}
    </Link>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-[3px] border border-white/12 bg-white/[0.04] px-1 font-mono text-[0.5625rem] leading-none tracking-normal text-smoke-400 normal-case">
      {children}
    </kbd>
  )
}

