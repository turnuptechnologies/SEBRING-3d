import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import type { CarCtx } from "./assemble"
import type { LoftPainter, LoftTarget } from "./livery"
import { featureArc, featurePoint, surfaceNormal, surfacePatch, surfacePoint } from "./loft"
import { airfoil, extrudeSide, rod, roundedPolyShape, tube } from "./shapes"

/** Detail parts shared by the bodies. All coordinates are real-car metres. */

export type PaintRef = "base" | "secondary" | "accent" | "carbon" | "trim" | "chrome"

export function paintMat(ctx: CarCtx, ref: PaintRef): THREE.Material {
  switch (ref) {
    case "base":
      return ctx.mats.base
    case "secondary":
      return ctx.mats.secondary
    case "accent":
      return ctx.mats.accent
    case "carbon":
      return ctx.mats.carbon
    case "chrome":
      return ctx.mats.chrome
    default:
      return ctx.mats.trim
  }
}

export interface WingOpts {
  span: number
  chord: number
  /** Leading edge position (centre). */
  z: number
  y: number
  thickness?: number
  camber?: number
  aoa?: number
  paint?: PaintRef
  /** Second element (flap) behind and above the main plane. */
  flap?: { chord: number; dz: number; dy: number; aoa?: number } | null
  /** Endplate outline in side view relative to the leading edge (z, y). */
  endplate?: Array<[number, number]> | null
  endplatePaint?: PaintRef
  endplateThickness?: number
  /** Gurney lip on the trailing edge. */
  gurney?: number
}

export function wing(ctx: CarCtx, o: WingOpts) {
  const st = ctx.hq ? 28 : 6
  const pts = ctx.hq ? 30 : 10
  const main = airfoil({
    span: o.span,
    chord: o.chord,
    thickness: o.thickness ?? 0.11,
    camber: o.camber ?? 0.06,
    aoa: o.aoa ?? -0.12,
    invert: true,
    stations: st,
    points: pts,
  })
  main.translate(0, o.y, o.z)
  const mat = paintMat(ctx, o.paint ?? "carbon")
  ctx.add(main, mat, "wing")
  if (o.flap) {
    const f = airfoil({
      span: o.span,
      chord: o.flap.chord,
      thickness: 0.1,
      camber: 0.05,
      aoa: o.flap.aoa ?? -0.45,
      invert: true,
      stations: st,
      points: pts,
    })
    f.translate(0, o.y + o.flap.dy, o.z + o.flap.dz)
    ctx.add(f, mat, "wing-flap")
  }
  if (o.gurney) {
    const tz = o.z - (o.flap ? -o.flap.dz + o.flap.chord : o.chord) * 0.98
    const g = new THREE.BoxGeometry(o.span, o.gurney, 0.008)
    g.translate(0, o.y + (o.flap ? o.flap.dy : 0) + o.gurney / 2 + 0.02, tz)
    ctx.add(g, ctx.mats.trim, "gurney")
  }
  if (o.endplate) {
    const shape = roundedPolyShape(
      o.endplate.map(([z, y]) => [o.z + z, o.y + y] as [number, number]),
      0.03
    )
    const t = o.endplateThickness ?? 0.014
    for (const sx of [-1, 1]) {
      const g = extrudeSide(shape, t, Math.min(0.005, t * 0.4), ctx.hq ? 8 : 3)
      g.translate(sx * (o.span / 2 + t / 2), 0, 0)
      ctx.add(g, paintMat(ctx, o.endplatePaint ?? o.paint ?? "carbon"), "endplate")
    }
  }
}

/** A side-view (z, y) profile extruded across X at ±x. */
export function sidePlate(ctx: CarCtx, outline: Array<[number, number]>, x: number, thickness: number, ref: PaintRef, round = 0.02, mirror = true) {
  const shape = roundedPolyShape(outline, round)
  for (const sx of mirror ? [-1, 1] : [1]) {
    const g = extrudeSide(shape, thickness, Math.min(0.006, thickness * 0.4), ctx.hq ? 8 : 3)
    g.translate(sx * x, 0, 0)
    ctx.add(g, paintMat(ctx, ref), "plate")
  }
}

/** Aero mirror: an ellipsoid pod on a stalk from the door. */
export function mirrors(ctx: CarCtx, o: { x: number; y: number; z: number; root: [number, number, number]; size?: [number, number, number]; paint?: PaintRef }) {
  const [sx, sy, sz] = o.size ?? [0.17, 0.085, 0.1]
  for (const side of [-1, 1]) {
    const pod = new THREE.SphereGeometry(1, ctx.hq ? 28 : 10, ctx.hq ? 18 : 6)
    pod.scale(sx / 2, sy / 2, sz / 2)
    pod.translate(side * o.x, o.y, o.z)
    ctx.add(pod, paintMat(ctx, o.paint ?? "base"), "mirror")
    const glassG = new THREE.CircleGeometry(1, ctx.hq ? 24 : 8)
    glassG.scale(sx * 0.42, sy * 0.36, 1)
    glassG.rotateY(Math.PI)
    glassG.translate(side * o.x, o.y, o.z - sz * 0.47)
    ctx.add(glassG, ctx.mats.chrome, "mirror-glass")
    const stalk = rod(new THREE.Vector3(side * o.root[0], o.root[1], o.root[2]), new THREE.Vector3(side * (o.x - sx * 0.3), o.y - sy * 0.1, o.z), 0.018, ctx.hq ? 10 : 5)
    ctx.add(stalk, ctx.mats.trim, "mirror-stalk")
  }
}

/** Exhaust tip: outer pipe, dark bore. Direction is the pipe axis (outward). */
export function exhaust(ctx: CarCtx, at: THREE.Vector3, dir: THREE.Vector3, r: number, len: number) {
  const d = dir.clone().normalize()
  const a = at.clone().addScaledVector(d, -len)
  const pipe = new THREE.CylinderGeometry(r, r, len, ctx.hq ? 24 : 10, 1, true)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
  pipe.applyQuaternion(q)
  const mid = a.clone().add(at).multiplyScalar(0.5)
  pipe.translate(mid.x, mid.y, mid.z)
  const m = ctx.add(pipe, ctx.mats.exhaust, "exhaust")
  ;(m.material as THREE.Material).side = THREE.DoubleSide
  const lip = new THREE.TorusGeometry(r, r * 0.12, 8, ctx.hq ? 24 : 10)
  lip.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d))
  lip.translate(at.x, at.y, at.z)
  ctx.add(lip, ctx.mats.exhaust, "exhaust-lip")
  const bore = new THREE.CircleGeometry(r * 0.92, ctx.hq ? 20 : 8)
  bore.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d))
  const b = at.clone().addScaledVector(d, -r * 1.2)
  bore.translate(b.x, b.y, b.z)
  ctx.add(bore, ctx.mats.dark, "exhaust-bore")
}

/**
 * Lamp cluster on the body surface: glossy black housing, emissive projector
 * pods and/or a DRL strip, then a domed clear lens. `s` is the signed arc
 * position; mirrored onto the other flank unless mirror is false.
 */
export function surfaceLamp(
  ctx: CarCtx,
  o: {
    z: number
    s: number
    hz: number
    hs: number
    kind: "head" | "tail"
    shape?: "ellipse" | "rect"
    round?: number
    /** Emissive element size as a fraction of the housing (when no pods). */
    inner?: number
    mirror?: boolean
    lens?: boolean
    /** Round projector pods inside the housing, spread along z. */
    pods?: number
    podScale?: number
    /** DRL strip along one edge of the housing: +1 = outer (larger |s|), −1 = inner. */
    drl?: 1 | -1 | null
  }
) {
  const data = ctx.body.data
  const sides = o.mirror === false ? [1] : [1, -1]
  const mat = o.kind === "head" ? ctx.mats.head : ctx.mats.tail
  const list = o.kind === "head" ? ctx.headlights : ctx.taillights
  const ring = ctx.hq ? 6 : 2
  const seg = ctx.hq ? 40 : 14
  for (const sgn of sides) {
    const s = o.s * sgn
    const housing = surfacePatch(data, { z: o.z, s, hz: o.hz, hs: o.hs, lift: 0.003, shape: o.shape, round: o.round, rings: ring, segments: seg })
    ctx.add(housing, ctx.mats.seal, `${o.kind}-housing`)
    if (o.pods && o.pods > 0) {
      for (let i = 0; i < o.pods; i++) {
        const t = o.pods === 1 ? 0 : (i + 0.5) / o.pods - 0.5
        const r = Math.min((o.hz * 2) / o.pods, o.hs * 2) * 0.3 * (o.podScale ?? 1)
        const zc = o.z + t * o.hz * 2 * 0.9
        const sc = s - (o.drl ? o.drl * sgn * o.hs * 0.18 : 0)
        const bezel = surfacePatch(data, { z: zc, s: sc, hz: r * 1.3, hs: r * 1.3, lift: 0.005, rings: 2, segments: ctx.hq ? 28 : 10, dome: 0.004 })
        ctx.add(bezel, ctx.mats.reflector, "lamp-bezel")
        const lamp = surfacePatch(data, { z: zc, s: sc, hz: r, hs: r, lift: 0.008, rings: ctx.hq ? 3 : 1, segments: ctx.hq ? 28 : 10, dome: 0.006 })
        list.push(ctx.add(lamp, mat, `${o.kind}light`))
      }
    } else if (!o.drl) {
      const inner = o.inner ?? 0.7
      const lamp = surfacePatch(data, { z: o.z, s, hz: o.hz * inner, hs: o.hs * inner, lift: 0.007, shape: o.shape, round: o.round, rings: ctx.hq ? 4 : 1, segments: seg })
      list.push(ctx.add(lamp, mat, `${o.kind}light`))
    }
    if (o.drl) {
      const strip = surfacePatch(data, {
        z: o.z,
        s: s + o.drl * sgn * o.hs * 0.72,
        hz: o.hz * 0.9,
        hs: o.hs * 0.1,
        lift: 0.007,
        shape: "rect",
        round: 1,
        rings: ctx.hq ? 3 : 1,
        segments: seg,
      })
      list.push(ctx.add(strip, mat, `${o.kind}light`))
    }
    if (o.lens !== false) {
      const lens = surfacePatch(data, { z: o.z, s, hz: o.hz * 1.03, hs: o.hs * 1.03, lift: 0.012, shape: o.shape, round: o.round, rings: ring, segments: seg, dome: 0.012 })
      ctx.add(lens, ctx.mats.lens, "lens")
    }
  }
}

/** Round lamp on a plane: chrome bezel, emissive face, domed lens. Normal is the facing direction. */
export function roundLamp(ctx: CarCtx, at: THREE.Vector3, normal: THREE.Vector3, r: number, kind: "head" | "tail", depth = 0.03) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize())
  const place = (g: THREE.BufferGeometry, off: number) => {
    g.applyQuaternion(q)
    const p = at.clone().addScaledVector(normal, off)
    g.translate(p.x, p.y, p.z)
    return g
  }
  const seg = ctx.hq ? 32 : 12
  const bezel = new THREE.TorusGeometry(r * 1.05, r * 0.13, ctx.hq ? 10 : 4, seg)
  ctx.add(place(bezel, depth * 0.3), ctx.mats.chrome, "bezel")
  const bowl = new THREE.CylinderGeometry(r * 1.02, r * 0.8, depth, seg, 1, true)
  bowl.rotateX(Math.PI / 2)
  const bm = ctx.add(place(bowl, -depth * 0.2), ctx.mats.reflector, "bowl")
  ;(bm.material as THREE.Material).side = THREE.DoubleSide
  const face = new THREE.CircleGeometry(r * 0.96, seg)
  const mat = kind === "head" ? ctx.mats.head : ctx.mats.tail
  const m = ctx.add(place(face, 0.002), mat, `${kind}light`)
  ;(kind === "head" ? ctx.headlights : ctx.taillights).push(m)
  const lens = new THREE.SphereGeometry(r * 1.02, seg, ctx.hq ? 10 : 4, 0, Math.PI * 2, 0, Math.PI * 0.22)
  lens.rotateX(Math.PI / 2)
  lens.translate(0, 0, -r * 1.02 * Math.cos(Math.PI * 0.22))
  ctx.add(place(lens, 0.004), ctx.mats.lens, "lens")
}

/** A flat lamp bar on a plane facing `normal` (tail light bars, DRLs). */
export function lampBar(ctx: CarCtx, at: THREE.Vector3, normal: THREE.Vector3, w: number, h: number, kind: "head" | "tail", housing = true) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize())
  const mk = (g: THREE.BufferGeometry, off: number) => {
    g.applyQuaternion(q)
    const p = at.clone().addScaledVector(normal, off)
    g.translate(p.x, p.y, p.z)
    return g
  }
  if (housing) {
    const hshape = roundedPolyShape(
      [
        [-w / 2 - 0.02, -h / 2 - 0.02],
        [w / 2 + 0.02, -h / 2 - 0.02],
        [w / 2 + 0.02, h / 2 + 0.02],
        [-w / 2 - 0.02, h / 2 + 0.02],
      ],
      Math.min(h * 0.4, 0.03)
    )
    const hg = new THREE.ExtrudeGeometry(hshape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 6 })
    ctx.add(mk(hg, -0.006), ctx.mats.trim, "lamp-housing")
  }
  const shape = roundedPolyShape(
    [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ],
    Math.min(h * 0.45, 0.02)
  )
  const g = new THREE.ShapeGeometry(shape, 6)
  const mat = kind === "head" ? ctx.mats.head : ctx.mats.tail
  const m = ctx.add(mk(g, 0.012), mat, `${kind}light`)
  ;(kind === "head" ? ctx.headlights : ctx.taillights).push(m)
}

/** Point and outward normal on the body loft at (z, s). */
export function onBody(ctx: CarCtx, z: number, s: number) {
  return { p: surfacePoint(ctx.body.data, z, s), n: surfaceNormal(ctx.body.data, z, s) }
}

/** Louvred vent: a row of thin slats standing on the body surface. */
export function louvres(ctx: CarCtx, o: { z0: number; z1: number; s0: number; s1: number; count: number; mirror?: boolean; height?: number }) {
  const geos: THREE.BufferGeometry[] = []
  for (const sgn of o.mirror === false ? [1] : [1, -1]) {
    for (let i = 0; i < o.count; i++) {
      const z = o.z0 + ((o.z1 - o.z0) * (i + 0.5)) / o.count
      const a = onBody(ctx, z, o.s0 * sgn)
      const b = onBody(ctx, z, o.s1 * sgn)
      const h = o.height ?? 0.018
      const len = a.p.distanceTo(b.p)
      const slat = new THREE.BoxGeometry(len, h, 0.012)
      const mid = a.p.clone().add(b.p).multiplyScalar(0.5)
      const n = a.n.clone().add(b.n).normalize()
      const xdir = b.p.clone().sub(a.p).normalize()
      const zdir = new THREE.Vector3().crossVectors(xdir, n).normalize()
      const m = new THREE.Matrix4().makeBasis(xdir, n, zdir)
      slat.applyMatrix4(m)
      slat.translate(mid.x + n.x * h * 0.3, mid.y + n.y * h * 0.3, mid.z + n.z * h * 0.3)
      geos.push(slat.toNonIndexed())
    }
  }
  if (geos.length) ctx.add(mergeGeometries(geos), ctx.mats.trim, "louvres")
}

export function tubeAlong(ctx: CarCtx, pts: THREE.Vector3[], r: number, mat: THREE.Material, name = "tube") {
  return ctx.add(tube(pts, r, ctx.hq ? 10 : 5, ctx.hq ? pts.length * 10 : pts.length * 3), mat, name)
}

/** Signed-arc position of a template corner (fraction f along its fillet) at z. */
export function cornerArc(t: LoftTarget, z: number, corner: number, f = 0.5) {
  const [a, b] = t.features.corner[corner]
  return featureArc(t.data, z, Math.round(a + (b - a) * f))
}

/** x, y of a template corner at z. */
export function cornerPoint(t: LoftTarget, z: number, corner: number, f = 0.5) {
  const [a, b] = t.features.corner[corner]
  return featurePoint(t.data, z, Math.round(a + (b - a) * f))
}

/** NACA duct: tapered dark recess drawn on a loft in (z, s) — opens toward −z. */
export function nacaTop(p: LoftPainter, z: number, s: number, len: number, w: number, mirror = true) {
  const pts: Array<[number, number]> = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const half = (w / 2) * (0.12 + 0.88 * Math.pow(t, 1.6))
    pts.push([z - t * len, s + half])
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n
    const half = (w / 2) * (0.12 + 0.88 * Math.pow(t, 1.6))
    pts.push([z - t * len, s - half])
  }
  const g = p.gradient([z, s], [z - len, s], [
    [0, "#2a2a30"],
    [1, "#050506"],
  ])
  p.topPoly(pts, g, mirror)
}

/** NACA duct on the flank (side projection), opening toward −z. */
export function nacaFlank(p: LoftPainter, z: number, y: number, len: number, h: number) {
  const pts: Array<[number, number]> = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([z - t * len, y + (h / 2) * (0.12 + 0.88 * Math.pow(t, 1.6))])
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n
    pts.push([z - t * len, y - (h / 2) * (0.12 + 0.88 * Math.pow(t, 1.6))])
  }
  p.flankPoly(pts, "#060607")
}
