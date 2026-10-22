"use client"

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Scroll-linked vertical drift. `offset` px of travel each way. */
export function Parallax({ children, offset = 60, className }: { children: ReactNode; offset?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [offset, -offset])
  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </motion.div>
    </div>
  )
}
