"use client"

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { useLenis } from "lenis/react"
import { createContext, useContext, useEffect, useRef, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from "react"

import { LapProgress, type GridSector } from "@/components/home/grid/lap-progress"
import { PIN_QUERY, useMediaQuery } from "@/components/home/grid/use-media-query"
import { cn } from "@/lib/utils"

export interface GridGeometry {
  /** Left edge of each car slot inside the track, px. */
  starts: number[]
  /** Distance between neighbouring slots, px. */
  pitch: number
  /** Leading padding of the track (lines up with the page gutter), px. */
  gutter: number
  /** Visible width of the scroller, px. */
  view: number
}

interface GridContextValue {
  /** How far the track has travelled: −x while pinned, scrollLeft when native. */
  travel: MotionValue<number>
  geometry: MotionValue<GridGeometry>
  pinned: boolean
}

const GridContext = createContext<GridContextValue | null>(null)
export const useGrid = () => useContext(GridContext)

/*
 * Pinned mode is pure CSS first (so the server markup is already laid out) and
 * JS only refines it: `pointer-fine:lg:motion-safe:` mirrors PIN_QUERY.
 */
const PIN_ROOT = "pointer-fine:lg:motion-safe:h-[var(--grid-h,calc(100vh_+_var(--track-est)_-_100vw))]"
const PIN_VIEWPORT =
  "pointer-fine:lg:motion-safe:sticky pointer-fine:lg:motion-safe:top-0 pointer-fine:lg:motion-safe:flex pointer-fine:lg:motion-safe:h-screen pointer-fine:lg:motion-safe:flex-col pointer-fine:lg:motion-safe:justify-center pointer-fine:lg:motion-safe:overflow-clip pointer-fine:lg:motion-safe:pt-16"
const PIN_INTRO =
  "pointer-fine:lg:motion-safe:absolute pointer-fine:lg:motion-safe:inset-y-0 pointer-fine:lg:motion-safe:left-[calc(max(0px,(100%_-_1440px)/2)_+_clamp(1rem,4vw,3.5rem))] pointer-fine:lg:motion-safe:z-10 pointer-fine:lg:motion-safe:m-0 pointer-fine:lg:motion-safe:flex pointer-fine:lg:motion-safe:w-(--intro-w) pointer-fine:lg:motion-safe:max-w-none pointer-fine:lg:motion-safe:flex-col pointer-fine:lg:motion-safe:justify-center pointer-fine:lg:motion-safe:px-0"
const PIN_SCROLLER = "pointer-fine:lg:motion-safe:overflow-visible pointer-fine:lg:motion-safe:snap-none"
const PIN_SPACER = "pointer-fine:lg:motion-safe:block pointer-fine:lg:motion-safe:w-(--intro-w)"

const TRACK_ESTIMATE =
  "calc(var(--n) * (var(--panel-w) + var(--gap)) + var(--intro-w) + var(--gap) + var(--outro-w) + 2 * (max(0px, (100vw - 1440px) / 2) + clamp(1rem, 4vw, 3.5rem)))"

interface GridRailProps {
  /** Heading block — pinned: rides the track as its first panel; otherwise sits above the carousel. */
  intro: ReactNode
  /** Car slots: <li data-grid-slot> elements. */
  children: ReactNode
  /** The closing panel (an <li>). */
  outro: ReactNode
  sectors: GridSector[]
  label: string
}

/**
 * The Starting Grid rail. With a fine pointer on a wide screen it pins to the
 * viewport and translates sideways as the page scrolls (1px down = 1px across,
 * so the last slot lands exactly on the gutter). Touch, narrow and reduced-motion
 * visitors get a native scroll-snap carousel instead.
 */
export function GridRail({ intro, children, outro, sectors, label }: GridRailProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const activeRef = useRef(-1)

  const pinned = useMediaQuery(PIN_QUERY)
  const reduce = useReducedMotion()
  const lenis = useLenis()

  const distance = useMotionValue(0)
  const geometry = useMotionValue<GridGeometry>({ starts: [], pitch: 1, gutter: 0, view: 0 })

  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start start", "end end"] })
  const { scrollX } = useScroll({ container: scrollerRef })
  const x = useTransform(() => -scrollYProgress.get() * distance.get())
  const travel = useTransform(() => scrollX.get() - x.get())
  /** 0 when P1 sits on the gutter, 1 for P2… */
  const position = useTransform(() => {
    const g = geometry.get()
    if (!g.starts.length) return 0
    return (travel.get() - (g.starts[0] - g.gutter)) / g.pitch
  })

  useEffect(() => {
    const root = rootRef.current
    const viewport = viewportRef.current
    const scroller = scrollerRef.current
    const track = trackRef.current
    if (!root || !viewport || !scroller || !track) return

    const measure = () => {
      const slots = Array.from(track.querySelectorAll<HTMLElement>("[data-grid-slot]"))
      const style = getComputedStyle(track)
      const starts = slots.map((s) => s.offsetLeft)
      const pitch = starts.length > 1 ? starts[1] - starts[0] : (slots[0]?.offsetWidth ?? 0) + (parseFloat(style.columnGap) || 0)
      geometry.set({ starts, pitch: Math.max(1, pitch), gutter: parseFloat(style.paddingLeft) || 0, view: scroller.clientWidth })

      if (pinned) {
        const d = Math.max(0, track.offsetWidth - viewport.clientWidth)
        distance.set(d)
        root.style.setProperty("--grid-h", `${Math.ceil(viewport.clientHeight + d)}px`)
      } else {
        distance.set(0)
        root.style.removeProperty("--grid-h")
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    ro.observe(viewport)
    return () => ro.disconnect()
  }, [pinned, distance, geometry])

  // Light up the slot on the gutter without re-rendering the track.
  useMotionValueEvent(position, "change", (v) => {
    const track = trackRef.current
    if (!track) return
    const cards = track.querySelectorAll<HTMLElement>("[data-grid-card]")
    const i = Math.min(cards.length - 1, Math.max(0, Math.round(v)))
    if (i === activeRef.current) return
    activeRef.current = i
    cards.forEach((card, n) => card.setAttribute("data-active", String(n === i)))
  })

  /** Brings a track offset (px from the start of the track) to the gutter. */
  const scrollToOffset = (left: number, duration = 1.1) => {
    const d = distance.get()
    if (d > 0) {
      const root = rootRef.current
      if (!root) return
      const top = root.getBoundingClientRect().top + window.scrollY
      const y = top + Math.min(Math.max(left, 0), d)
      if (lenis) lenis.scrollTo(y, { duration })
      else window.scrollTo({ top: y, behavior: "smooth" })
      return
    }
    scrollerRef.current?.scrollTo({ left, behavior: reduce ? "auto" : "smooth" })
  }

  const goTo = (index: number) => {
    const g = geometry.get()
    const start = g.starts[Math.min(Math.max(index, 0), g.starts.length - 1)]
    if (start != null) scrollToOffset(start - g.gutter)
  }

  const skip = () => {
    const root = rootRef.current
    if (!root) return
    const y = root.getBoundingClientRect().bottom + window.scrollY
    if (lenis) lenis.scrollTo(y, { duration: 1.4 })
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" })
  }

  // Keyboard focus anywhere in the track brings that panel fully into view.
  const onFocus = (e: FocusEvent<HTMLOListElement>) => {
    const target = e.target as HTMLElement
    const scroller = scrollerRef.current
    if (!scroller || !target.matches(":focus-visible")) return
    const item = target.closest<HTMLElement>("[data-grid-slot], [data-grid-outro]")
    if (!item) return
    const r = item.getBoundingClientRect()
    const v = scroller.getBoundingClientRect()
    if (r.left >= v.left - 1 && r.right <= v.right + 1) return
    scrollToOffset(item.offsetLeft - geometry.get().gutter, 0.7)
  }

  // Arrow keys hop between panels once a panel itself has focus.
  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const target = e.target as HTMLElement
    if (!target.hasAttribute("data-grid-card")) return
    const cards = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-grid-card]"))
    const i = cards.indexOf(target)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: cards.length - 1 }[e.key]
    if (next == null) return
    e.preventDefault()
    cards[Math.min(Math.max(next, 0), cards.length - 1)]?.focus()
  }

  return (
    <GridContext.Provider value={{ travel, geometry, pinned }}>
      <div
        ref={rootRef}
        style={{ "--n": sectors.length, "--track-est": TRACK_ESTIMATE } as CSSProperties}
        className={cn(
          "relative [--gap:1rem] sm:[--gap:1.25rem] lg:[--gap:1.5rem]",
          "[--panel-w:min(76vw,1080px)] [--intro-w:min(34vw,520px)] [--outro-w:min(36vw,520px)]",
          "lg:[--panel-h:clamp(22rem,calc(100vh_-_14.5rem),42rem)]",
          PIN_ROOT
        )}
      >
        <div ref={viewportRef} className={cn("relative py-20 md:py-28", "pointer-fine:lg:motion-safe:py-0", PIN_VIEWPORT)}>
          <div className="relative">
            <motion.div style={{ x }} className={cn("container-site mb-10 md:mb-14", PIN_INTRO)}>
              {intro}
            </motion.div>
            <div
              ref={scrollerRef}
              data-lenis-prevent={pinned ? undefined : ""}
              className={cn(
                "relative snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none",
                "scroll-px-[calc(max(0px,(100%_-_1440px)/2)_+_clamp(1rem,4vw,3.5rem))]",
                PIN_SCROLLER
              )}
            >
              <motion.ol
                ref={trackRef}
                aria-label={label}
                style={{ x }}
                onFocus={onFocus}
                onKeyDown={onKeyDown}
                className="relative flex w-max gap-(--gap) px-[calc(max(0px,(100%_-_1440px)/2)_+_clamp(1rem,4vw,3.5rem))] py-1 will-change-transform"
              >
                <li aria-hidden="true" className={cn("hidden shrink-0", PIN_SPACER)} />
                {children}
                {outro}
              </motion.ol>
            </div>
          </div>
          <LapProgress position={position} sectors={sectors} onSelect={goTo} onSkip={skip} className="mt-8 md:mt-10 pointer-fine:lg:motion-safe:mt-7" />
        </div>
      </div>
    </GridContext.Provider>
  )
}
