"use client"

import { useSyncExternalStore } from "react"

const noop = () => () => {}
const OPEN: Record<number, [number, number] | null> = { 0: [12, 18], 1: null, 2: null, 3: [15, 21], 4: [15, 21], 5: [15, 23], 6: [10, 22] }

/** "Open now" badge — computed on the client only (SAMPLE hours, local time). */
export function OpenNow() {
  const open = useSyncExternalStore(
    noop,
    () => {
      const d = new Date()
      const h = OPEN[d.getDay()]
      return h ? d.getHours() >= h[0] && d.getHours() < h[1] : false
    },
    () => null
  )
  if (open === null) return null
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 label-mono ${open ? "bg-go/12 text-go" : "bg-carbon-700 text-smoke-400"}`}>
      <span className={`size-1.5 rounded-full ${open ? "animate-live bg-go" : "bg-smoke-500"}`} />
      {open ? "Open now" : "Closed now"}
    </span>
  )
}
