"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, CornerDownLeft, Search, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useId, useRef } from "react"

import { SEARCH_LISTING } from "@/components/collection/listing-configs"
import { useListing } from "@/components/collection/listing-context"
import { taxonomyMatches, type TaxonomyMatch } from "@/components/collection/listing-model"
import { ListingView } from "@/components/collection/listing-view"
import { EASE_OUT_EXPO } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { POPULAR_SEARCHES } from "@/lib/catalog"
import { cn } from "@/lib/utils"

/** /search — the query lives in ?q=, read on the client. Must render inside <Suspense>. */
export function SearchView() {
  return (
    <ListingView config={SEARCH_LISTING}>
      <SearchHero />
    </ListingView>
  )
}

function SearchHero() {
  const { query, setQuery } = useListing()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const trimmed = query.trim()
  const matches = taxonomyMatches(trimmed)

  // Arriving with nothing typed on a desktop: put the cursor in the field.
  useEffect(() => {
    if (!inputRef.current?.value && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div>
      <form
        role="search"
        aria-label="Search the catalog"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(query, { immediate: true })
          inputRef.current?.blur()
        }}
      >
        <div className="group/field relative flex items-center gap-3 border-b-2 border-foreground/15 pb-3 transition-colors duration-500 focus-within:border-volt sm:gap-5 sm:pb-4">
          <label htmlFor={inputId} className="shrink-0 text-muted-foreground transition-colors group-focus-within/field:text-foreground">
            <Search className="size-6 sm:size-8" aria-hidden="true" />
            <span className="sr-only">Search products, brands, SKUs and maker codes</span>
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault()
                setQuery("", { immediate: true })
              }
            }}
            placeholder="Cars, parts, SKUs…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent py-1 font-wide text-[clamp(1.55rem,4.4vw,3.5rem)] leading-none font-black tracking-[-0.035em] uppercase outline-none placeholder:text-foreground/18 [&::-webkit-search-cancel-button]:hidden"
          />
          <AnimatePresence initial={false}>
            {query && (
              <motion.button
                key="clear"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                onClick={() => {
                  setQuery("", { immediate: true })
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-volt"
              >
                <X className="size-5" />
              </motion.button>
            )}
          </AnimatePresence>
          <Button type="submit" size="icon-lg" aria-label="Search" className="hidden sm:inline-flex">
            <CornerDownLeft />
          </Button>
        </div>
      </form>

      <div className={cn("mt-5", !trimmed && "min-h-11")}>
        {trimmed ? <JumpTo matches={matches} /> : <PopularSearches onPick={(term) => setQuery(term, { immediate: true })} />}
      </div>
    </div>
  )
}

/** Departments and makers that match the query — straight to their pages. */
function JumpTo({ matches }: { matches: TaxonomyMatch[] }) {
  if (!matches.length) return null
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <p className="shrink-0 label-mono text-[0.625rem] text-muted-foreground">Jump to</p>
      <ul className="-mx-[clamp(1rem,4vw,3.5rem)] flex gap-2 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {matches.map((m) => (
          <li key={m.id} className="shrink-0">
            <Link
              href={m.href}
              className="group/jump inline-flex h-11 items-center gap-3 rounded-sm border border-foreground/14 bg-foreground/[0.03] pr-3 pl-3.5 outline-none transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="label-mono text-[0.5625rem] text-muted-foreground">{m.kind}</span>
              <span className="text-sm font-medium whitespace-nowrap text-foreground">{m.label}</span>
              {m.context && <span className="hidden text-xs whitespace-nowrap text-muted-foreground md:inline">{m.context}</span>}
              <span className="font-mono text-[0.6875rem] text-muted-foreground tabular">{m.count}</span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-3.5 text-muted-foreground transition-transform duration-300 group-hover/jump:translate-x-0.5 group-hover/jump:-translate-y-0.5 group-hover/jump:text-volt"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PopularSearches({ onPick }: { onPick: (term: string) => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <p className="shrink-0 label-mono text-[0.625rem] text-muted-foreground">Popular</p>
      <ul className="-mx-[clamp(1rem,4vw,3.5rem)] flex gap-2 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {POPULAR_SEARCHES.map((term) => (
          <li key={term} className="shrink-0">
            <button
              type="button"
              onClick={() => onPick(term)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-foreground/12 px-4 text-[0.8125rem] whitespace-nowrap text-foreground/85 outline-none transition-colors pointer-fine:h-9 hover:border-foreground/35 hover:text-foreground focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30"
            >
              <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {term}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
