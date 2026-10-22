import { HudCorners } from "@/components/site/hud-corners"
import { cn } from "@/lib/utils"

const Bar = ({ className }: { className?: string }) => <div className={cn("rounded-sm bg-muted skeleton-shimmer", className)} />

/** Suspense fallback for /products/[slug] — the page's exact footprint, shimmering. */
export function ProductPageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading product…</span>
      <div className="container-site flex items-center justify-between gap-4 pt-5 md:pt-8" aria-hidden="true">
        <Bar className="h-3 w-72 max-w-[70%]" />
        <Bar className="h-9 w-24 rounded-full" />
      </div>
      <div className="container-site grid gap-8 pt-5 pb-16 md:pt-8 lg:grid-cols-12 lg:gap-x-10 lg:pb-24 xl:gap-x-16" aria-hidden="true">
        <div className="lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline bg-carbon-850 max-sm:-mx-[clamp(1rem,4vw,3.5rem)] max-sm:rounded-none max-sm:border-x-0">
            <div className="absolute inset-0 bg-spotlight" />
            <div className="absolute inset-0 skeleton-shimmer" />
            <HudCorners inset={14} size={16} className="opacity-40" />
            <div className="absolute top-6 left-6 space-y-2">
              <Bar className="h-2 w-14" />
              <Bar className="h-2 w-28" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 sm:gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Bar key={i} className="aspect-[4/3] rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-5 lg:col-span-5">
          <div className="flex justify-between">
            <Bar className="h-3 w-20" />
            <Bar className="h-3 w-36" />
          </div>
          <div className="space-y-3 pt-1">
            <Bar className="h-10 w-[92%]" />
            <Bar className="h-10 w-[70%]" />
          </div>
          <Bar className="h-4 w-[85%]" />
          <div className="flex gap-1.5">
            <Bar className="h-7 w-14" />
            <Bar className="h-7 w-12" />
            <Bar className="h-7 w-24" />
          </div>
          <div className="space-y-4 border-t border-hairline pt-6">
            <Bar className="h-8 w-32" />
            <Bar className="h-4 w-[75%]" />
          </div>
          <div className="flex gap-3 pt-2">
            <Bar className="h-12 w-32" />
            <Bar className="h-12 flex-1" />
          </div>
          <div className="flex gap-3">
            <Bar className="h-12 flex-1" />
            <Bar className="h-12 w-28" />
          </div>
          <Bar className="h-[4.5rem] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
