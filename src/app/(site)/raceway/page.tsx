import { ArrowRight, Check, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Reveal } from "@/components/motion"
import { EventsList } from "@/components/raceway/events-list"
import { OpenNow } from "@/components/raceway/open-now"
import { TrackMap } from "@/components/raceway/track-map"
import { ArrowLink } from "@/components/site/arrow-link"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SectionHeading } from "@/components/site/section-heading"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { classes, events, faq, pricing, trackFacts } from "@/lib/raceway"
import { directionsHref, formatAddress, site } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Raceway & Events",
  description: "Race night at Sebring: an 8-lane routed raceway, weekly events, rental cars, parties and open track time.",
}

export default function RacewayPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-hairline">
        <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-60" />
        <div aria-hidden="true" className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-volt/[0.06] blur-3xl" />
        <div className="relative container-site grid items-center gap-12 py-14 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Breadcrumbs items={[{ label: "Raceway & events" }]} />
            <p className="mt-10 label-mono text-volt">The raceway</p>
            <h1 className="mt-4 font-wide text-display font-black uppercase">Then come race with us</h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Eight lanes of routed track, race nights every week and rental cars on the wall. Bring the car you bought here — or borrow one of ours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#events">See upcoming events <ArrowRight /></a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={directionsHref()} target="_blank" rel="noreferrer">
                  <MapPin /> Directions
                </a>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-lg border border-hairline bg-carbon-850/70 p-4 backdrop-blur-sm sm:p-6">
              <TrackMap />
            </div>
          </div>
        </div>
        <div className="relative container-site grid grid-cols-2 border-t border-hairline md:grid-cols-4">
          {trackFacts.map((f, i) => (
            <div key={f.label} className={cn("py-7 md:py-9", i > 0 && "md:border-l md:border-hairline md:pl-8", i % 2 === 1 && "border-l border-hairline pl-6 md:pl-8")}>
              <p className="label-mono text-muted-foreground">{f.label}</p>
              <p className="mt-2 font-wide text-3xl font-black">{f.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-site grid gap-6 py-20 md:grid-cols-2 md:py-28">
        <Reveal className="rounded-lg border border-hairline bg-card p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-wide text-title font-black uppercase">Hours</h2>
            <OpenNow />
          </div>
          <dl className="mt-6 divide-y divide-hairline">
            {site.hours.map((h) => (
              <div key={h.days} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                <dt className="font-medium">{h.days}</dt>
                <dd className={cn("tabular", h.hours === "Closed" ? "text-muted-foreground" : "")}>
                  {h.hours}
                  {"note" in h && h.note ? <span className="ml-2 label-mono text-volt">{h.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col rounded-lg border border-hairline bg-card p-7">
          <h2 className="font-wide text-title font-black uppercase">Find us</h2>
          <p className="mt-6 text-lg">{formatAddress()}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <a href={site.phoneHref} className="hover:text-foreground">{site.phone}</a> · <a href={`mailto:${site.email}`} className="hover:text-foreground">{site.email}</a>
          </p>
          <div className="relative mt-6 flex-1 overflow-hidden rounded-md border border-hairline bg-carbon-850 min-h-48">
            <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid [--grid-size:32px]" />
            <svg aria-hidden="true" viewBox="0 0 400 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
              <path d="M-10 140 C 80 120 140 160 220 120 S 360 60 420 80" stroke="rgb(243 239 230 / .18)" strokeWidth="14" fill="none" />
              <path d="M120 -10 L 160 210" stroke="rgb(243 239 230 / .12)" strokeWidth="9" fill="none" />
              <path d="M300 -10 L 260 210" stroke="rgb(243 239 230 / .1)" strokeWidth="6" fill="none" />
            </svg>
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
              <span className="grid size-11 place-items-center rounded-full bg-volt text-carbon-900 shadow-glow"><MapPin className="size-5" /></span>
              <span className="rounded-sm bg-carbon-900/90 px-2 py-1 label-mono">Sebring Raceway</span>
            </div>
          </div>
          <ArrowLink href={directionsHref()} target="_blank" rel="noreferrer" className="mt-6">Get directions</ArrowLink>
        </Reveal>
      </section>

      <section id="events" className="scroll-mt-28 border-t border-hairline bg-carbon-850/50 py-20 md:py-28">
        <div className="container-site">
          <SectionHeading index={1} eyebrow="On the schedule" title="Upcoming race nights" description="Register online to hold your spot. Entry is paid at the counter on the night." />
          <div className="mt-10">
            <EventsList events={events} />
          </div>
        </div>
      </section>

      <section className="container-site py-20 md:py-28">
        <SectionHeading index={2} eyebrow="Classes" title="Race classes" description="House rules for our regular classes — and the cars and parts that are legal for each." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {classes.map((c) => (
            <Reveal key={c.name} className="flex flex-col justify-between gap-6 rounded-lg border border-hairline bg-card p-6">
              <div>
                <h3 className="font-semiwide text-lg font-bold">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.rules}</p>
              </div>
              <ArrowLink href={c.href}>Shop class-legal cars & parts</ArrowLink>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="light py-20 md:py-28">
        <div className="container-site">
          <SectionHeading index={3} eyebrow="Track time" title="Race any day we’re open" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pricing.map((p) => (
              <div key={p.title} className={cn("flex flex-col rounded-lg border p-7", p.featured ? "border-carbon-900 bg-carbon-900 text-ivory-100" : "border-border bg-card")}>
                <p className="label-mono opacity-70">{p.title}</p>
                <p className="mt-4 font-wide text-4xl font-black">{p.price}</p>
                <p className="mt-1 text-sm opacity-70">{p.unit}</p>
                <ul className="mt-6 grid gap-2.5 text-sm">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <Check className={cn("mt-0.5 size-4 shrink-0", p.featured ? "text-volt" : "")} aria-hidden="true" />
                      {it}
                    </li>
                  ))}
                </ul>
                {p.title.startsWith("Parties") && (
                  <Button variant="carbon" className="mt-8 self-start" asChild>
                    <Link href="/contact?topic=party">Ask about a party</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-site grid gap-12 py-20 md:py-28 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading index={4} eyebrow="Questions" title="Raceway FAQ" />
        </div>
        <Accordion type="single" collapsible className="lg:col-span-8">
          {faq.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-hairline">
              <AccordionTrigger className="py-5 text-left font-semiwide text-base font-bold">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="border-t border-hairline">
        <div className="container-site flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <p className="label-mono text-muted-foreground">Need a car for race night?</p>
            <p className="mt-3 font-wide text-title font-black uppercase">Shop race-ready cars & parts</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/collections/slot-cars">Shop slot cars</Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/collections/parts">Shop parts</Link></Button>
          </div>
        </div>
      </section>
    </>
  )
}
