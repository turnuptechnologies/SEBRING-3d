"use client"

import { createContext, use, useDeferredValue, useEffect, useState, type ReactNode } from "react"

import {
  baseProductsFor,
  filterChips,
  garageCarSlugs,
  listingCounts,
  presentOptions,
  resultsFor,
  withFilters,
  type FilterChip,
  type ListingConfig,
  type ListingCounts,
} from "@/components/collection/listing-model"
import { useListingState } from "@/components/collection/use-listing-state"
import type { ListingState } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { useHydrated } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"

interface ListingContextValue {
  config: ListingConfig
  /** Effective state (optimistic URL state + the live search text). */
  state: ListingState
  commit: (next: ListingState) => void
  hrefFor: (next: ListingState) => string
  base: Product[]
  results: Product[]
  counts: ListingCounts
  options: ReturnType<typeof presentOptions>
  chips: FilterChip[]
  /** Saved cars in My Garage — empty until the store hydrates. */
  garageCars: string[]
  hydrated: boolean
  /** Search listings: the text in the search field (results follow it live). */
  query: string
  setQuery: (text: string, opts?: { immediate?: boolean }) => void
}

const ListingContext = createContext<ListingContextValue | null>(null)

export function useListing() {
  const ctx = use(ListingContext)
  if (!ctx) throw new Error("useListing() must be used inside <ListingProvider>")
  return ctx
}

const QUERY_DEBOUNCE_MS = 320

export function ListingProvider({ config, children }: { config: ListingConfig; children: ReactNode }) {
  const { state: urlState, commit: commitUrl, hrefFor } = useListingState(config)
  const isSearch = config.kind === "search"

  // Search text: local for instant results, written to ?q= after a pause.
  const urlQuery = urlState.filters.q ?? ""
  const [text, setText] = useState(urlQuery)
  const [seenQuery, setSeenQuery] = useState(urlQuery)
  if (seenQuery !== urlQuery) {
    // The URL moved on its own (back/forward, header search) — follow it.
    setSeenQuery(urlQuery)
    if (urlQuery !== text.trim()) setText(urlQuery)
  }
  const liveQuery = useDeferredValue(text.trim())

  const state: ListingState = isSearch ? { ...urlState, filters: { ...urlState.filters, q: liveQuery || undefined } } : urlState

  // On search, the field owns the query: facet changes always carry the live text.
  const commit = (next: ListingState) =>
    commitUrl(isSearch ? { ...next, filters: { ...next.filters, q: text.trim() || undefined } } : next)

  useEffect(() => {
    if (!isSearch) return
    const q = text.trim()
    if (q === urlQuery) return
    const id = window.setTimeout(() => commitUrl(withFilters(urlState, { q: q || undefined })), QUERY_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [isSearch, text, urlQuery, urlState, commitUrl])

  const setQuery = (value: string, opts: { immediate?: boolean } = {}) => {
    setText(value)
    if (opts.immediate) commitUrl(withFilters(urlState, { q: value.trim() || undefined }))
  }

  const hydrated = useHydrated()
  const saved = useGarage((s) => s.saved)
  const garageCars = hydrated ? garageCarSlugs(saved) : []

  const base = baseProductsFor(config)
  const results = resultsFor(base, state)
  const counts = listingCounts(base, state.filters, garageCars)
  const options = presentOptions(base)
  const chips = filterChips(state, { includeQuery: !isSearch })

  return (
    <ListingContext
      value={{ config, state, commit, hrefFor, base, results, counts, options, chips, garageCars, hydrated, query: text, setQuery }}
    >
      {children}
    </ListingContext>
  )
}
