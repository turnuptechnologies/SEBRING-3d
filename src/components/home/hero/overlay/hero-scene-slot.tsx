"use client"

import dynamic from "next/dynamic"

/**
 * The realtime WebGL scene — client-only and code-split, so three.js never
 * blocks the first paint. It mounts transparent and fades itself in over the
 * poster once its shaders are compiled; until then the poster is the hero.
 */
export const HeroSceneSlot = dynamic(() => import("@/components/home/hero/hero-scene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
})
