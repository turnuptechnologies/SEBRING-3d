"use client"

import { useInView } from "framer-motion"
import { useLenis } from "lenis/react"
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { FacetPanel, FacetPanelHeader } from "@/components/collection/facet-panel"
import { FiltersDrawer, FloatingFilterBar } from "@/components/collection/filters-drawer"
import { ListingProvider, useListing } from "@/components/collection/listing-context"
import type { ListingConfig } from "@/components/collection/listing-model"
import { ListingResults } from "@/components/collection/listing-results"
import { ActiveFilters, FiltersButton, ResultsStatus, SortSelect } from "@/components/collection/listing-toolbar"
import { PartsHub } from "@/components/collection/parts-hub"
import { BrandRow, CategoryChips, ScalePills, SubcategoryContext, SubcategoryTiles } from "@/components/collection/quick-filters"

/**
 * The client half of every listing page: reads filters from the URL (so it
 * must sit inside <Suspense>), renders quick filters, facets, toolbar and grid.
 * `children` render at the top, inside the listing context (search header).
 */
export function ListingView({ config, children }: { config: ListingConfig; children?: ReactNode }) {
  return (
    <ListingProvider config={config}>
      <ListingLayout>{children}</ListingLayout>
    </ListingProvider>
  )
}

function ListingLayout({ children }: { children?: ReactNode }) {
  const { config } = useListing()
  const headingId = useId()
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Pages stay mounted (hidden) after navigating away — never come back to an open sheet.
  useLayoutEffect(() => () => setDrawerOpen(false), [])

  const topRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const toolbarInView = useInView(toolbarRef)
  const resultsInView = useInView(resultsRef, { margin: "0px 0px -35% 0px" })
  const lenis = useLenis()

  const scrollTo = (el: HTMLElement | null) => {
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 112
    if (lenis) lenis.scrollTo(top, { duration: 1 })
    else window.scrollTo({ top, behavior: "smooth" })
  }

  const showResults = () => {
    const el = resultsRef.current
    if (el && el.getBoundingClientRect().top < 0) window.setTimeout(() => scrollTo(el), 320)
  }

  const top =
    config.kind === "category" ? (
      <>
        <SubcategoryTiles />
        <BrandRow />
      </>
    ) : config.kind === "parts" ? (
      <PartsHub />
    ) : config.kind === "collection" || config.kind === "brand" ? (
      <CategoryChips />
    ) : null

  return (
    <div ref={topRef} className="container-site pb-24 md:pb-32">
      {(children || top) && (
        <div className="space-y-5 pt-7 md:pt-9">
          {children}
          {top}
          <SubcategoryContext />
        </div>
      )}

      <div className="mt-7 md:mt-9 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[17.25rem_minmax(0,1fr)] xl:gap-12">
        <aside aria-label="Product filters" className="hidden lg:block">
          <div
            data-lenis-prevent
            className="sticky top-[calc(var(--header-h,5.5rem)+1.25rem)] max-h-[calc(100svh-var(--header-h,5.5rem)-2.5rem)] overflow-y-auto overscroll-contain pr-3 [scrollbar-color:var(--color-carbon-600)_transparent] [scrollbar-width:thin]"
          >
            <FacetPanelHeader className="border-b border-hairline pb-3" />
            <FacetPanel />
          </div>
        </aside>

        <section ref={resultsRef} aria-labelledby={headingId} className="min-w-0">
          <h2 id={headingId} className="sr-only">
            {config.label} — products
          </h2>
          <div ref={toolbarRef} className="space-y-4">
            <div className="flex items-center gap-4">
              <ScalePills className="min-w-0 flex-1" />
              <SortSelect className="ml-auto hidden shrink-0 lg:flex" />
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <FiltersButton onClick={() => setDrawerOpen(true)} className="flex-1 sm:flex-none" />
              <SortSelect compact className="flex-1 justify-between sm:ml-auto sm:flex-none" />
            </div>
            <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
              <ResultsStatus statusRef={statusRef} />
              <ActiveFilters statusRef={statusRef} className="min-w-0 flex-1" />
            </div>
          </div>
          <div className="mt-6">
            <ListingResults onTop={() => scrollTo(topRef.current)} />
          </div>
        </section>
      </div>

      <FiltersDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onShowResults={showResults} />
      <FloatingFilterBar visible={!drawerOpen && !toolbarInView && resultsInView} onOpenFilters={() => setDrawerOpen(true)} />
    </div>
  )
}
