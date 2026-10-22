"use client"

import { motion, useMotionValue, useTransform } from "framer-motion"
import { useEffect, useRef, type ReactNode } from "react"

import { useGrid } from "@/components/home/grid/grid-rail"

interface SlotParallaxProps {
  /**
   * Share of the slot's distance from the viewport centre applied as extra
   * x offset. Positive lags behind (reads as further away), negative leads.
   */
  factor: number
  className?: string
  children: ReactNode
}

/** Depth layer inside a grid slot — only moves while the grid is pinned. */
export function SlotParallax({ factor, className, children }: SlotParallaxProps) {
  const grid = useGrid()
  const pinned = grid?.pinned ?? false
  const ref = useRef<HTMLDivElement>(null)
  const center = useMotionValue(0)

  // Re-measured when pinning toggles: the intro spacer shifts every slot without resizing it.
  useEffect(() => {
    const slot = ref.current?.closest<HTMLElement>("[data-grid-slot]")
    if (!slot) return
    const update = () => center.set(slot.offsetLeft + slot.offsetWidth / 2)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(slot)
    return () => ro.disconnect()
  }, [center, pinned])

  const x = useTransform(() => {
    if (!grid || !pinned) return 0
    return (center.get() - grid.travel.get() - grid.geometry.get().view / 2) * factor
  })

  return (
    <motion.div ref={ref} style={{ x }} className={className}>
      {children}
    </motion.div>
  )
}
