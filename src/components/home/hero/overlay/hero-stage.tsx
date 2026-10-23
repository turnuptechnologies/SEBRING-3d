"use client"

import { motion, useInView, useScroll, useTransform } from "framer-motion"
import { useLenis } from "lenis/react"
import { ArrowRight, Pause, Play } from "lucide-react"
import Link from "next/link"
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react"

import { HeroSceneSlot } from "@/components/home/hero/overlay/hero-scene-slot"
import { HeroWordmark } from "@/components/home/hero/overlay/hero-wordmark"
import { NowOnTrack } from "@/components/home/hero/overlay/now-on-track"
import { Magnetic } from "@/components/motion/magnetic"
import { Button } from "@/components/ui/button"
import type { CarArt, Product } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)"
const subscribeReduce = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCE_QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}
const prefersReduced = () => window.matchMedia(REDUCE_QUERY).matches
const prefersReducedOnServer = () => false

interface HeroStageProps {
  /** Hero cars, in scene order. */
  cars: Product[]
  /** Server-rendered still (poster or designed fallback) that sits under the scene. */
  poster: ReactNode
  /** True when `poster` is the rendered still of the scene (not the CSS fallback). */
  hasPoster: boolean
}

export function HeroStage({ cars, poster, hasPoster }: HeroStageProps) {
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()
  const lenis = useLenis()
  const reduce = useSyncExternalStore(subscribeReduce, prefersReduced, prefersReducedOnServer)
  const inView = useInView(ref, { amount: 0.06 })
  const [active, setActive] = useState(0)
  // null = follow the OS motion preference; true/false = the shopper's own choice.
  const [choice, setChoice] = useState<boolean | null>(null)
  // Once the scene has been mounted, pausing keeps it alive rather than tearing down WebGL.
  const [keepScene, setKeepScene] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)

  // WebGL waits for page load + an idle moment so it never competes with first paint.
  // Data-saver connections and low-memory devices keep the rendered poster unless the shopper presses play.
  const [deferred, setDeferred] = useState(false)
  const [lite, setLite] = useState(false)
  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
    const isLite = Boolean(nav.connection?.saveData) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)
    let idle = 0
    let timer = 0
    const go = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => {
        setLite(isLite)
        setDeferred(true)
      }, { timeout: 1800 })
      else timer = window.setTimeout(() => {
        setLite(isLite)
        setDeferred(true)
      }, 500)
    }
    // Start on the first interaction (or 3.5s after load): the poster — a frame of the same
    // scene — holds the screen meanwhile, so the three.js parse never blocks first input.
    const EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const
    let started = false
    const start = () => {
      if (started) return
      started = true
      EVENTS.forEach((e) => window.removeEventListener(e, start))
      go()
    }
    EVENTS.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }))
    const arm = () => (timer = window.setTimeout(start, 3500))
    if (document.readyState === "complete") arm()
    else window.addEventListener("load", arm, { once: true })
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, start))
      window.removeEventListener("load", arm)
      window.clearTimeout(timer)
      const w = window as Window & { cancelIdleCallback?: (id: number) => void }
      if (idle) w.cancelIdleCallback?.(idle)
    }
  }, [])

  const motionOn = choice ?? (!reduce && !lite)
  const carArts = cars.map((c) => c.art).filter((a): a is CarArt => a.kind === "car")
  // Reduced motion: the poster is the still; without one, the scene renders its own composed still.
  const showScene = carArts.length > 0 && (keepScene || (deferred && (motionOn || (reduce && !hasPoster))))
  // The scene honours prefers-reduced-motion with a still, so the control only exists where it can animate.
  const canToggle = carArts.length > 0 && !reduce

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const sceneScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.14])
  const sceneY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "16%"])
  const markY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -140])
  const markOpacity = useTransform(scrollYProgress, [0.05, 0.62], [1, 0])
  const cueOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0])

  const toggleMotion = () => {
    setKeepScene(true)
    setChoice(!motionOn)
  }

  const scrollToShop = () => {
    const hero = ref.current
    if (!hero) return
    // The hero sits directly under the sticky header, so a scroll position equal to
    // its height lands the next section right below the header.
    const top = hero.offsetHeight
    if (lenis) lenis.scrollTo(top, { duration: 1.2 })
    else window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" })
  }

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      data-scene={sceneReady ? "ready" : "poster"}
      className="@container relative isolate flex h-[calc(100svh-var(--hero-offset))] min-h-[640px] flex-col overflow-hidden bg-carbon-950 text-ivory-100 [--hero-offset:4rem]"
    >
      {/* Scene: poster underneath, realtime WebGL on top once it loads. Sinks and scales on scroll. */}
      {/* Nudged down a touch on wide screens so the horizon sits just under the lockup, leaving the car a clear run. */}
      <motion.div aria-hidden="true" style={{ scale: sceneScale, y: sceneY }} className="absolute inset-0 -z-20 origin-[50%_46%] sm:top-[3%] sm:-bottom-[3%]">
        {poster}
        {showScene && (
          <HeroSceneSlot
            cars={carArts}
            paused={!motionOn || !inView}
            onActiveCarChange={setActive}
            onReady={() => {
              setSceneReady(true)
              window.dispatchEvent(new Event("sebring:scene-ready"))
            }}
            quality="auto"
            className="absolute inset-0"
          />
        )}
      </motion.div>

      {/* Legibility scrims: header + wordmark at the top, CTAs and the HUD card at the bottom. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(6_6_9/0.82)_0%,rgb(6_6_9/0.42)_24%,rgb(6_6_9/0)_46%,rgb(6_6_9/0)_64%,rgb(6_6_9/0.88)_100%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_58%,rgb(6_6_9/0.7))]" />

      {/* HUD frame. */}
      <motion.div aria-hidden="true" style={{ opacity: cueOpacity }} className="pointer-events-none absolute inset-3 -z-10 sm:inset-5">
        <span className="absolute top-0 left-0 size-4 border-t border-l border-ivory-100/35" />
        <span className="absolute top-0 right-0 size-4 border-t border-r border-ivory-100/35" />
        <span className="absolute bottom-0 left-0 size-4 border-b border-l border-ivory-100/35" />
        <span className="absolute right-0 bottom-0 size-4 border-r border-b border-ivory-100/35" />
      </motion.div>

      <div className="pointer-events-none container-site relative flex flex-1 flex-col">
        <motion.div style={{ y: markY, opacity: markOpacity }} className="flex flex-col items-center pt-[clamp(1.25rem,3.6svh,3rem)] text-center max-sm:pt-[clamp(2rem,7svh,4rem)]">
          <p className="flex items-center gap-2.5 label-mono text-ivory-200/90">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inset-0 animate-live rounded-full bg-volt" />
              <span className="relative size-1.5 rounded-full bg-volt" />
            </span>
            Online slot car &amp; parts shop
          </p>

          <HeroWordmark id={titleId} className="mt-[clamp(1rem,2.2svh,1.75rem)]" />

          <div className="pointer-events-auto mt-[clamp(1.25rem,3svh,2.25rem)] flex flex-wrap items-center justify-center gap-3 max-sm:mt-7 max-sm:w-full max-sm:flex-nowrap">
            <Magnetic className="max-sm:flex-1">
              <Button size="xl" asChild className="max-sm:h-13 max-sm:w-full max-sm:px-5 max-sm:text-[12px] [@media(max-height:999px)]:h-13">
                <Link href="/collections/slot-cars">
                  Shop slot cars
                  <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-1" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic className="max-sm:flex-1">
              <Button size="xl" variant="glass" asChild className="max-sm:h-13 max-sm:w-full max-sm:px-5 max-sm:text-[12px] [@media(max-height:999px)]:h-13">
                <Link href="/collections/parts">Shop parts</Link>
              </Button>
            </Magnetic>
          </div>
        </motion.div>

        <div className="flex-1" />

        <div className="flex items-end justify-between gap-6 pb-[clamp(1rem,3.2svh,2rem)] max-sm:pb-3">
          <motion.div style={{ opacity: cueOpacity }} className="pointer-events-auto flex items-center gap-2 max-sm:hidden">
            <ScrollCue onClick={scrollToShop} />
            {canToggle && <MotionToggle on={motionOn} onToggle={toggleMotion} />}
          </motion.div>
          <NowOnTrack
            cars={cars}
            active={active}
            control={canToggle ? <MotionToggle on={motionOn} onToggle={toggleMotion} compact className="sm:hidden" /> : null}
            className="w-[24rem] max-sm:w-full"
          />
        </div>
      </div>
    </section>
  )
}

function ScrollCue({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/cue flex h-11 items-center gap-3 rounded-full pr-4 pl-1.5 text-ivory-200/80 transition-colors hover:text-ivory-100 max-sm:hidden"
    >
      <span className="relative grid h-9 w-6 place-items-start justify-center overflow-hidden rounded-full border border-ivory-100/30 pt-1.5 transition-colors group-hover/cue:border-volt/70">
        <span className="h-2 w-px animate-[sb-cue_1.8s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-current motion-reduce:animate-none" />
      </span>
      <span className="label-mono">Scroll to shop</span>
      <style href="sebring-hero-cue" precedence="default">
        {"@keyframes sb-cue { 0% { transform: translateY(-2px); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(16px); opacity: 0 } }"}
      </style>
    </button>
  )
}

/** WCAG 2.2.2: looping motion that starts on its own needs a way to stop it. */
function MotionToggle({ on, onToggle, compact = false, className }: { on: boolean; onToggle: () => void; compact?: boolean; className?: string }) {
  const label = on ? "Pause motion" : "Play motion"
  const icon = on ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5 translate-x-px" aria-hidden="true" />
  if (compact) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        className={cn("-my-1 grid size-9 place-items-center rounded-full border border-ivory-100/16 text-ivory-200/85 transition-colors active:bg-white/10", className)}
      >
        {icon}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-full border border-ivory-100/16 bg-carbon-950/30 pr-4 pl-1 text-ivory-200/85 transition-colors",
        "hover:border-ivory-100/40 hover:text-ivory-100",
        className
      )}
    >
      <span className="grid size-9 place-items-center rounded-full">{icon}</span>
      <span className="label-mono" aria-hidden="true">
        {on ? "Pause" : "Play"}
      </span>
    </button>
  )
}
