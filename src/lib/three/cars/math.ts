/** Small numeric helpers shared by the car generator. Lengths are real-car metres unless noted. */

export type Fn = (x: number) => number
export type Key = readonly [number, number]

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const saturate = (x: number) => clamp(x, 0, 1)

export function smoothstep(e0: number, e1: number, x: number) {
  const t = saturate((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Smooth bell: 1 at |x - c| = 0, 0 beyond `half`, C1 at both ends. */
export function bell(x: number, c: number, half: number) {
  const t = saturate(Math.abs(x - c) / half)
  const s = 1 - t * t
  return s * s
}

/** Plateau: 1 inside [a, b], easing to 0 over `ease` outside. */
export function plateau(x: number, a: number, b: number, ease: number) {
  return smoothstep(a - ease, a, x) * (1 - smoothstep(b, b + ease, x))
}

/** Polynomial smooth max (k = blend width). */
export function smax(a: number, b: number, k: number) {
  if (k <= 0) return Math.max(a, b)
  const h = saturate(0.5 + (0.5 * (a - b)) / k)
  return lerp(b, a, h) + k * h * (1 - h)
}

export function smin(a: number, b: number, k: number) {
  return -smax(-a, -b, k)
}

/**
 * Monotone cubic (Fritsch–Carlson / PCHIP) through the keys — no overshoot, so
 * body profiles never grow bumps between keys. Constant outside the key range.
 */
export function pchip(keys: readonly Key[]): Fn {
  const pts = [...keys].sort((a, b) => a[0] - b[0])
  const n = pts.length
  if (n === 0) return () => 0
  if (n === 1) return () => pts[0][1]
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const hi = Math.max(xs[i + 1] - xs[i], 1e-9)
    h.push(hi)
    d.push((ys[i + 1] - ys[i]) / hi)
  }
  const m = new Array<number>(n).fill(0)
  if (n === 2) {
    m[0] = d[0]
    m[1] = d[0]
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0
      else {
        const w1 = 2 * h[i] + h[i - 1]
        const w2 = h[i] + 2 * h[i - 1]
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
      }
    }
    const end = (h0: number, h1: number, d0: number, d1: number) => {
      let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
      if (Math.sign(s) !== Math.sign(d0)) s = 0
      else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > Math.abs(3 * d0)) s = 3 * d0
      return s
    }
    m[0] = end(h[0], h[1], d[0], d[1])
    m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3])
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (xs[mid] > x) hi = mid
      else lo = mid
    }
    const hh = h[lo]
    const t = (x - xs[lo]) / hh
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * hh * m[lo] +
      (-2 * t3 + 3 * t2) * ys[lo + 1] +
      (t3 - t2) * hh * m[lo + 1]
    )
  }
}

/** Uniform Catmull–Rom through keys (smoother than PCHIP, may overshoot). */
export function catmull(keys: readonly Key[]): Fn {
  const pts = [...keys].sort((a, b) => a[0] - b[0])
  const n = pts.length
  if (n < 3) return pchip(pts)
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1]
    if (x >= pts[n - 1][0]) return pts[n - 1][1]
    let i = 0
    while (i < n - 2 && pts[i + 1][0] < x) i++
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    const hh = p2[0] - p1[0]
    const t = (x - p1[0]) / hh
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * hh
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * hh
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2
  }
}

/** Deterministic PRNG (mulberry32). */
export function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Sorted, de-duplicated station list (keeps points closer than `eps` apart only once). */
export function uniqueSorted(values: number[], eps = 1e-5) {
  const v = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const x of v) if (!out.length || x - out[out.length - 1] > eps) out.push(x)
  return out
}

export function range(a: number, b: number, step: number) {
  const n = Math.max(1, Math.round((b - a) / step))
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
}
