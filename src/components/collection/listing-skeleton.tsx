import type { ListingKind } from "@/components/collection/listing-model"
import { ProductCardSkeleton } from "@/components/site/product-card"
import { cn } from "@/lib/utils"

const bar = "rounded-[3px] bg-foreground/[0.06] skeleton-shimmer"

/**
 * Suspense fallback for the client listing — mirrors its real geometry (tiles,
 * sidebar, toolbar, grid) so nothing jumps when filters hydrate.
 */
export function ListingSkeleton({ kind, tiles = 6 }: { kind: ListingKind; tiles?: number }) {
  return (
    <div className="container-site pb-24 md:pb-32" aria-busy="true">
      <p className="sr-only" role="status">
        Loading products…
      </p>
      <div aria-hidden="true">
        <div className="space-y-5 pt-7 md:pt-9">
          {kind === "category" && <TileRow count={tiles} />}
          {kind === "parts" && (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {[0, 1].map((g) => (
                  <div key={g} className="rounded-lg border border-hairline bg-carbon-850/70 p-4">
                    <div className={cn(bar, "mb-5 h-5 w-48")} />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="h-[6.25rem] rounded-lg border border-hairline bg-card" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-44 rounded-lg border border-hairline bg-card lg:h-36" />
            </>
          )}
          {kind === "search" && (
            <>
              <div className="flex items-center gap-4 border-b-2 border-foreground/15 pb-4">
                <div className="size-7 shrink-0 rounded-full border-2 border-foreground/15" />
                <div className={cn(bar, "h-[clamp(1.4rem,3.6vw,2.9rem)] w-[min(26rem,60%)]")} />
              </div>
              <ChipRow />
            </>
          )}
          {(kind === "collection" || kind === "brand") && <ChipRow />}
        </div>

        <div className="mt-7 md:mt-9 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[17.25rem_minmax(0,1fr)] xl:gap-12">
          <div className="hidden lg:block">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className={cn(bar, "h-3 w-20")} />
            </div>
            {[5, 4, 0, 4, 3].map((rows, g) => (
              <div key={g} className="border-b border-hairline py-4">
                <div className={cn(bar, "h-2.5 w-24")} />
                {rows === 0 ? (
                  <div className="mt-5 space-y-3">
                    <div className="flex h-10 items-end gap-[2px]">
                      {[3, 5, 8, 6, 9, 7, 4, 5, 3, 2, 4, 2, 1, 2].map((h, i) => (
                        <span key={i} className="flex-1 rounded-t-[1px] bg-foreground/[0.07]" style={{ height: `${h * 10}%` }} />
                      ))}
                    </div>
                    <div className="h-[2px] bg-foreground/10" />
                    <div className="flex gap-2">
                      <div className="h-9 flex-1 rounded-sm border border-hairline" />
                      <div className="h-9 flex-1 rounded-sm border border-hairline" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3.5">
                    {Array.from({ length: rows }, (_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="size-4 rounded-[4px] border border-foreground/15" />
                        <div className={cn(bar, "h-2.5")} style={{ width: `${48 + ((i * 17) % 35)}%` }} />
                        <div className={cn(bar, "ml-auto h-2.5 w-5")} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {[88, 58, 58, 58].map((w, i) => (
                  <div key={i} className="h-11 rounded-sm border border-hairline pointer-fine:h-9" style={{ width: w }} />
                ))}
                <div className="ml-auto hidden h-9 w-44 rounded-sm border border-hairline lg:block" />
              </div>
              <div className="flex gap-2 lg:hidden">
                <div className="h-11 flex-1 rounded-sm border border-hairline sm:w-32 sm:flex-none" />
                <div className="h-11 flex-1 rounded-sm border border-hairline sm:ml-auto sm:w-40 sm:flex-none" />
              </div>
              <div className="flex items-baseline gap-2 border-t border-hairline pt-4">
                <div className={cn(bar, "h-6 w-10")} />
                <div className={cn(bar, "h-2.5 w-16")} />
              </div>
            </div>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className={cn(i > 1 && "hidden sm:block", i > 3 && "sm:hidden xl:block")}>
                  <ProductCardSkeleton />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/** App-shell header band while route params resolve (unlisted URLs only). */
export function HeaderSkeleton() {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline" aria-hidden="true">
      <div className="absolute inset-0 -z-10 bg-hairline-grid [--grid-size:72px] [mask-image:radial-gradient(90%_120%_at_75%_0%,#000_10%,transparent_70%)]" />
      <div className="container-site pt-6 pb-10 md:pt-8 md:pb-12">
        <div className={cn(bar, "h-2.5 w-40")} />
        <div className="mt-9 md:mt-12">
          <div className={cn(bar, "h-2.5 w-28")} />
          <div className={cn(bar, "mt-6 h-[clamp(2.1rem,4.6vw,4.2rem)] w-[min(36rem,80%)]")} />
          <div className={cn(bar, "mt-6 h-3 w-[min(30rem,90%)]")} />
          <div className={cn(bar, "mt-3 h-3 w-[min(22rem,70%)]")} />
        </div>
        <div className="mt-9 grid grid-cols-2 border-t border-hairline sm:grid-cols-4 md:mt-11">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("space-y-3 py-5", i > 0 && "sm:border-l sm:border-hairline sm:pl-5")}>
              <div className={cn(bar, "h-2 w-14")} />
              <div className={cn(bar, "h-5 w-12")} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TileRow({ count }: { count: number }) {
  return (
    <div className="-mx-[clamp(1rem,4vw,3.5rem)] overflow-hidden lg:mx-0">
      <div className="flex gap-2.5 px-[clamp(1rem,4vw,3.5rem)] lg:grid lg:grid-cols-[repeat(auto-fit,minmax(9.75rem,1fr))] lg:px-0">
        {Array.from({ length: count + 1 }, (_, i) => (
          <div key={i} className="flex min-h-[7.25rem] w-[9.5rem] shrink-0 flex-col justify-between rounded-lg border border-hairline bg-card p-4 lg:w-auto">
            <div className="flex justify-between">
              <div className={cn(bar, "h-2 w-5")} />
              <div className="size-7 rounded-full bg-foreground/[0.05]" />
            </div>
            <div className="space-y-2.5">
              <div className={cn(bar, "h-2.5 w-4/5")} />
              <div className={cn(bar, "h-2 w-1/3")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChipRow() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {[64, 120, 150, 170, 140].map((w, i) => (
        <div key={i} className="h-11 shrink-0 rounded-sm border border-hairline pointer-fine:h-9" style={{ width: w }} />
      ))}
    </div>
  )
}
