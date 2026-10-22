import * as THREE from "three"
import { LoftGeometry } from "three/examples/jsm/geometries/LoftGeometry.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/**
 * Geometry helpers. Extrusions keep three's world-space UVs (1 UV = 1 unit),
 * so micro-surface maps stay at a consistent physical scale across parts.
 */

/** Rounded rectangle centred on (cx, cy). */
export function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0, path: THREE.Path = new THREE.Shape()) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  const x = cx - w / 2
  const y = cy - h / 2
  path.moveTo(x + rr, y)
  path.lineTo(x + w - rr, y)
  if (rr) path.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false)
  path.lineTo(x + w, y + h - rr)
  if (rr) path.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false)
  path.lineTo(x + rr, y + h)
  if (rr) path.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false)
  path.lineTo(x, y + rr)
  if (rr) path.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false)
  return path
}

export const roundedRectShape = (w: number, h: number, r: number, cx = 0, cy = 0) => roundedRect(w, h, r, cx, cy) as THREE.Shape

/** Rounded-rect hole path (clockwise, for Shape.holes). */
export function roundedRectHole(w: number, h: number, r: number, cx = 0, cy = 0): THREE.Path {
  const p = roundedRect(w, h, r, cx, cy, new THREE.Path())
  const pts = p.getPoints(8).reverse()
  return new THREE.Path(pts)
}

export function circleHole(r: number, cx = 0, cy = 0, segments = 32): THREE.Path {
  const p = new THREE.Path()
  p.absarc(cx, cy, r, 0, Math.PI * 2, true)
  return new THREE.Path(p.getPoints(segments))
}

export interface ExtrudeOptions {
  bevel?: number
  bevelThickness?: number
  bevelSegments?: number
  curveSegments?: number
  steps?: number
}

/** Extrudes an XY shape along +Z, centred on z = 0 (bevel included). */
export function extrudeCentered(shape: THREE.Shape | THREE.Shape[], depth: number, o: ExtrudeOptions = {}) {
  const bevel = o.bevel ?? 0
  const bt = o.bevelThickness ?? bevel
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-5, depth - bt * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bt,
    bevelSize: bevel,
    bevelSegments: o.bevelSegments ?? 3,
    curveSegments: o.curveSegments ?? 12,
    steps: o.steps ?? 1,
  })
  geo.translate(0, 0, -(depth - bt * 2) / 2)
  return geo
}

/**
 * Side-profile extrusion: shape x → world +Z (forward), shape y → world +Y,
 * extruded across X (width centred on x = 0).
 */
export function profileX(shape: THREE.Shape | THREE.Shape[], width: number, o: ExtrudeOptions = {}) {
  const geo = extrudeCentered(shape, width, o)
  geo.rotateY(-Math.PI / 2)
  return geo
}

/** Plan extrusion: shape x → world X, shape y → world +Z, rising from y = 0 to `height`. */
export function planExtrude(shape: THREE.Shape | THREE.Shape[], height: number, o: ExtrudeOptions = {}) {
  const geo = extrudeCentered(shape, height, o)
  geo.rotateX(Math.PI / 2)
  geo.translate(0, height / 2, 0)
  return geo
}

/** Rounded slab: footprint w × d (X × Z), height h from y = 0, with plan radius and bevelled top/bottom edges. */
export function slab(w: number, h: number, d: number, o: { radius?: number; bevel?: number; bevelSegments?: number; curveSegments?: number } = {}) {
  const b = Math.min(o.bevel ?? 0.006, h / 2.2, w / 4, d / 4)
  const r = Math.max(0, (o.radius ?? 0.02) - b)
  const shape = roundedRectShape(w - b * 2, d - b * 2, r)
  return planExtrude(shape, h, { bevel: b, bevelSegments: o.bevelSegments ?? 3, curveSegments: o.curveSegments ?? 8 })
}

/** Lathe from [radius, y] pairs (bottom → top). */
export function lathe(profile: [number, number][], segments = 64, phiStart = 0, phiLength = Math.PI * 2) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)),
    segments,
    phiStart,
    phiLength
  )
}

/** Smooth profile helper: rounds the corners of a [r, y] polyline with quadratic fillets. */
export function filletProfile(points: [number, number][], radius: number, steps = 4): [number, number][] {
  const out: [number, number][] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]
    const d1 = Math.hypot(cx - px, cy - py)
    const d2 = Math.hypot(nx - cx, ny - cy)
    const r = Math.min(radius, d1 / 2, d2 / 2)
    const a: [number, number] = [cx + ((px - cx) / d1) * r, cy + ((py - cy) / d1) * r]
    const b: [number, number] = [cx + ((nx - cx) / d2) * r, cy + ((ny - cy) / d2) * r]
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0]
      const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]
      out.push([x, y])
    }
  }
  out.push(points[points.length - 1])
  return out
}

/** Disc outline with `ribs` rounded flutes — knurled knobs, thumb wheels, gears. */
export function ribbedDisc(radius: number, ribs: number, depth: number, pointsPerRib = 8) {
  const shape = new THREE.Shape()
  const n = ribs * pointsPerRib
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const f = (i % pointsPerRib) / pointsPerRib
    const flute = Math.pow(Math.sin(f * Math.PI), 2)
    const r = radius - depth * flute
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  return shape
}

/** Vertical knurled cylinder (axis Y) from y = 0 to `height`, with chamfered ends. */
export function knurledCylinder(radius: number, height: number, ribs: number, depth: number, bevel = 0.004) {
  const b = Math.min(bevel, height / 3, radius / 4)
  return planExtrude(ribbedDisc(radius - b, ribs, depth, 6), height, { bevel: b, bevelSegments: 2, curveSegments: 1 })
}

/**
 * Bends a geometry laid along +Z (z = 0 … L) around a vertical axis at x = -radius,
 * turning left. Exact for normals perpendicular to the bend direction.
 */
export function bendAroundY(geo: THREE.BufferGeometry, radius: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const t = z / radius
    const c = Math.cos(t)
    const s = Math.sin(t)
    pos.setXYZ(i, -radius + (radius + x) * c, pos.getY(i), (radius + x) * s)
    if (nor) {
      const nx = nor.getX(i)
      const nz = nor.getZ(i)
      nor.setXYZ(i, nx * c - nz * s, nor.getY(i), nx * s + nz * c)
    }
  }
  pos.needsUpdate = true
  if (nor) nor.needsUpdate = true
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

/** Smooth curve through points (centripetal Catmull-Rom). */
export const spline = (points: THREE.Vector3[], closed = false, tension = 0.5) =>
  new THREE.CatmullRomCurve3(points, closed, "centripetal", tension)

export function tube(curve: THREE.Curve<THREE.Vector3>, radius: number, segments = 64, radial = 12, closed = false) {
  return new THREE.TubeGeometry(curve, segments, radius, radial, closed)
}

/** Helix wound around a centreline — coiled cords and springs. */
export class CoilCurve extends THREE.Curve<THREE.Vector3> {
  private readonly frames: { normals: THREE.Vector3[]; binormals: THREE.Vector3[] }
  private readonly samples: number

  constructor(
    private readonly path: THREE.Curve<THREE.Vector3>,
    private readonly radius: number,
    private readonly turns: number,
    private readonly phase = 0
  ) {
    super()
    this.samples = Math.max(64, Math.ceil(turns * 8))
    const f = path.computeFrenetFrames(this.samples, false)
    this.frames = { normals: f.normals, binormals: f.binormals }
  }

  override getPoint(t: number, target = new THREE.Vector3()) {
    const u = Math.min(1, Math.max(0, t))
    const fi = u * this.samples
    const i = Math.min(this.samples - 1, Math.floor(fi))
    const k = fi - i
    const n = this.frames.normals[i].clone().lerp(this.frames.normals[i + 1], k).normalize()
    const b = this.frames.binormals[i].clone().lerp(this.frames.binormals[i + 1], k).normalize()
    const a = this.phase + u * this.turns * Math.PI * 2
    this.path.getPointAt(u, target)
    return target.addScaledVector(n, Math.cos(a) * this.radius).addScaledVector(b, Math.sin(a) * this.radius)
  }
}

/**
 * Moves every vertex through `fn` (in place). Normals follow the deformation's
 * Jacobian (inverse transpose, by finite differences), so smooth bevels stay
 * smooth and hard seams stay hard.
 */
export function deform(geo: THREE.BufferGeometry, fn: (p: THREE.Vector3) => void, eps = 1e-4) {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
  const p = new THREE.Vector3()
  const p0 = new THREE.Vector3()
  const dx = new THREE.Vector3()
  const dy = new THREE.Vector3()
  const dz = new THREE.Vector3()
  const m = new THREE.Matrix3()
  const n = new THREE.Vector3()
  const at = (v: THREE.Vector3, ox: number, oy: number, oz: number) => {
    v.set(p.x + ox, p.y + oy, p.z + oz)
    fn(v)
    return v
  }
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    at(p0, 0, 0, 0)
    if (nor) {
      at(dx, eps, 0, 0).sub(p0).divideScalar(eps)
      at(dy, 0, eps, 0).sub(p0).divideScalar(eps)
      at(dz, 0, 0, eps).sub(p0).divideScalar(eps)
      m.set(dx.x, dy.x, dz.x, dx.y, dy.y, dz.y, dx.z, dy.z, dz.z).invert().transpose()
      n.fromBufferAttribute(nor, i).applyMatrix3(m).normalize()
      nor.setXYZ(i, n.x, n.y, n.z)
    }
    pos.setXYZ(i, p0.x, p0.y, p0.z)
  }
  pos.needsUpdate = true
  if (nor) nor.needsUpdate = true
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Loft through superellipse sections along an arbitrary spine. Each station gives a
 * centre, width (local X), height (local Y) and exponent; sections are oriented
 * perpendicular to the spine with local Y kept close to `up`.
 */
export interface LoftStation {
  at: THREE.Vector3
  w: number
  h: number
  n?: number
  /** Extra per-point radial offset: (angle, station) → distance. */
  shape?: (angle: number) => number
}

export function loft(stations: LoftStation[], segments = 40, up = new THREE.Vector3(0, 1, 0), caps = true) {
  const sections: THREE.Vector3[][] = []
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i]
    const prev = stations[Math.max(0, i - 1)].at
    const next = stations[Math.min(stations.length - 1, i + 1)].at
    const t = next.clone().sub(prev).normalize()
    const x = new THREE.Vector3().crossVectors(up, t)
    if (x.lengthSq() < 1e-8) x.set(1, 0, 0)
    x.normalize()
    const y = new THREE.Vector3().crossVectors(t, x).normalize()
    const ring: THREE.Vector3[] = []
    for (let k = 0; k < segments; k++) {
      const a = (k / segments) * Math.PI * 2
      const c = Math.cos(a)
      const sn = Math.sin(a)
      const n = s.n ?? 2.6
      let px = (s.w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)
      let py = (s.h / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)
      if (s.shape) {
        const d = s.shape(a)
        const len = Math.hypot(px, py) || 1
        px += (px / len) * d
        py += (py / len) * d
      }
      ring.push(s.at.clone().addScaledVector(x, px).addScaledVector(y, py))
    }
    sections.push(ring)
  }
  return new LoftGeometry(sections, { capStart: caps, capEnd: caps })
}

export function merge(geos: THREE.BufferGeometry[]) {
  const prepared = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  for (const g of prepared) {
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  }
  const out = mergeGeometries(prepared, false)
  return out ?? geos[0]
}

/** Superellipse ring of points in the local XY plane, counter-clockwise. */
export function superellipse(w: number, h: number, n = 4, segments = 32, cx = 0, cy = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    pts.push(
      new THREE.Vector2(cx + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), cy + (h / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n))
    )
  }
  return pts
}
