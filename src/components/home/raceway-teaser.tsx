import { Calendar, Clock, MapPin } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/motion"
import { TrackMap } from "@/components/raceway/track-map"
import { Eyebrow } from "@/components/site/section-heading"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { nextEvent } from "@/lib/raceway"
import { site } from "@/lib/site"

/** Racing second: a cinematic nudge to the raceway after the shopping sections. */
export function RacewayTeaser() {
  const event = nextEvent()
  const open = site.hours.filter((h) => h.hours !== "Closed")
  const facts = [
    { icon: Clock, label: "Hours", value: `${open[0].days.split(" ")[0]}–Sun`, note: `${open.length} days a week` },
    { icon: MapPin, label: "Location", value: `${site.address.city}, ${site.address.region}`, note: site.address.street },
    { icon: Calendar, label: "Next event", value: event.title, note: `${formatDate(event.date, { weekday: "short", month: "short", day: "numeric" })} · ${event.start}` },
  ]
  return (
    <section className="relative overflow-hidden border-t border-hairline bg-carbon-950 py-24 md:py-32" aria-labelledby="raceway-teaser">
      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-50" />
      <div aria-hidden="true" className="absolute top-1/2 right-0 h-[600px] w-[800px] -translate-y-1/2 rounded-full bg-volt/[0.05] blur-3xl" />
      <div className="relative container-site grid items-center gap-14 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <Eyebrow index={6}>The raceway</Eyebrow>
          <h2 id="raceway-teaser" className="mt-5 font-wide text-display font-black uppercase">Then come race with us</h2>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Eight lanes of routed track in {site.address.city}. Race nights every week, rental cars on the wall, and the crew who sold you the parts standing at the next lane.
          </p>
          <dl className="mt-10 grid gap-5">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-4 border-l-2 border-volt/70 pl-5">
                <f.icon className="mt-1 size-4 shrink-0 text-volt" aria-hidden="true" />
                <div>
                  <dt className="label-mono text-muted-foreground">{f.label}</dt>
                  <dd className="mt-1.5 font-semiwide text-lg font-bold">{f.value}</dd>
                  <dd className="text-sm text-muted-foreground">{f.note}</dd>
                </div>
              </div>
            ))}
          </dl>
          <Button size="lg" variant="outline" className="mt-10" asChild>
            <Link href="/raceway">Track info & events</Link>
          </Button>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="rounded-lg border border-hairline bg-carbon-900/70 p-4 backdrop-blur-sm sm:p-6">
            <TrackMap />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
