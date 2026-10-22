/**
 * Half cross-sections as rounded polygons.
 *
 * A half section runs from the bottom centre-line (x = 0) out along +X, up the
 * flank and back over the top to the top centre-line (x = 0). Each corner is
 * rounded with a quadratic-Bézier fillet whose `r` is the set-back distance
 * along both edges. The two centre-line corners are mirrored, so the section
 * stays tangent-continuous across the symmetry plane.
 *
 * Every corner and edge gets a FIXED number of samples, so a given vertex row
 * always lands on the same feature (shoulder crease, arch lip …) along the
 * whole loft — reflections run straight and the livery can address features.
 */

export interface Corner {
  x: number
  y: number
  /** Fillet set-back along each adjacent edge (clamped to fit). */
  r: number
}

export interface SectionLayout {
  /** Fillet segments per corner (centre-line corners use half). */
  fillets: number[]
  /** Interior samples per edge (edge e joins corner e and e + 1). */
  edges: number[]
}

export interface SectionFeatures {
  count: number
  /** [first, last] point index of each corner's fillet. */
  corner: Array<[number, number]>
  /** [first, last] interior point index of each edge (first > last when empty). */
  edge: Array<[number, number]>
}

const half = (n: number) => Math.max(1, Math.ceil(n / 2))

export function sectionFeatures(layout: SectionLayout): SectionFeatures {
  const n = layout.fillets.length
  const corner: Array<[number, number]> = []
  const edge: Array<[number, number]> = []
  let k = 0
  for (let i = 0; i < n; i++) {
    const segs = i === 0 || i === n - 1 ? half(layout.fillets[i]) : Math.max(1, layout.fillets[i])
    corner.push([k, k + segs])
    k += segs + 1
    if (i < n - 1) {
      const m = layout.edges[i] ?? 0
      edge.push([k, k + m - 1])
      k += m
    }
  }
  return { count: k, corner, edge }
}

/** Scales every sample count (for realtime vs. high quality). */
export function scaleLayout(layout: SectionLayout, k: number, min = 1): SectionLayout {
  return {
    fillets: layout.fillets.map((f) => Math.max(min, Math.round(f * k))),
    edges: layout.edges.map((e) => (e <= 0 ? 0 : Math.max(1, Math.round(e * k)))),
  }
}

const setA = new Float64Array(64)
const setB = new Float64Array(64)

/** Samples the half section into `out` as x,y pairs. Returns the number of points written. */
export function sampleHalf(c: readonly Corner[], layout: SectionLayout, out: Float64Array): number {
  const n = c.length
  for (let i = 0; i < n; i++) {
    const r = Math.max(0, c[i].r)
    setA[i] = r
    setB[i] = r
  }
  for (let e = 0; e < n - 1; e++) {
    const len = Math.hypot(c[e + 1].x - c[e].x, c[e + 1].y - c[e].y)
    const budget = len * 0.985
    const sum = setB[e] + setA[e + 1]
    if (sum > budget) {
      const k = sum > 0 ? budget / sum : 0
      setB[e] *= k
      setA[e + 1] *= k
    }
  }
  // Centre-line corners are symmetric: incoming set-back equals outgoing.
  setA[0] = setB[0]
  setB[n - 1] = setA[n - 1]

  let k = 0
  const put = (x: number, y: number) => {
    out[2 * k] = x
    out[2 * k + 1] = y
    k++
  }

  for (let i = 0; i < n; i++) {
    const cx = c[i].x
    const cy = c[i].y
    const prevX = i === 0 ? -c[1].x : c[i - 1].x
    const prevY = i === 0 ? c[1].y : c[i - 1].y
    const nextX = i === n - 1 ? -c[n - 2].x : c[i + 1].x
    const nextY = i === n - 1 ? c[n - 2].y : c[i + 1].y
    let dix = prevX - cx
    let diy = prevY - cy
    let dox = nextX - cx
    let doy = nextY - cy
    const li = Math.hypot(dix, diy)
    const lo = Math.hypot(dox, doy)
    if (li > 1e-12) {
      dix /= li
      diy /= li
    } else {
      dix = 0
      diy = 0
    }
    if (lo > 1e-12) {
      dox /= lo
      doy /= lo
    } else {
      dox = 0
      doy = 0
    }
    const a = setA[i]
    const b = setB[i]
    const t0x = cx + dix * a
    const t0y = cy + diy * a
    const t1x = cx + dox * b
    const t1y = cy + doy * b
    const segs = i === 0 || i === n - 1 ? half(layout.fillets[i]) : Math.max(1, layout.fillets[i])
    const tStart = i === 0 ? 0.5 : 0
    const tEnd = i === n - 1 ? 0.5 : 1
    for (let s = 0; s <= segs; s++) {
      const t = tStart + ((tEnd - tStart) * s) / segs
      const u = 1 - t
      let x = u * u * t0x + 2 * u * t * cx + t * t * t1x
      const y = u * u * t0y + 2 * u * t * cy + t * t * t1y
      if ((i === 0 && s === 0) || (i === n - 1 && s === segs)) x = 0
      put(x, y)
    }
    if (i < n - 1) {
      const m = layout.edges[i] ?? 0
      if (m > 0) {
        // Edge runs from this corner's outgoing tangent point to the next corner's incoming one.
        const nx = c[i + 1].x
        const ny = c[i + 1].y
        let ex = cx - nx
        let ey = cy - ny
        const el = Math.hypot(ex, ey)
        if (el > 1e-12) {
          ex /= el
          ey /= el
        }
        const a1 = i + 1 === n - 1 ? setA[n - 1] : setA[i + 1]
        const e1x = nx + ex * a1
        const e1y = ny + ey * a1
        for (let j = 1; j <= m; j++) {
          const t = j / (m + 1)
          put(t1x + (e1x - t1x) * t, t1y + (e1y - t1y) * t)
        }
      }
    }
  }
  return k
}

/**
 * Offsets a sampled half section inward along its 2-D normals (used to round
 * the loft's end caps). Clamped so thin sections never invert.
 */
export function insetHalf(pts: Float64Array, count: number, d: number) {
  if (d <= 0) return
  let minY = Infinity
  let maxY = -Infinity
  let maxX = 0
  for (let i = 0; i < count; i++) {
    maxX = Math.max(maxX, pts[2 * i])
    minY = Math.min(minY, pts[2 * i + 1])
    maxY = Math.max(maxY, pts[2 * i + 1])
  }
  const dd = Math.min(d, maxX * 0.45, (maxY - minY) * 0.45)
  if (dd <= 0) return
  const nx = new Float64Array(count)
  const ny = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    // Walk outward to the nearest distinct neighbours so collapsed runs get a sane normal.
    let a = i - 1
    while (a >= 0 && Math.hypot(pts[2 * a] - pts[2 * i], pts[2 * a + 1] - pts[2 * i + 1]) < 1e-7) a--
    let b = i + 1
    while (b < count && Math.hypot(pts[2 * b] - pts[2 * i], pts[2 * b + 1] - pts[2 * i + 1]) < 1e-7) b++
    const ax = a >= 0 ? pts[2 * a] : -pts[2 * (i + 1)]
    const ay = a >= 0 ? pts[2 * a + 1] : pts[2 * (i + 1) + 1]
    const bx = b < count ? pts[2 * b] : -pts[2 * (i - 1)]
    const by = b < count ? pts[2 * b + 1] : pts[2 * (i - 1) + 1]
    const tx = bx - ax
    const ty = by - ay
    const l = Math.hypot(tx, ty) || 1
    // Counter-clockwise traversal: outward normal is (ty, -tx).
    nx[i] = ty / l
    ny[i] = -tx / l
  }
  for (let i = 0; i < count; i++) {
    pts[2 * i] = Math.max(0, pts[2 * i] - nx[i] * dd)
    pts[2 * i + 1] -= ny[i] * dd
  }
  pts[0] = 0
  pts[2 * (count - 1)] = 0
}
