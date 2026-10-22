"use client"

import { PerformanceMonitor } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react"
import * as THREE from "three"

import type { CarArt } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

import { HeroDirector } from "./director"
import { createFocusState, type FocusState, HeroPost } from "./post"

export type HeroQuality = "auto" | "low" | "high"

export interface HeroCanvasProps {
  cars: CarArt[]
  className?: string
  onActiveCarChange?: (index: number) => void
  paused?: boolean
  quality?: HeroQuality
  /** Fires once shaders are compiled and the first frames are on screen. */
  onReady?: () => void
  /** Lab / capture: freeze the timeline at this time in seconds. */
  fixedTime?: number | null
  /** Deterministic poster frame: first car at its hero moment, steady camera. */
  poster?: boolean
  /** Lab: force a device pixel ratio. */
  dpr?: number
  /** Lab: access to the scene director (time control, diagnostics). */
  directorRef?: RefObject<HeroDirector | null>
  /** Lab: disable post-processing entirely. */
  post?: boolean
  /** Lab: override MSAA sample count of the composer. */
  msaa?: number
  /** Lab: force a quality tier (0–3) and/or the moon shadow. */
  forceTier?: number
  forceShadows?: boolean
}

/** Per-tier render settings: 0 = full, 3 = survival mode. */
const TIERS = [
  { dpr: 1.5, msaa: 4 },
  { dpr: 1.25, msaa: 4 },
  { dpr: 1, msaa: 0 },
  { dpr: 0.75, msaa: 0 },
] as const

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatch(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [query])
  return match
}

function initialTier(quality: HeroQuality): number {
  if (quality === "high") return 0
  if (quality === "low") return 2
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  return coarse ? 1 : 0
}

export function HeroCanvas({
  cars,
  className,
  onActiveCarChange,
  paused = false,
  quality = "auto",
  onReady,
  fixedTime = null,
  poster = false,
  dpr,
  directorRef,
  post = true,
  msaa,
  forceTier,
  forceShadows,
}: HeroCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const [ready, setReady] = useState(false)
  const [lost, setLost] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0)
  const [tier, setTier] = useState(() => forceTier ?? initialTier(quality))
  const [focus] = useState(createFocusState)
  // Decided once per canvas: toggling either would recompile every material.
  const [mount] = useState(() => {
    const t = forceTier ?? initialTier(quality)
    return { shadows: forceShadows ?? false, mist: quality === "low" ? 0 : t === 0 ? 520 : 340 }
  })

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden)
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  const still = poster || reducedMotion || fixedTime !== null
  const running = !paused && inView && pageVisible && !lost
  const frameloop = running && !still ? "always" : "demand"
  const tierCfg = TIERS[Math.min(tier, TIERS.length - 1)]
  const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const canvasDpr = dpr ?? Math.min(deviceDpr, tierCfg.dpr)
  const adaptive = quality === "auto" && !still && dpr === undefined && forceTier === undefined

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity: ready && !lost ? 1 : 0, transition: "opacity 1100ms cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <Canvas
        key={canvasKey}
        frameloop={frameloop}
        dpr={canvasDpr}
        shadows={mount.shadows ? { type: THREE.PCFShadowMap } : false}
        camera={{ fov: 35, near: 0.02, far: 900, position: [0, 0.27, 0] }}
        gl={{ antialias: false, alpha: false, stencil: false, depth: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 1)
          gl.toneMappingExposure = 1
          const canvas = gl.domElement
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault()
            setLost(true)
          })
          canvas.addEventListener("webglcontextrestored", () => {
            setLost(false)
            setReady(false)
            setCanvasKey((k) => k + 1)
          })
        }}
      >
        <HeroStage
          cars={cars}
          onActiveCarChange={onActiveCarChange}
          fixedTime={fixedTime}
          poster={poster || reducedMotion}
          tier={tier}
          shadows={mount.shadows}
          mist={mount.mist}
          pointer={!still}
          directorRef={directorRef}
          focus={focus}
          onReady={() => {
            setReady(true)
            onReady?.()
          }}
        />
        {adaptive ? (
          <PerformanceMonitor
            ms={300}
            iterations={8}
            threshold={0.7}
            flipflops={4}
            bounds={(refresh) => (refresh > 90 ? [58, 88] : [45, 57])}
            onDecline={() => setTier((t) => Math.min(TIERS.length - 1, t + 1))}
            onIncline={() => setTier((t) => Math.max(0, t - 1))}
            onFallback={() => setTier(TIERS.length - 1)}
          />
        ) : null}
        {post ? <HeroPost tier={tier} multisampling={msaa ?? tierCfg.msaa} focus={focus} /> : null}
      </Canvas>
    </div>
  )
}

interface HeroStageProps {
  cars: CarArt[]
  onActiveCarChange?: (index: number) => void
  fixedTime: number | null
  poster: boolean
  tier: number
  shadows: boolean
  mist: number
  pointer: boolean
  onReady: () => void
  directorRef?: RefObject<HeroDirector | null>
  focus: FocusState
}

function HeroStage({ cars, onActiveCarChange, fixedTime, poster, tier, shadows, mist, pointer, onReady, directorRef, focus }: HeroStageProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const invalidate = useThree((s) => s.invalidate)
  const local = useRef<HeroDirector | null>(null)
  const callbacks = useRef({ onActiveCarChange, onReady })
  const initialCars = useRef(cars)

  useLayoutEffect(() => {
    callbacks.current = { onActiveCarChange, onReady }
  })

  useLayoutEffect(() => {
    const director = new HeroDirector({ renderer: gl, scene, camera, shadows, mist, focus })
    director.onActiveCarChange = (i) => callbacks.current.onActiveCarChange?.(i)
    director.setCars(initialCars.current)
    scene.add(director.root)
    local.current = director
    if (directorRef) directorRef.current = director
    director.update(0)

    let cancelled = false
    let raf = 0
    const finish = () => {
      if (cancelled) return
      invalidate()
      // Two frames on screen before we reveal the canvas.
      raf = requestAnimationFrame(() => {
        invalidate()
        raf = requestAnimationFrame(() => !cancelled && callbacks.current.onReady())
      })
    }
    gl.compileAsync(scene, camera).then(finish, finish)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (directorRef?.current === director) directorRef.current = null
      local.current = null
      director.dispose()
    }
  }, [gl, scene, camera, shadows, mist, invalidate, directorRef, focus])

  useEffect(() => {
    local.current?.setCars(cars)
    invalidate()
  }, [cars, invalidate])

  useEffect(() => {
    const d = local.current
    if (!d) return
    d.steady = poster
    d.fixedTime = poster && fixedTime === null ? d.heroTime(0) : fixedTime
    invalidate()
  }, [fixedTime, poster, invalidate])

  useEffect(() => {
    local.current?.setTier(tier)
  }, [tier])

  useEffect(() => {
    if (!pointer || !window.matchMedia("(pointer: fine)").matches) return
    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      local.current?.setPointer(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1))
    }
    const onLeave = () => local.current?.setPointer(0, 0)
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [pointer, gl])

  useFrame((_, delta) => {
    local.current?.update(delta)
  })

  return null
}
