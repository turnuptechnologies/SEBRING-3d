"use client"

import { useSyncExternalStore } from "react"

import { useHydrated } from "@/lib/commerce/cart-store"

const subscribe = () => () => {}

/** False during SSR and the hydration pass, true afterwards (and on client-side mounts). */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

/**
 * Persisted cart/garage state is loaded AND safe to render.
 * `useHydrated()` alone can already be true while a late-streamed Suspense
 * boundary hydrates (the shell rehydrated the stores first), which renders
 * store-derived text the server never sent — a hydration mismatch.
 */
export function useStoresReady() {
  const isClient = useIsClient()
  const hydrated = useHydrated()
  return isClient && hydrated
}
