"use client"

import { LayoutGroup, motion } from "framer-motion"
import { useEffect, type ReactNode } from "react"

import { DETAILS_TABS, usePurchase, type DetailsTab } from "@/components/product/purchase-context"
import { Eyebrow } from "@/components/site/section-heading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const isTab = (v: string): v is DetailsTab => DETAILS_TABS.some((t) => t.value === v)

/**
 * Overview · Specs · Fitment · Shipping & returns. Every panel stays in the DOM
 * (hidden when inactive) so search engines and find-in-page see the whole spec sheet.
 */
export function ProductTabs({ panels, title }: { panels: Record<DetailsTab, ReactNode>; title: string }) {
  const { product, tab, setTab, registerDetails } = usePurchase()

  // Deep links: /products/x#specs, #fitment, #shipping
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1)
      if (isTab(hash)) setTab(hash)
    }
    const frame = window.requestAnimationFrame(sync)
    window.addEventListener("hashchange", sync)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("hashchange", sync)
    }
  }, [setTab])

  return (
    <section ref={registerDetails} id="details" aria-labelledby="details-heading" className="scroll-mt-24 border-t border-hairline">
      <div className="container-site py-16 md:py-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow index={1}>Spec sheet</Eyebrow>
            <h2 id="details-heading" className="mt-4 font-wide text-headline font-black uppercase text-balance">
              {title}
            </h2>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => isTab(v) && setTab(v)} className="mt-10 gap-0 md:mt-12">
          <LayoutGroup id={`details-${product.slug}`}>
            <div className="relative -mx-[clamp(1rem,4vw,3.5rem)] overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] scrollbar-none">
              <TabsList variant="line" className="h-auto w-max min-w-full justify-start gap-0 rounded-none border-b border-hairline p-0 group-data-horizontal/tabs:h-auto">
                {DETAILS_TABS.map((t, i) => {
                  const active = tab === t.value
                  return (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      id={`tab-${t.value}`}
                      className={cn(
                        "relative h-14 flex-none gap-2.5 rounded-none border-0 px-0 font-semiwide text-[0.8125rem] font-bold tracking-[0.08em] uppercase after:hidden",
                        "mr-8 last:mr-0 md:mr-12",
                        "text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-foreground dark:data-active:border-transparent dark:data-active:bg-transparent",
                        "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                      )}
                    >
                      <span className={cn("font-mono text-[0.625rem] font-medium tracking-[0.12em] transition-colors", active ? "text-volt" : "text-foreground/30")}>
                        {indexLabel(i + 1)}
                      </span>
                      {t.label}
                      {active && (
                        <motion.span
                          layoutId="details-tab-indicator"
                          aria-hidden="true"
                          className="absolute inset-x-0 -bottom-px h-0.5 bg-volt"
                          transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        />
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          </LayoutGroup>

          {DETAILS_TABS.map((t) => (
            <TabsContent
              key={t.value}
              value={t.value}
              forceMount
              className="pt-10 outline-none data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-500 md:pt-14"
            >
              {panels[t.value]}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
