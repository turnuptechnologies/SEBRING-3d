"use client"

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import { useRef, type PointerEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Pulls its child toward the pointer (mouse only). Use on hero CTAs and icon buttons. */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 240, damping: 18, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 240, damping: 18, mass: 0.35 })

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.span ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x: sx, y: sy }} className={cn("inline-flex", className)}>
      {children}
    </motion.span>
  )
}
