"use client"

import { useSyncExternalStore } from "react"

const subscribers = new Map<string, (onChange: () => void) => () => void>()

function subscribeTo(query: string) {
  let subscribe = subscribers.get(query)
  if (!subscribe) {
    subscribe = (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    }
    subscribers.set(query, subscribe)
  }
  return subscribe
}

/** Live media-query match. False on the server and during hydration, so markup always matches. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => false
  )
}

/**
 * The Starting Grid pins and scrolls sideways only for a fine pointer on a wide
 * screen with motion allowed. Mirrors the CSS variant chain `pointer-fine:lg:motion-safe:`.
 */
export const PIN_QUERY = "(min-width: 64rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
