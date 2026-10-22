"use client"

import Link from "next/link"
import type { ComponentProps } from "react"

import { useListing } from "@/components/collection/listing-context"
import type { ListingState } from "@/lib/catalog"

type FilterLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & { next: ListingState }

/**
 * A real link to a filtered URL (crawlable, opens in a new tab with ⌘/Ctrl),
 * but a plain click applies the filter instantly in place.
 */
export function FilterLink({ next, ...props }: FilterLinkProps) {
  const { commit, hrefFor } = useListing()
  return (
    <Link
      {...props}
      href={hrefFor(next)}
      prefetch={false}
      scroll={false}
      replace
      onNavigate={(e) => {
        e.preventDefault()
        commit(next)
      }}
    />
  )
}
