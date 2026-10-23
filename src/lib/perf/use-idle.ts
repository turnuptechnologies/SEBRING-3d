"use client"

import { useEffect, useState } from "react"

/**
 * True once the page has loaded and the browser is idle (Safari: short timeout).
 * Used to fetch and mount code that is not needed for first paint.
 */
export function useIdle(timeout = 2500) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    let id = 0
    let t = 0
    const run = () => {
      if (w.requestIdleCallback) id = w.requestIdleCallback(() => setIdle(true), { timeout })
      else t = window.setTimeout(() => setIdle(true), 400)
    }
    if (document.readyState === "complete") run()
    else window.addEventListener("load", run, { once: true })
    return () => {
      window.removeEventListener("load", run)
      if (id) w.cancelIdleCallback?.(id)
      window.clearTimeout(t)
    }
  }, [timeout])
  return idle
}
