import * as THREE from "three"
import { LoftGeometry } from "three/examples/jsm/geometries/LoftGeometry.js"

import { canvasToTexture, makeCanvas } from "./canvas"
import { CoilCurve, deform, filletProfile, knurledCylinder, lathe, planExtrude, profileX, spline, superellipse, tube } from "./geometry"
import * as M from "./materials"

/**
 * Reusable sub-assemblies shared by the trackside models: knobs, binding posts,
 * feet, screws, LEDs, alligator clips, cords and displays. Sizes are in units
 * (1 unit = 150 mm). Everything is built around its own origin, Y up.
 */

export const mm = (v: number) => v / 150

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], at?: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat)
  if (at) m.position.set(at[0], at[1], at[2])
  if (rot) m.rotation.set(rot[0], rot[1], rot[2])
  return m
}

export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group()
  if (children.length) g.add(...children)
  return g
}

/* ----------------------------------------------------------------- knobs */

export interface KnobOptions {
  radius: number
  height: number
  ribs?: number
  body?: THREE.Material
  /** Coloured cap insert on the top face. */
  cap?: THREE.Material | null
  indicator?: string | null
  /** Flat skirt below the knurl. */
  skirt?: { radius: number; height: number; material?: THREE.Material } | null
  segments?: number
}

/** Machined knurled knob, axis +Y, sitting on y = 0. */
export function knob(o: KnobOptions) {
  const g = new THREE.Group()
  const body = o.body ?? M.brushed("#d9dce1", { repeat: 40 })
  let y = 0
  if (o.skirt) {
    const s = o.skirt
    const prof = filletProfile(
      [
        [0, 0],
        [s.radius, 0],
        [s.radius, s.height * 0.55],
        [o.radius * 1.02, s.height],
        [0, s.height],
      ],
      s.height * 0.3
    )
    g.add(mesh(lathe(prof, o.segments ?? 64), s.material ?? body))
    y = s.height
  }
  const ribs = o.ribs ?? Math.max(18, Math.round(o.radius * 900))
  const kn = mesh(knurledCylinder(o.radius, o.height, ribs, o.radius * 0.06, o.radius * 0.08), body)
  kn.position.y = y
  g.add(kn)
  const top = y + o.height
  if (o.cap) {
    const capR = o.radius * 0.72
    const cap = mesh(
      lathe(
        [
          [0, 0],
          [capR, 0],
          [capR, o.height * 0.05],
          [capR * 0.96, o.height * 0.09],
          [0, o.height * 0.11],
        ],
        o.segments ?? 48
      ),
      o.cap
    )
    cap.position.y = top - o.height * 0.06
    g.add(cap)
  }
  if (o.indicator) {
    const line = mesh(new THREE.BoxGeometry(o.radius * 0.09, o.height * 0.06, o.radius * 0.62), M.ink(o.indicator, 0.4))
    line.position.set(0, top + (o.cap ? o.height * 0.045 : 0.0005), o.radius * 0.5)
    g.add(line)
  }
  return g
}

/* ----------------------------------------------------------------- binding post */

/** 4 mm binding post: nickel base nut, coloured knurled cap, gold contact. Axis +Y. */
export function bindingPost(capColor: string, scale = 1) {
  const g = new THREE.Group()
  const s = (v: number) => mm(v) * scale
  const hex = mesh(new THREE.CylinderGeometry(s(7.5), s(7.5), s(3), 6), M.nickel(0.25))
  hex.position.y = s(1.5)
  g.add(hex)
  const collar = mesh(
    lathe(
      filletProfile(
        [
          [0, s(3)],
          [s(6.5), s(3)],
          [s(6.5), s(6)],
          [s(5.6), s(7)],
          [0, s(7)],
        ],
        s(0.8)
      ),
      48
    ),
    M.gloss(capColor, { roughness: 0.3 })
  )
  g.add(collar)
  const capBody = mesh(knurledCylinder(s(6), s(11), 22, s(0.45), s(0.9)), M.gloss(capColor, { roughness: 0.28 }))
  capBody.position.y = s(7)
  g.add(capBody)
  const topRing = mesh(new THREE.TorusGeometry(s(2.6), s(0.7), 12, 40), M.gold())
  topRing.rotation.x = Math.PI / 2
  topRing.position.y = s(18.05)
  g.add(topRing)
  const hole = mesh(new THREE.CircleGeometry(s(2.2), 32), M.voidMat())
  hole.rotation.x = -Math.PI / 2
  hole.position.y = s(18.1)
  g.add(hole)
  return g
}

/* ----------------------------------------------------------------- feet & fasteners */

export function rubberFoot(radius: number, height: number) {
  const prof = filletProfile(
    [
      [0, 0],
      [radius * 0.9, 0],
      [radius, height * 0.4],
      [radius * 0.92, height],
      [0, height],
    ],
    height * 0.35
  )
  return mesh(lathe(prof, 40), M.rubberSoft("#101012", { repeat: 30 }))
}

/** Socket-head cap screw seen head-on: axis +Y, head top at y = height. */
export function socketScrew(radius: number, material: THREE.Material = M.steel(0.32, "#7c8088")) {
  const h = radius * 0.9
  const g = new THREE.Group()
  g.add(
    mesh(
      lathe(
        filletProfile(
          [
            [0, 0],
            [radius, 0],
            [radius, h * 0.85],
            [radius * 0.86, h],
            [0, h],
          ],
          radius * 0.12
        ),
        28
      ),
      material
    )
  )
  const socket = mesh(new THREE.CircleGeometry(radius * 0.46, 6), M.voidMat())
  socket.rotation.x = -Math.PI / 2
  socket.position.y = h + 0.0004
  g.add(socket)
  return g
}

/** Domed LED in a bezel, axis +Y. */
export function led(color: string, radius: number, lit = true) {
  const g = new THREE.Group()
  const bezel = mesh(new THREE.TorusGeometry(radius * 1.12, radius * 0.22, 12, 40), M.chrome())
  bezel.rotation.x = Math.PI / 2
  bezel.position.y = radius * 0.12
  g.add(bezel)
  const dome = mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    lit ? M.glow(color, 2.6) : M.lens(color)
  )
  dome.scale.y = 0.75
  g.add(dome)
  return g
}

/* ----------------------------------------------------------------- glow sprites */

let haloTex: THREE.Texture | null | undefined
function haloTexture() {
  if (haloTex !== undefined) return haloTex
  const c = makeCanvas(128, 128)
  if (!c) return (haloTex = null)
  const ctx = c.getContext("2d")!
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, "rgba(255,255,255,1)")
  gr.addColorStop(0.18, "rgba(255,255,255,0.55)")
  gr.addColorStop(0.45, "rgba(255,255,255,0.14)")
  gr.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, 128, 128)
  haloTex = canvasToTexture(c)
  return haloTex
}

/** Flat additive glow lying on a surface (light spill around LEDs and displays). Plane in XY, facing +Z. */
export function haloPlane(color: string, size: number, opacity = 0.6) {
  return mesh(new THREE.PlaneGeometry(size, size), M.halo(haloTexture(), color, opacity))
}

/* ----------------------------------------------------------------- display */

/** Emissive readout under reflective cover glass. Plane in XY facing +Z, w × h units. */
export function display(canvas: HTMLCanvasElement | null, w: number, h: number, intensity = 1.6) {
  const g = new THREE.Group()
  const map = canvas ? canvasToTexture(canvas, { anisotropy: 8 }) : null
  g.add(mesh(new THREE.PlaneGeometry(w, h), M.screen(map, intensity)))
  const glass = mesh(new THREE.PlaneGeometry(w, h), M.coverGlass())
  glass.position.z = 0.0006
  glass.renderOrder = 2
  g.add(glass)
  return g
}

/** Printed decal plane (XY, facing +Z). */
export function decalPlane(canvas: HTMLCanvasElement | null, w: number, h: number, o: { roughness?: number; metal?: boolean } = {}) {
  const map = canvas ? canvasToTexture(canvas, { anisotropy: 8 }) : null
  const m = mesh(new THREE.PlaneGeometry(w, h), M.decal(map, o))
  m.renderOrder = 1
  return m
}

export type Face = "+x" | "-x" | "+y" | "+z" | "-z"

/**
 * Orients an XY plane so its canvas reads correctly from outside the given face:
 * vertical faces keep canvas-up = world up; on "+y" canvas-up points to −Z (rear),
 * so text reads from the front. Canvas-right per face: +z → +X, +x → −Z, −x → +Z,
 * −z → −X, +y → +X.
 */
export function orientToFace(o: THREE.Object3D, face: Face) {
  o.rotation.set(0, 0, 0)
  if (face === "+x") o.rotation.y = Math.PI / 2
  else if (face === "-x") o.rotation.y = -Math.PI / 2
  else if (face === "-z") o.rotation.y = Math.PI
  else if (face === "+y") o.rotation.x = -Math.PI / 2
  return o
}

/** Decal on a face, centred at `at`. */
export function faceDecal(canvas: HTMLCanvasElement | null, w: number, h: number, face: Face, at: [number, number, number], o: { roughness?: number; metal?: boolean } = {}) {
  const d = orientToFace(decalPlane(canvas, w, h, o), face)
  d.position.set(at[0], at[1], at[2])
  return d
}

/* ----------------------------------------------------------------- wires & cords */

/** Round cable along a smooth path. */
export function cable(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 96, radial = 12) {
  return mesh(tube(spline(points), radius, segments, radial), material)
}

/**
 * Coiled cord: a helix of `turns` wound around `path` (centreline) with coil
 * radius `coilRadius`, cord radius `cordRadius`.
 */
export function coiledCord(path: THREE.Curve<THREE.Vector3>, coilRadius: number, cordRadius: number, turns: number, material: THREE.Material, quality = 1) {
  const curve = new CoilCurve(path, coilRadius, turns)
  return mesh(tube(curve, cordRadius, Math.round(turns * 28 * quality), Math.max(6, Math.round(10 * quality))), material)
}

/** Stripped, twisted, tinned conductor end: `strands` fine wires around the axis. Along +Z from z = 0. */
export function strandedEnd(length: number, radius: number, strands = 7, material: THREE.Material = M.nickel(0.3)) {
  const g = new THREE.Group()
  const r = radius / 3
  for (let i = 0; i < strands; i++) {
    const core = i === 0
    const a0 = (i / Math.max(1, strands - 1)) * Math.PI * 2
    const pts: THREE.Vector3[] = []
    for (let k = 0; k <= 12; k++) {
      const t = k / 12
      const a = a0 + t * Math.PI * 1.4
      const rr = core ? 0 : r * 2 * (1 - t * 0.15)
      pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, t * length * (core ? 1.02 : 1)))
    }
    g.add(mesh(tube(spline(pts), r, 24, 6), material))
  }
  return g
}

/* ----------------------------------------------------------------- alligator clip */

export interface ClipOptions {
  boot: string
  /** Jaw opening, radians. */
  open?: number
  quality?: number
}

/**
 * Insulated alligator clip lying flat: wire enters at the origin from -Z, jaws
 * point along +Z (tip at z ≈ 0.31). Bottom of the boot sits at y = -0.028.
 */
export function alligatorClip(o: ClipOptions) {
  const g = new THREE.Group()
  const q = o.quality ?? 1
  const seg = Math.max(16, Math.round(36 * q))

  // Insulating boot: flattened, tapering to the lead, ribbed finger grip.
  const bootLen = mm(26)
  const sections: THREE.Vector3[][] = []
  const rows = Math.max(24, Math.round(44 * q))
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const z = t * bootLen
    const taper = t < 0.32 ? 0.42 + 0.58 * Math.sin((t / 0.32) * Math.PI * 0.5) : 1
    const ridge = t > 0.44 && t < 0.86 ? Math.max(0, Math.sin(((t - 0.44) / 0.42) * Math.PI * 5)) ** 2 * mm(0.5) : 0
    const flare = t > 0.86 ? mm(0.35) * Math.sin(((t - 0.86) / 0.14) * Math.PI * 0.5) : 0
    const nose = t > 0.95 ? -mm(1.4) * ((t - 0.95) / 0.05) ** 2 : 0
    const w = mm(10.4) * taper + ridge + flare + nose
    const h = mm(7.4) * taper + ridge * 0.7 + flare + nose
    sections.push(superellipse(w, h, 3.4, seg).map((p) => new THREE.Vector3(p.x, p.y, z)))
  }
  g.add(mesh(new LoftGeometry(sections, { capStart: true, capEnd: true }), M.pvc(o.boot)))

  // Stamped U-channel jaws with interlocking teeth.
  const jawMat = M.nickel(0.3)
  const open = o.open ?? 0
  const pivotZ = bootLen + mm(1.2)
  const L = mm(16)
  const back = mm(4.5)
  const halfW = (z: number) => {
    const t = Math.min(1, Math.max(0, (z + back) / (L + back)))
    return THREE.MathUtils.lerp(mm(3.3), mm(1.5), Math.pow(t, 1.4))
  }
  const lift = (z: number) => mm(1.1) * (1 - Math.min(1, Math.max(0, (z + back) / (L + back))))
  const teeth = 8
  const pitch = (L - mm(1)) / teeth
  // One stamped jaw (upper); the lower jaw is the same part turned over.
  const jawPart = () => {
    const j = new THREE.Group()
    const outline = new THREE.Shape()
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const z = -back + ((L + back) * i) / steps
      if (i === 0) outline.moveTo(halfW(z), z)
      else outline.lineTo(halfW(z), z)
    }
    outline.quadraticCurveTo(0, L + mm(1.2), -halfW(L), L)
    for (let i = steps; i >= 0; i--) {
      const z = -back + ((L + back) * i) / steps
      outline.lineTo(-halfW(z), z)
    }
    const plate = planExtrude(outline, mm(0.55), { bevel: mm(0.12), bevelSegments: 1, curveSegments: 6 })
    deform(plate, (p) => {
      p.y += mm(1.05) + lift(p.z)
    })
    j.add(mesh(plate, jawMat))
    for (const side of [-1, 1]) {
      const wall = new THREE.Shape()
      wall.moveTo(-back, mm(1.3))
      wall.lineTo(-back, mm(0.5))
      for (let k = 0; k < teeth; k++) {
        wall.lineTo(mm(0.6) + pitch * k, mm(0.45))
        wall.lineTo(mm(0.6) + pitch * (k + 0.55), -mm(0.38))
      }
      wall.lineTo(L - mm(0.2), mm(0.3))
      wall.lineTo(L - mm(0.2), mm(1.2))
      wall.closePath()
      const wg = profileX(wall, mm(0.42), { curveSegments: 1 })
      deform(wg, (p) => {
        p.x += side * (halfW(p.z) - mm(0.2))
        p.y += lift(p.z)
      })
      j.add(mesh(wg, jawMat))
    }
    return j
  }
  const upper = new THREE.Group()
  upper.add(jawPart())
  upper.position.z = pivotZ
  upper.rotation.x = -open
  const lower = new THREE.Group()
  const flipped = jawPart()
  flipped.rotation.z = Math.PI
  flipped.position.z = pitch / 2
  lower.add(flipped)
  lower.position.z = pivotZ
  lower.rotation.x = open
  g.add(upper, lower)

  const rivet = mesh(new THREE.CylinderGeometry(mm(0.95), mm(0.95), mm(7.6), 18), M.steel(0.26, "#c2c6cb"), [0, mm(0.2), pivotZ - mm(1)], [0, 0, Math.PI / 2])
  g.add(rivet)
  const springPath = new THREE.LineCurve3(new THREE.Vector3(-mm(2.1), mm(0.2), pivotZ - mm(1)), new THREE.Vector3(mm(2.1), mm(0.2), pivotZ - mm(1)))
  g.add(coiledCord(springPath, mm(1.55), mm(0.3), 4, M.steel(0.22, "#d6d9dd"), q))
  return g
}

/** Clip boot half-height — offset to rest a flat clip on the floor. */
export const CLIP_REST = mm(3.75)
