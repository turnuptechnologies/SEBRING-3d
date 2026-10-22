import { keySpecs } from "@/components/product/product-facts"
import type { Product } from "@/lib/catalog/types"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Telemetry strip: the figures racers scan first, straight under the fold. */
export function KeySpecs({ product }: { product: Product }) {
  const specs = keySpecs(product)
  if (!specs.length) return null
  return (
    <section aria-label="Key specifications" className="relative border-t border-hairline bg-carbon-850/70">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hairline-grid opacity-40 [--grid-size:24px] [mask-image:linear-gradient(to_right,transparent,#000_20%,#000_80%,transparent)]" />
      <dl className={cn("container-site relative grid grid-cols-2", specs.length >= 4 ? "md:grid-cols-4" : specs.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {specs.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "flex flex-col gap-3 py-7 md:py-9",
              i % 2 === 1 ? "pl-5 md:pl-8" : "pr-5 md:pr-8",
              i > 0 && "md:border-l md:border-hairline md:pl-8",
              i % 2 === 1 && "border-l border-hairline",
              i >= 2 && "max-md:border-t max-md:border-hairline"
            )}
          >
            <dt className="flex items-center gap-2 label-mono text-[0.625rem] text-muted-foreground">
              <span className="text-volt">{indexLabel(i + 1)}</span>
              {s.label}
            </dt>
            <dd className="font-semiwide text-[clamp(1.05rem,1.55vw,1.4rem)] leading-tight font-bold tracking-[-0.02em] text-balance">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
