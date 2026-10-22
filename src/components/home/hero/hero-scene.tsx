"use client"

import type { CarArt } from "@/lib/catalog/types"

import { HeroCanvas } from "./scene/hero-canvas"

export interface HeroSceneProps {
  cars: CarArt[]
  className?: string
  /** Fires as each car begins its approach (index into `cars`). */
  onActiveCarChange?: (index: number) => void
  paused?: boolean
  quality?: "auto" | "low" | "high"
  /** Optional: fires once the first frames are on screen (the canvas then fades in over the poster). */
  onReady?: () => void
}

/**
 * Realtime night-raceway hero: slot cars burst out of the fog on lane 2 and run
 * into the foreground, one after another. Client-only — import it with
 * `next/dynamic(() => import(...), { ssr: false })`.
 *
 * Fills its positioned parent (absolute inset-0) and starts transparent, then
 * fades in once shaders are compiled, so a poster image behind it covers LCP.
 * Renders nothing while offscreen or hidden; honours prefers-reduced-motion
 * with a single composed still; adapts DPR / post-processing to the frame rate.
 */
export function HeroScene({ cars, className, onActiveCarChange, paused, quality = "auto", onReady }: HeroSceneProps) {
  return (
    <HeroCanvas
      cars={cars}
      className={className}
      onActiveCarChange={onActiveCarChange}
      paused={paused}
      quality={quality}
      onReady={onReady}
    />
  )
}
