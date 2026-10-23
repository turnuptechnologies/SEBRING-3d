import { ArrowUpRight, Search } from "lucide-react"
import Link from "next/link"

import { Marquee, Reveal, RevealGroup, RevealItem } from "@/components/motion"
import { SectionHeading } from "@/components/site/section-heading"
import { brandHref, brands, POPULAR_SEARCHES, products, scaleHref, scales } from "@/lib/catalog"

const QUICK = [
  { label: "New arrivals", href: "/collections/new-arrivals", note: "Fresh off the truck" },
  { label: "Pre-orders", href: "/collections/pre-orders", note: "Reserve before they land" },
  { label: "Digital racing", href: "/collections/digital", note: "Lane-change ready" },
  { label: "Sale", href: "/collections/sale", note: "Pit-stop pricing" },
]

/** Three fast routes into the catalog: by scale, by brand and by what other racers search for. */
export function FindItFast() {
  const scaleCounts = scales.map((s) => ({ ...s, count: products.filter((p) => p.scales.includes(s.value)).length })).filter((s) => s.count > 0)
  const stocked = brands.filter((b) => products.some((p) => p.brand === b.slug))
  return (
    <section className="border-t border-hairline py-24 md:py-32" aria-labelledby="find-it-fast">
      <div className="container-site">
        <SectionHeading index={5} eyebrow="Find it fast" title="Know what you want?" description="Jump straight in by scale, by brand or by the searches racers run most." />

        <RevealGroup className="mt-12 grid gap-4 md:grid-cols-3">
          {scaleCounts.map((s) => (
            <RevealItem key={s.value}>
              <Link
                href={scaleHref(s.value)}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-card p-7 transition-[border-color,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:border-foreground/25"
              >
                <div aria-hidden="true" className="absolute -right-6 -bottom-10 font-wide text-[9rem] leading-none font-black text-foreground/[0.04] transition-colors duration-500 group-hover:text-volt/10">
                  {s.label}
                </div>
                <div className="flex items-start justify-between">
                  <p className="font-wide text-5xl font-black">{s.label}</p>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-volt" />
                </div>
                <div className="relative mt-10">
                  <p className="label-mono text-volt">{s.count} products</p>
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      <div className="mt-16 border-y border-hairline py-8">
        <p className="container-site mb-6 label-mono text-muted-foreground">Shop by brand</p>
        <Marquee duration={48}>
          {stocked.map((b) => (
            <Link key={b.slug} href={brandHref(b.slug)} className="group flex items-baseline gap-3 whitespace-nowrap">
              <span className="font-wide text-3xl font-black uppercase text-foreground/30 transition-colors duration-300 group-hover:text-foreground md:text-4xl">{b.name}</span>
              <span className="label-mono text-volt opacity-0 transition-opacity duration-300 group-hover:opacity-100">{b.country}</span>
            </Link>
          ))}
        </Marquee>
      </div>

      <div className="container-site mt-14 grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <p className="flex items-center gap-2 label-mono text-muted-foreground">
            <Search className="size-3.5" aria-hidden="true" /> Popular searches
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((q) => (
              <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="rounded-full border border-hairline px-4 py-2 text-sm transition-colors hover:border-volt hover:text-volt">
                {q}
              </Link>
            ))}
          </div>
          <Link href="/brands" className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            All {stocked.length} brands A–Z
          </Link>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 gap-3 lg:col-span-7">
          {QUICK.map((q) => (
            <RevealItem key={q.href}>
              <Link href={q.href} className="group flex h-full items-center justify-between gap-4 rounded-lg border border-hairline bg-card px-5 py-5 transition-colors hover:border-foreground/25">
                <span>
                  <span className="block font-semiwide font-bold">{q.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{q.note}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-volt" />
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
