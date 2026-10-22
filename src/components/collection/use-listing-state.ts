"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useOptimistic, useTransition } from "react"

import { sanitizeListing, type ListingConfig } from "@/components/collection/listing-model"
import { listingHref, parseListingParams, type ListingState } from "@/lib/catalog"

/**
 * Listing state lives in the URL (shareable, survives back/forward). Updates
 * render optimistically, then router.replace() catches the URL up inside the
 * same transition — so filters respond on the click, not after the round trip.
 * Must render inside <Suspense> (useSearchParams).
 */
export function useListingState(config: ListingConfig) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlState = sanitizeListing(parseListingParams(searchParams), config)
  const [state, setOptimisticState] = useOptimistic(urlState)
  const [, startTransition] = useTransition()

  const hrefFor = (next: ListingState) => listingHref(config.pathname, sanitizeListing(next, config))

  const commit = (next: ListingState) => {
    const clean = sanitizeListing(next, config)
    startTransition(() => {
      setOptimisticState(clean)
      router.replace(listingHref(config.pathname, clean), { scroll: false })
    })
  }

  return { state, commit, hrefFor }
}
