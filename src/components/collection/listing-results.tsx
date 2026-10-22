"use client"

import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { ArrowUp, ChevronDown } from "lucide-react"
import { useRef, useState } from "react"

import { EmptyResults } from "@/components/collection/empty-results"
import { useListing } from "@/components/collection/listing-context"
import { PAGE_SIZE } from "@/components/collection/listing-model"
import { EASE_OUT_EXPO } from "@/components/motion"
import { ProductCard } from "@/components/site/product-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CARD_SIZES = "(min-width: 1280px) 24vw, (min-width: 1024px) 34vw, (min-width: 640px) 46vw, 92vw"

/** The product grid: animated reflow on every filter change, 24 per page, Load more. */
export function ListingResults({ onTop }: { onTop?: () => void }) {
  const { results, state, commit } = useListing()
  const gridRef = useRef<HTMLUListElement>(null)
  const shown = Math.min(results.length, state.page * PAGE_SIZE)
  const visible = results.slice(0, shown)
  const remaining = results.length - shown

  // Cards that join the grid (Load more, widened filters) cascade in after the existing ones.
  const [prevShown, setPrevShown] = useState(shown)
  const [staggerFrom, setStaggerFrom] = useState(Number.POSITIVE_INFINITY)
  if (prevShown !== shown) {
    setStaggerFrom(shown > prevShown ? prevShown : Number.POSITIVE_INFINITY)
    setPrevShown(shown)
  }

  if (!results.length) return <EmptyResults />

  const loadMore = () => {
    commit({ ...state, page: state.page + 1 })
    window.requestAnimationFrame(() => {
      gridRef.current?.querySelectorAll<HTMLElement>("li[data-card] h3 a")[shown]?.focus({ preventScroll: true })
    })
  }

  return (
    <div>
      <LayoutGroup>
        <ul ref={gridRef} className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((product, i) => (
              <motion.li
                key={product.slug}
                data-card=""
                layout
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.22 } }}
                transition={{
                  layout: { duration: 0.6, ease: EASE_OUT_EXPO },
                  default: { duration: 0.55, ease: EASE_OUT_EXPO, delay: i >= staggerFrom ? Math.min(i - staggerFrom, 8) * 0.035 : 0 },
                }}
                className="min-w-0"
              >
                <ProductCard product={product} morph eager={i < 3} sizes={CARD_SIZES} className="h-full" />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>

      <div className="mt-14 flex flex-col items-center gap-5 text-center">
        <p className="label-mono text-[0.625rem] text-muted-foreground">
          Showing <span className="text-foreground tabular">{shown}</span> of <span className="text-foreground tabular">{results.length}</span>
        </p>
        <div aria-hidden="true" className="h-[2px] w-56 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full bg-volt transition-[width] duration-700 ease-out-expo" style={{ width: `${(shown / results.length) * 100}%` }} />
        </div>
        {remaining > 0 ? (
          <Button variant="outline" size="lg" onClick={loadMore} className="mt-1 min-w-56">
            Load {Math.min(PAGE_SIZE, remaining)} more
            <ChevronDown aria-hidden="true" />
          </Button>
        ) : (
          results.length > PAGE_SIZE && (
            <button
              type="button"
              onClick={onTop}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 font-semiwide text-[0.6875rem] font-bold tracking-[0.1em] text-muted-foreground uppercase outline-none",
                "hover:text-foreground focus-visible:text-volt"
              )}
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
              You’ve seen them all — back to top
            </button>
          )
        )}
      </div>
    </div>
  )
}
