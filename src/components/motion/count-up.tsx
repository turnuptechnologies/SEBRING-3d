"use client"

import { animate } from "animejs"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface CountUpProps {
  to: number
  from?: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

/**
 * Telemetry-style number that counts up (anime.js) the first time it is seen.
 * Server markup shows the final value, so there is no layout shift and no-JS works.
 */
export function CountUp({ to, from = 0, duration = 1800, decimals = 0, prefix = "", suffix = "", className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const state = { v: from }
    const render = () => (el.textContent = `${prefix}${state.v.toFixed(decimals)}${suffix}`)
    let anim: ReturnType<typeof animate> | undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        render()
        anim = animate(state, { v: to, duration, ease: "outExpo", onUpdate: render })
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      anim?.pause()
    }
  }, [to, from, duration, decimals, prefix, suffix])

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {prefix}
      {to.toFixed(decimals)}
      {suffix}
    </span>
  )
}
