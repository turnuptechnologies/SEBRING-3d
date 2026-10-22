"use client"

import { AnimatePresence, motion } from "framer-motion"
import { SlidersHorizontal, X } from "lucide-react"

import { FacetPanel } from "@/components/collection/facet-panel"
import { useListing } from "@/components/collection/listing-context"
import { clearFilters } from "@/components/collection/listing-model"
import { RollingNumber, SortSelect } from "@/components/collection/listing-toolbar"
import { EASE_OUT_EXPO } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

/** Mobile filters: a bottom sheet that applies live, with a sticky "Show N results". */
export function FiltersDrawer({ open, onOpenChange, onShowResults }: { open: boolean; onOpenChange: (open: boolean) => void; onShowResults?: () => void }) {
  const { results, chips, state, commit, config } = useListing()
  const n = results.length

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="flex max-h-[92svh] flex-col border-hairline bg-carbon-850 data-[vaul-drawer-direction=bottom]:max-h-[92svh] data-[vaul-drawer-direction=bottom]:rounded-t-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 pt-3 pb-4">
          <div>
            <DrawerTitle className="font-semiwide text-sm font-bold tracking-[0.12em] uppercase">Filters</DrawerTitle>
            <DrawerDescription className="mt-1 text-xs text-muted-foreground">
              {chips.length ? `${chips.length} active · ` : ""}
              {config.label}
            </DrawerDescription>
          </div>
          <div className="flex items-center gap-1">
            {chips.length > 0 && (
              <button
                type="button"
                onClick={() => commit(clearFilters(state, true))}
                className="min-h-11 px-2 text-[0.8125rem] font-medium text-muted-foreground underline decoration-foreground/20 underline-offset-4 outline-none hover:text-foreground focus-visible:text-volt"
              >
                Clear all
              </button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close filters">
                <X />
              </Button>
            </DrawerClose>
          </div>
        </div>

        <div className="px-5 pt-4 pb-1">
          <p className="mb-2 label-mono text-[0.625rem] text-muted-foreground">Sort by</p>
          <SortSelect className="w-full justify-between" />
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <FacetPanel variant="sheet" />
        </div>

        <div className="border-t border-hairline bg-carbon-850/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <DrawerClose asChild>
            <Button size="lg" className="w-full" disabled={n === 0} onClick={onShowResults}>
              {n === 0 ? (
                "No matches — loosen a filter"
              ) : (
                <>
                  Show <span className="sr-only">{n}</span>
                  <RollingNumber value={n} /> {n === 1 ? "result" : "results"}
                </>
              )}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** A floating Filters · Sort pill for small screens once the toolbar scrolls away. */
export function FloatingFilterBar({ visible, onOpenFilters }: { visible: boolean; onOpenFilters: () => void }) {
  const { chips, results } = useListing()
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:hidden"
        >
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/12 bg-carbon-800/85 p-1.5 shadow-lift backdrop-blur-xl">
            <button
              type="button"
              onClick={onOpenFilters}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full pr-4 pl-3.5 font-semiwide text-[0.6875rem] font-bold tracking-[0.1em] uppercase outline-none transition-colors",
                "bg-ivory-100 text-carbon-900 hover:bg-white focus-visible:ring-2 focus-visible:ring-volt"
              )}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Filters
              {chips.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-carbon-900 px-1.5 font-mono text-[0.625rem] text-volt">{chips.length}</span>}
            </button>
            <span className="px-3 font-mono text-xs text-muted-foreground tabular">
              {results.length} <span className="sr-only">results</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
