import { ArrowUpRight, Search } from "lucide-react"
import Link from "next/link"

import { TrackArt } from "@/components/collection/track-art"
import { Button } from "@/components/ui/button"

interface Destination {
  href: string
  label: string
  meta: string
}

/** Unknown collection / brand: say so plainly and offer the nearest lanes. */
export function ListingNotFound({ kind, destinations }: { kind: "collection" | "brand"; destinations: Destination[] }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hairline-grid [--grid-size:72px] [mask-image:radial-gradient(80%_100%_at_70%_0%,#000_10%,transparent_70%)]" />
      <div className="container-site py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label-mono text-[0.625rem] text-signal">Off track · 404</p>
            <h1 className="mt-5 font-wide text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.9] font-black tracking-[-0.04em] uppercase">Wrong turn</h1>
            <p className="mt-5 max-w-lg text-[0.98rem] leading-relaxed text-muted-foreground text-pretty">
              {kind === "brand"
                ? "We don’t carry a brand at that address. Pick one of the makers below, or search for the part you need."
                : "That collection isn’t on the map. Pick a lane below, or search the whole catalog."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/search">
                  <Search aria-hidden="true" />
                  Search the catalog
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={kind === "brand" ? "/brands" : "/collections/all"}>{kind === "brand" ? "All brands" : "Shop everything"}</Link>
              </Button>
            </div>
          </div>
          <TrackArt className="hidden aspect-[560/236] w-full lg:col-span-5 lg:block" lap="6s" />
        </div>

        <ul className="mt-16 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                className="group/dest flex min-h-20 items-center justify-between gap-4 rounded-lg border border-hairline bg-card px-5 py-4 outline-none transition-[border-color,transform] duration-500 ease-out-expo hover:-translate-y-0.5 hover:border-foreground/22 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <span className="block font-semiwide text-[0.8125rem] font-bold tracking-[0.04em] uppercase">{d.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{d.meta}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out-expo group-hover/dest:translate-x-0.5 group-hover/dest:-translate-y-0.5 group-hover/dest:text-volt" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
