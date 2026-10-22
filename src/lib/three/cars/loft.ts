import * as THREE from "three"

/**
 * Lofts half sections along Z into a closed, mirrored surface.
 *
 * Ring order per station: bottom centre → +X flank up → top centre → −X flank
 * down → bottom centre (duplicated, so the UV seam sits on the underside).
 * Stations ascend from tail (−Z) to nose (+Z). UVs are physical: `s` is the
 * signed arc length from the top centre-line (+ on the +X flank), so stripes,
 * roundels and numbers keep their true size wherever they land.
 */

export type UvFn = (z: number, s: number) => readonly [number, number]

export interface CapOptions {
  group: number
  uv: (x: number, y: number) => readonly [number, number]
}

export interface LoftGeometryOptions {
  uv: UvFn
  /** Material group for the quad on half-segment k (k → k + 1) between stations j and j + 1. Negative skips the quad. */
  group?: (j: number, k: number, z: number, s: number, side: 1 | -1, x: number, y: number) => number
  capFront?: CapOptions | null
  capRear?: CapOptions | null
}

export interface LoftData {
  stations: Float64Array
  halfCount: number
  /** x, y per half point per station. */
  pts: Float64Array
  /** Arc length from the top centre-line per half point per station. */
  arc: Float64Array
}

/** Evaluates every station's half section and its arc lengths. */
export function sampleLoft(stations: readonly number[], halfCount: number, half: (z: number, out: Float64Array) => void): LoftData {
  const S = stations.length
  const N = halfCount
  const st = Float64Array.from(stations)
  const pts = new Float64Array(S * N * 2)
  const arc = new Float64Array(S * N)
  const tmp = new Float64Array(N * 2 + 8)
  for (let j = 0; j < S; j++) {
    half(st[j], tmp)
    pts.set(tmp.subarray(0, N * 2), j * N * 2)
    let acc = 0
    const base = j * N
    arc[base] = 0
    for (let k = 1; k < N; k++) {
      const o = (j * N + k) * 2
      acc += Math.hypot(pts[o] - pts[o - 2], pts[o + 1] - pts[o - 1])
      arc[base + k] = acc
    }
    for (let k = 0; k < N; k++) arc[base + k] = acc - arc[base + k]
  }
  return { stations: st, halfCount: N, pts, arc }
}

/** Largest arc length from the top centre-line to the bottom centre-line. */
export function maxArc(data: LoftData) {
  let m = 0
  for (let j = 0; j < data.stations.length; j++) m = Math.max(m, data.arc[j * data.halfCount])
  return m
}

export function loftGeometry(data: LoftData, opts: LoftGeometryOptions): THREE.BufferGeometry {
  const stations = data.stations
  const S = stations.length
  const N = data.halfCount
  const ring = 2 * N - 1
  const { pts, arc } = data

  const loftVerts = S * ring
  const capVerts = (opts.capFront ? ring : 0) + (opts.capRear ? ring : 0)
  const position = new Float32Array((loftVerts + capVerts) * 3)
  const uv = new Float32Array((loftVerts + capVerts) * 2)

  const vid = (j: number, c: number) => j * ring + c
  for (let j = 0; j < S; j++) {
    const z = stations[j]
    for (let c = 0; c < ring; c++) {
      const side = c < N ? 1 : -1
      const k = c < N ? c : 2 * N - 2 - c
      const o = (j * N + k) * 2
      const v = vid(j, c)
      position[v * 3] = pts[o] * side
      position[v * 3 + 1] = pts[o + 1]
      position[v * 3 + 2] = z
      const t = opts.uv(z, arc[j * N + k] * side)
      uv[v * 2] = t[0]
      uv[v * 2 + 1] = t[1]
    }
  }

  const buckets = new Map<number, number[]>()
  const push = (g: number, a: number, b: number, c: number) => {
    let arr = buckets.get(g)
    if (!arr) buckets.set(g, (arr = []))
    arr.push(a, b, c)
  }

  for (let j = 0; j < S - 1; j++) {
    const zMid = (stations[j] + stations[j + 1]) / 2
    for (let c = 0; c < ring - 1; c++) {
      const side: 1 | -1 = c < N - 1 ? 1 : -1
      const k = side === 1 ? c : 2 * N - 3 - c
      const sMid = ((arc[j * N + k] + arc[j * N + k + 1]) / 2) * side
      const o0 = (j * N + k) * 2
      const o1 = ((j + 1) * N + k + 1) * 2
      const xMid = ((pts[o0] + pts[o1]) / 2) * side
      const yMid = (pts[o0 + 1] + pts[o1 + 1]) / 2
      const g = opts.group ? opts.group(j, k, zMid, sMid, side, xMid, yMid) : 0
      if (g < 0) continue
      const A = vid(j, c)
      const B = vid(j, c + 1)
      const C = vid(j + 1, c + 1)
      const D = vid(j + 1, c)
      push(g, A, B, C)
      push(g, A, C, D)
    }
  }

  let capBase = loftVerts
  const addCap = (j: number, cap: CapOptions, front: boolean) => {
    const z = stations[j]
    const contour: THREE.Vector2[] = []
    for (let c = 0; c < ring - 1; c++) {
      const v = vid(j, c)
      const x = position[v * 3]
      const y = position[v * 3 + 1]
      const last = contour[contour.length - 1]
      if (last && Math.hypot(last.x - x, last.y - y) < 1e-6) continue
      contour.push(new THREE.Vector2(x, y))
    }
    if (contour.length > 2 && contour[0].distanceTo(contour[contour.length - 1]) < 1e-6) contour.pop()
    if (contour.length < 3) return
    for (let i = 0; i < contour.length; i++) {
      const v = capBase + i
      position[v * 3] = contour[i].x
      position[v * 3 + 1] = contour[i].y
      position[v * 3 + 2] = z
      const t = cap.uv(contour[i].x, contour[i].y)
      uv[v * 2] = t[0]
      uv[v * 2 + 1] = t[1]
    }
    const faces = THREE.ShapeUtils.triangulateShape(contour, [])
    for (const f of faces) {
      const [a, b, c] = f
      const area =
        (contour[b].x - contour[a].x) * (contour[c].y - contour[a].y) - (contour[c].x - contour[a].x) * (contour[b].y - contour[a].y)
      if (area > 0 === front) push(cap.group, capBase + a, capBase + b, capBase + c)
      else push(cap.group, capBase + a, capBase + c, capBase + b)
    }
    capBase += ring
  }
  if (opts.capFront) addCap(S - 1, opts.capFront, true)
  if (opts.capRear) addCap(0, opts.capRear, false)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
  const index: number[] = []
  const groupIds = [...buckets.keys()].sort((a, b) => a - b)
  for (const g of groupIds) {
    const arr = buckets.get(g)!
    geometry.addGroup(index.length, arr.length, g)
    for (const i of arr) index.push(i)
  }
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  repairNormals(geometry, S, ring, loftVerts)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Fills zero normals from ring neighbours and welds the underside seam. */
function repairNormals(geometry: THREE.BufferGeometry, S: number, ring: number, loftVerts: number) {
  const n = geometry.getAttribute("normal") as THREE.BufferAttribute
  const arr = n.array as Float32Array
  const len = (v: number) => Math.hypot(arr[v * 3], arr[v * 3 + 1], arr[v * 3 + 2])
  for (let j = 0; j < S; j++) {
    for (let c = 0; c < ring; c++) {
      const v = j * ring + c
      if (len(v) > 0.5) continue
      let found = -1
      for (let d = 1; d < ring && found < 0; d++) {
        for (const cc of [c - d, c + d]) {
          if (cc < 0 || cc >= ring) continue
          if (len(j * ring + cc) > 0.5) {
            found = j * ring + cc
            break
          }
        }
      }
      if (found < 0) {
        const jj = j > 0 ? j - 1 : j + 1
        found = jj * ring + c
      }
      arr[v * 3] = arr[found * 3]
      arr[v * 3 + 1] = arr[found * 3 + 1]
      arr[v * 3 + 2] = arr[found * 3 + 2]
    }
    const a = j * ring
    const b = j * ring + ring - 1
    if (b < loftVerts) {
      const x = arr[a * 3] + arr[b * 3]
      const y = arr[a * 3 + 1] + arr[b * 3 + 1]
      const z = arr[a * 3 + 2] + arr[b * 3 + 2]
      const l = Math.hypot(x, y, z) || 1
      for (const v of [a, b]) {
        arr[v * 3] = x / l
        arr[v * 3 + 1] = y / l
        arr[v * 3 + 2] = z / l
      }
    }
  }
  n.needsUpdate = true
}

/* ---------------------------------------------------------------------------
 * Surface queries — used for conforming patches (lamps, vents, glass) and by
 * the livery painter to find features in (z, s) space.
 * ------------------------------------------------------------------------- */

function stationLerp(data: LoftData, z: number) {
  const st = data.stations
  const S = st.length
  if (z <= st[0]) return { j: 0, t: 0 }
  if (z >= st[S - 1]) return { j: S - 2, t: 1 }
  let lo = 0
  let hi = S - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (st[mid] > z) hi = mid
    else lo = mid
  }
  const span = st[hi] - st[lo]
  return { j: lo, t: span > 1e-12 ? (z - st[lo]) / span : 0 }
}

/** Point on station j at arc distance |s| from the top (side given by sign of s). */
function pointOnStation(data: LoftData, j: number, s: number, out: THREE.Vector3) {
  const N = data.halfCount
  const a = Math.abs(s)
  const base = j * N
  // arc is decreasing with k (top has arc 0 at k = N - 1)
  let k = N - 1
  while (k > 0 && data.arc[base + k - 1] < a) k--
  // now arc[k] <= a <= arc[k-1]
  if (k === 0) {
    out.set(data.pts[base * 2], data.pts[base * 2 + 1], 0)
  } else {
    const a0 = data.arc[base + k]
    const a1 = data.arc[base + k - 1]
    const t = a1 - a0 > 1e-12 ? (a - a0) / (a1 - a0) : 0
    const o0 = (base + k) * 2
    const o1 = (base + k - 1) * 2
    out.set(data.pts[o0] + (data.pts[o1] - data.pts[o0]) * t, data.pts[o0 + 1] + (data.pts[o1 + 1] - data.pts[o0 + 1]) * t, 0)
  }
  if (s < 0) out.x = -out.x
  return out
}

const _p0 = new THREE.Vector3()
const _p1 = new THREE.Vector3()

export function surfacePoint(data: LoftData, z: number, s: number, out = new THREE.Vector3()) {
  const { j, t } = stationLerp(data, z)
  pointOnStation(data, j, s, _p0)
  pointOnStation(data, j + 1, s, _p1)
  out.lerpVectors(_p0, _p1, t)
  out.z = z
  return out
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()
const _d = new THREE.Vector3()

export function surfaceNormal(data: LoftData, z: number, s: number, out = new THREE.Vector3()) {
  const e = 0.004
  surfacePoint(data, z + e, s, _a)
  surfacePoint(data, z - e, s, _b)
  surfacePoint(data, z, s + e, _c)
  surfacePoint(data, z, s - e, _d)
  const dz = _a.sub(_b)
  const ds = _c.sub(_d)
  // s runs from the top centre-line down the +X flank, so outward = dz × ds
  out.crossVectors(dz, ds).normalize()
  return out
}

/** Arc position (signed s) of half point k at height z, interpolated between stations. */
export function featureArc(data: LoftData, z: number, k: number) {
  const { j, t } = stationLerp(data, z)
  const N = data.halfCount
  const a = data.arc[j * N + k]
  const b = data.arc[(j + 1) * N + k]
  return a + (b - a) * t
}

/** x, y of half point k at z (interpolated between stations). */
export function featurePoint(data: LoftData, z: number, k: number) {
  const { j, t } = stationLerp(data, z)
  const N = data.halfCount
  const o0 = (j * N + k) * 2
  const o1 = ((j + 1) * N + k) * 2
  return {
    x: data.pts[o0] + (data.pts[o1] - data.pts[o0]) * t,
    y: data.pts[o0 + 1] + (data.pts[o1 + 1] - data.pts[o0 + 1]) * t,
  }
}

/**
 * Arc position on the +X flank where the surface reaches height y, searching
 * half points kFrom → kTo (inclusive). Returns null if the flank never gets there.
 */
export function arcAtHeight(data: LoftData, z: number, y: number, kFrom: number, kTo: number): number | null {
  const { j, t } = stationLerp(data, z)
  const N = data.halfCount
  const yAt = (k: number) => {
    const a = data.pts[(j * N + k) * 2 + 1]
    const b = data.pts[((j + 1) * N + k) * 2 + 1]
    return a + (b - a) * t
  }
  const arcAt = (k: number) => {
    const a = data.arc[j * N + k]
    const b = data.arc[(j + 1) * N + k]
    return a + (b - a) * t
  }
  const step = kTo >= kFrom ? 1 : -1
  for (let k = kFrom; k !== kTo; k += step) {
    const y0 = yAt(k)
    const y1 = yAt(k + step)
    if ((y0 - y) * (y1 - y) <= 0 && Math.abs(y1 - y0) > 1e-9) {
      const f = (y - y0) / (y1 - y0)
      return arcAt(k) + (arcAt(k + step) - arcAt(k)) * f
    }
  }
  return null
}

/**
 * Builds a thin conforming patch over the loft surface: an ellipse (or rounded
 * rectangle) in (z, s) space, lifted by `lift` along the normal.
 */
export function surfacePatch(
  data: LoftData,
  opts: {
    z: number
    s: number
    /** Half extents along z and s. */
    hz: number
    hs: number
    lift: number
    shape?: "ellipse" | "rect"
    /** Corner rounding for rect (0–1 of the smaller half extent). */
    round?: number
    rings?: number
    segments?: number
    /** Extra lift at the centre (domes a lens). */
    dome?: number
    uv?: (z: number, s: number) => readonly [number, number]
  }
): THREE.BufferGeometry {
  const rings = opts.rings ?? 6
  const segs = opts.segments ?? 32
  const shape = opts.shape ?? "ellipse"
  const round = opts.round ?? 0.35
  const pos: number[] = []
  const uvs: number[] = []
  const idx: number[] = []
  const p = new THREE.Vector3()
  const nrm = new THREE.Vector3()
  const outline = (a: number): [number, number] => {
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    if (shape === "ellipse") return [ca * opts.hz, sa * opts.hs]
    // superellipse rounded rectangle
    const e = 2 + (1 - round) * 10
    const x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e)
    const y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e)
    return [x * opts.hz, y * opts.hs]
  }
  const add = (z: number, s: number, f: number) => {
    surfacePoint(data, z, s, p)
    surfaceNormal(data, z, s, nrm)
    const lift = opts.lift + (opts.dome ?? 0) * (1 - f * f)
    pos.push(p.x + nrm.x * lift, p.y + nrm.y * lift, p.z + nrm.z * lift)
    const t = opts.uv ? opts.uv(z, s) : [0.5 + (z - opts.z) / (2 * opts.hz), 0.5 + (s - opts.s) / (2 * opts.hs)]
    uvs.push(t[0], t[1])
  }
  add(opts.z, opts.s, 0)
  for (let r = 1; r <= rings; r++) {
    const f = r / rings
    for (let i = 0; i < segs; i++) {
      const [dz, ds] = outline((i / segs) * Math.PI * 2)
      add(opts.z + dz * f, opts.s + ds * f, f)
    }
  }
  const ringStart = (r: number) => (r === 0 ? 0 : 1 + (r - 1) * segs)
  for (let i = 0; i < segs; i++) idx.push(0, 1 + i, 1 + ((i + 1) % segs))
  for (let r = 1; r < rings; r++) {
    const a0 = ringStart(r)
    const b0 = ringStart(r + 1)
    for (let i = 0; i < segs; i++) {
      const i1 = (i + 1) % segs
      idx.push(a0 + i, b0 + i, b0 + i1, a0 + i, b0 + i1, a0 + i1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  // Winding: (z, s) basis — ensure normals face outward.
  g.computeVertexNormals()
  const n0 = new THREE.Vector3().fromBufferAttribute(g.getAttribute("normal") as THREE.BufferAttribute, 0)
  surfaceNormal(data, opts.z, opts.s, nrm)
  if (n0.dot(nrm) < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1]
      idx[i + 1] = idx[i + 2]
      idx[i + 2] = t
    }
    g.setIndex(idx)
    g.computeVertexNormals()
  }
  return g
}
