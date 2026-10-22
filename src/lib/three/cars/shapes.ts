import * as THREE from "three"

/** Geometry helpers shared by the car parts. */

export function roundedRectShape(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape()
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  const rr = Math.min(r, w / 2, h / 2)
  s.moveTo(x0 + rr, y0)
  s.lineTo(x0 + w - rr, y0)
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr)
  s.lineTo(x0 + w, y0 + h - rr)
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h)
  s.lineTo(x0 + rr, y0 + h)
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr)
  s.lineTo(x0, y0 + rr)
  s.quadraticCurveTo(x0, y0, x0 + rr, y0)
  return s
}

export function roundedRectPath(w: number, h: number, r: number, cx = 0, cy = 0) {
  const shape = roundedRectShape(w, h, r, cx, cy)
  const p = new THREE.Path()
  p.curves = shape.curves
  return p
}

/** Polygon (array of [x, y]) with every corner rounded by set-back r. */
export function roundedPolyShape(pts: ReadonlyArray<readonly [number, number]>, r: number | number[]) {
  const s = new THREE.Shape()
  const n = pts.length
  const rad = (i: number) => (Array.isArray(r) ? r[i] : r)
  const corner = (i: number) => {
    const p = pts[i]
    const a = pts[(i - 1 + n) % n]
    const b = pts[(i + 1) % n]
    const la = Math.hypot(a[0] - p[0], a[1] - p[1])
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1])
    const rr = Math.min(rad(i), la * 0.48, lb * 0.48)
    return {
      p,
      t0: [p[0] + ((a[0] - p[0]) / la) * rr, p[1] + ((a[1] - p[1]) / la) * rr] as const,
      t1: [p[0] + ((b[0] - p[0]) / lb) * rr, p[1] + ((b[1] - p[1]) / lb) * rr] as const,
    }
  }
  const c0 = corner(0)
  s.moveTo(c0.t1[0], c0.t1[1])
  for (let i = 1; i <= n; i++) {
    const c = corner(i % n)
    s.lineTo(c.t0[0], c.t0[1])
    s.quadraticCurveTo(c.p[0], c.p[1], c.t1[0], c.t1[1])
  }
  return s
}

/**
 * Extrudes a shape drawn in the (z, y) side-view plane across X (centred),
 * with rounded edges. Good for endplates, flaps, light pods.
 */
export function extrudeSide(shape: THREE.Shape, thickness: number, bevel = 0.006, curveSegments = 12) {
  const b = Math.min(bevel, thickness * 0.45)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(thickness - 2 * b, 0.0005),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments,
  })
  // shape (u, v) → (z, y); extrusion along +Z → +X
  g.translate(0, 0, -(thickness - 2 * b) / 2)
  g.rotateY(Math.PI / 2)
  // after rotateY(+90°): (u, v, w) → (w, v, -u); flip so u maps to +z
  g.scale(1, 1, -1)
  flipWinding(g)
  return g
}

/** Extrudes a plan-view shape (x, z) vertically from y0 to y1. */
export function extrudePlan(shape: THREE.Shape, y0: number, y1: number, bevel = 0.004, curveSegments = 12) {
  const h = y1 - y0
  const b = Math.min(bevel, h * 0.45)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(h - 2 * b, 0.0005),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments,
  })
  // shape (x, v) with extrusion along +Z → rotate so extrusion is +Y and v maps to z
  g.rotateX(-Math.PI / 2)
  // (x, v, w) → (x, w, -v); map v → +z
  g.scale(1, 1, -1)
  flipWinding(g)
  g.translate(0, y0 + b, 0)
  return g
}

export function flipWinding(g: THREE.BufferGeometry) {
  const index = g.getIndex()
  if (index) {
    const a = index.array as Uint16Array | Uint32Array
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1]
      a[i + 1] = a[i + 2]
      a[i + 2] = t
    }
    index.needsUpdate = true
  } else {
    const pos = g.getAttribute("position") as THREE.BufferAttribute
    const attrs = Object.values(g.attributes) as THREE.BufferAttribute[]
    for (let i = 0; i < pos.count; i += 3) {
      for (const attr of attrs) {
        const s = attr.itemSize
        const arr = attr.array as Float32Array
        for (let c = 0; c < s; c++) {
          const t = arr[(i + 1) * s + c]
          arr[(i + 1) * s + c] = arr[(i + 2) * s + c]
          arr[(i + 2) * s + c] = t
        }
      }
    }
    for (const attr of attrs) attr.needsUpdate = true
  }
  g.computeVertexNormals()
  return g
}

/** A tube along an arbitrary polyline with constant radius. */
export function tube(points: THREE.Vector3[], radius: number, radial = 8, tubular?: number, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal", 0.5)
  return new THREE.TubeGeometry(curve, tubular ?? Math.max(4, points.length * 6), radius, radial, closed)
}

/** Straight cylinder between two points. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, radial = 8, capped = true) {
  const len = a.distanceTo(b)
  const g = new THREE.CylinderGeometry(radius, radius, len, radial, 1, !capped)
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const dir = b.clone().sub(a).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  g.applyQuaternion(q)
  g.translate(mid.x, mid.y, mid.z)
  return g
}

/**
 * Wing / airfoil lofted along X between ±span/2. `chord`, `twist` and `y`
 * offsets may vary along the span. Section: cambered NACA-like profile.
 */
export function airfoil(opts: {
  span: number
  chord: number
  thickness?: number
  camber?: number
  /** Angle of attack (radians); positive raises the leading edge. */
  aoa?: number
  stations?: number
  points?: number
  /** Leading edge at z = 0, trailing edge toward −z. */
  sweep?: (u: number) => number
  chordAt?: (u: number) => number
  yAt?: (u: number) => number
  /** Inverted (downforce) camber when true. */
  invert?: boolean
  uv?: (u: number, t: number) => readonly [number, number]
}) {
  const nS = opts.stations ?? 24
  const nP = opts.points ?? 28
  const th = opts.thickness ?? 0.12
  const cam = opts.camber ?? 0.05
  const aoa = opts.aoa ?? 0
  const pos: number[] = []
  const uvs: number[] = []
  const idx: number[] = []
  const ring = nP * 2
  for (let i = 0; i <= nS; i++) {
    const u = i / nS
    const x = (u - 0.5) * opts.span
    const c = opts.chordAt ? opts.chordAt(u) : opts.chord
    const z0 = opts.sweep ? opts.sweep(u) : 0
    const y0 = opts.yAt ? opts.yAt(u) : 0
    for (let k = 0; k < ring; k++) {
      // k: 0..nP-1 upper surface LE→TE, nP..2nP-1 lower surface TE→LE
      const upper = k < nP
      const f = upper ? k / (nP - 1) : 1 - (k - nP) / (nP - 1)
      const xc = (1 - Math.cos(f * Math.PI)) / 2
      const yt = 5 * th * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1036 * xc ** 4)
      const p = 0.4
      let yc = xc < p ? (cam / (p * p)) * (2 * p * xc - xc * xc) : (cam / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * xc - xc * xc)
      if (opts.invert) yc = -yc
      const yy = (upper ? yc + yt : yc - yt) * c
      const zz = -xc * c
      const ca = Math.cos(aoa)
      const sa = Math.sin(aoa)
      // rotate about leading edge: positive aoa lifts the LE (TE drops)
      const zr = zz * ca - yy * sa
      const yr = zz * sa + yy * ca
      pos.push(x, y0 + yr, z0 + zr)
      const t = k / ring
      const uvv = opts.uv ? opts.uv(u, t) : [u, t]
      uvs.push(uvv[0], uvv[1])
    }
  }
  for (let i = 0; i < nS; i++) {
    for (let k = 0; k < ring; k++) {
      const a = i * ring + k
      const b = i * ring + ((k + 1) % ring)
      const c = (i + 1) * ring + ((k + 1) % ring)
      const d = (i + 1) * ring + k
      idx.push(a, c, b, a, d, c)
    }
  }
  // end caps
  for (const end of [0, nS]) {
    const cBase = pos.length / 3
    for (let k = 0; k < ring; k++) {
      const o = (end * ring + k) * 3
      pos.push(pos[o], pos[o + 1], pos[o + 2])
      uvs.push(uvs[(end * ring + k) * 2], uvs[(end * ring + k) * 2 + 1])
    }
    for (let k = 1; k < nP - 1; k++) {
      const top = cBase + k
      const bot = cBase + (ring - 1 - k)
      const top2 = cBase + k + 1
      const bot2 = cBase + (ring - 2 - k)
      if (end === 0) idx.push(top, top2, bot, top2, bot2, bot)
      else idx.push(top, bot, top2, top2, bot, bot2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Ensures outward-facing winding by testing a sample normal against a reference direction. */
export function orient(g: THREE.BufferGeometry, ref: THREE.Vector3) {
  g.computeVertexNormals()
  const n = g.getAttribute("normal") as THREE.BufferAttribute
  let dot = 0
  for (let i = 0; i < n.count; i += Math.max(1, Math.floor(n.count / 64))) dot += n.getX(i) * ref.x + n.getY(i) * ref.y + n.getZ(i) * ref.z
  if (dot < 0) flipWinding(g)
  return g
}
