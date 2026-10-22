import { ArrowRight, BookOpen, CarFront, MessageSquareText, SlidersHorizontal, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { PartsExplorer, type PartType } from "@/components/home/grid/parts-explorer"
import { ProductCard } from "@/components/site/product-card"
import { SectionHeading } from "@/components/site/section-heading"
import { getSubcategory, isPart, products, sortProducts } from "@/lib/catalog"
import type { SubcategorySlug } from "@/lib/catalog/types"
import { indexLabel } from "@/lib/format"

const PARTS = "/collections/parts"

/** The quick-chip order from the brief, with short shopper-facing labels. */
const TYPES: { slug: SubcategorySlug; label: string }[] = [
  { slug: "motors", label: "Motors" },
  { slug: "gears-pinions", label: "Gears & pinions" },
  { slug: "tires", label: "Tires" },
  { slug: "wheels", label: "Wheels" },
  { slug: "magnets", label: "Magnets" },
  { slug: "axles-bushings", label: "Axles" },
  { slug: "guides-braid", label: "Guides & braid" },
  { slug: "chassis-pods", label: "Chassis" },
  { slug: "tools-care", label: "Tools" },
]

const FIT_STEPS: { title: string; body: string; href: string; icon: LucideIcon }[] = [
  { title: "Shop by fit", body: "Every part lists the brands, chassis and scales it fits — filter the whole range in one go.", href: PARTS, icon: SlidersHorizontal },
  { title: "Save your cars", body: "Add the cars you race to My Garage, then switch on “Fits my garage” on any parts page.", href: "/garage", icon: CarFront },
  { title: "Ask for a fit check", body: "Not sure? Tell us your car and we’ll confirm the part before you order.", href: "/contact?topic=fit-check", icon: MessageSquareText },
  { title: "Tech & setup", body: "Gearing, tire truing and magnet tuning — the set-up notes that find the tenths.", href: "/tech", icon: BookOpen },
]

/**
 * Parts & upgrades on ivory paper: a blueprint of the car next to the part-type
 * index, the crew's picks, and the fitment tools that stop wrong-part returns.
 */
export function PartsUpgrades() {
  const parts = products.filter(isPart)
  const types: PartType[] = TYPES.map(({ slug, label }) => ({
    slug,
    label,
    href: `${PARTS}?type=${slug}`,
    count: parts.filter((p) => p.subcategory === slug).length,
    description: getSubcategory(slug)?.description ?? "",
  })).filter((t) => t.count > 0)
  const picks = sortProducts(parts, "featured").slice(0, 4)

  return (
    <section id="parts" aria-labelledby="parts-heading" className="light relative isolate overflow-hidden py-24 md:py-32">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hairline-grid [--grid-size:72px] [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" />
      <div className="container-site">
        <SectionHeading
          index={4}
          eyebrow="Parts & upgrades"
          title="Find the tenths"
          description="Motors, gears, tires and the small parts that win club nights — sorted by type and checked against the car you race."
          action={{ label: "Shop all parts", href: PARTS }}
          className="[&_h2>span]:inline [&_h2]:scroll-mt-28"
        />
        <h2 id="parts-heading" className="sr-only">
          Parts and upgrades
        </h2>

        {types.length > 0 && (
          <div className="mt-14 md:mt-16">
            <PartsExplorer types={types} />
          </div>
        )}

        {picks.length > 0 && (
          <div className="mt-20 md:mt-24">
            <div className="mb-8 flex items-end justify-between gap-6 border-b border-hairline pb-4">
              <h3 className="font-semiwide text-lg font-bold tracking-[-0.01em]">Pit-crew picks</h3>
              <p className="label-mono text-muted-foreground">Tested on our own cars</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {picks.map((p) => (
                <li key={p.slug} className="min-w-0">
                  <ProductCard product={p} className="h-full" sizes="(min-width: 1024px) 24vw, 48vw" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <FitFinder />
      </div>
    </section>
  )
}

/** A carbon "pit board" on the ivory page. Dark tokens are re-declared so shared utilities read correctly inside. */
function FitFinder() {
  return (
    <div
      className={[
        "mt-20 grid overflow-hidden rounded-lg bg-carbon-900 text-ivory-100 shadow-lift md:mt-24 lg:grid-cols-12",
        "[--foreground:#f3efe6] [--muted-foreground:#a6a3ad] [--border:rgb(243_239_230/0.1)] [--hairline:rgb(243_239_230/0.09)] [--ring:#ffd23f]",
      ].join(" ")}
    >
      <div className="relative isolate flex flex-col justify-between gap-8 overflow-hidden p-7 sm:p-9 lg:col-span-4 lg:p-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(90%_80%_at_0%_100%,rgb(255_210_63/0.12),transparent_65%)]" />
        <p className="label-mono text-volt">Fitment</p>
        <div>
          <h3 className="font-wide text-title font-black uppercase text-balance">Find parts that fit your car</h3>
          <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
            Brand, chassis and scale on every part page — and real racers on the other end of the line when you want a second opinion.
          </p>
        </div>
      </div>
      <ol className="grid sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
        {FIT_STEPS.map((step, i) => (
          <li key={step.href} className="border-t border-hairline sm:[&:nth-child(even)]:border-l lg:border-t-0 lg:border-l">
            <Link
              href={step.href}
              className="group/step relative flex h-full min-h-56 flex-col gap-8 p-7 outline-none transition-colors duration-500 ease-out-expo hover:bg-ivory-100/[0.035] focus-visible:bg-ivory-100/[0.05] focus-visible:shadow-[inset_0_0_0_2px_var(--color-volt)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-smoke-500 tabular">{indexLabel(i + 1)}</span>
                <step.icon className="size-5 text-smoke-400 transition-colors duration-300 group-hover/step:text-volt" aria-hidden="true" />
              </div>
              <div className="mt-auto">
                <p className="font-semiwide text-[1.0625rem] font-bold tracking-[-0.01em]">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">{step.body}</p>
              </div>
              <span className="inline-flex items-center gap-2 label-mono text-ivory-100/80 transition-colors group-hover/step:text-volt">
                Go
                <ArrowRight className="size-3.5 transition-transform duration-500 ease-out-expo group-hover/step:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
