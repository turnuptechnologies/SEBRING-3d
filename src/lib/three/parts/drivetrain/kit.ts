import * as THREE from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

import type { ProductView } from "@/lib/catalog/types"
import type { ViewAngle } from "@/lib/three/framing"

/**
 * Geometry toolkit for the drivetrain generators. Everything is modelled in
 * real millimetres and baked to world units (1 unit = 150 mm) by `finalize`.
 */

export const MM = 1 / 150

export type V2 = [number, number]
export type ViewOverrides = Partial<Record<ProductView, Partial<ViewAngle>>>

export const TAU = Math.PI * 2
export const deg = (d: number) => (d * Math.PI) / 180
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => t * t * (3 - 2 * t)

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------------- */
/* 2D profiles                                                                */
/* ------------------------------------------------------------------------- */

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps: number): V2[] {
  const out: V2[] = []
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

/**
 * Replaces polyline corners with tangent circular arcs. `radius` may be a
 * number, a per-vertex array or a callback (index, turn angle) → radius.
 * Open polylines keep their end points.
 */
export function fillet(
  pts: V2[],
  radius: number | number[] | ((i: number, turn: number) => number),
  opts: { closed?: boolean; seg?: number } = {}
): V2[] {
  const { closed = false, seg = 6 } = opts
  const n = pts.length
  const out: V2[] = []
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    if (!closed && (i === 0 || i === n - 1)) {
      out.push([p[0], p[1]])
      continue
    }
    const a = pts[(i - 1 + n) % n]
    const b = pts[(i + 1) % n]
    const ux = a[0] - p[0]
    const uy = a[1] - p[1]
    const vx = b[0] - p[0]
    const vy = b[1] - p[1]
    const lu = Math.hypot(ux, uy)
    const lv = Math.hypot(vx, vy)
    if (lu < 1e-9 || lv < 1e-9) {
      out.push([p[0], p[1]])
      continue
    }
    const nux = ux / lu
    const nuy = uy / lu
    const nvx = vx / lv
    const nvy = vy / lv
    const inner = Math.acos(clamp(nux * nvx + nuy * nvy, -1, 1))
    const turn = Math.PI - inner
    const r = typeof radius === "number" ? radius : Array.isArray(radius) ? (radius[i] ?? 0) : radius(i, turn)
    if (r <= 0 || turn < 1e-3 || inner < 1e-3) {
      out.push([p[0], p[1]])
      continue
    }
    const half = inner / 2
    let t = r / Math.tan(half)
    let rr = r
    const limU = !closed && i - 1 === 0 ? lu : lu / 2
    const limV = !closed && i + 1 === n - 1 ? lv : lv / 2
    const tmax = Math.min(limU, limV)
    if (t > tmax) {
      t = tmax
      rr = t * Math.tan(half)
    }
    const p1x = p[0] + nux * t
    const p1y = p[1] + nuy * t
    const p2x = p[0] + nvx * t
    const p2y = p[1] + nvy * t
    const bx = nux + nvx
    const by = nuy + nvy
    const bl = Math.hypot(bx, by) || 1
    const dc = rr / Math.sin(half)
    const cx = p[0] + (bx / bl) * dc
    const cy = p[1] + (by / bl) * dc
    const a0 = Math.atan2(p1y - cy, p1x - cx)
    let da = Math.atan2(p2y - cy, p2x - cx) - a0
    while (da > Math.PI) da -= TAU
    while (da < -Math.PI) da += TAU
    const steps = Math.max(1, Math.ceil((Math.abs(da) / (Math.PI / 2)) * seg))
    for (let s = 0; s <= steps; s++) {
      const aa = a0 + (da * s) / steps
      out.push([cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr])
    }
  }
  return out
}

/** Signed area of a closed polygon (positive = counter-clockwise). */
export function signedArea(pts: V2[]) {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

export const ccw = (pts: V2[]) => (signedArea(pts) < 0 ? [...pts].reverse() : pts)

/** Rounded rectangle outline centred on the origin, counter-clockwise. */
export function roundedRect(w: number, h: number, r: number, seg = 6): V2[] {
  const x = w / 2
  const y = h / 2
  return fillet(
    [
      [-x, -y],
      [x, -y],
      [x, y],
      [-x, y],
    ],
    Math.min(r, x - 1e-4, y - 1e-4),
    { closed: true, seg }
  )
}

export function circle(r: number, n: number, cx = 0, cy = 0, a0 = 0): V2[] {
  const out: V2[] = []
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

export function toShape(outline: V2[], holes: V2[][] = []): THREE.Shape {
  const shape = new THREE.Shape(ccw(outline).map(([x, y]) => new THREE.Vector2(x, y)))
  for (const h of holes) {
    const hole = ccw(h).reverse()
    shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))))
  }
  return shape
}

/* ------------------------------------------------------------------------- */
/* Normals                                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Area-weighted normals that stay smooth across edges flatter than `angleDeg`
 * and crease across sharper ones. Returns a non-indexed geometry.
 */
export function creaseNormals(geometry: THREE.BufferGeometry, angleDeg = 32, quant = 1e-4): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  if (g !== geometry) geometry.dispose()
  const pos = g.attributes.position.array as ArrayLike<number>
  const count = g.attributes.position.count
  const faces = count / 3
  const fn = new Float64Array(faces * 3)
  for (let f = 0; f < faces; f++) {
    const o = f * 9
    const e1x = pos[o + 3] - pos[o]
    const e1y = pos[o + 4] - pos[o + 1]
    const e1z = pos[o + 5] - pos[o + 2]
    const e2x = pos[o + 6] - pos[o]
    const e2y = pos[o + 7] - pos[o + 1]
    const e2z = pos[o + 8] - pos[o + 2]
    fn[f * 3] = e1y * e2z - e1z * e2y
    fn[f * 3 + 1] = e1z * e2x - e1x * e2z
    fn[f * 3 + 2] = e1x * e2y - e1y * e2x
  }
  const key = (i: number) =>
    `${Math.round(pos[i * 3] / quant)},${Math.round(pos[i * 3 + 1] / quant)},${Math.round(pos[i * 3 + 2] / quant)}`
  const buckets = new Map<string, number[]>()
  const keys: string[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const k = key(i)
    keys[i] = k
    const b = buckets.get(k)
    if (b) b.push(Math.floor(i / 3))
    else buckets.set(k, [Math.floor(i / 3)])
  }
  const cos = Math.cos(deg(angleDeg))
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const f = Math.floor(i / 3)
    const ax = fn[f * 3]
    const ay = fn[f * 3 + 1]
    const az = fn[f * 3 + 2]
    const al = Math.hypot(ax, ay, az) || 1
    let sx = 0
    let sy = 0
    let sz = 0
    for (const o of buckets.get(keys[i]) ?? []) {
      const bx = fn[o * 3]
      const by = fn[o * 3 + 1]
      const bz = fn[o * 3 + 2]
      const bl = Math.hypot(bx, by, bz) || 1
      if ((ax * bx + ay * by + az * bz) / (al * bl) >= cos) {
        sx += bx
        sy += by
        sz += bz
      }
    }
    const l = Math.hypot(sx, sy, sz) || 1
    out[i * 3] = sx / l
    out[i * 3 + 1] = sy / l
    out[i * 3 + 2] = sz / l
  }
  g.setAttribute("normal", new THREE.BufferAttribute(out, 3))
  return g
}

/* ------------------------------------------------------------------------- */
/* Lathe                                                                      */
/* ------------------------------------------------------------------------- */

interface Row {
  a: number
  b: number
  na: number
  nb: number
  v: number
}

function profileRows(pts: V2[], crease: number) {
  const n = pts.length
  const segN: V2[] = []
  const segL: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const da = pts[i + 1][0] - pts[i][0]
    const db = pts[i + 1][1] - pts[i][1]
    const l = Math.hypot(da, db) || 1
    segN.push([db / l, -da / l])
    segL.push(l)
  }
  const cosC = Math.cos(deg(crease))
  const rows: Row[] = []
  const start: number[] = []
  const end: number[] = []
  let v = 0
  for (let i = 0; i < n; i++) {
    const [a, b] = pts[i]
    const prev = i > 0 ? segN[i - 1] : null
    const next = i < n - 1 ? segN[i] : null
    if (prev && next) {
      if (prev[0] * next[0] + prev[1] * next[1] < cosC) {
        rows.push({ a, b, na: prev[0], nb: prev[1], v })
        end[i - 1] = rows.length - 1
        rows.push({ a, b, na: next[0], nb: next[1], v })
        start[i] = rows.length - 1
      } else {
        const sa = prev[0] + next[0]
        const sb = prev[1] + next[1]
        const l = Math.hypot(sa, sb) || 1
        rows.push({ a, b, na: sa / l, nb: sb / l, v })
        end[i - 1] = rows.length - 1
        start[i] = rows.length - 1
      }
    } else if (next) {
      rows.push({ a, b, na: next[0], nb: next[1], v })
      start[i] = rows.length - 1
    } else if (prev) {
      rows.push({ a, b, na: prev[0], nb: prev[1], v })
      end[i - 1] = rows.length - 1
    }
    if (i < n - 1) v += segL[i]
  }
  return { rows, start, end, segments: n - 1 }
}

function dedupe(profile: V2[]): V2[] {
  const pts: V2[] = []
  for (const p of profile) {
    const q = pts[pts.length - 1]
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7) pts.push([p[0], p[1]])
  }
  return pts
}

export interface LatheOptions {
  seg?: number
  /** Profile corners sharper than this (degrees) become hard edges. */
  crease?: number
  phi0?: number
  phiLen?: number
  /** Circumference in UV units (default: outer circumference in mm, rounded). */
  uSpan?: number
  /** V at the first profile point (V then grows with arc length, in mm). */
  v0?: number
}

/**
 * Revolves a [radius, y] profile around +Y. Walk the profile counter-clockwise
 * (radius → right, y → up) so normals face outward. x = r·sinφ, z = r·cosφ.
 */
export function lathe(profile: V2[], opts: LatheOptions = {}): THREE.BufferGeometry {
  const { seg = 96, crease = 38, phi0 = 0, phiLen = TAU, v0 = 0 } = opts
  const pts = dedupe(profile)
  const { rows, start, end, segments } = profileRows(pts, crease)
  const rMax = Math.max(...pts.map((p) => p[0]))
  const uSpan = opts.uSpan ?? Math.max(1, Math.round(TAU * rMax))
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  for (const row of rows) {
    for (let j = 0; j <= seg; j++) {
      const phi = phi0 + (j / seg) * phiLen
      const s = Math.sin(phi)
      const c = Math.cos(phi)
      pos.push(row.a * s, row.b, row.a * c)
      nor.push(row.na * s, row.nb, row.na * c)
      uv.push((j / seg) * uSpan * (phiLen / TAU), row.v + v0)
    }
  }
  const idx: number[] = []
  const w = seg + 1
  for (let i = 0; i < segments; i++) {
    const a = start[i]
    const b = end[i]
    for (let j = 0; j < seg; j++) {
      const i00 = a * w + j
      const i01 = a * w + j + 1
      const i10 = b * w + j
      const i11 = b * w + j + 1
      idx.push(i00, i01, i10, i01, i11, i10)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/* ------------------------------------------------------------------------- */
/* Loft: closed outline swept along Z with per-ring offsets                   */
/* ------------------------------------------------------------------------- */

export interface Ring {
  /** Outline offset (mm, + outward). */
  o: number
  z: number
}

export interface LoftHole {
  /** Arc-length range along the outline. */
  s0: number
  s1: number
  z0: number
  z1: number
  depth: number
}

export interface LoftOptions {
  crease?: number
  capStart?: boolean
  capEnd?: boolean
  holes?: LoftHole[]
}

function outlineFrame(outline: V2[]) {
  const n = outline.length
  const s: number[] = [0]
  for (let i = 1; i <= n; i++) {
    const a = outline[i - 1]
    const b = outline[i % n]
    s.push(s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const normals: V2[] = []
  const miter: number[] = []
  for (let i = 0; i < n; i++) {
    const p = outline[(i - 1 + n) % n]
    const c = outline[i]
    const q = outline[(i + 1) % n]
    const e0x = c[0] - p[0]
    const e0y = c[1] - p[1]
    const e1x = q[0] - c[0]
    const e1y = q[1] - c[1]
    const l0 = Math.hypot(e0x, e0y) || 1
    const l1 = Math.hypot(e1x, e1y) || 1
    const n0: V2 = [e0y / l0, -e0x / l0]
    const n1: V2 = [e1y / l1, -e1x / l1]
    const sx = n0[0] + n1[0]
    const sy = n0[1] + n1[1]
    const l = Math.hypot(sx, sy) || 1
    const nn: V2 = [sx / l, sy / l]
    normals.push(nn)
    miter.push(1 / clamp(nn[0] * n0[0] + nn[1] * n0[1], 0.5, 1))
  }
  return { s, normals, miter, length: s[n] }
}

/** Inserts outline vertices at the given arc lengths (for hole boundaries). */
export function splitOutline(outline: V2[], cuts: number[]): V2[] {
  if (!cuts.length) return outline
  const n = outline.length
  const { s } = outlineFrame(outline)
  const sorted = [...cuts].sort((a, b) => a - b)
  const out: V2[] = []
  let k = 0
  for (let i = 0; i < n; i++) {
    out.push(outline[i])
    const a = outline[i]
    const b = outline[(i + 1) % n]
    while (k < sorted.length && sorted[k] < s[i + 1] - 1e-6) {
      const c = sorted[k]
      if (c > s[i] + 1e-6) {
        const t = (c - s[i]) / (s[i + 1] - s[i])
        out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)])
      }
      k++
    }
  }
  return out
}

/**
 * Sweeps a closed, smooth, counter-clockwise outline (XY) along +Z through
 * `rings`; each ring offsets the outline. Optional caps and rectangular wall
 * holes (in outline arc-length × z) with inward walls of `depth`.
 */
export function loft(outlineIn: V2[], rings: Ring[], opts: LoftOptions = {}): THREE.BufferGeometry {
  const { crease = 38, capStart = false, capEnd = false, holes = [] } = opts
  const outline = splitOutline(
    ccw(outlineIn),
    holes.flatMap((h) => [h.s0, h.s1])
  )
  const n = outline.length
  const frame = outlineFrame(outline)
  const ringPts: V2[] = rings.map((r) => [r.o, r.z])
  const { rows, start, end, segments } = profileRows(ringPts, crease)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const w = n + 1
  for (const row of rows) {
    for (let j = 0; j <= n; j++) {
      const p = outline[j % n]
      const nn = frame.normals[j % n]
      const m = frame.miter[j % n]
      pos.push(p[0] + nn[0] * row.a * m, p[1] + nn[1] * row.a * m, row.b)
      const nx = nn[0] * row.na
      const ny = nn[1] * row.na
      const nz = row.nb
      const l = Math.hypot(nx, ny, nz) || 1
      nor.push(nx / l, ny / l, nz / l)
      uv.push(frame.s[j], row.b)
    }
  }
  const inHole = (sMid: number, zMid: number) => holes.some((h) => sMid > h.s0 && sMid < h.s1 && zMid > h.z0 && zMid < h.z1)
  for (let i = 0; i < segments; i++) {
    const a = start[i]
    const b = end[i]
    const zMid = (rows[a].b + rows[b].b) / 2
    for (let j = 0; j < n; j++) {
      if (holes.length && inHole((frame.s[j] + frame.s[j + 1]) / 2, zMid)) continue
      const i00 = a * w + j
      const i01 = a * w + j + 1
      const i10 = b * w + j
      const i11 = b * w + j + 1
      idx.push(i00, i01, i10, i01, i11, i10)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)

  const parts: THREE.BufferGeometry[] = [g]
  const ringAt = (z: number) => rings.reduce((best, r) => (Math.abs(r.z - z) < Math.abs(best.z - z) ? r : best), rings[0])
  const point = (sArc: number, z: number, extra: number): THREE.Vector3 => {
    let j = 0
    while (j < n - 1 && frame.s[j + 1] < sArc) j++
    const t = clamp((sArc - frame.s[j]) / Math.max(frame.s[j + 1] - frame.s[j], 1e-9), 0, 1)
    const p0 = outline[j]
    const p1 = outline[(j + 1) % n]
    const n0 = frame.normals[j]
    const n1 = frame.normals[(j + 1) % n]
    const nx = lerp(n0[0], n1[0], t)
    const ny = lerp(n0[1], n1[1], t)
    const l = Math.hypot(nx, ny) || 1
    const o = ringAt(z).o + extra
    return new THREE.Vector3(lerp(p0[0], p1[0], t) + (nx / l) * o, lerp(p0[1], p1[1], t) + (ny / l) * o, z)
  }
  const holeWalls: THREE.BufferGeometry[] = []
  for (const h of holes) {
    const loop: [number, number][] = []
    const sSteps = Math.max(2, Math.ceil((h.s1 - h.s0) / 0.25))
    const zSteps = 2
    for (let k = 0; k <= sSteps; k++) loop.push([lerp(h.s0, h.s1, k / sSteps), h.z0])
    for (let k = 1; k <= zSteps; k++) loop.push([h.s1, lerp(h.z0, h.z1, k / zSteps)])
    for (let k = sSteps - 1; k >= 0; k--) loop.push([lerp(h.s0, h.s1, k / sSteps), h.z1])
    for (let k = zSteps - 1; k >= 1; k--) loop.push([h.s0, lerp(h.z0, h.z1, k / zSteps)])
    const wp: number[] = []
    for (let k = 0; k < loop.length; k++) {
      const [sa, za] = loop[k]
      const [sb, zb] = loop[(k + 1) % loop.length]
      const A = point(sa, za, 0)
      const B = point(sb, zb, 0)
      const C = point(sb, zb, -h.depth)
      const D = point(sa, za, -h.depth)
      wp.push(A.x, A.y, A.z, B.x, B.y, B.z, D.x, D.y, D.z, B.x, B.y, B.z, C.x, C.y, C.z, D.x, D.y, D.z)
    }
    const wg = new THREE.BufferGeometry()
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3))
    wg.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((wp.length / 3) * 2).fill(0), 2))
    wg.computeVertexNormals()
    holeWalls.push(wg)
  }
  const cap = (ring: Ring, dir: 1 | -1) => {
    const contour = outline.map((p, j) => {
      const nn = frame.normals[j]
      const m = frame.miter[j]
      return new THREE.Vector2(p[0] + nn[0] * ring.o * m, p[1] + nn[1] * ring.o * m)
    })
    const tris = THREE.ShapeUtils.triangulateShape(contour, [])
    const cp: number[] = []
    const cn: number[] = []
    const cu: number[] = []
    for (const t of tris) {
      const a = contour[t[0]]
      const b = contour[t[1]]
      const c = contour[t[2]]
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
      const ord = (cross > 0) === dir > 0 ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]]
      for (const k of ord) {
        cp.push(contour[k].x, contour[k].y, ring.z)
        cn.push(0, 0, dir)
        cu.push(contour[k].x, contour[k].y)
      }
    }
    const cg = new THREE.BufferGeometry()
    cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3))
    cg.setAttribute("normal", new THREE.Float32BufferAttribute(cn, 3))
    cg.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2))
    parts.push(cg)
  }
  if (capStart) cap(rings[0], -1)
  if (capEnd) cap(rings[rings.length - 1], 1)
  const out = parts.length === 1 ? g : merge(parts)
  // Hole walls are returned separately so they can take a cut-edge material.
  if (holeWalls.length) out.userData.holeWalls = merge(holeWalls)
  return out
}

/* ------------------------------------------------------------------------- */
/* Extrusions, boxes, tubes, ribbons                                          */
/* ------------------------------------------------------------------------- */

/** Extrudes `shape` to z ∈ [0, thickness] with rounded edges of `radius`. */
export function slab(
  shape: THREE.Shape | THREE.Shape[],
  thickness: number,
  radius: number,
  opts: { seg?: number; curveSeg?: number; crease?: number } = {}
): THREE.BufferGeometry {
  const { seg = 4, curveSeg = 12, crease = 34 } = opts
  const r = Math.max(0, Math.min(radius, thickness / 2 - 1e-4))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(thickness - 2 * r, 1e-4),
    bevelEnabled: r > 0,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: -r,
    bevelSegments: r > 0 ? seg : 0,
    curveSegments: curveSeg,
  })
  g.translate(0, 0, r)
  return creaseNormals(g, crease)
}

export function rbox(w: number, h: number, d: number, r: number, seg = 4): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999)
}

export function tube(points: THREE.Vector3[], radius: number, opts: { seg?: number; radial?: number; closed?: boolean; tension?: number } = {}) {
  const { seg = 64, radial = 16, closed = false, tension = 0.5 } = opts
  const curve = new THREE.CatmullRomCurve3(points, closed, "catmullrom", tension)
  return new THREE.TubeGeometry(curve, seg, radius, radial, closed)
}

/**
 * Sweeps a flat stadium cross-section (width × thickness) along a path.
 * `side` is the constant width direction (path bends in the plane ⟂ side),
 * or pass `up` for paths that bend in plan (width = up × tangent).
 * UVs: u = arc length (mm), v = across width (mm).
 */
export function ribbon(
  path: THREE.Vector3[],
  width: number,
  thickness: number,
  opts: { side?: THREE.Vector3; up?: THREE.Vector3; cross?: number } = {}
): THREE.BufferGeometry {
  const crossN = opts.cross ?? 10
  const r = thickness / 2
  const flat = width / 2 - r
  // Stadium outline in (x across, y normal), CCW.
  const section: V2[] = []
  const nrm: V2[] = []
  for (let i = 0; i <= crossN; i++) {
    const a = -Math.PI / 2 + (i / crossN) * Math.PI
    section.push([flat + Math.cos(a) * r, Math.sin(a) * r])
    nrm.push([Math.cos(a), Math.sin(a)])
  }
  for (let i = 0; i <= crossN; i++) {
    const a = Math.PI / 2 + (i / crossN) * Math.PI
    section.push([-flat + Math.cos(a) * r, Math.sin(a) * r])
    nrm.push([Math.cos(a), Math.sin(a)])
  }
  const m = section.length
  const vAcross: number[] = section.map((p) => p[0] + width / 2)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  let u = 0
  const T = new THREE.Vector3()
  const N = new THREE.Vector3()
  const B = new THREE.Vector3()
  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    T.subVectors(next, prev).normalize()
    if (opts.up) {
      B.crossVectors(opts.up, T).normalize()
      N.crossVectors(T, B).normalize()
    } else {
      const side = opts.side ?? new THREE.Vector3(0, 0, 1)
      B.copy(side).addScaledVector(T, -side.dot(T)).normalize()
      N.crossVectors(T, B).normalize()
    }
    if (i > 0) u += path[i].distanceTo(path[i - 1])
    for (let k = 0; k <= m; k++) {
      const [x, y] = section[k % m]
      const [nx, ny] = nrm[k % m]
      pos.push(path[i].x + B.x * x + N.x * y, path[i].y + B.y * x + N.y * y, path[i].z + B.z * x + N.z * y)
      nor.push(B.x * nx + N.x * ny, B.y * nx + N.y * ny, B.z * nx + N.z * ny)
      uv.push(u, vAcross[k % m])
    }
  }
  const idx: number[] = []
  const w = m + 1
  for (let i = 0; i < path.length - 1; i++) {
    for (let k = 0; k < m; k++) {
      const a = i * w + k
      const b = i * w + k + 1
      const c = (i + 1) * w + k
      const d = (i + 1) * w + k + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  fixWinding(g)
  return g
}

/** Flips each triangle whose winding disagrees with its stored vertex normals. */
export function fixWinding(g: THREE.BufferGeometry) {
  const p = g.attributes.position
  const nrm = g.attributes.normal
  const index = g.index
  if (!index || !nrm) return g
  const arr = index.array as Uint16Array | Uint32Array
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  const m = new THREE.Vector3()
  for (let t = 0; t < arr.length; t += 3) {
    a.fromBufferAttribute(p, arr[t])
    b.fromBufferAttribute(p, arr[t + 1])
    c.fromBufferAttribute(p, arr[t + 2])
    n.fromBufferAttribute(nrm, arr[t])
    n.add(m.fromBufferAttribute(nrm, arr[t + 1])).add(m.fromBufferAttribute(nrm, arr[t + 2]))
    if (b.sub(a).cross(c.sub(a)).dot(n) < 0) {
      const tmp = arr[t + 1]
      arr[t + 1] = arr[t + 2]
      arr[t + 2] = tmp
    }
  }
  index.needsUpdate = true
  return g
}

/* ------------------------------------------------------------------------- */
/* Cylinder wall with radial round holes (grub-screw holes, oil holes)        */
/* ------------------------------------------------------------------------- */

export interface RadialHole {
  phi: number
  y: number
  r: number
  depth: number
  chamfer?: number
}

/**
 * Cylindrical wall of radius R between y0 and y1 (no caps), sampled with the
 * same φ grid as `lathe(…, { seg })` so it stitches to lathed ends, with true
 * radial holes (wall + chamfered mouth). Returns [wall, holeWalls].
 */
export function holedCylinder(R: number, y0: number, y1: number, holes: RadialHole[], seg = 96, uSpan?: number) {
  const dphi = TAU / seg
  const span = uSpan ?? Math.max(1, Math.round(TAU * R))
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const vert = (phi: number, y: number) => {
    const s = Math.sin(phi)
    const c = Math.cos(phi)
    pos.push(R * s, y, R * c)
    nor.push(s, 0, c)
    uv.push((phi / TAU) * span, y)
    return pos.length / 3 - 1
  }
  const patches = holes.map((h) => {
    const ch = h.chamfer ?? Math.min(0.05, h.r * 0.07)
    const mouth = h.r + ch
    const halfAng = Math.asin(clamp((mouth * 1.55) / R, 0, 0.95))
    const j0 = Math.floor((h.phi - halfAng) / dphi)
    const j1 = Math.ceil((h.phi + halfAng) / dphi)
    return { h, j0, j1, mouth, ch }
  })
  const covered = (j: number) => patches.some((p) => j >= p.j0 && j < p.j1)
  for (let j = 0; j < seg; j++) {
    if (covered(j) || covered(j - seg) || covered(j + seg)) continue
    const a = vert(j * dphi, y0)
    const b = vert((j + 1) * dphi, y0)
    const c = vert(j * dphi, y1)
    const d = vert((j + 1) * dphi, y1)
    idx.push(a, b, c, b, d, c)
  }
  const wallPos: number[] = []
  for (const { h, j0, j1, mouth, ch } of patches) {
    // Patch boundary (CCW in s,y): bottom → right → top → left.
    const yc = h.y
    const bound: [number, number][] = []
    const vSteps = 6
    for (let j = j0; j <= j1; j++) bound.push([j * dphi, y0])
    for (let k = 1; k <= vSteps; k++) bound.push([j1 * dphi, lerp(y0, y1, k / vSteps)])
    for (let j = j1 - 1; j >= j0; j--) bound.push([j * dphi, y1])
    for (let k = vSteps - 1; k >= 1; k--) bound.push([j0 * dphi, lerp(y0, y1, k / vSteps)])
    const axis = new THREE.Vector3(Math.sin(h.phi), 0, Math.cos(h.phi))
    const tang = new THREE.Vector3(Math.cos(h.phi), 0, -Math.sin(h.phi))
    // Point on the outer cylinder where a line parallel to the hole axis, offset
    // (ox along tangent, oy along y), pierces it.
    const pierce = (ox: number, oy: number): [number, number] => [h.phi + Math.asin(clamp(ox / R, -1, 1)), yc + oy]
    const rings = 5
    const ringIdx: number[][] = []
    for (let q = 0; q <= rings; q++) {
      const t = Math.pow(q / rings, 1.6)
      const row: number[] = []
      for (const [bphi, by] of bound) {
        const ang = Math.atan2(by - yc, (bphi - h.phi) * R)
        const [cphi, cy] = pierce(Math.cos(ang) * mouth, Math.sin(ang) * mouth)
        row.push(vert(lerp(cphi, bphi, t), lerp(cy, by, t)))
      }
      ringIdx.push(row)
    }
    for (let q = 0; q < rings; q++) {
      const A = ringIdx[q]
      const B = ringIdx[q + 1]
      for (let k = 0; k < A.length; k++) {
        const k1 = (k + 1) % A.length
        idx.push(A[k], A[k1], B[k], A[k1], B[k1], B[k])
      }
    }
    // Hole wall: chamfer from the mouth down to radius r, then straight to depth.
    const n = bound.length
    const ringPoint = (ang: number, rad: number, depth: number) => {
      const ox = Math.cos(ang) * rad
      const oy = Math.sin(ang) * rad
      const surf = Math.sqrt(Math.max(R * R - ox * ox, 0))
      const along = surf - depth
      return new THREE.Vector3().addScaledVector(axis, along).addScaledVector(tang, ox).add(new THREE.Vector3(0, yc + oy, 0))
    }
    const layers: [number, number][] = [
      [mouth, 0],
      [h.r, ch],
      [h.r, h.depth],
    ]
    for (let L = 0; L < layers.length - 1; L++) {
      for (let k = 0; k < n; k++) {
        const [b0phi, b0y] = bound[k]
        const [b1phi, b1y] = bound[(k + 1) % n]
        const a0 = Math.atan2(b0y - yc, (b0phi - h.phi) * R)
        const a1 = Math.atan2(b1y - yc, (b1phi - h.phi) * R)
        const P = ringPoint(a0, layers[L][0], layers[L][1])
        const Q = ringPoint(a1, layers[L][0], layers[L][1])
        const S = ringPoint(a0, layers[L + 1][0], layers[L + 1][1])
        const T2 = ringPoint(a1, layers[L + 1][0], layers[L + 1][1])
        wallPos.push(P.x, P.y, P.z, Q.x, Q.y, Q.z, S.x, S.y, S.z, Q.x, Q.y, Q.z, T2.x, T2.y, T2.z, S.x, S.y, S.z)
      }
    }
  }
  const wall = new THREE.BufferGeometry()
  wall.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  wall.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
  wall.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  wall.setIndex(idx)
  fixWinding(wall)
  const hw = new THREE.BufferGeometry()
  hw.setAttribute("position", new THREE.Float32BufferAttribute(wallPos, 3))
  hw.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((wallPos.length / 3) * 2).fill(0), 2))
  const holeWalls = creaseNormals(hw, 50)
  return { wall, holeWalls }
}

/* ------------------------------------------------------------------------- */
/* Merging, meshes and final assembly                                         */
/* ------------------------------------------------------------------------- */

/** Merges geometries (indexed or not) into one non-indexed geometry with position/normal/uv. */
export function merge(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = geoms.map((g) => (g.index ? g.toNonIndexed() : g))
  let count = 0
  for (const g of flat) count += g.attributes.position.count
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  let o = 0
  for (const g of flat) {
    if (!g.attributes.normal) g.computeVertexNormals()
    pos.set(g.attributes.position.array as Float32Array, o * 3)
    nor.set(g.attributes.normal.array as Float32Array, o * 3)
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2)
    o += g.attributes.position.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3))
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
  for (const g of geoms) g.dispose()
  for (const g of flat) g.dispose()
  return out
}

export interface PartOptions {
  p?: [number, number, number]
  r?: [number, number, number]
  s?: number | [number, number, number]
  name?: string
  cast?: boolean
  receive?: boolean
  order?: number
}

export function part(geometry: THREE.BufferGeometry, material: THREE.Material, o: PartOptions = {}): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  if (o.p) m.position.set(...o.p)
  if (o.r) m.rotation.set(...o.r)
  if (o.s !== undefined) {
    if (typeof o.s === "number") m.scale.setScalar(o.s)
    else m.scale.set(...o.s)
  }
  if (o.name) m.name = o.name
  m.userData.cast = o.cast ?? true
  m.userData.receive = o.receive ?? true
  if (o.order !== undefined) m.renderOrder = o.order
  return m
}

export function group(children: THREE.Object3D[], o: { p?: [number, number, number]; r?: [number, number, number]; s?: number } = {}) {
  const g = new THREE.Group()
  for (const c of children) g.add(c)
  if (o.p) g.position.set(...o.p)
  if (o.r) g.rotation.set(...o.r)
  if (o.s !== undefined) g.scale.setScalar(o.s)
  return g
}

/**
 * Bakes a millimetre-space assembly into world units: every mesh transform is
 * folded into its geometry (tight bounds for framing), the result rests on
 * y = 0 and is centred on X/Z.
 */
export function finalize(content: THREE.Object3D, model: string, views: ViewOverrides = {}, extra: Record<string, unknown> = {}): THREE.Group {
  const scaler = new THREE.Group()
  scaler.scale.setScalar(MM)
  scaler.add(content)
  scaler.updateMatrixWorld(true)
  const meshes: THREE.Mesh[] = []
  scaler.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
  })
  const root = new THREE.Group()
  const seen = new Set<THREE.BufferGeometry>()
  for (const m of meshes) {
    let g = m.geometry
    if (seen.has(g)) g = g.clone()
    seen.add(g)
    g.applyMatrix4(m.matrixWorld)
    const det = m.matrixWorld.determinant()
    if (det < 0 && g.index) {
      const arr = g.index.array as Uint16Array | Uint32Array
      for (let t = 0; t < arr.length; t += 3) {
        const tmp = arr[t + 1]
        arr[t + 1] = arr[t + 2]
        arr[t + 2] = tmp
      }
    } else if (det < 0) {
      const p = g.attributes.position
      const n = g.attributes.normal
      const u = g.attributes.uv
      for (let t = 0; t < p.count; t += 3) {
        for (const attr of [p, n, u]) {
          if (!attr) continue
          for (let c = 0; c < attr.itemSize; c++) {
            const a = attr.getComponent(t + 1, c)
            attr.setComponent(t + 1, c, attr.getComponent(t + 2, c))
            attr.setComponent(t + 2, c, a)
          }
        }
      }
    }
    const baked = new THREE.Mesh(g, m.material)
    baked.name = m.name
    baked.castShadow = m.userData.cast !== false
    baked.receiveShadow = m.userData.receive !== false
    baked.renderOrder = m.renderOrder
    baked.onBeforeRender = m.onBeforeRender
    baked.onAfterRender = m.onAfterRender
    root.add(baked)
  }
  const box = new THREE.Box3()
  for (const m of root.children as THREE.Mesh[]) {
    m.geometry.computeBoundingBox()
    box.union(m.geometry.boundingBox!)
  }
  const cx = (box.min.x + box.max.x) / 2
  const cz = (box.min.z + box.max.z) / 2
  for (const m of root.children as THREE.Mesh[]) {
    m.geometry.translate(-cx, -box.min.y, -cz)
    m.geometry.computeBoundingBox()
    m.geometry.computeBoundingSphere()
  }
  root.name = `part:${model}`
  root.userData = { kind: "part", model, views, ...extra }
  return root
}

/* ------------------------------------------------------------------------- */
/* Outline utilities & build context                                          */
/* ------------------------------------------------------------------------- */

/** Offsets a closed outline along its vertex normals (+ outward). */
export function offsetOutline(outline: V2[], o: number): V2[] {
  const pts = ccw(outline)
  const f = outlineFrame(pts)
  return pts.map((p, j) => [p[0] + f.normals[j][0] * o * f.miter[j], p[1] + f.normals[j][1] * o * f.miter[j]])
}

/** Arc length (from the first vertex, CCW) of the outline vertex nearest `target`. */
export function arcLengthAt(outline: V2[], target: V2) {
  const pts = ccw(outline)
  const f = outlineFrame(pts)
  let best = 0
  let bestD = Infinity
  pts.forEach((p, j) => {
    const d = Math.hypot(p[0] - target[0], p[1] - target[1])
    if (d < bestD) {
      bestD = d
      best = j
    }
  })
  return { s: f.s[best], length: f.length }
}

/** Flat cap (XY plane at z = 0) of an outline with round / custom holes; faces +Z. */
export function flatCap(outline: V2[], holes: V2[][] = [], curveSeg = 24): THREE.BufferGeometry {
  return new THREE.ShapeGeometry(toShape(outline, holes), curveSeg)
}

export interface BuildCtx {
  /** Segment multiplier (1 = product render, ~0.5 = realtime). */
  q: number
}

export const segs = (ctx: BuildCtx, n: number) => Math.max(8, Math.round(n * ctx.q))

export interface Built {
  content: THREE.Object3D
  views?: ViewOverrides
}

/** Re-maps a geometry's UVs: u' = (u - u0) / du, v' = (v - v0) / dv. */
export function remapUV(g: THREE.BufferGeometry, u0: number, du: number, v0: number, dv: number) {
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / du, (uv.getY(i) - v0) / dv)
  uv.needsUpdate = true
  return g
}

/**
 * Polar UVs about the local Y axis (u = angle × rRef, v = radius on faces
 * that point along ±Y, height elsewhere) so "lines along U" read as turned,
 * concentric machining. Unwraps the atan2 seam per triangle (non-indexed).
 */
export function polarUV(geometry: THREE.BufferGeometry, rRef: number, axis: "y" | "z" = "y") {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  const p = g.attributes.position
  const n = g.attributes.normal
  const uv = new Float32Array(p.count * 2)
  const span = TAU * rRef
  for (let t = 0; t < p.count; t += 3) {
    const us: number[] = []
    for (let k = 0; k < 3; k++) {
      const i = t + k
      const x = p.getX(i)
      const h = axis === "y" ? p.getY(i) : p.getZ(i)
      const w = axis === "y" ? p.getZ(i) : -p.getY(i)
      const nh = axis === "y" ? n.getY(i) : n.getZ(i)
      const r = Math.hypot(x, w)
      us.push(Math.atan2(x, w) * rRef)
      uv[i * 2 + 1] = Math.abs(nh) > 0.7 ? r : h
    }
    const max = Math.max(...us)
    for (let k = 0; k < 3; k++) {
      let u = us[k]
      if (max - u > span / 2) u += span
      uv[(t + k) * 2] = u
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
  return g
}

/** World-space bounds of an object, from vertices (exact under rotation). */
export function boundsOf(o: THREE.Object3D) {
  o.updateMatrixWorld(true)
  return new THREE.Box3().setFromObject(o, true)
}

/** Lifts an object (in its parent's space) so its lowest vertex touches y = 0. */
export function dropToFloor(o: THREE.Object3D, gap = 0) {
  const parent = o.parent
  o.removeFromParent()
  o.updateMatrixWorld(true)
  const b = new THREE.Box3().setFromObject(o, true)
  o.position.y += gap - b.min.y
  if (parent) parent.add(o)
  return o
}
