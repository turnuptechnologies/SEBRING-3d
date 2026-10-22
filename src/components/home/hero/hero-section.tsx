import fs from "node:fs"
import path from "node:path"

import { HeroPoster, type HeroPosterSources } from "@/components/home/hero/overlay/hero-poster"
import { HeroStage } from "@/components/home/hero/overlay/hero-stage"
import { products } from "@/lib/catalog"

/** The first three featured slot cars, in catalog order, take turns on the hero track. */
const HERO_CAR_COUNT = 3

/*
 * Poster stills rendered from the hero scene by the media pipeline. Checked on
 * disk (a predictable, prerender-safe read) so the hero falls back to the
 * designed CSS raceway until they exist.
 */
function posterSources(): HeroPosterSources | null {
  const has = (file: string) => fs.existsSync(path.join(process.cwd(), "public", "media", "hero", file))
  const desktop = has("poster.webp") ? "/media/hero/poster.webp" : null
  const mobile = has("poster-mobile.webp") ? "/media/hero/poster-mobile.webp" : null
  if (!desktop && !mobile) return null
  return { desktop: desktop ?? mobile!, mobile: mobile ?? desktop! }
}

/**
 * Home hero — the logo big enough not to miss, a car driving down a night
 * raceway into the foreground, and two direct routes into the shop plus a
 * one-click "Buy now" on whichever car is on track.
 */
export function HeroSection() {
  const cars = products.filter((p) => p.category === "slot-cars" && p.isFeatured && p.art.kind === "car").slice(0, HERO_CAR_COUNT)
  const sources = posterSources()
  return <HeroStage cars={cars} poster={<HeroPoster sources={sources} />} hasPoster={sources !== null} />
}
