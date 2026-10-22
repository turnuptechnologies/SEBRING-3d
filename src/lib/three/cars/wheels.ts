import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import type { CarMaterials } from "./car-materials"
import { rod } from "./shapes"

/**
 * Wheels are built around local +X (the axle) with the outer face toward +X.
 *
 *   hub (Group, at the wheel centre; the steer pivot on the front axle)
 *    ├─ caliper            — fixed to the upright
 *    └─ spin (Group)       — rolls about local X; +angle = rolling forward
 *        └─ visual (Group) — rotated π about Y on the −X side
 */

export type RimStyle = "multi" | "five" | "wire" | "disc" | "holes" | "star" | "mesh" | "minilite"

export interface WheelSpec {
  radius: number
  width: number
  /** Rim (bead) radius / tyre radius. */
  rimRatio: number
  style: RimStyle
  spokes?: number
  tread?: "slick" | "grooved" | "block"
  centreLock?: boolean
  lugs?: number
  /** Rim face recess from the outer sidewall. */
  dish?: number
  brakes?: boolean
  /** Sidewall lettering colour (null = none). */
  letters?: string | null
}

export interface WheelParts {
  hub: THREE.Group
  spin: THREE.Group
}

interface Q {
  hq: boolean
}

function tireGeometry(spec: WheelSpec, q: Q) {
  const R = spec.radius
  const W = spec.width
  const rr = R * spec.rimRatio
  const sideH = R - rr
  const sh = Math.min(W * 0.2, sideH * 0.42)
  const bulge = Math.min(W * 0.05, 0.018)
  const pts: THREE.Vector2[] = []
  const P = (r: number, y: number) => pts.push(new THREE.Vector2(r, y))
  const nSide = q.hq ? 8 : 3
  const nSh = q.hq ? 8 : 3
  const wall = (t: number) => bulge * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - 0.5 * t)
  // −Y sidewall: bead → shoulder (LatheGeometry normal = (dy, −dr), so this faces −Y)
  P(rr - 0.006, -W / 2 + 0.03)
  P(rr + 0.003, -W / 2 + 0.008)
  for (let i = 1; i < nSide; i++) {
    const t = i / nSide
    P(rr + 0.003 + (R - sh - rr - 0.003) * t, -W / 2 - wall(t))
  }
  for (let i = 0; i <= nSh; i++) {
    const a = -Math.PI / 2 + (i / nSh) * (Math.PI / 2)
    P(R - sh + sh * Math.cos(a), -W / 2 + sh + sh * Math.sin(a))
  }
  // tread, slightly crowned, with optional circumferential grooves
  const y0 = -W / 2 + sh
  const y1 = W / 2 - sh
  const ys: number[] = []
  const nT = q.hq ? 18 : 5
  for (let i = 1; i < nT; i++) ys.push(y0 + ((y1 - y0) * i) / nT)
  const grooves = spec.tread === "grooved" || spec.tread === "block" ? [-0.2 * W, 0.2 * W] : []
  const gw = W * 0.03
  const gd = Math.min(0.01, R * 0.028)
  if (q.hq) for (const g of grooves) ys.push(g - gw, g - gw * 0.55, g + gw * 0.55, g + gw)
  ys.sort((p0, p1) => p0 - p1)
  for (const y of ys) {
    let r = R + 0.004 * (1 - (y / (W / 2)) ** 2)
    if (q.hq) for (const g of grooves) if (Math.abs(y - g) < gw * 0.7) r -= gd
    P(r, y)
  }
  for (let i = 0; i <= nSh; i++) {
    const a = (i / nSh) * (Math.PI / 2)
    P(R - sh + sh * Math.cos(a), W / 2 - sh + sh * Math.sin(a))
  }
  for (let i = nSide - 1; i >= 1; i--) {
    const t = i / nSide
    P(rr + 0.003 + (R - sh - rr - 0.003) * t, W / 2 + wall(t))
  }
  P(rr + 0.003, W / 2 - 0.008)
  P(rr - 0.006, W / 2 - 0.03)
  const g = new THREE.LatheGeometry(pts, q.hq ? 112 : 40)
  g.rotateZ(-Math.PI / 2)
  return g
}

/** Outer lip + inner barrel of the rim (the barrel is what shows through the spokes). */
function barrelGeometry(spec: WheelSpec, q: Q) {
  const R = spec.radius
  const W = spec.width
  const rr = R * spec.rimRatio
  const dish = spec.dish ?? W * 0.22
  const lip = Math.min(0.022, rr * 0.08)
  const pts: THREE.Vector2[] = []
  const P = (r: number, y: number) => pts.push(new THREE.Vector2(r, y))
  // Traversed with the metal on the left, so normals face out of the metal.
  P(rr + lip * 0.55, W / 2 - 0.018)
  P(rr + lip * 0.45, W / 2 - 0.007)
  P(rr + lip * 0.1, W / 2 - 0.002)
  P(rr - lip * 0.4, W / 2 - 0.003)
  P(rr - lip * 0.75, W / 2 - 0.012)
  P(rr - lip * 0.95, W / 2 - dish * 0.6)
  P(rr - lip * 1.1, W / 2 - dish - 0.01)
  P(rr - lip * 1.15, -W / 2 + 0.03)
  P(rr - lip * 0.6, -W / 2 + 0.008)
  const g = new THREE.LatheGeometry(pts, q.hq ? 96 : 32)
  g.rotateZ(-Math.PI / 2)
  return g
}

/** x of the rim face's outer surface at the hub. */
function faceHubX(spec: WheelSpec) {
  const rr = spec.radius * spec.rimRatio
  const W = spec.width
  const dish = spec.dish ?? W * 0.22
  const t = Math.max(0.014, rr * 0.06)
  return W / 2 - dish + t * 0.3 + dish * 0.55
}

function faceShape(spec: WheelSpec, rf: number): THREE.Shape {
  const s = new THREE.Shape()
  s.absarc(0, 0, rf, 0, Math.PI * 2, false)
  const style = spec.style
  const hubR = rf * 0.26
  const addHole = (pts: Array<[number, number]>) => {
    const h = new THREE.Path()
    h.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) h.lineTo(pts[i][0], pts[i][1])
    h.closePath()
    s.holes.push(h)
  }
  const window = (n: number, a0: number, spokeHalf: number, rIn: number, rOut: number, roundSteps = 6) => {
    // hole between two spokes: annular sector minus spoke half-widths (constant width spokes)
    for (let i = 0; i < n; i++) {
      const ac = a0 + ((i + 0.5) / n) * Math.PI * 2
      const half = Math.PI / n
      const pts: Array<[number, number]> = []
      const edge = (r: number) => Math.min(half * 0.95, half - Math.asin(Math.min(0.99, spokeHalf / r)))
      // outer arc
      const eo = edge(rOut)
      const ei = edge(rIn)
      for (let k = 0; k <= roundSteps * 2; k++) {
        const a = ac - eo + (2 * eo * k) / (roundSteps * 2)
        pts.push([Math.cos(a) * rOut, Math.sin(a) * rOut])
      }
      // inner arc reversed
      for (let k = 0; k <= roundSteps; k++) {
        const a = ac + ei - (2 * ei * k) / roundSteps
        pts.push([Math.cos(a) * rIn, Math.sin(a) * rIn])
      }
      addHole(pts)
    }
  }
  const circleHole = (cx: number, cy: number, r: number) => {
    const h = new THREE.Path()
    h.absarc(cx, cy, r, 0, Math.PI * 2, true)
    s.holes.push(h)
  }
  switch (style) {
    case "five":
      window(5, Math.PI / 2, rf * 0.11, hubR * 1.25, rf * 0.84, 8)
      break
    case "multi":
      window(spec.spokes ?? 10, Math.PI / 2, rf * 0.05, hubR * 1.35, rf * 0.88, 5)
      break
    case "star":
      window(spec.spokes ?? 6, Math.PI / 2, rf * 0.085, hubR * 1.3, rf * 0.8, 6)
      break
    case "minilite":
      window(8, Math.PI / 2, rf * 0.055, hubR * 1.5, rf * 0.83, 5)
      break
    case "holes": {
      const n = spec.spokes ?? 8
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i / n) * Math.PI * 2
        circleHole(Math.cos(a) * rf * 0.6, Math.sin(a) * rf * 0.6, rf * 0.17)
      }
      break
    }
    case "disc": {
      const n = spec.spokes ?? 12
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i / n) * Math.PI * 2
        circleHole(Math.cos(a) * rf * 0.72, Math.sin(a) * rf * 0.72, rf * 0.075)
      }
      break
    }
    default:
      break
  }
  return s
}

/** Spoked face, dished so the hub stands proud of the spoke roots. */
function faceGeometry(spec: WheelSpec, q: Q) {
  const R = spec.radius
  const W = spec.width
  const rr = R * spec.rimRatio
  const rf = rr - Math.min(0.018, rr * 0.06)
  const dish = spec.dish ?? W * 0.22
  const t = Math.max(0.014, rr * 0.06)
  const g = new THREE.ExtrudeGeometry(faceShape(spec, rf), {
    depth: t,
    bevelEnabled: true,
    bevelThickness: t * 0.3,
    bevelSize: Math.min(0.006, rf * 0.02),
    bevelSegments: q.hq ? 3 : 1,
    curveSegments: q.hq ? 64 : 24,
  })
  // concave: push centre outward, roots inward
  const pos = g.getAttribute("position") as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const r = Math.hypot(x, y) / rf
    pos.setZ(i, pos.getZ(i) + dish * 0.55 * (1 - Math.min(1, r) ** 1.6))
  }
  g.computeVertexNormals()
  g.rotateY(Math.PI / 2)
  g.translate(W / 2 - dish - t, 0, 0)
  return g
}

function wireSpokes(spec: WheelSpec, q: Q) {
  const R = spec.radius
  const W = spec.width
  const rr = R * spec.rimRatio
  const n = q.hq ? 36 : 18
  const geos: THREE.BufferGeometry[] = []
  const hubR = rr * 0.2
  const xFace = W / 2 - 0.02
  const rad = q.hq ? 0.0042 : 0.006
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const layer = i % 3
    const twist = (layer === 0 ? 1 : -1) * 0.42
    const xh = xFace - 0.015 - layer * 0.03
    const xr = W / 2 - 0.07 - (layer === 2 ? 0.1 : 0)
    const a2 = a + twist
    const h = new THREE.Vector3(xh, Math.cos(a) * hubR, Math.sin(a) * hubR)
    const r = new THREE.Vector3(xr, Math.cos(a2) * rr * 0.96, Math.sin(a2) * rr * 0.96)
    geos.push(rod(h, r, rad, q.hq ? 5 : 3, false))
  }
  // hub shell
  const hub = new THREE.CylinderGeometry(hubR * 0.9, hubR * 1.15, 0.1, q.hq ? 24 : 10)
  hub.rotateZ(Math.PI / 2)
  hub.translate(xFace - 0.05, 0, 0)
  geos.push(hub)
  return mergeGeometries(geos.map((g) => g.toNonIndexed()))
}

function meshSpokes(spec: WheelSpec, q: Q) {
  // BBS-style cross spokes: pairs of thin bars from the hub ring to the rim.
  const R = spec.radius
  const W = spec.width
  const rr = R * spec.rimRatio
  const n = spec.spokes ?? 10
  const geos: THREE.BufferGeometry[] = []
  const x = W / 2 - (spec.dish ?? W * 0.18) - 0.012
  const hubR = rr * 0.3
  const rad = rr * 0.035
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    for (const d of [-1, 1]) {
      const h = new THREE.Vector3(x + 0.02, Math.cos(a) * hubR, Math.sin(a) * hubR)
      const a2 = a + d * (Math.PI / n) * 0.95
      const r = new THREE.Vector3(x - 0.015, Math.cos(a2) * rr * 0.93, Math.sin(a2) * rr * 0.93)
      geos.push(rod(h, r, rad, q.hq ? 6 : 4))
    }
  }
  const ring = new THREE.TorusGeometry(rr * 0.93, rad * 1.1, q.hq ? 8 : 4, q.hq ? 64 : 24)
  ring.rotateY(Math.PI / 2)
  ring.translate(x - 0.015, 0, 0)
  geos.push(ring)
  const hub = new THREE.CylinderGeometry(hubR * 1.05, hubR * 1.15, 0.05, q.hq ? 32 : 12)
  hub.rotateZ(Math.PI / 2)
  hub.translate(x + 0.02, 0, 0)
  geos.push(hub)
  return mergeGeometries(geos.map((g) => g.toNonIndexed()))
}

function centreNut(spec: WheelSpec, q: Q) {
  const rr = spec.radius * spec.rimRatio
  const W = spec.width
  const x = spec.style === "wire" ? W / 2 - 0.035 : spec.style === "mesh" ? W / 2 - (spec.dish ?? W * 0.18) + 0.02 : faceHubX(spec) - 0.008
  const geos: THREE.BufferGeometry[] = []
  if (spec.style === "wire") {
    // two-eared knock-off spinner
    const c = new THREE.CylinderGeometry(rr * 0.12, rr * 0.15, 0.05, q.hq ? 20 : 8)
    c.rotateZ(Math.PI / 2)
    c.translate(x + 0.03, 0, 0)
    geos.push(c)
    for (const s of [-1, 1]) {
      const ear = new THREE.BoxGeometry(0.022, rr * 0.1, rr * 0.34)
      ear.translate(x + 0.04, 0, s * rr * 0.18)
      ear.rotateX(0.5)
      geos.push(ear)
    }
  } else if (spec.centreLock) {
    const nut = new THREE.CylinderGeometry(rr * 0.13, rr * 0.15, 0.05, 6)
    nut.rotateZ(Math.PI / 2)
    nut.translate(x + 0.025, 0, 0)
    geos.push(nut)
    const pin = new THREE.SphereGeometry(rr * 0.07, q.hq ? 16 : 8, q.hq ? 10 : 6)
    pin.scale(0.6, 1, 1)
    pin.translate(x + 0.05, 0, 0)
    geos.push(pin)
  } else {
    const cap = new THREE.CylinderGeometry(rr * 0.1, rr * 0.13, 0.04, q.hq ? 24 : 10)
    cap.rotateZ(Math.PI / 2)
    cap.translate(x + 0.015, 0, 0)
    geos.push(cap)
    const n = spec.lugs ?? 5
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2
      const lug = new THREE.CylinderGeometry(rr * 0.035, rr * 0.035, 0.035, 6)
      lug.rotateZ(Math.PI / 2)
      lug.translate(x + 0.012, Math.cos(a) * rr * 0.2, Math.sin(a) * rr * 0.2)
      geos.push(lug)
    }
  }
  return mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)))
}

function discGeometry(spec: WheelSpec, q: Q) {
  const rr = spec.radius * spec.rimRatio
  const g = new THREE.CylinderGeometry(rr * 0.8, rr * 0.8, 0.028, q.hq ? 48 : 16, 1)
  g.rotateZ(Math.PI / 2)
  g.translate(-spec.width * 0.05, 0, 0)
  return g
}

function caliperGeometry(spec: WheelSpec, q: Q) {
  const rr = spec.radius * spec.rimRatio
  const s = new THREE.Shape()
  const r0 = rr * 0.58
  const r1 = rr * 0.86
  const a0 = -0.42
  const a1 = 0.42
  s.absarc(0, 0, r1, a0, a1, false)
  s.absarc(0, 0, r0, a1, a0, true)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: q.hq ? 3 : 1,
    curveSegments: q.hq ? 12 : 4,
  })
  g.translate(0, 0, -0.03)
  g.rotateY(Math.PI / 2)
  // sits at the trailing upper edge of the disc (toward −Z, +Y)
  g.rotateX(0.9)
  g.translate(spec.width * 0.06, 0, 0)
  return g
}

export function buildWheel(spec: WheelSpec, mats: CarMaterials, opts: { hq: boolean; side: 1 | -1; front: boolean }): WheelParts {
  const q = { hq: opts.hq }
  const hub = new THREE.Group()
  hub.name = opts.front ? "steer" : "hub"
  const spin = new THREE.Group()
  spin.name = "wheel"
  const visual = new THREE.Group()
  if (opts.side < 0) visual.rotation.y = Math.PI
  spin.add(visual)
  hub.add(spin)

  const tire = new THREE.Mesh(tireGeometry(spec, q), mats.rubber)
  tire.name = "tire"
  visual.add(tire)
  const barrel = new THREE.Mesh(barrelGeometry(spec, q), mats.rim)
  barrel.name = "rim-barrel"
  visual.add(barrel)
  if (spec.style === "wire") {
    visual.add(new THREE.Mesh(wireSpokes(spec, q), mats.rim))
  } else if (spec.style === "mesh") {
    visual.add(new THREE.Mesh(meshSpokes(spec, q), mats.rim))
  } else {
    const face = new THREE.Mesh(faceGeometry(spec, q), mats.rim)
    face.name = "rim-face"
    visual.add(face)
  }
  visual.add(new THREE.Mesh(centreNut(spec, q), spec.centreLock || spec.style === "wire" ? mats.rimAccent : mats.rim))
  if (spec.brakes !== false) {
    const disc = new THREE.Mesh(discGeometry(spec, q), mats.disc)
    disc.name = "disc"
    visual.add(disc)
    const cal = new THREE.Mesh(caliperGeometry(spec, q), mats.caliper)
    cal.name = "caliper"
    if (opts.side < 0) cal.scale.x = -1
    hub.add(cal)
  }
  return { hub, spin }
}
