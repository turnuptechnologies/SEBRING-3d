import type { PartArt } from "@/lib/catalog/types"
import type { BuildOptions } from "@/lib/three/build"

import { hashString, rng } from "./kit/rng"

/** Per-build settings shared by every trackside generator. */
export interface BuildContext {
  /** Segment multiplier: 1 for offline product renders, ~0.5 for realtime. */
  q: number
  realtime: boolean
  /** Deterministic random stream seeded from the art spec. */
  rand: () => number
}

export function createContext(art: PartArt, opts: BuildOptions): BuildContext {
  const realtime = opts.quality === "realtime"
  return {
    q: realtime ? 0.5 : 1,
    realtime,
    rand: rng(hashString(JSON.stringify(art))),
  }
}

/** Segment count scaled by quality, never below `min`. */
export const segs = (ctx: BuildContext, n: number, min = 6) => Math.max(min, Math.round(n * ctx.q))
