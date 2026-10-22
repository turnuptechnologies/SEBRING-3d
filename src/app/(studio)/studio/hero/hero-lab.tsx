"use client"

import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import type { HeroDirector } from "@/components/home/hero/scene/director"
import type { HeroQuality } from "@/components/home/hero/scene/hero-canvas"

import { LAB_CARS } from "./lab-cars"

const HeroCanvas = dynamic(() => import("@/components/home/hero/scene/hero-canvas").then((m) => m.HeroCanvas), { ssr: false })

declare global {
  interface Window {
    __HERO_LAB__?: {
      ready: boolean
      activeCar: number
      setTime: (t: number | null) => void
      time: () => number
      period: () => number
      heroTime: (run?: number) => number
      frames: () => number
    }
  }
}

/**
 * Hero lab — renders the realtime hero full-screen for tuning and capture.
 *   /studio/hero                      live loop
 *   /studio/hero?t=3.2                frozen at t = 3.2 s (window.__HERO_LAB__.setTime(t) to scrub)
 *   /studio/hero?poster=1             deterministic poster frame
 *   /studio/hero?w=1440&h=900         fixed CSS size (otherwise fills the window)
 *   /studio/hero?overlay=1            mock wordmark / CTA overlay to judge composition
 *   /studio/hero?quality=low&dpr=1    force quality tier / pixel ratio
 */
export function HeroLab() {
  const params = useSearchParams()
  const w = params.get("w")
  const h = params.get("h")
  const t = params.get("t")
  const poster = params.get("poster") === "1"
  const overlay = params.get("overlay") === "1"
  const hud = params.get("hud") === "1"
  const quality = (params.get("quality") ?? "auto") as HeroQuality
  const dprParam = params.get("dpr")
  const startCar = Number(params.get("car") ?? 0)
  const post = params.get("post") !== "0"
  const msaa = params.get("msaa")
  const tierParam = params.get("tier")
  const shadowsParam = params.get("shadows")

  const cars = useMemo(() => {
    const list = LAB_CARS.map((c) => c.art)
    const k = ((startCar % list.length) + list.length) % list.length
    return [...list.slice(k), ...list.slice(0, k)]
  }, [startCar])
  const names = useMemo(() => {
    const list = LAB_CARS.map((c) => c.name)
    const k = ((startCar % list.length) + list.length) % list.length
    return [...list.slice(k), ...list.slice(0, k)]
  }, [startCar])

  const directorRef = useRef<HeroDirector | null>(null)
  const [fixedTime, setFixedTime] = useState<number | null>(t !== null ? Number(t) : null)
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const frames = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      frames.current++
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    window.__HERO_LAB__ = {
      ready,
      activeCar: active,
      setTime: (v) => setFixedTime(v),
      time: () => directorRef.current?.now ?? 0,
      period: () => directorRef.current?.timeline.period ?? 0,
      heroTime: (run = 0) => directorRef.current?.heroTime(run) ?? 0,
      frames: () => frames.current,
    }
    if (ready) document.body.dataset.heroReady = "1"
  }, [ready, active])

  const hide = params.get("hide")
  useEffect(() => {
    if (ready && hide) directorRef.current?.debugHide(hide.split(","))
  }, [ready, hide])

  const size = w && h ? { width: Number(w), height: Number(h) } : { width: "100vw", height: "100svh" }

  return (
    <div id="hero-lab" className="relative overflow-hidden bg-carbon-950" style={size}>
      <HeroCanvas
        cars={cars}
        quality={quality}
        poster={poster}
        fixedTime={fixedTime}
        dpr={dprParam ? Number(dprParam) : undefined}
        directorRef={directorRef}
        post={post}
        msaa={msaa !== null ? Number(msaa) : undefined}
        forceTier={tierParam !== null ? Number(tierParam) : undefined}
        forceShadows={shadowsParam !== null ? shadowsParam === "1" : undefined}
        onActiveCarChange={setActive}
        onReady={() => setReady(true)}
      />
      {overlay ? <MockOverlay name={names[active] ?? ""} /> : null}
      {hud ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-ivory-100">
          car {active} · {names[active]} · {ready ? "ready" : "loading"}
        </div>
      ) : null}
    </div>
  )
}

/** Stand-in for the real DOM overlay, only to judge composition in the lab. */
function MockOverlay({ name }: { name: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center px-4 pt-[18svh] text-center">
      <p className="font-mono text-eyebrow uppercase text-smoke-300">Slot cars &amp; raceways · Est. 1987</p>
      <h1 className="mt-4 font-display text-hero font-black italic uppercase text-ivory-100 [font-stretch:115%]">Sebring</h1>
      <div className="mt-8 flex gap-3">
        <span className="rounded-full bg-volt px-5 py-3 text-sm font-semibold text-carbon-900">Shop slot cars</span>
        <span className="rounded-full border border-ivory-100/30 px-5 py-3 text-sm font-semibold text-ivory-100">Book the raceway</span>
      </div>
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.2em] text-smoke-300">
        Now on track: <span className="text-ivory-100">{name}</span> — <span className="text-volt">Buy now</span>
      </p>
    </div>
  )
}
