import { ArrowRight, BadgePercent, Boxes, Gamepad2, Plug } from "lucide-react"
import Link from "next/link"
import type { JSX } from "react"

import {
  BrandRow,
  EmptyNote,
  FeaturedFallback,
  FeaturedProduct,
  HelpTiles,
  PanelCard,
  PanelCell,
  PanelColumn,
  PanelFooter,
  PanelGrid,
  RowList,
  ScalePills,
} from "@/components/layout/header/mega-atoms"
import {
  controllersMenu,
  partsMenu,
  PLUG_GUIDE,
  PLUG_TYPES,
  saleMenu,
  slotCarsMenu,
  trackMenu,
  type MenuKey,
} from "@/components/layout/header/nav-data"
import { ArrowLink } from "@/components/site/arrow-link"
import { CATEGORY_ICONS } from "@/components/site/category-icon"
import { Eyebrow } from "@/components/site/section-heading"
import { site } from "@/lib/site"

const restockNote = (
  <EmptyNote>
    New stock lands every week.{" "}
    <Link href="/contact" className="text-ivory-100 underline decoration-white/25 underline-offset-4 hover:decoration-volt">
      Ask the {site.shortName} crew
    </Link>{" "}
    what&rsquo;s due.
  </EmptyNote>
)

export function SlotCarsPanel() {
  const m = slotCarsMenu()
  return (
    <PanelGrid>
      <PanelColumn index={1} title="By class" i={0} className="col-span-4">
        <RowList links={m.byClass} empty={restockNote} />
      </PanelColumn>
      <PanelColumn index={2} title="By scale" i={1} className="col-span-3">
        <ScalePills links={m.scales} />
        <Eyebrow index={3} className="mt-8 mb-3 text-smoke-500">
          Quick picks
        </Eyebrow>
        <RowList links={m.quick} />
      </PanelColumn>
      <PanelCell i={2} className="col-span-5">
        {m.featured ? (
          <FeaturedProduct product={m.featured} eyebrow="Featured car" />
        ) : (
          <FeaturedFallback title="Slot cars" copy="GT racers, endurance prototypes and Trans-Am muscle in 1:32 and 1:24." href={m.all.href} cta="Browse all cars" icon={CATEGORY_ICONS["slot-cars"]} />
        )}
      </PanelCell>
      <PanelFooter all={m.all}>
        <BrandRow title="Car brands" links={m.brands} />
      </PanelFooter>
    </PanelGrid>
  )
}

export function PartsPanel() {
  const m = partsMenu()
  return (
    <PanelGrid>
      {m.groups.map((g, i) => (
        <PanelColumn key={g.title} index={i + 1} title={g.title} i={i} className="col-span-3">
          <RowList links={g.links} empty={restockNote} />
          <ArrowLink href={g.all.href} className="mt-5 text-ivory-100/90">
            {g.all.label}
          </ArrowLink>
        </PanelColumn>
      ))}
      <PanelCell i={2} className="col-span-6">
        <PanelCard>
          <Eyebrow index={3} className="text-smoke-500">
            Find parts that fit
          </Eyebrow>
          <p className="mt-4 font-wide text-[1.5rem] leading-[0.95] font-black tracking-[-0.03em] text-ivory-50 uppercase">Right part, first time.</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-pretty text-smoke-400">
            Every part lists the brands and scales it fits. Not sure? Send us your car and we&rsquo;ll confirm before it ships.
          </p>
          <div className="mt-6">
            <HelpTiles links={m.fit} />
          </div>
        </PanelCard>
      </PanelCell>
      <PanelFooter all={m.all}>
        <BrandRow title="Parts brands" links={m.brands} />
      </PanelFooter>
    </PanelGrid>
  )
}

export function TrackSetsPanel() {
  const m = trackMenu()
  return (
    <PanelGrid>
      <PanelColumn index={1} title="Track & sets" i={0} className="col-span-3">
        <RowList links={m.links} empty={restockNote} />
      </PanelColumn>
      <PanelCell i={1} className="col-span-4">
        <Link
          href={m.digital.href}
          className="group/digital relative flex h-full min-h-[19rem] flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-carbon-850 p-6 outline-none transition-[border-color] duration-500 hover:border-volt/50 focus-visible:border-volt"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-60 [--grid-size:30px] mask-fade-b" />
          <DigitalLanes />
          <div className="relative">
            <Eyebrow index={2} className="text-smoke-500">
              Digital hub
            </Eyebrow>
            <p className="mt-4 font-wide text-[1.5rem] leading-[0.95] font-black tracking-[-0.03em] text-ivory-50 uppercase">Race more cars on fewer lanes.</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-pretty text-smoke-400">Lane-change sets, chipped cars, controllers and the wiring to run them.</p>
            <span className="mt-5 inline-flex items-center gap-2 font-semiwide text-xs font-bold tracking-[0.1em] text-ivory-50 uppercase">
              Enter the digital hub
              <span className="font-mono font-normal tracking-normal text-smoke-500">{m.digital.count}</span>
              <ArrowRight className="size-3.5 transition-transform duration-500 ease-out-expo group-hover/digital:translate-x-1" />
            </span>
          </div>
        </Link>
      </PanelCell>
      <PanelCell i={2} className="col-span-5">
        {m.featured ? (
          <FeaturedProduct product={m.featured} eyebrow="Featured set" />
        ) : (
          <FeaturedFallback title="Race sets" copy="Track, cars, controllers and power in one box — analog or digital." href={m.all.href} cta="Browse track & sets" icon={Boxes} />
        )}
      </PanelCell>
      <PanelFooter all={m.all} />
    </PanelGrid>
  )
}

export function ControllersPanel() {
  const m = controllersMenu()
  return (
    <PanelGrid>
      <PanelColumn index={1} title="Controllers & power" i={0} className="col-span-3">
        <RowList links={m.links} empty={restockNote} />
      </PanelColumn>
      <PanelCell i={1} className="col-span-4">
        <Link
          href={PLUG_GUIDE.href}
          className="group/plug relative flex h-full min-h-[19rem] flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-carbon-850 p-6 outline-none transition-[border-color] duration-500 hover:border-volt/50 focus-visible:border-volt"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-60 [--grid-size:30px] mask-fade-b" />
          <Plug aria-hidden="true" className="relative size-10 text-smoke-500 transition-colors duration-500 group-hover/plug:text-volt" strokeWidth={1.25} />
          <div className="relative">
            <Eyebrow index={2} className="text-smoke-500">
              Plug guide
            </Eyebrow>
            <p className="mt-4 font-wide text-[1.5rem] leading-[0.95] font-black tracking-[-0.03em] text-ivory-50 uppercase">{PLUG_GUIDE.label}</p>
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Connector types covered">
              {PLUG_TYPES.map((t) => (
                <li key={t} className="rounded-[3px] border border-white/10 px-2 py-1 label-mono text-[0.5625rem] text-smoke-400">
                  {t}
                </li>
              ))}
            </ul>
            <span className="mt-5 inline-flex items-center gap-2 font-semiwide text-xs font-bold tracking-[0.1em] text-ivory-50 uppercase">
              Match my controller
              <ArrowRight className="size-3.5 transition-transform duration-500 ease-out-expo group-hover/plug:translate-x-1" />
            </span>
          </div>
        </Link>
      </PanelCell>
      <PanelCell i={2} className="col-span-5">
        {m.featured ? (
          <FeaturedProduct product={m.featured} eyebrow="Featured controller" />
        ) : (
          <FeaturedFallback title="Controllers" copy="Electronic, resistor and digital controllers with the right plug for your track." href={m.all.href} cta="Browse controllers" icon={Gamepad2} />
        )}
      </PanelCell>
      <PanelFooter all={m.all} />
    </PanelGrid>
  )
}

export function SalePanel() {
  const m = saleMenu()
  return (
    <PanelGrid>
      <PanelColumn index={1} title="Sale by category" i={0} className="col-span-4">
        <RowList links={m.byCategory} tone="sale" empty={restockNote} />
      </PanelColumn>
      <PanelColumn index={2} title="Price bands" i={1} className="col-span-3">
        <RowList links={m.bands} tone="sale" />
      </PanelColumn>
      <PanelCell i={2} className="col-span-5">
        {m.featured ? (
          <FeaturedProduct product={m.featured} eyebrow="Biggest markdown" />
        ) : (
          <FeaturedFallback title="Sale" copy="Pit-stop pricing on cars, parts and sets — while stock lasts." href={m.all.href} cta="Shop the sale" icon={BadgePercent} />
        )}
      </PanelCell>
      <PanelFooter all={m.all} />
    </PanelGrid>
  )
}

/** Two lanes merging and splitting — the digital lane-change, drawn in hairlines. */
function DigitalLanes() {
  return (
    <svg viewBox="0 0 240 90" className="relative h-auto w-[78%] text-smoke-600 transition-colors duration-500 group-hover/digital:text-smoke-400" fill="none" aria-hidden="true">
      <path d="M0 22h70c30 0 40 46 70 46h100" stroke="currentColor" strokeWidth="1.25" />
      <path d="M0 68h70c30 0 40-46 70-46h100" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 5" />
      <circle cx="104" cy="45" r="3.5" className="fill-volt" />
      <path d="M0 22h240M0 68h240" stroke="currentColor" strokeOpacity=".25" strokeWidth="1" />
    </svg>
  )
}

/** Panels keyed by primaryNav `menu`. */
export const MEGA_PANELS: Record<MenuKey, () => JSX.Element> = {
  "slot-cars": SlotCarsPanel,
  parts: PartsPanel,
  "track-sets": TrackSetsPanel,
  "controllers-power": ControllersPanel,
  sale: SalePanel,
}
