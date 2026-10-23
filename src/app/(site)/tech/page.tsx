import type { Metadata } from "next"

import { GearCalculator } from "@/components/content/gear-calculator"
import { PageIntro } from "@/components/content/page-intro"
import { ArrowLink } from "@/components/site/arrow-link"
import { SectionHeading } from "@/components/site/section-heading"

export const metadata: Metadata = { title: "Pit Wall — tech guides", description: "Gear ratio calculator, tire sizes, motor cans and controller plugs for slot cars." }

const TIRES = [
  { size: "20 × 10 mm", hub: "17.3 mm", use: "Most 1:32 racing rears (Slot.it, NSR, Scaleauto)", href: "/collections/tires-magnets-axles?type=tires&scale=1:32" },
  { size: "19 × 10 mm", hub: "15.8 mm", use: "Small-hub racing rears, routed wood", href: "/collections/tires-magnets-axles?type=tires" },
  { size: "21 × 11 mm", hub: "Stock", use: "Carrera Evolution / Digital 132 rears", href: "/brands/paul-gage" },
  { size: "27 × 13 mm", hub: "3 mm axle", use: "1:24 raceway rears", href: "/collections/tires-magnets-axles?scale=1:24" },
]
const CANS = [
  { can: "Boxer / short can", fits: "Slot.it, NSR, most 1:32 racing pods", note: "The club standard — 18k to 25k rpm." },
  { can: "Long can", fits: "NSR & long-can anglewinder pods, 1:24", note: "More torque and top speed; longer pods only." },
  { can: "Flat can", fits: "Inline & sidewinder home cars", note: "High-revving sprint option where classes allow." },
]
const PLUGS = [
  { system: "Carrera Evolution / Digital 132", plug: "Carrera 3-pin", tip: "Use Carrera controllers or an adapter for electronic controllers." },
  { system: "Scalextric Sport / ARC", plug: "Scalextric 3-pin", tip: "Sport plunger controllers plug straight into the power base." },
  { system: "Raceway driver stations", plug: "Alligator clips", tip: "Red to power, black to brake, white to controller — check the station label." },
]

export default function TechPage() {
  return (
    <>
      <PageIntro crumb="Tech guides" eyebrow="Pit Wall" title="Set-up notes that find the tenths">
        Gearing, tires, motors and plugs — the quick references the crew uses at the counter every night.
      </PageIntro>

      <section className="container-site py-16 md:py-24">
        <SectionHeading index={1} eyebrow="Calculator" title="Gear ratio & rollout" action={{ label: "Shop gears & pinions", href: "/collections/chassis-motors?type=gears-pinions" }} />
        <div className="mt-10"><GearCalculator /></div>
      </section>

      <section className="container-site grid gap-12 border-t border-hairline py-16 md:py-24 lg:grid-cols-2">
        <div>
          <SectionHeading index={2} eyebrow="Tires" title="Tire size guide" />
          <ul className="mt-8 divide-y divide-hairline rounded-lg border border-hairline">
            {TIRES.map((t) => (
              <li key={t.size} className="grid gap-1 p-5 sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:gap-6">
                <span className="font-mono text-volt">{t.size}</span>
                <span className="text-sm text-muted-foreground">{t.use} · hub {t.hub}</span>
                <ArrowLink href={t.href}>Shop</ArrowLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeading index={3} eyebrow="Motors" title="Motor can guide" />
          <ul className="mt-8 grid gap-3">
            {CANS.map((c) => (
              <li key={c.can} className="rounded-lg border border-hairline bg-card p-5">
                <p className="font-semiwide font-bold">{c.can}</p>
                <p className="mt-1 text-sm text-muted-foreground">Fits {c.fits}. {c.note}</p>
              </li>
            ))}
          </ul>
          <ArrowLink href="/collections/chassis-motors?type=motors" className="mt-6">Shop motors</ArrowLink>
        </div>
      </section>

      <section id="plugs" className="container-site scroll-mt-28 border-t border-hairline py-16 md:py-24">
        <SectionHeading index={4} eyebrow="Controllers" title="Which plug does my track use?" action={{ label: "Shop controllers", href: "/collections/controllers-power?type=controllers" }} />
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {PLUGS.map((p) => (
            <div key={p.system} className="rounded-lg border border-hairline bg-card p-6">
              <p className="label-mono text-muted-foreground">{p.system}</p>
              <p className="mt-3 font-wide text-xl font-black uppercase">{p.plug}</p>
              <p className="mt-3 text-sm text-muted-foreground">{p.tip}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
