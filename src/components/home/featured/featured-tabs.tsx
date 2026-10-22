"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useId, useState } from "react"

import { EASE_OUT_EXPO, SPRING_SNAPPY } from "@/components/motion/ease"
import { ArrowLink } from "@/components/site/arrow-link"
import { ProductRail } from "@/components/site/product-rail"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Product } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

export interface FeaturedTab {
  id: string
  label: string
  description: string
  href: string
  hrefLabel: string
  slugs: string[]
}

interface FeaturedTabsProps {
  tabs: FeaturedTab[]
  /** Every product referenced by the tabs (sent once, looked up by slug). */
  products: Product[]
  className?: string
}

/**
 * Tabbed product rails: a sliding pill marks the active tab and the rails
 * crossfade. Radix Tabs supplies the roving focus and tab/tabpanel wiring.
 */
export function FeaturedTabs({ tabs, products, className }: FeaturedTabsProps) {
  const pillId = useId()
  const [value, setValue] = useState(tabs[0]?.id ?? "")
  const tab = tabs.find((t) => t.id === value) ?? tabs[0]
  if (!tab) return null
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const items = tab.slugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p))

  return (
    <Tabs value={tab.id} onValueChange={setValue} className={cn("gap-0", className)}>
      <div className="-mx-[clamp(1rem,4vw,3.5rem)] overflow-x-auto scrollbar-none px-[clamp(1rem,4vw,3.5rem)] max-md:mask-fade-x">
        <TabsList
          variant="line"
          aria-label="Browse slot cars"
          className="h-auto w-max gap-1 rounded-full border border-hairline bg-carbon-850/70 p-1 group-data-horizontal/tabs:h-auto data-[variant=line]:rounded-full"
        >
          {tabs.map((t) => {
            const active = t.id === tab.id
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
                className={cn(
                  "relative h-10 flex-none gap-2 rounded-full border-0 px-4 font-semiwide text-[0.6875rem] font-bold tracking-[0.08em] text-ivory-200/70 uppercase transition-colors duration-300 touch:h-11 sm:px-5",
                  "after:hidden hover:text-ivory-100 focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt",
                  "data-active:bg-transparent data-active:text-carbon-900 data-active:shadow-none"
                )}
              >
                {active && <motion.span layoutId={pillId} aria-hidden="true" className="absolute inset-0 rounded-full bg-ivory-100" transition={SPRING_SNAPPY} />}
                <span className="relative">{t.label}</span>
                <span className={cn("relative font-mono text-[0.625rem] font-medium tracking-normal tabular transition-colors", active ? "text-carbon-900/55" : "text-smoke-500")}>
                  <span className="sr-only">, </span>
                  {t.slugs.length}
                  <span className="sr-only"> cars</span>
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      <div className="relative mt-10">
        <AnimatePresence mode="popLayout" initial={false}>
          <TabsContent key={tab.id} value={tab.id} forceMount asChild>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT_EXPO } }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              className="w-full outline-none"
            >
              <ProductRail
                label={`${tab.label} slot cars`}
                products={items}
                header={
                  <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
                    <p className="max-w-md text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">{tab.description}</p>
                    <ArrowLink href={tab.href} className="text-ivory-100">
                      {tab.hrefLabel}
                    </ArrowLink>
                  </div>
                }
              />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </div>
    </Tabs>
  )
}
