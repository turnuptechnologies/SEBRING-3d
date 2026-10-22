"use client"

import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion"
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"
import { useState } from "react"

import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { Button } from "@/components/ui/button"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface GridSector {
  /** "P1" */
  label: string
  /** Car name for the readout and the jump buttons. */
  name: string
}

interface LapProgressProps {
  /** Continuous grid position: 0 = P1 on the gutter, 1 = P2… */
  position: MotionValue<number>
  sectors: GridSector[]
  onSelect: (index: number) => void
  onSkip: () => void
  className?: string
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Lap-style progress: one sector per grid slot, a car marker riding the line,
 * a rolling SECTOR 02 / 06 counter. Each sector is also a jump button.
 */
export function LapProgress({ position, sectors, onSelect, onSkip, className }: LapProgressProps) {
  const count = sectors.length
  const [{ active, dir }, setState] = useState({ active: 0, dir: 1 })

  useMotionValueEvent(position, "change", (v) => {
    const i = clamp(Math.round(v), 0, count - 1)
    setState((s) => (s.active === i ? s : { active: i, dir: i > s.active ? 1 : -1 }))
  })

  const marker = useTransform(position, (v) => `${clamp((v + 0.5) / count, 0, 1) * 100}%`)
  const current = sectors[active]

  return (
    <div className={cn("container-site", className)}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,15rem)_auto] lg:gap-x-8">
        {/* Sectors */}
        <div className="relative col-span-3 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <ol className="flex gap-1.5" aria-label="Grid positions">
            {sectors.map((s, i) => (
              <li key={s.label} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`${s.label}: ${s.name}`}
                  aria-current={i === active ? "step" : undefined}
                  className="group/seg flex h-11 w-full flex-col justify-end gap-2.5 rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
                >
                  <span
                    className={cn(
                      "label-mono text-[0.625rem] transition-colors duration-300",
                      i === active ? "text-volt" : "text-smoke-500 group-hover/seg:text-ivory-100"
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-ivory-100/10 transition-colors group-hover/seg:bg-ivory-100/20">
                    <SectorFill position={position} index={i} active={i === active} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <motion.div aria-hidden="true" style={{ x: marker }} className="pointer-events-none absolute inset-x-0 bottom-0">
            <CarMarker className="absolute bottom-[-4.5px] left-0 -translate-x-1/2" />
          </motion.div>
        </div>

        {/* Sector counter */}
        <p className="flex items-baseline gap-3 lg:col-start-1 lg:row-start-1">
          <span className="label-mono text-smoke-500" aria-hidden="true">
            Sector
          </span>
          <span className="flex items-baseline font-mono text-[1.75rem] leading-none tracking-[-0.02em] text-ivory-100 tabular" aria-hidden="true">
            <span className="relative inline-flex h-[1em] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.span
                  key={active}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%" }),
                    center: { y: "0%" },
                    exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%" }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
                  className="inline-block"
                >
                  {indexLabel(active + 1)}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="ml-1 text-base text-smoke-600">/{indexLabel(count)}</span>
          </span>
          <span className="sr-only">
            Sector {active + 1} of {count}
          </span>
        </p>

        {/* Current car */}
        <p className="min-w-0 truncate label-mono text-smoke-400 lg:col-start-3 lg:row-start-1" aria-hidden="true">
          <span className="text-volt">{current?.label}</span>
          <span className="mx-2 text-smoke-600">/</span>
          {current?.name}
        </p>

        {/* Controls: step buttons for the carousel, a skip link for the pinned run */}
        <div className="flex justify-end gap-2 lg:col-start-4 lg:row-start-1">
          <div className="flex gap-2 pointer-fine:lg:motion-safe:hidden">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => onSelect(active - 1)} disabled={active <= 0} aria-label="Previous grid slot">
              <ArrowLeft />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => onSelect(active + 1)} disabled={active >= count - 1} aria-label="Next grid slot">
              <ArrowRight />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip} className="hidden h-11 text-smoke-400 hover:text-ivory-100 pointer-fine:lg:motion-safe:inline-flex">
            Skip the grid
            <ArrowDown />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectorFill({ position, index, active }: { position: MotionValue<number>; index: number; active: boolean }) {
  const scaleX = useTransform(position, (v) => clamp(v - index + 0.5, 0, 1))
  return (
    <motion.span
      style={{ scaleX }}
      className={cn("absolute inset-0 origin-left rounded-full transition-colors duration-500", active ? "bg-volt" : "bg-ivory-100/55")}
    />
  )
}

/** A top-down slot car with its headlights on, riding the progress line. */
function CarMarker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 12" className={cn("h-3 w-11 overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id="grid-marker-beam" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffd23f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M27 3.2 44 0v12l-17-3.2Z" fill="url(#grid-marker-beam)" />
      <rect x="6" y="0" width="5" height="12" rx="1.2" fill="#2a2a34" />
      <rect x="19" y="0.6" width="4.4" height="10.8" rx="1.2" fill="#2a2a34" />
      <path d="M4 3.6c0-1.4 1-2.4 2.4-2.4H22c2.8 0 5.4 2.2 5.4 4.8S24.8 10.8 22 10.8H6.4C5 10.8 4 9.8 4 8.4Z" fill="#ffd23f" />
      <rect x="13" y="3.6" width="6" height="4.8" rx="1.6" fill="#0b0b0f" />
      <circle cx="26.6" cy="4.2" r="0.9" fill="#fff8d6" />
      <circle cx="26.6" cy="7.8" r="0.9" fill="#fff8d6" />
    </svg>
  )
}
