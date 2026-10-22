"use client"

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion"
import { useEffect, useId, useRef, useState, type PointerEvent } from "react"

import { cn } from "@/lib/utils"

/*
 * Geometry, measured from Archivo at wdth 125 / weight 900: "SEBRING" advances
 * 6.03em with a 0.70em cap height. At 172 units the word spans the 1000-unit
 * viewBox (textLength trims the tracking slightly, like the logo lockup).
 */
const VB_W = 1000
const VB_H = 128
const BASELINE = 124
const FONT_SIZE = 172
/** Longer than any glyph contour, so each letter draws on completely. */
const DASH = 900

/**
 * The footer's brand moment: a full-width outlined SEBRING whose stroke draws
 * on as the page reaches its end, lit by a headlight that follows the pointer
 * (or sweeps with scroll on touch screens). Decorative — hidden from AT.
 */
export function FooterWordmark({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const reduce = useReducedMotion()
  // CSS px per viewBox unit — keeps hairlines crisp at every width.
  const [scale, setScale] = useState(1.4)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.max(0.2, entry.contentRect.width / VB_W))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start end", "end end"] })
  const draw = useTransform(scrollYProgress, [0.08, 0.92], [DASH, 0])
  const fillOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 1])
  const rise = useTransform(scrollYProgress, [0, 1], ["24%", "0%"])

  const pointerX = useMotionValue(VB_W / 2)
  const pointerY = useMotionValue(VB_H * 0.4)
  const hovering = useMotionValue(0)
  const sweepX = useTransform(scrollYProgress, [0, 1], [-0.12 * VB_W, 0.5 * VB_W])
  const targetX = useTransform(() => (hovering.get() ? pointerX.get() : sweepX.get()))
  const targetY = useTransform(() => (hovering.get() ? pointerY.get() : VB_H * 0.4))
  const lightX = useSpring(targetX, { stiffness: 110, damping: 20, mass: 0.7 })
  const lightY = useSpring(targetY, { stiffness: 110, damping: 20, mass: 0.7 })

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const svg = svgRef.current
    if (reduce || e.pointerType !== "mouse" || !svg) return
    const r = svg.getBoundingClientRect()
    pointerX.set(((e.clientX - r.left) / r.width) * VB_W)
    pointerY.set(((e.clientY - r.top) / r.height) * VB_H)
    hovering.set(1)
  }

  const text = {
    x: VB_W / 2,
    y: BASELINE,
    textAnchor: "middle",
    fontSize: FONT_SIZE,
    fontWeight: 900,
    textLength: VB_W - 2,
    lengthAdjust: "spacing",
    className: "font-wide",
  } as const

  const dash = reduce ? {} : { strokeDasharray: DASH, style: { strokeDashoffset: draw } }

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      onPointerMove={onPointerMove}
      onPointerLeave={() => hovering.set(0)}
      className={cn("relative overflow-hidden select-none", className)}
    >
      <motion.svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block h-auto w-full overflow-visible"
        style={reduce ? undefined : { y: rise }}
        focusable="false"
      >
        <defs>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3efe6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#f3efe6" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3efe6" stopOpacity="0.075" />
            <stop offset="0.7" stopColor="#f3efe6" stopOpacity="0.01" />
            <stop offset="1" stopColor="#f3efe6" stopOpacity="0" />
          </linearGradient>
          <motion.radialGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" r={190} cx={lightX} cy={lightY}>
            <stop offset="0" stopColor="#fff4cc" stopOpacity="1" />
            <stop offset="0.28" stopColor="#ffd23f" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
          </motion.radialGradient>
          <radialGradient id={`${id}-pool`}>
            <stop offset="0" stopColor="#ffd23f" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Light pooling on the "asphalt" under the headlight */}
        <motion.ellipse cx={lightX} cy={VB_H - 2} rx={240} ry={26} fill={`url(#${id}-pool)`} />

        <motion.text {...text} fill={`url(#${id}-fill)`} style={reduce ? undefined : { fillOpacity }}>
          SEBRING
        </motion.text>
        <motion.text {...text} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth={1.1 / scale} strokeLinejoin="round" {...dash}>
          SEBRING
        </motion.text>
        <motion.text {...text} fill="none" stroke={`url(#${id}-light)`} strokeWidth={1.9 / scale} strokeLinejoin="round" {...dash}>
          SEBRING
        </motion.text>
      </motion.svg>
    </div>
  )
}
