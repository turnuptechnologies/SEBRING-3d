"use client"

import { ArrowRight, Flag, MessageSquareText, Search } from "lucide-react"
import Link from "next/link"

import { useListing } from "@/components/collection/listing-context"
import { clearFilters, resultsFor } from "@/components/collection/listing-model"
import { HudCorners } from "@/components/site/hud-corners"
import { Button } from "@/components/ui/button"
import { POPULAR_SEARCHES, categories, categoryHref } from "@/lib/catalog"
import { cn } from "@/lib/utils"

const FIT_CHECK_HREF = "/contact?topic=fit-check"

/** Zero results: say why, offer the cheapest way back, never a dead end. */
export function EmptyResults() {
  const { chips, state, commit, base, config, setQuery } = useListing()
  const isSearch = config.kind === "search"
  const q = state.filters.q

  const recoveries = chips
    .map((chip) => ({ chip, count: resultsFor(base, chip.next).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
  const withoutFilters = chips.length ? resultsFor(base, clearFilters(state, true)).length : 0

  const title = isSearch && q && !chips.length ? `Nothing for “${q}” yet` : "No exact matches"
  const lede =
    isSearch && q && !chips.length
      ? "Check the spelling, try fewer words, or search a maker code like MN08c. Our crew can also track down parts we don’t list."
      : `Nothing ${isSearch && q ? `for “${q}”` : `in ${config.label}`} matches all ${chips.length === 1 ? "of your filters" : `${chips.length} of your filters`}.`

  return (
    <section aria-labelledby="empty-results-title" className="relative overflow-hidden rounded-lg border border-hairline bg-card">
      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-60 [--grid-size:40px] [mask-image:radial-gradient(80%_90%_at_50%_0%,#000,transparent)]" />
      <HudCorners className="opacity-70" size={16} inset={14} />
      <div className="relative mx-auto max-w-2xl px-6 py-14 text-center sm:px-10 sm:py-20">
        <p className="inline-flex items-center gap-2 label-mono text-[0.625rem] text-signal">
          <Flag className="size-3.5" aria-hidden="true" />
          Red flag · 0 results
        </p>
        <h2 id="empty-results-title" className="mt-5 font-wide text-[clamp(1.75rem,3.4vw,2.6rem)] leading-[0.95] font-black tracking-[-0.03em] text-balance uppercase">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground text-pretty">{lede}</p>

        {recoveries.length > 0 && (
          <div className="mt-9">
            <p className="label-mono text-[0.625rem] text-muted-foreground">Remove one to get back on track</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {recoveries.map(({ chip, count }) => (
                <li key={chip.id}>
                  <button
                    type="button"
                    onClick={() => commit(chip.next)}
                    className="group/rec inline-flex h-11 items-center gap-2.5 rounded-sm border border-foreground/14 bg-background/40 pr-3 pl-3.5 text-sm outline-none transition-colors hover:border-foreground/40 focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30"
                  >
                    <span className="text-muted-foreground line-through decoration-signal/70">
                      {chip.group}: {chip.label}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover/rec:translate-x-0.5" aria-hidden="true" />
                    <span className="font-mono text-xs text-foreground tabular">{count}</span>
                    <span className="sr-only">{count === 1 ? "result" : "results"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {chips.length > 0 && (
            <Button size="lg" onClick={() => commit(clearFilters(state, true))}>
              Clear all filters{withoutFilters ? ` · ${withoutFilters}` : ""}
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <Link href={FIT_CHECK_HREF}>
              <MessageSquareText aria-hidden="true" />
              Ask for a fit check
            </Link>
          </Button>
        </div>

        <div className="mt-12 border-t border-hairline pt-8">
          <p className="label-mono text-[0.625rem] text-muted-foreground">Popular searches</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <li key={term}>
                {isSearch ? (
                  <button type="button" onClick={() => setQuery(term, { immediate: true })} className={suggestionClass}>
                    <Search aria-hidden="true" />
                    {term}
                  </button>
                ) : (
                  <Link href={`/search?q=${encodeURIComponent(term)}`} className={suggestionClass}>
                    <Search aria-hidden="true" />
                    {term}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {isSearch && (
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={categoryHref(c.slug)} className="text-muted-foreground underline decoration-foreground/20 underline-offset-4 hover:text-foreground hover:decoration-volt">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

const suggestionClass = cn(
  "inline-flex h-10 items-center gap-2 rounded-full border border-foreground/12 px-3.5 text-[0.8125rem] text-foreground/85 outline-none transition-colors",
  "hover:border-foreground/35 hover:text-foreground focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30 [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
)
