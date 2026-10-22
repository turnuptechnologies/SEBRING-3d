/**
 * Livery atlas: every painted surface of a car gets a rectangle in one canvas
 * at the same texel density, so stripes keep their width and roundels stay
 * round across body, greenhouse, caps and wings.
 *
 * Orientation (texture.flipY = false, so uv = px / size):
 *   loft  — x runs nose → tail, y runs s from −X flank bottom to +X flank bottom
 *   capF  — viewed from the front (+X on the right), y down
 *   capR  — viewed from behind (−X on the right), y down
 *   plain — x along a0 → a1, y along b0 → b1
 */

export type RegionKind = "loft" | "capF" | "capR" | "plain"

export interface RegionRequest {
  name: string
  kind: RegionKind
  a0: number
  a1: number
  b0: number
  b1: number
}

export class Region {
  constructor(
    readonly name: string,
    readonly kind: RegionKind,
    readonly a0: number,
    readonly a1: number,
    readonly b0: number,
    readonly b1: number,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
    readonly ppm: number,
    readonly size: number
  ) {}

  /** Physical → canvas pixels. */
  px(a: number, b: number): [number, number] {
    switch (this.kind) {
      case "loft":
        return [this.x + (this.a1 - a) * this.ppm, this.y + (b - this.b0) * this.ppm]
      case "capF":
        return [this.x + (a - this.a0) * this.ppm, this.y + (this.b1 - b) * this.ppm]
      case "capR":
        return [this.x + (this.a1 - a) * this.ppm, this.y + (this.b1 - b) * this.ppm]
      default:
        return [this.x + (a - this.a0) * this.ppm, this.y + (b - this.b0) * this.ppm]
    }
  }

  uv = (a: number, b: number): readonly [number, number] => {
    const [x, y] = this.px(a, b)
    return [x / this.size, y / this.size]
  }

  centreUv(): readonly [number, number] {
    return [(this.x + this.w / 2) / this.size, (this.y + this.h / 2) / this.size]
  }
}

export class Atlas {
  readonly regions = new Map<string, Region>()
  constructor(
    readonly size: number,
    readonly ppm: number
  ) {}

  get(name: string): Region {
    const r = this.regions.get(name)
    if (!r) throw new Error(`atlas region "${name}" missing`)
    return r
  }

  has(name: string) {
    return this.regions.has(name)
  }
}

function pack(reqs: RegionRequest[], ppm: number, size: number, pad: number): Region[] | null {
  const items = reqs
    .map((r) => ({ r, w: Math.ceil((r.a1 - r.a0) * ppm) + 1, h: Math.ceil((r.b1 - r.b0) * ppm) + 1 }))
    .sort((p, q) => q.h - p.h)
  const out: Region[] = []
  let x = pad
  let y = pad
  let shelf = 0
  for (const it of items) {
    if (it.w + pad * 2 > size) return null
    if (x + it.w + pad > size) {
      x = pad
      y += shelf + pad
      shelf = 0
    }
    if (y + it.h + pad > size) return null
    out.push(new Region(it.r.name, it.r.kind, it.r.a0, it.r.a1, it.r.b0, it.r.b1, x, y, it.w, it.h, ppm, size))
    x += it.w + pad
    shelf = Math.max(shelf, it.h)
  }
  return out
}

/** Finds the highest uniform density at which every region fits in a size × size canvas. */
export function layoutAtlas(reqs: RegionRequest[], size: number): Atlas {
  const pad = Math.max(4, Math.round(size / 256))
  let lo = 10
  let hi = 4000
  let best: Region[] | null = null
  let bestPpm = lo
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) / 2
    const res = pack(reqs, mid, size, pad)
    if (res) {
      best = res
      bestPpm = mid
      lo = mid
    } else hi = mid
  }
  if (!best) best = pack(reqs, lo, size, pad) ?? []
  const atlas = new Atlas(size, bestPpm)
  for (const r of best) atlas.regions.set(r.name, r)
  return atlas
}
