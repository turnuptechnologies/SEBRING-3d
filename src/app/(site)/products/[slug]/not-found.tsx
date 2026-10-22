import { ArrowRight, Search } from "lucide-react"
import Link from "next/link"

import { Eyebrow } from "@/components/site/section-heading"
import { HudCorners } from "@/components/site/hud-corners"
import { Button } from "@/components/ui/button"
import { POPULAR_SEARCHES, listingHref } from "@/lib/catalog"

/** Unknown product slug. */
export default function ProductNotFound() {
  return (
    <section className="container-site py-16 md:py-24">
      <div className="relative isolate overflow-hidden rounded-lg border border-hairline bg-card px-6 py-16 sm:px-12 md:py-24">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-spotlight" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hairline-grid opacity-70 [--grid-size:56px] mask-fade-b" />
        <span
          aria-hidden="true"
          className="absolute -right-4 -bottom-10 -z-10 font-wide text-[clamp(9rem,30vw,24rem)] leading-none font-black tracking-[-0.06em] text-transparent select-none [-webkit-text-stroke:1.5px_rgb(243_239_230/0.07)]"
        >
          404
        </span>
        <HudCorners inset={16} size={18} className="opacity-60" />

        <div className="max-w-2xl">
          <Eyebrow>Off the racing line</Eyebrow>
          <h1 className="mt-5 font-wide text-display font-black uppercase text-balance">Product not found</h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
            That product has left the grid — the link may be old or the item may have moved. The shop is one click away.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/collections/slot-cars">
                Shop slot cars
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/collections/parts">Parts &amp; upgrades</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/collections/all">Shop everything</Link>
            </Button>
          </div>

          <div className="mt-12 border-t border-hairline pt-8">
            <p className="flex items-center gap-2 label-mono text-muted-foreground">
              <Search className="size-3.5" aria-hidden="true" />
              Popular searches
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((q) => (
                <li key={q}>
                  <Link
                    href={listingHref("/collections/all", { filters: { q } })}
                    className="inline-flex h-10 items-center rounded-full px-4 text-sm text-foreground/80 ring-1 ring-foreground/14 transition-[box-shadow,color] ring-inset hover:text-foreground hover:ring-foreground/40"
                  >
                    {q}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
