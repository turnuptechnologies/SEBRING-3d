import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { segs, type BuildContext } from "./context"
import { FONT, drawDialScale, drawText, makeCanvas } from "./kit/canvas"
import { deform, filletProfile, lathe, loft, profileX, slab, smoothstep, spline, type LoftStation } from "./kit/geometry"
import * as M from "./kit/materials"
import {
  CLIP_REST,
  alligatorClip,
  cable,
  coiledCord,
  faceDecal,
  haloPlane,
  knob,
  led,
  mesh,
  mm,
  socketScrew,
} from "./kit/parts"

const INK = "rgba(246,244,238,0.92)"
const INK_DIM = "rgba(246,244,238,0.6)"

/** Tapered rubber strain relief, axis +Y from the origin. */
function strainRelief(ctx: BuildContext, length: number, r0: number, r1: number, color = "#141417") {
  const ribs: [number, number][] = [[r0, 0]]
  const n = 7
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const r = THREE.MathUtils.lerp(r0 * 0.92, r1, t)
    ribs.push([r + (i % 2 ? mm(0.35) : 0), length * (0.25 + 0.75 * t) - mm(0.6)], [r, length * (0.25 + 0.75 * t)])
  }
  ribs.push([0, length])
  return mesh(lathe(filletProfile(ribs, mm(0.5), 2), segs(ctx, 32)), M.rubberSoft(color, { repeat: 40 }))
}

/* ===========================================================================
 * Pistol — raceway electronic controller
 * ========================================================================= */

function pistolGripShape(b: number) {
  const s = new THREE.Shape()
  const bottom = mm(5) + b
  const top = mm(117)
  const frontAt = (y: number) => {
    const t = (y - bottom) / (top - bottom)
    let z = THREE.MathUtils.lerp(mm(-12), mm(-1), t)
    for (const gy of [36, 61, 86]) z -= Math.exp(-(((y - mm(gy)) / mm(8.2)) ** 2)) * mm(3.2)
    return z
  }
  s.moveTo(mm(-50), bottom)
  s.lineTo(mm(-17), bottom)
  s.quadraticCurveTo(frontAt(bottom), bottom, frontAt(bottom + mm(6)), bottom + mm(6))
  for (let y = bottom + mm(6); y < top; y += mm(1.5)) s.lineTo(frontAt(y), y)
  s.lineTo(frontAt(top), top)
  s.lineTo(mm(-46), top)
  s.bezierCurveTo(mm(-49), mm(100), mm(-56.5), mm(76), mm(-55.5), mm(50))
  s.bezierCurveTo(mm(-55), mm(30), mm(-55), bottom + mm(5), mm(-50), bottom)
  return s
}

function pistolHeadShape() {
  const s = new THREE.Shape()
  s.moveTo(mm(-60), mm(114))
  s.lineTo(mm(57), mm(114))
  s.quadraticCurveTo(mm(63), mm(114), mm(63), mm(121))
  s.lineTo(mm(63), mm(127))
  s.lineTo(mm(55.5), mm(144))
  s.lineTo(mm(-50), mm(144))
  s.lineTo(mm(-58), mm(137))
  s.lineTo(mm(-60), mm(120))
  s.closePath()
  return s
}

function pistolTriggerShape() {
  const s = new THREE.Shape()
  s.moveTo(mm(12), mm(116))
  s.lineTo(mm(30), mm(116))
  s.bezierCurveTo(mm(31.5), mm(100), mm(33.5), mm(84), mm(31), mm(70))
  s.bezierCurveTo(mm(29), mm(61), mm(24), mm(55), mm(19), mm(55))
  s.bezierCurveTo(mm(16), mm(55), mm(15), mm(58), mm(16.5), mm(61))
  s.bezierCurveTo(mm(20), mm(70), mm(21.5), mm(84), mm(20.5), mm(97))
  s.bezierCurveTo(mm(19.5), mm(106), mm(15), mm(112), mm(12), mm(116))
  return s
}

/** +X cheek graphics. Canvas spans z 58.5 → −55.5 mm (left → right), y 144 → 114 mm. */
function pistolSideArt(ohms: number) {
  const k = 12
  const W = 114
  const H = 30
  const c = makeCanvas(W * k, H * k)
  if (!c) return null
  const g = c.getContext("2d")!
  const u = (z: number) => (58.5 - z) * k
  const v = (y: number) => (144 - y) * k
  for (const kn of [
    { z: 40, label: "BRAKE" },
    { z: 14, label: "CHOKE" },
  ]) {
    drawDialScale(g, { cx: u(kn.z), cy: v(129), r0: 9.3 * k, r1: 10.8 * k, from: -135, to: 135, majors: 5, minors: 1, color: INK, width: 0.26 * k })
    drawText(g, kn.label, u(kn.z), v(116.2), { size: 2.2 * k, font: FONT.din, weight: 700, color: INK, align: "center", tracking: 0.4 * k })
  }
  const x0 = u(-6)
  drawText(g, `${ohms}`, x0, v(124.5), { size: 12 * k, font: FONT.display, weight: 800, italic: true, color: INK })
  g.font = `italic 800 ${12 * k}px ${FONT.display}`
  const w = g.measureText(`${ohms}`).width
  drawText(g, "Ω", x0 + w + 0.8 * k, v(124.5), { size: 7 * k, font: FONT.sans, weight: 500, color: INK })
  drawText(g, "RACE ELECTRONIC", x0 + 0.3 * k, v(119.6), { size: 2.3 * k, font: FONT.din, weight: 700, color: INK, tracking: 0.5 * k })
  drawText(g, "12–18 V DC · 0–100 %", x0 + 0.3 * k, v(116.3), { size: 1.8 * k, font: FONT.mono, weight: 500, color: INK_DIM })
  return c
}

/** Lid-top graphics. Canvas u → +X (−14 … 14 mm), v → +Z (rear −42 at the top row … front 48). */
function pistolTopArt(knobZ: number, accent: string) {
  const k = 12
  const c = makeCanvas(28 * k, 90 * k)
  if (!c) return null
  const g = c.getContext("2d")!
  const u = (x: number) => (x + 14) * k
  const v = (z: number) => (z + 42) * k
  const cx = u(0)
  const cy = v(knobZ)
  // Scale reads from the operator's side: rotate so 0 sits toward the rear.
  g.save()
  g.translate(cx, cy)
  g.rotate(Math.PI)
  g.translate(-cx, -cy)
  drawDialScale(g, { cx, cy, r0: 11.4 * k, r1: 12.9 * k, from: -125, to: 125, majors: 10, minors: 1, color: INK, width: 0.22 * k })
  g.restore()
  for (let i = 0; i <= 10; i += 5) {
    const a = Math.PI + ((-125 + (250 * i) / 10) * Math.PI) / 180
    drawText(g, `${i}`, cx + Math.sin(a) * 14.6 * k * 0.92, cy - Math.cos(a) * 14.6 * k * 0.92 + 0.6 * k, {
      size: 1.7 * k,
      font: FONT.din,
      weight: 700,
      color: INK_DIM,
      align: "center",
    })
  }
  drawText(g, "SENS", cx, v(knobZ - 16), { size: 2.6 * k, font: FONT.din, weight: 700, color: INK, align: "center", tracking: 0.5 * k })
  g.fillStyle = accent
  g.fillRect(u(-6), v(knobZ - 20.5), 12 * k, 0.5 * k)
  drawText(g, "PWR", u(8), v(-24.5), { size: 1.8 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center", tracking: 0.3 * k })
  return c
}

function buildPistol(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const accent = art.accent ?? "#ff4b3a"
  const headMat = M.anodized(art.color, { repeat: 30 })
  const darkAlu = M.anodized("#2a2a30", { repeat: 30, roughness: 0.4 })
  const gripMat = M.rubberSoft(art.secondary ?? "#1a1a1f", { repeat: 26, grain: 0.55 })
  const knobMat = M.brushed("#e2e5e9", { repeat: 60, rotation: Math.PI / 2 })

  // Base plate.
  const base = mesh(slab(mm(40), mm(5), mm(60), { radius: mm(8), bevel: mm(1.4) }), headMat)
  base.position.set(0, 0, mm(-32))
  root.add(base)

  // Grip: extruded profile, then sculpted — thin at the finger edge, palm swell, flared heel.
  const gb = mm(8)
  const grip = profileX(pistolGripShape(gb), mm(29), { bevel: gb, bevelSegments: segs(ctx, 7), curveSegments: 24 })
  deform(grip, (p) => {
    const front = smoothstep(mm(-26), mm(2), p.z)
    const swell = Math.exp(-(((p.y - mm(64)) / mm(34)) ** 2)) * smoothstep(mm(-24), mm(-52), p.z)
    const flare = 1 - smoothstep(mm(12), mm(36), p.y)
    p.x *= (1 - 0.2 * front) * (1 + 0.12 * swell) * (1 + 0.14 * flare)
  })
  root.add(mesh(grip, gripMat))

  // Head, lid and rear heat sink.
  root.add(mesh(profileX(pistolHeadShape(), mm(36), { bevel: mm(3), bevelSegments: segs(ctx, 4), curveSegments: 12 }), headMat))
  const lid = mesh(slab(mm(28), mm(3.6), mm(90), { radius: mm(4), bevel: mm(1.2) }), darkAlu)
  lid.position.set(0, mm(146.6), mm(3))
  root.add(lid)
  const core = mesh(slab(mm(22), mm(29), mm(25), { radius: mm(2), bevel: mm(1) }), darkAlu)
  core.position.set(0, mm(115), mm(-75))
  root.add(core)
  for (let i = 0; i < 6; i++) {
    const fin = mesh(slab(mm(32), mm(31.5), mm(2.3), { radius: mm(1), bevel: mm(0.6) }), darkAlu)
    fin.position.set(0, mm(113.8), mm(-66.2 - i * 4.4))
    root.add(fin)
  }

  // Trigger, widening into a finger pad.
  const trigger = profileX(pistolTriggerShape(), mm(12), { bevel: mm(2.2), bevelSegments: segs(ctx, 4), curveSegments: 28 })
  deform(trigger, (p) => {
    p.x *= 1 + 0.32 * smoothstep(mm(96), mm(62), p.y)
  })
  root.add(mesh(trigger, M.anodized(accent, { repeat: 30 })))
  root.add(mesh(new THREE.CylinderGeometry(mm(2.2), mm(2.2), mm(36.6), 24), M.chrome(), [0, mm(117), mm(21.5)], [0, 0, Math.PI / 2]))

  // Dials.
  const topZ = 27
  const top = knob({
    radius: mm(9.5),
    height: mm(8.5),
    body: knobMat,
    cap: M.anodized(accent, { repeat: 40 }),
    indicator: "#f6f4ee",
    skirt: { radius: mm(11), height: mm(1.6), material: darkAlu },
    segments: segs(ctx, 64),
  })
  top.position.set(0, mm(150.2), mm(topZ))
  top.rotation.y = 2.4
  root.add(top)
  for (const [z, turn] of [
    [40, 0.7],
    [14, -0.5],
  ] as const) {
    const k = knob({
      radius: mm(6.4),
      height: mm(7.5),
      body: knobMat,
      cap: darkAlu,
      indicator: accent,
      skirt: { radius: mm(8), height: mm(1.3), material: darkAlu },
      segments: segs(ctx, 48),
    })
    k.rotation.set(turn, 0, -Math.PI / 2, "YXZ")
    k.position.set(mm(18), mm(129), mm(z))
    root.add(k)
  }

  for (const side of [-1, 1]) {
    for (const [y, z] of [
      [117, -54],
      [141, -54],
      [117, 55],
      [141, 55],
    ]) {
      const s = socketScrew(mm(2.1))
      s.rotation.z = -side * (Math.PI / 2)
      s.position.set(side * mm(17.95), mm(y), mm(z))
      root.add(s)
    }
  }

  root.add(faceDecal(pistolSideArt(art.params?.ohms ?? 45), mm(114), mm(30), "+x", [mm(18.03), mm(129), mm(1.5)], { roughness: 0.5 }))
  root.add(faceDecal(pistolTopArt(topZ, accent), mm(28), mm(90), "+y", [0, mm(150.24), mm(3)], { roughness: 0.5 }))

  const pwr = led("#ff3b2a", mm(1.6))
  pwr.position.set(mm(8), mm(150.2), mm(-30))
  root.add(pwr)
  const spill = haloPlane("#ff3b2a", mm(11), 0.5)
  spill.rotation.x = -Math.PI / 2
  spill.position.set(mm(8), mm(150.3), mm(-30))
  root.add(spill)

  // Heel strain relief, coiled cord, three leads to clips.
  const relief = strainRelief(ctx, mm(26), mm(5.6), mm(3.2))
  relief.position.set(0, mm(22), mm(-59))
  relief.rotation.x = -2.13
  root.add(relief)

  const coilR = mm(5.4)
  const cordR = mm(2.05)
  const yC = coilR + cordR
  const P = (x: number, z: number, y = yC) => new THREE.Vector3(mm(x), y, mm(z))
  const path = spline([
    new THREE.Vector3(0, mm(8.4), mm(-80.5)),
    P(3, -98),
    P(22, -118),
    P(56, -124),
    P(84, -104),
    P(95, -68),
    P(93, -30),
    P(81, 4),
  ])
  const cordMat = M.pvc("#18181c")
  root.add(coiledCord(path, coilR, cordR, Math.round(path.getLength() / (cordR * 2.12)), cordMat, ctx.q))
  const split = P(62, 46, cordR)
  root.add(cable([P(81, 4), P(76, 22, cordR + mm(2)), P(68, 36, cordR), split], cordR, cordMat, 40, 12))
  const sleeve = mesh(new THREE.CylinderGeometry(mm(3.2), mm(3.2), mm(10), 24), M.rubberSoft("#121214", { repeat: 40 }))
  sleeve.position.copy(split)
  sleeve.lookAt(P(56, 58, cordR))
  sleeve.rotateX(Math.PI / 2)
  root.add(sleeve)

  const leadR = mm(1.2)
  const clips = [
    { boot: "#e0261b", at: [22, 100], yaw: -0.12 },
    { boot: "#1a1a1e", at: [47, 106], yaw: 0.04 },
    { boot: "#f1efe9", at: [72, 99], yaw: 0.2 },
  ]
  clips.forEach((c, i) => {
    const clip = alligatorClip({ boot: c.boot, quality: ctx.q })
    clip.position.set(mm(c.at[0]), CLIP_REST, mm(c.at[1]))
    clip.rotation.y = c.yaw
    root.add(clip)
    const back = clip.position.clone().setY(CLIP_REST * 0.95)
    const from = split.clone().add(new THREE.Vector3(mm(-4 + i * 4), 0, mm(5)))
    const mid = from.clone().lerp(back, 0.5).setY(leadR)
    mid.x += mm(3 - i * 3)
    root.add(cable([from.setY(cordR), mid, back], leadR, M.silicone(c.boot === "#1a1a1e" ? "#202024" : c.boot), 40, 10))
  })

  root.userData.views = {
    hero: { azimuth: 34, elevation: 13, fill: 0.88 },
    detail: { azimuth: 58, elevation: 9, fill: 1.6, fov: 20 },
    alt: { azimuth: -36, elevation: 22, fill: 0.88 },
  }
  return root
}

/* ===========================================================================
 * Plunger — home-set thumb controller
 * ========================================================================= */

interface HandleProfile {
  w: (y: number) => number
  h: (y: number) => number
  z: (y: number) => number
  groove: (y: number) => number
}

function handleStations(p: HandleProfile, y0: number, y1: number, step: number, extra = 0): LoftStation[] {
  const out: LoftStation[] = []
  for (let y = y0; y <= y1 + 1e-9; y += step) {
    const g = p.groove(y)
    out.push({
      at: new THREE.Vector3(0, y, p.z(y)),
      w: p.w(y) + extra * 2,
      h: p.h(y) + extra * 2,
      n: 2.5,
      shape: g ? (a) => -g * Math.max(0, Math.sin(a)) ** 4 : undefined,
    })
  }
  return out
}

const lerpKeys = (keys: [number, number][]) => (y: number) => {
  if (y <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (y <= keys[i][0]) {
      const [y0, v0] = keys[i - 1]
      const [y1, v1] = keys[i]
      const t = smoothstep(0, 1, (y - y0) / (y1 - y0))
      return v0 + (v1 - v0) * t
    }
  }
  return keys[keys.length - 1][1]
}

function domeTop(width: (y: number) => number, yStart: number, yTop: number) {
  return (y: number) => {
    if (y <= yStart) return width(y)
    const t = Math.min(1, (y - yStart) / (yTop - yStart))
    return width(yStart) * Math.sqrt(Math.max(0, 1 - t * t))
  }
}

function plugAndPins(color: string) {
  const g = new THREE.Group()
  g.add(mesh(slab(mm(15), mm(11), mm(26), { radius: mm(3), bevel: mm(1.6) }), M.satin(color, { repeat: 30 })))
  for (const x of [-4.2, 0, 4.2]) {
    g.add(mesh(new THREE.BoxGeometry(mm(1.1), mm(4.6), mm(9)), M.nickel(0.2), [mm(x), mm(5.5), mm(16.5)]))
  }
  const grips = mesh(slab(mm(15.4), mm(6), mm(9), { radius: mm(3), bevel: mm(1.2) }), M.rubberSoft("#101012", { repeat: 40 }))
  grips.position.set(0, mm(2.5), mm(-6))
  g.add(grips)
  return g
}

function laneBadge(n: number) {
  const c = makeCanvas(256, 256)
  if (!c) return null
  const g = c.getContext("2d")!
  g.fillStyle = "#0e0e12"
  g.beginPath()
  g.arc(128, 128, 122, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = "#f3efe6"
  g.lineWidth = 8
  g.beginPath()
  g.arc(128, 128, 106, 0, Math.PI * 2)
  g.stroke()
  drawText(g, `${n}`, 122, 180, { size: 150, font: FONT.display, weight: 800, italic: true, color: "#f3efe6", align: "center" })
  return c
}

function buildPlunger(art: PartArt, ctx: BuildContext, o: VariantOptions = {}) {
  const root = new THREE.Group()
  const bodyMat = M.gloss(art.color, { roughness: 0.2 })
  const gripMat = M.rubberSoft(art.secondary ?? "#1c1c21", { repeat: 26, grain: 0.6 })
  const accent = art.accent ?? "#c9cdd3"
  const up = new THREE.Vector3(0, 0, 1)
  const TOP = mm(127)

  // Grip waist → flared, forward-leaning thumb head with a domed top.
  const w = domeTop(lerpKeys([[0, mm(33)], [mm(4), mm(35.5)], [mm(14), mm(36)], [mm(42), mm(32)], [mm(64), mm(31.5)], [mm(86), mm(35)], [mm(98), mm(41)], [mm(110), mm(43.5)]]), mm(112), TOP)
  const h = domeTop(lerpKeys([[0, mm(30)], [mm(4), mm(32.5)], [mm(14), mm(33)], [mm(42), mm(29.5)], [mm(64), mm(29)], [mm(86), mm(33)], [mm(98), mm(38.5)], [mm(110), mm(41)]]), mm(112), TOP)
  const z = lerpKeys([[0, 0], [mm(60), mm(1)], [mm(90), mm(4.5)], [TOP, mm(9)]])
  const groove = (y: number) => {
    let g = 0
    for (const gy of [36, 52, 68]) g += Math.exp(-(((y - mm(gy)) / mm(5.2)) ** 2)) * mm(2.3)
    return g
  }
  const profile: HandleProfile = { w, h, z, groove }
  const seam = mm(88.6)
  root.add(mesh(loft(handleStations(profile, 0, seam + mm(0.6), mm(1.2)), segs(ctx, 56), up), gripMat))
  root.add(mesh(loft(handleStations(profile, seam - mm(0.4), TOP - mm(0.2), mm(1), mm(0.35)), segs(ctx, 56), up), bodyMat))
  root.add(mesh(loft(handleStations({ ...profile, groove: () => 0 }, seam - mm(0.9), seam + mm(0.5), mm(0.35), mm(0.75)), segs(ctx, 56), up), M.chrome()))

  // Thumb plunger set into the dome: chrome bezel, dark well, rubber-capped button.
  const plunger = new THREE.Group()
  const bezel = mesh(new THREE.TorusGeometry(mm(9.6), mm(1.35), 16, segs(ctx, 56)), M.chrome())
  bezel.rotation.x = Math.PI / 2
  plunger.add(bezel)
  const well = mesh(new THREE.CircleGeometry(mm(9.4), segs(ctx, 48)), M.voidMat())
  well.rotation.x = -Math.PI / 2
  well.position.y = -mm(0.6)
  plunger.add(well)
  plunger.add(mesh(new THREE.CylinderGeometry(mm(3.8), mm(3.8), mm(6), 28), M.chrome(), [0, mm(1.4), 0]))
  const button = mesh(
    lathe(
      filletProfile(
        [
          [0, 0],
          [mm(7.6), 0],
          [mm(7.9), mm(4.6)],
          [mm(7.2), mm(6.6)],
          [mm(3), mm(6.2)],
          [0, mm(6.6)],
        ],
        mm(1.2),
        4
      ),
      segs(ctx, 48)
    ),
    M.satin(accent, { roughness: 0.3, repeat: 40 })
  )
  button.position.y = mm(3.4)
  plunger.add(button)
  const pad = mesh(new THREE.CylinderGeometry(mm(5.2), mm(5.4), mm(0.8), segs(ctx, 40)), M.rubberSoft("#18181c", { repeat: 60 }))
  pad.position.y = mm(9.9)
  plunger.add(pad)
  plunger.position.set(0, TOP - mm(3.2), z(TOP) - mm(0.5))
  plunger.rotation.x = -0.16
  root.add(plunger)

  // Lane badge on the head front.
  const by = mm(106)
  const tilt = -0.18
  const badge = mesh(new THREE.CylinderGeometry(mm(6.4), mm(6.4), mm(1.4), 40), M.chrome())
  badge.rotation.x = Math.PI / 2 + tilt
  badge.position.set(0, by, z(by) + h(by) / 2 - mm(0.45))
  root.add(badge)
  const face = faceDecal(laneBadge(1), mm(11.2), mm(11.2), "+z", [0, by, z(by) + h(by) / 2 + mm(0.3)], { roughness: 0.3 })
  face.rotation.x = tilt
  root.add(face)

  // Cable to a three-pin track plug.
  if (o.cable === false) return root
  const relief = strainRelief(ctx, mm(16), mm(4.4), mm(2.6), "#16161a")
  relief.position.set(0, mm(9), mm(-12))
  relief.rotation.x = -2.0
  root.add(relief)
  const cr = mm(1.75)
  const C = (x: number, zz: number, y = cr) => new THREE.Vector3(mm(x), y, mm(zz))
  root.add(
    cable(
      [new THREE.Vector3(0, mm(2.6), mm(-25)), C(-4, -40), C(-26, -58), C(-60, -50), C(-82, -16), C(-84, 26), C(-72, 62), C(-58, 86)],
      cr,
      M.gloss("#141417", { roughness: 0.3, clearcoat: 0.4 }),
      120,
      12
    )
  )
  const plug = plugAndPins(art.secondary ?? "#18181d")
  plug.position.set(mm(-52), 0, mm(98))
  plug.rotation.y = 0.5
  root.add(plug)

  root.userData.views = {
    hero: { azimuth: 30, elevation: 16, fill: 0.86 },
    detail: { azimuth: 16, elevation: 30, fill: 1.4, fov: 20 },
    alt: { azimuth: -40, elevation: 24, fill: 0.86 },
  }
  return root
}

/* ===========================================================================
 * Digital — wireless controller with status LED
 * ========================================================================= */

function digitalHeadShape() {
  const s = new THREE.Shape()
  s.moveTo(mm(-22), mm(99))
  s.lineTo(mm(36), mm(99))
  s.quadraticCurveTo(mm(46), mm(99), mm(46), mm(106))
  s.lineTo(mm(45), mm(112))
  s.quadraticCurveTo(mm(43), mm(119.5), mm(33), mm(121))
  s.lineTo(mm(-12), mm(121))
  s.quadraticCurveTo(mm(-22), mm(121), mm(-24), mm(114))
  s.lineTo(mm(-24), mm(104))
  s.quadraticCurveTo(mm(-24), mm(99), mm(-22), mm(99))
  return s
}

function buildDigital(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const shellMat = M.rubberSoft(art.color, { repeat: 26, grain: 0.4, roughness: 0.62 })
  const topMat = M.gloss(art.secondary ?? "#2a2a34", { roughness: 0.16 })
  const accent = art.accent ?? "#ffd23f"
  const up = new THREE.Vector3(0, 0, 1)

  // Grip.
  const gw = lerpKeys([[0, mm(31)], [mm(4), mm(33)], [mm(16), mm(34)], [mm(42), mm(30.5)], [mm(72), mm(31)], [mm(102), mm(33)]])
  const gh = lerpKeys([[0, mm(29)], [mm(4), mm(31)], [mm(16), mm(32)], [mm(42), mm(28.5)], [mm(72), mm(29)], [mm(102), mm(31)]])
  const gz = lerpKeys([[0, mm(-10)], [mm(102), mm(-1)]])
  const groove = (y: number) => {
    let g = 0
    for (const gy of [46, 62, 78]) g += Math.exp(-(((y - mm(gy)) / mm(5)) ** 2)) * mm(2.1)
    return g
  }
  root.add(mesh(loft(handleStations({ w: gw, h: gh, z: gz, groove }, 0, mm(104), mm(1.4)), segs(ctx, 56), up), shellMat))

  // Head: clean profile extrusion with soft 5 mm radii.
  root.add(mesh(profileX(digitalHeadShape(), mm(34), { bevel: mm(5), bevelSegments: segs(ctx, 6), curveSegments: 16 }), shellMat))
  const plate = mesh(slab(mm(24), mm(1.6), mm(44), { radius: mm(7), bevel: mm(0.7) }), topMat)
  plate.position.set(0, mm(125.6), mm(11))
  root.add(plate)

  // Lane-change button with glowing status ring.
  const btn = mesh(
    lathe(
      filletProfile(
        [
          [0, 0],
          [mm(6.8), 0],
          [mm(6.8), mm(2.2)],
          [mm(6), mm(3.3)],
          [0, mm(3.6)],
        ],
        mm(0.9),
        3
      ),
      segs(ctx, 48)
    ),
    M.gloss("#0c0c0f", { roughness: 0.14 })
  )
  btn.position.set(0, mm(127.2), mm(-2))
  root.add(btn)
  const ring = mesh(new THREE.TorusGeometry(mm(8.3), mm(0.8), 12, segs(ctx, 64)), M.glow(accent, 2.4))
  ring.rotation.x = Math.PI / 2
  ring.position.set(0, mm(127.3), mm(-2))
  root.add(ring)
  const ringSpill = haloPlane(accent, mm(28), 0.4)
  ringSpill.rotation.x = -Math.PI / 2
  ringSpill.position.set(0, mm(127.35), mm(-2))
  root.add(ringSpill)

  const status = led("#3dff9a", mm(1.4))
  status.position.set(mm(6.5), mm(127.2), mm(26))
  root.add(status)
  const statusSpill = haloPlane("#3dff9a", mm(10), 0.5)
  statusSpill.rotation.x = -Math.PI / 2
  statusSpill.position.set(mm(6.5), mm(127.3), mm(26))
  root.add(statusSpill)

  // Light-pipe accents along both flanks of the head.
  for (const side of [-1, 1]) {
    const pipe = mesh(new THREE.BoxGeometry(mm(0.6), mm(1.1), mm(40)), M.glow(accent, 1.8))
    pipe.position.set(side * mm(17.05), mm(110), mm(8))
    root.add(pipe)
  }

  const inlayArt = makeCanvas(24 * 12, 44 * 12)
  if (inlayArt) {
    const g = inlayArt.getContext("2d")!
    const k = 12
    const u = (x: number) => (x + 12) * k
    const v = (zz: number) => (zz + 11) * k
    drawText(g, "LANE", u(0), v(8.2), { size: 2 * k, font: FONT.din, weight: 700, color: INK, align: "center", tracking: 0.5 * k })
    drawText(g, "CHANGE", u(0), v(10.7), { size: 1.5 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center", tracking: 0.4 * k })
    drawText(g, "CH 1", u(-4), v(27.8), { size: 2.1 * k, font: FONT.din, weight: 700, color: INK, align: "center", tracking: 0.3 * k })
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i < 3 ? INK : "rgba(246,244,238,0.3)"
      const bh = (0.7 + i * 0.5) * k
      g.fillRect(u(-1.2 + i * 0.85), v(27.8) - bh, 0.5 * k, bh)
    }
    drawText(g, "2.4 GHz · DIGITAL", u(0), v(32.6), { size: 1.3 * k, font: FONT.mono, weight: 500, color: INK_DIM, align: "center" })
  }
  root.add(faceDecal(inlayArt, mm(24), mm(44), "+y", [0, mm(127.23), mm(11)], { roughness: 0.3 }))

  // Trigger lever under the nose.
  const trig = new THREE.Shape()
  trig.moveTo(mm(12), mm(100))
  trig.lineTo(mm(32), mm(100))
  trig.bezierCurveTo(mm(33), mm(90), mm(32), mm(80), mm(27), mm(73))
  trig.bezierCurveTo(mm(24), mm(69), mm(19), mm(68), mm(16.5), mm(70))
  trig.bezierCurveTo(mm(15), mm(72), mm(17.5), mm(77), mm(18.5), mm(82))
  trig.bezierCurveTo(mm(19.5), mm(88), mm(16), mm(95), mm(12), mm(100))
  const trigGeo = profileX(trig, mm(13), { bevel: mm(2.4), bevelSegments: segs(ctx, 4), curveSegments: 24 })
  deform(trigGeo, (p) => {
    p.x *= 1 + 0.25 * smoothstep(mm(88), mm(70), p.y)
  })
  root.add(mesh(trigGeo, M.gloss(accent, { roughness: 0.2 })))

  // USB-C port on the tail.
  const port = mesh(slab(mm(9.4), mm(3.4), mm(1.2), { radius: mm(1.6), bevel: mm(0.3) }), M.voidMat())
  port.rotation.x = Math.PI / 2
  port.position.set(0, mm(110), mm(-29.4))
  root.add(port)

  // Wrist lanyard lying on the floor.
  const lr = mm(1.6)
  const L = (x: number, zz: number, y = lr) => new THREE.Vector3(mm(x), y, mm(zz))
  root.add(
    cable(
      [L(0, -12, mm(6)), L(-8, -26), L(-30, -46), L(-60, -42), L(-72, -14), L(-58, 12), L(-30, 10), L(-10, -4, mm(4))],
      lr,
      M.satin("#202026", { roughness: 0.8, repeat: 60 }),
      120,
      8
    )
  )

  root.userData.views = {
    hero: { azimuth: 32, elevation: 15, fill: 0.86 },
    detail: { azimuth: 22, elevation: 38, fill: 1.5, fov: 20 },
    alt: { azimuth: -40, elevation: 24, fill: 0.86 },
  }
  return root
}

export interface VariantOptions {
  /** Plunger only: false leaves off the lead and plug (used as a prop). */
  cable?: boolean
}

export function buildControllerVariant(art: PartArt, ctx: BuildContext, o: VariantOptions = {}) {
  switch (art.variant) {
    case "plunger":
      return buildPlunger(art, ctx, o)
    case "digital":
      return buildDigital(art, ctx)
    default:
      return buildPistol(art, ctx)
  }
}

export const buildController = (art: PartArt, ctx: BuildContext) => buildControllerVariant(art, ctx)
