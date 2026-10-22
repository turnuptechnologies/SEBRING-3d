import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

import { Parallax, RevealGroup, RevealItem } from "@/components/motion"
import { CATEGORY_ICONS } from "@/components/site/category-icon"
import { HudCorners } from "@/components/site/hud-corners"
import { ProductImage } from "@/components/site/product-image"
import { SectionHeading } from "@/components/site/section-heading"
import { categories, categoryHref, getSubcategory, isInStock, primaryImage, products, sceneImage, subcategoryHref } from "@/lib/catalog"
import type { Category, CategorySlug, Product, SubcategorySlug } from "@/lib/catalog/types"
import { formatPrice, indexLabel, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"

type Variant = "feature" | "tile"

interface TileData {
  category: Category
  index: number
  count: number
  fromPrice: number | null
  subs: { slug: SubcategorySlug; label: string; count: number }[]
  montage: Product[]
  scene: string | null
}

/** Bento placement per category (lg+). Slot Cars is the hero tile. */
const PLACEMENT: Record<CategorySlug, string> = {
  "slot-cars": "md:col-span-2 lg:col-span-7 lg:row-span-2",
  "chassis-motors": "lg:col-span-5",
  "tires-magnets-axles": "lg:col-span-5",
  "controllers-power": "lg:col-span-6",
  "track-sets": "lg:col-span-6",
}

function tileData(category: Category, index: number): TileData {
  const items = products.filter((p) => p.category === category.slug)
  const counts = new Map<SubcategorySlug, number>()
  for (const p of items) counts.set(p.subcategory, (counts.get(p.subcategory) ?? 0) + 1)
  const subs = category.subcategories
    .map((slug, order) => ({ slug, order, count: counts.get(slug) ?? 0, label: getSubcategory(slug)?.label ?? slug }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, 3)
  const montage = items
    .filter((p) => primaryImage(p))
    .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || Number(isInStock(b)) - Number(isInStock(a)) || b.releasedAt.localeCompare(a.releasedAt))
    .slice(0, 3)
  return {
    category,
    index,
    count: items.length,
    fromPrice: items.length ? Math.min(...items.map((p) => p.price)) : null,
    subs,
    montage,
    scene: sceneImage(`category-${category.slug}`, `media/categories/${category.slug}.webp`),
  }
}

/** "Start here": the five departments as a bento, Slot Cars first and largest. */
export function CategoryShowcase() {
  const tiles = categories.map((c, i) => tileData(c, i + 1))
  return (
    <section aria-label="Shop by category" className="relative border-b border-hairline py-24 md:py-32">
      <div className="container-site">
        <SectionHeading
          eyebrow="Start here"
          title="Shop by category"
          description="Five departments and one home for every product — pick a lane, then narrow it by brand, scale and price."
          action={{ label: "Shop everything", href: "/collections/all" }}
        />

        <RevealGroup stagger={0.08} className="mt-12 grid grid-cols-1 gap-3 sm:gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[minmax(17.5rem,1fr)]">
          {tiles.map((t) => (
            <RevealItem key={t.category.slug} className={cn("flex", PLACEMENT[t.category.slug])}>
              <CategoryTile data={t} variant={t.category.slug === "slot-cars" ? "feature" : "tile"} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

function CategoryTile({ data, variant }: { data: TileData; variant: Variant }) {
  const { category, index, count, fromPrice, subs, montage, scene } = data
  const Icon = CATEGORY_ICONS[category.slug]
  const feature = variant === "feature"
  const word = category.shortLabel.toUpperCase()

  return (
    <article
      className={cn(
        "group/tile @container relative isolate flex w-full flex-col overflow-hidden rounded-lg border border-hairline bg-carbon-850 text-ivory-100",
        "transition-[border-color,box-shadow] duration-700 ease-out-expo hover:border-ivory-100/20 hover:shadow-lift",
        "has-[[data-tile-link]:focus-visible]:border-volt has-[[data-tile-link]:focus-visible]:shadow-[0_0_0_1px_var(--color-volt)]",
        feature ? "min-h-[27rem] sm:min-h-[32rem] lg:min-h-0" : "min-h-[17rem] sm:min-h-[18.5rem] lg:min-h-0"
      )}
    >
      {/* Atmosphere: studio spotlight, hairline grid and the department name in huge outline type. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-spotlight" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hairline-grid opacity-60 [--grid-size:48px] [mask-image:radial-gradient(80%_70%_at_70%_55%,#000,transparent)]" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[0.04em] -bottom-[0.2em] -z-10 font-wide leading-none font-black tracking-[-0.04em] whitespace-nowrap text-transparent transition-transform duration-1000 ease-out-expo select-none [-webkit-text-stroke:1px_rgb(243_239_230/0.09)] group-hover/tile:-translate-x-[2%]"
        style={{ fontSize: `${Math.min(feature ? 34 : 40, 118 / word.length)}cqw` } as CSSProperties}
      >
        {word}
      </span>

      <TileMedia scene={scene} montage={montage} feature={feature} icon={category.slug === "slot-cars" ? <SlotCarDrawing /> : <Icon strokeWidth={0.6} className="size-full" />} />
      <HudCorners className="opacity-0 transition-opacity duration-500 group-hover/tile:opacity-100" />

      <div className={cn("relative flex flex-1 flex-col p-5 sm:p-7", feature && "lg:p-9")}>
        <div className="flex items-center gap-3 label-mono text-smoke-400">
          <span className="text-volt tabular">{indexLabel(index)}</span>
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
          {count > 0 ? (
            <span className="tabular">
              {pluralize(count, "item")}
              {fromPrice != null && <> · from {formatPrice(fromPrice)}</>}
            </span>
          ) : (
            <span>{category.shortLabel}</span>
          )}
        </div>

        <h3
          className={cn(
            "mt-4 font-wide font-black uppercase text-balance",
            feature ? "max-w-[14ch] text-headline" : "max-w-[13ch] text-title @[34rem]:max-w-[16ch]"
          )}
        >
          <Link href={categoryHref(category.slug)} data-tile-link className="outline-none after:absolute after:inset-0 after:z-0 after:content-['']">
            {category.label}
          </Link>
        </h3>
        {(feature || subs.length === 0) && (
          <p className={cn("mt-4 max-w-[34ch] leading-relaxed text-pretty text-muted-foreground", feature ? "text-[0.9375rem] sm:text-base" : "max-w-[30ch] text-sm")}>{category.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-5 pt-8">
          {subs.length > 0 && (
            <ul
              className={cn("relative z-10 flex min-w-0 flex-wrap gap-1.5", feature ? "flex-[1_1_20rem] @[40rem]:max-w-[30rem]" : "flex-[1_1_17rem] @[30rem]:max-w-[62%]")}
              aria-label={`Popular in ${category.label}`}
            >
              {subs.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={subcategoryHref(s.slug)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-sm border border-ivory-100/14 bg-carbon-950/55 px-3 font-semiwide text-[0.6875rem] font-semibold tracking-[0.06em] whitespace-nowrap text-ivory-100/90 uppercase backdrop-blur-md touch:h-11",
                      "transition-colors duration-300 hover:border-volt hover:text-volt focus-visible:border-volt focus-visible:text-volt focus-visible:outline-none"
                    )}
                  >
                    {s.label}
                    <span className="font-mono text-[0.625rem] font-normal tracking-normal text-smoke-400 tabular">{s.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <span aria-hidden="true" className="ml-auto flex shrink-0 items-center gap-2 font-semiwide text-xs font-bold tracking-[0.1em] whitespace-nowrap uppercase">
            Shop all
            <span className="grid size-9 place-items-center rounded-full border border-ivory-100/20 transition-all duration-500 ease-out-expo group-hover/tile:border-volt group-hover/tile:bg-volt group-hover/tile:text-carbon-900">
              <ArrowRight className="size-4 transition-transform duration-500 ease-out-expo group-hover/tile:-rotate-45" />
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}

/** Montage slots (relative to the tile) for up to three renders, front-most first. */
const SLOTS: Record<Variant, { box: string; offset: number }[]> = {
  feature: [
    { box: "right-[-4%] bottom-[16%] w-[70%] @max-[40rem]:bottom-[24%] @max-[40rem]:w-[88%]", offset: 26 },
    { box: "right-[34%] top-[30%] w-[44%] opacity-80 @max-[40rem]:hidden", offset: 54 },
    { box: "right-[2%] top-[18%] w-[36%] opacity-60 @max-[40rem]:hidden", offset: 80 },
  ],
  tile: [
    { box: "right-[-6%] bottom-[10%] w-[54%] @max-[26rem]:w-[62%] @max-[26rem]:bottom-[26%]", offset: 22 },
    { box: "right-[30%] top-[8%] w-[32%] opacity-75 @max-[26rem]:hidden", offset: 46 },
    { box: "right-[2%] top-[4%] w-[28%] opacity-55 @max-[26rem]:hidden", offset: 64 },
  ],
}

function TileMedia({ scene, montage, feature, icon }: { scene: string | null; montage: Product[]; feature: boolean; icon: ReactNode }) {
  const variant: Variant = feature ? "feature" : "tile"
  if (scene) {
    return (
      <div aria-hidden="true" className="absolute inset-0 -z-10 transition-transform duration-1000 ease-out-expo group-hover/tile:scale-[1.04]">
        <Image src={scene} alt="" fill sizes={feature ? "(min-width: 1024px) 56vw, 100vw" : "(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"} quality={80} className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgb(15_15_20/0.92)_8%,rgb(15_15_20/0.55)_45%,transparent_75%)]" />
      </div>
    )
  }
  if (montage.length) {
    return (
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {montage.map((p, i) => {
          const slot = SLOTS[variant][i]
          return (
            <Parallax key={p.slug} offset={slot.offset} className={cn("absolute aspect-[4/3]", slot.box)}>
              <div className="relative size-full transition-transform duration-1000 ease-out-expo group-hover/tile:scale-[1.05]" style={{ transitionDelay: `${i * 60}ms` }}>
                <ProductImage product={p} sizes={feature ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 22vw, 60vw"} />
              </div>
            </Parallax>
          )
        })}
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(15_15_20/0.85)_10%,rgb(15_15_20/0.2)_50%,transparent_70%)]" />
      </div>
    )
  }
  // No renders yet: a technical line drawing of the department icon in a HUD reticle.
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute -z-10 aspect-square text-ivory-100/[0.13] transition-transform duration-1000 ease-out-expo group-hover/tile:scale-[1.04] group-hover/tile:text-ivory-100/20", feature ? "top-[20%] right-[6%] w-[46%] @max-[40rem]:top-[34%] @max-[40rem]:w-[58%]" : "top-1/2 right-[7%] w-[34%] -translate-y-[58%] @max-[26rem]:w-[40%]")}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth="0.35">
        <circle cx="50" cy="50" r="48" />
        <circle cx="50" cy="50" r="36" strokeDasharray="1 2.2" />
        <path d="M50 0v8M50 92v8M0 50h8M92 50h8" />
      </svg>
      <div className="absolute inset-[24%] grid place-items-center">{icon}</div>
    </div>
  )
}

/** Technical side elevation of a slot car — prototype body, wing, guide blade and braid. */
function SlotCarDrawing() {
  return (
    <svg viewBox="0 0 200 100" className="w-[150%] max-w-none shrink-0" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 71C10 71 9 67 11 64C13 61 20 60 28 59.5L60 56.5C70 55.5 78 51 86 43C92 37 101 33.5 112 33.5H127C137 33.5 145 37.5 151 43.5L180 46.5C187 47.5 191 51.5 191 57V66C191 69 189 71 186 71H168A16 16 0 0 0 136 71H68A16 16 0 0 0 36 71Z" />
      <path d="M91 44C96 39.5 102.5 37.5 111 37.5H125C131.5 37.5 137 40 141 44Z" opacity="0.7" />
      <path d="M168 33.5L195 31.5V36L170 38ZM177 37.4L178.5 46.6M187 36.6V47.4" />
      <path d="M96 53H146M64 63H128" opacity="0.5" />
      <circle cx="113" cy="61.5" r="5.5" opacity="0.7" />
      <circle cx="52" cy="71" r="12" />
      <circle cx="52" cy="71" r="5" opacity="0.6" />
      <circle cx="152" cy="71" r="12" />
      <circle cx="152" cy="71" r="5" opacity="0.6" />
      <path d="M23 71V83.5H31V71" opacity="0.8" />
      <path d="M2 84.5H198" strokeDasharray="1.5 2.5" opacity="0.6" />
    </svg>
  )
}
