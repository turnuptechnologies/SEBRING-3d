"use client"

import { animate, createDrawable, createMotionPath } from "animejs"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/** Top-down outline of the Sebring raceway (illustrative). */
const TRACK =
  "M150 420 C 90 420 60 370 70 320 C 82 262 140 250 190 258 L 470 300 C 540 312 590 290 610 240 C 632 186 600 120 540 110 L 330 82 C 250 72 210 120 230 170 C 246 210 300 220 360 214 L 700 180 C 790 172 850 220 850 300 C 850 380 790 420 720 420 Z"

const LANES = [
  { color: "var(--color-volt)", duration: 7400, delay: 0 },
  { color: "var(--color-signal)", duration: 7900, delay: 600 },
  { color: "var(--color-chrome)", duration: 8300, delay: 1300 },
]

/** Animated track map: the circuit draws in, then cars lap it along the racing line. */
export function TrackMap({ className, showTimer = true }: { className?: string; showTimer?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [lap, setLap] = useState("0:07.412")

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const path = svg.querySelector<SVGPathElement>("#racing-line")
    if (!path || reduce) return
    const anims: Array<{ revert: () => unknown }> = []
    let timer = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        anims.push(animate(createDrawable(svg.querySelectorAll("[data-draw]")), { draw: ["0 0", "0 1"], duration: 1800, ease: "inOutQuart" }))
        svg.querySelectorAll<SVGGElement>("[data-car]").forEach((car, i) => {
          const lane = LANES[i]
          anims.push(animate(car, { ...createMotionPath(path), duration: lane.duration, delay: 1200 + lane.delay, loop: true, ease: "linear" }))
          car.style.opacity = "1"
        })
        const t0 = performance.now()
        timer = window.setInterval(() => {
          const s = ((performance.now() - t0) % 7400) / 1000
          setLap(`0:${s.toFixed(3).padStart(6, "0")}`)
        }, 53)
      },
      { threshold: 0.3 }
    )
    io.observe(svg)
    return () => {
      io.disconnect()
      window.clearInterval(timer)
      anims.forEach((a) => a.revert())
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      <svg ref={svgRef} viewBox="0 0 920 480" className="h-auto w-full" role="img" aria-label="Map of the Sebring raceway circuit">
        <defs>
          <filter id="car-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={TRACK} data-draw fill="none" stroke="rgb(243 239 230 / 0.07)" strokeWidth="46" strokeLinejoin="round" />
        <path d={TRACK} data-draw fill="none" stroke="rgb(243 239 230 / 0.35)" strokeWidth="1.2" strokeDasharray="2 10" />
        <path id="racing-line" d={TRACK} data-draw fill="none" stroke="rgb(243 239 230 / 0.85)" strokeWidth="1.6" />
        {/* start / finish */}
        <g transform="translate(150 398)">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={(i % 2) * 6} y={Math.floor(i / 2) * 6 - 6} width="6" height="6" fill={i % 3 === 0 ? "#f3efe6" : "#0b0b0f"} />
          ))}
        </g>
        <text x="150" y="458" className="fill-smoke-500 font-mono text-[11px] tracking-[0.2em]">START / FINISH</text>
        <text x="610" y="160" className="fill-smoke-500 font-mono text-[11px] tracking-[0.2em]">BACK STRAIGHT</text>
        {LANES.map((lane, i) => (
          <g key={i} data-car style={{ opacity: 0 }} filter="url(#car-glow)">
            <rect x="-9" y="-4" width="18" height="8" rx="3" fill={lane.color} />
          </g>
        ))}
      </svg>
      {showTimer && (
        <div className="absolute top-3 right-3 rounded-sm border border-hairline bg-carbon-900/80 px-3 py-2 backdrop-blur-md">
          <p className="label-mono text-[0.5625rem] text-muted-foreground">Lap · lane 1</p>
          <p className="mt-1 font-mono text-lg text-volt tabular" aria-hidden="true">
            {lap}
          </p>
        </div>
      )}
    </div>
  )
}
