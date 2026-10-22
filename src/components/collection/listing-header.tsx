import type { ReactNode } from "react"

import type { HeaderStat } from "@/components/collection/listing-model"
import { TrackArt } from "@/components/collection/track-art"
import { CountUp } from "@/components/motion"
import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs"
import { Eyebrow } from "@/components/site/section-heading"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

interface ListingHeaderProps {
  crumbs: Crumb[]
  eyebrow: string
  title: string
  description?: ReactNode
  stats?: HeaderStat[]
  /** Right-hand art. Defaults to the circuit map. */
  aside?: ReactNode
  /** Large outlined word set behind the band (brand landings). */
  watermark?: string
  /** Extra content under the description (brand facts, links). */
  children?: ReactNode
  className?: string
}

/**
 * The listing header band — static, server-rendered from catalog data so it is
 * in the prerendered shell before any filter state is read. Kept compact so the
 * first row of products sits close to the fold.
 */
export function ListingHeader({ crumbs, eyebrow, title, description, stats, aside, watermark, children, className }: ListingHeaderProps) {
  return (
    <section className={cn("relative isolate overflow-hidden border-b border-hairline", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-hairline-grid [--grid-size:72px] [mask-image:radial-gradient(90%_130%_at_78%_0%,#000_8%,transparent_72%)]" />
        <div className="absolute -top-1/2 right-[-14%] h-[200%] w-[62%] bg-[radial-gradient(closest-side,rgb(255_210_63/0.07),transparent)]" />
        {watermark && (
          <p className="absolute right-[-0.03em] bottom-[-0.24em] font-wide text-[clamp(6rem,19vw,19rem)] leading-none font-black tracking-[-0.05em] whitespace-nowrap text-transparent uppercase [-webkit-text-stroke:1px_rgb(243_239_230/0.075)]">
            {watermark}
          </p>
        )}
      </div>

      <div className="container-site pt-5 pb-9 md:pt-6 md:pb-11">
        <Breadcrumbs items={crumbs} baseUrl={site.url} />

        <div className="relative mt-8 md:mt-10">
          <div className="max-w-[46rem] lg:max-w-[57%]">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-4 font-wide text-[clamp(2.2rem,4.5vw,4.1rem)] leading-[0.92] font-black tracking-[-0.035em] text-balance uppercase md:mt-5">
              {title}
            </h1>
            {description && <div className="mt-4 max-w-[36rem] text-[0.98rem] leading-relaxed text-muted-foreground text-pretty md:mt-5">{description}</div>}
            {children}
            {stats && stats.length > 0 && <StatLine stats={stats} />}
          </div>
          <div className="pointer-events-none absolute top-1/2 right-0 hidden w-[38%] max-w-[31rem] -translate-y-1/2 lg:block">
            {aside ?? <TrackArt className="aspect-[560/236] w-full" />}
          </div>
        </div>
      </div>
    </section>
  )
}

/** A one-line telemetry readout: 61 PRODUCTS │ 9 BRANDS │ 1:32 · 1:24 SCALES │ FROM $8.99 */
function StatLine({ stats }: { stats: HeaderStat[] }) {
  return (
    <dl className="mt-6 flex flex-wrap items-center gap-y-2.5 md:mt-7">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            "relative flex items-baseline gap-2 pr-5",
            i > 0 && "pl-5 before:absolute before:top-1/2 before:left-0 before:h-3 before:w-px before:-translate-y-1/2 before:bg-foreground/15"
          )}
        >
          <dt className={cn("label-mono text-[0.5625rem] text-muted-foreground", !s.labelFirst && "order-2")}>{s.label}</dt>
          <dd className="font-semiwide text-[0.95rem] leading-none font-bold tracking-[-0.01em] text-foreground tabular">
            {s.count != null ? <CountUp to={s.count} duration={1300} /> : s.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
