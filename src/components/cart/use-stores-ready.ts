"use client"

import { useSyncExternalStore } from "react"

import { useCart } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"

const subscribe = (onChange: () => void) => {
  const offCart = useCart.persist.onFinishHydration(onChange)
  const offGarage = useGarage.persist.onFinishHydration(onChange)
  return () => {
    offCart()
    offGarage()
  }
}

const snapshot = () => useCart.persist.hasHydrated() && useGarage.persist.hasHydrated()
const serverSnapshot = () => false

/**
 * True once the persisted cart and garage have loaded from localStorage.
 * Reads `false` while hydrating — even in segments that hydrate after the
 * stores did — so server and client markup always match, then flips without
 * a skeleton flash on client-side navigations.
 */
export function useStoresReady() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
