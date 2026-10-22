import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { pocket } from "./hardware"
import {
  arcLengthAt,
  circle,
  deg,
  fillet,
  flatCap,
  group,
  lathe,
  loft,
  offsetOutline,
  part,
  remapUV,
  roundedRect,
  segs,
  slab,
  toShape,
  type BuildCtx,
  type Built,
  type Ring,
  type V2,
} from "./kit"
import {
  anodizedAlu,
  brassMetal,
  canvasTex,
  cavity,
  cutSteel,
  enamelWire,
  faceSteel,
  FONT_SANS,
  hexToHsl,
  isNeutral,
  plastic,
  polishedSteel,
  printed,
  rubberCompound,
  satinSteel,
  tinnedBrass,
} from "./surfaces"

type Variant = "boxer" | "round" | "long"

/** Can cross-section (XY), counter-clockwise from the top centre. */
function canOutline(variant: Variant, W: number, H: number): V2[] {
  const R = W / 2
  if (variant === "round") return circle(R, 168, 0, 0, Math.PI / 2)
  const hy = Math.min(H / 2, R - 0.5)
  const a0 = Math.asin(hy / R)
  const cx = R * Math.cos(a0)
  const step = deg(3)
  const pts: V2[] = [
    [0, hy],
    [-cx, hy],
  ]
  for (let a = Math.PI - a0 + step; a < Math.PI + a0 - step / 2; a += step) pts.push([Math.cos(a) * R, Math.sin(a) * R])
  pts.push([-cx, -hy], [0, -hy], [cx, -hy])
  for (let a = -a0 + step; a < a0 - step / 2; a += step) pts.push([Math.cos(a) * R, Math.sin(a) * R])
  pts.push([cx, hy])
  return fillet(pts, (_i, turn) => (turn > deg(20) ? 1.35 : 0), { closed: true, seg: 6 })
}

function rpmLabel(rpm: number) {
  return rpm >= 1000 ? `${(rpm / 1000).toFixed(rpm % 1000 === 0 ? 0 : 1)}K` : `${rpm}`
}

/** Label band artwork: u wraps the can (perimeter), v runs along the axis. */
function labelTexture(key: string, perimeter: number, bandLen: number, centres: { s: number; side: 1 | -1 }[], rpm: string, stripe: string) {
  const Wc = 4096
  const Hc = Math.round((Wc * bandLen) / perimeter)
  const pxPerMm = Wc / perimeter
  return canvasTex(`motor-label:${key}`, Wc, Hc, (ctx, w, h) => {
    ctx.fillStyle = "#101014"
    ctx.fillRect(0, 0, w, h)
    // Fine pinstripes at both edges.
    ctx.fillStyle = stripe
    const sw = Math.max(2, Math.round(0.32 * pxPerMm))
    ctx.fillRect(0, Math.round(0.55 * pxPerMm), w, sw)
    ctx.fillRect(0, h - Math.round(0.55 * pxPerMm) - sw, w, sw)
    for (const c of centres) {
      const x = (c.s / perimeter) * w
      ctx.save()
      ctx.translate(x, h / 2)
      ctx.rotate((c.side * Math.PI) / 2)
      const cap = 2.6 * pxPerMm
      ctx.textAlign = "center"
      ctx.textBaseline = "alphabetic"
      ctx.fillStyle = "#f3efe6"
      ctx.font = `800 ${Math.round(cap * 1.38)}px ${FONT_SANS}`
      ctx.save()
      ctx.scale(0.86, 1)
      ctx.fillText(rpm, -0.2 * pxPerMm, cap * 0.18)
      ctx.restore()
      ctx.fillStyle = "#a6a3ad"
      ctx.font = `600 ${Math.round(0.95 * pxPerMm)}px ${FONT_SANS}`
      if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(0.18 * pxPerMm)}px`
      ctx.fillText("RPM · 12 V", 0, cap * 0.18 + 1.75 * pxPerMm)
      ctx.restore()
    }
  })
}

export function buildMotor(art: PartArt, ctx: BuildCtx): Built {
  const variant: Variant = art.variant === "round" || art.variant === "long" ? art.variant : "boxer"
  const p = art.params ?? {}
  const W = p.diameter ?? (variant === "round" ? 24 : 20)
  const H = variant === "round" ? W : (p.height ?? 15)
  const L = p.length ?? (variant === "long" ? 38 : 30)
  const shaftR = (p.shaft ?? 2) / 2
  const Le = 5.4
  const Lc = L - Le
  const seg = segs(ctx, 128)
  const rpm = rpmLabel(p.rpm ?? (variant === "round" ? 18000 : variant === "long" ? 25000 : 21500))

  const canMat = isNeutral(art.color) ? satinSteel() : anodizedAlu(art.color)
  const bellColor = art.secondary ?? "#ff4b3a"
  const bellMat = plastic(bellColor, 0.36, { clearcoat: 0.15 })
  const tabMat = art.accent && !isNeutral(art.accent) ? brassMetal("bright") : tinnedBrass()
  const steel = polishedSteel()

  const outline = canOutline(variant, W, H)
  const right = arcLengthAt(outline, [W / 2, 0])
  const left = arcLengthAt(outline, [-W / 2, 0])
  const perimeter = right.length

  /* ---- Can ------------------------------------------------------------- */
  const lip = 0.35
  const rf = variant === "round" ? 2.2 : 1.8
  const vent = { z0: 1.5, z1: Math.min(6.2, Lc * 0.28), w: variant === "round" ? 5.2 : 5.6 }
  const ventS = variant === "round" ? [right.s - 4.2, right.s + 4.2, left.s - 4.2, left.s + 4.2] : [right.s, left.s]
  const rings: Ring[] = []
  for (let i = 0; i <= 4; i++) {
    const t = (i / 4) * (Math.PI / 2)
    rings.push({ o: -lip + lip * Math.sin(t), z: lip - lip * Math.cos(t) })
  }
  rings.push({ o: 0, z: vent.z0 }, { o: 0, z: vent.z1 })
  if (variant === "long") rings.push({ o: 0, z: Lc - 6.8 }, { o: 0, z: Lc - 3.6 })
  rings.push({ o: 0, z: Lc - rf })
  for (let i = 1; i <= 9; i++) {
    const t = (i / 9) * (Math.PI / 2)
    rings.push({ o: -rf + rf * Math.cos(t), z: Lc - rf + rf * Math.sin(t) })
  }
  const holes = ventS.map((s) => ({ s0: s - vent.w / 2, s1: s + vent.w / 2, z0: vent.z0, z1: vent.z1, depth: 0.32 }))
  if (variant === "long") for (const s of [right.s, left.s]) holes.push({ s0: s - 2.2, s1: s + 2.2, z0: Lc - 6.8, z1: Lc - 3.6, depth: 0.32 })
  const can = loft(outline, rings, { holes })

  const bossR = 3.75
  const mountX = variant === "round" ? 7.5 : 6.4
  const faceOutline = offsetOutline(outline, -rf)
  const face = flatCap(faceOutline, [circle(bossR, 64), circle(1.0, 32, mountX, 0), circle(1.0, 32, -mountX, 0)])
  face.translate(0, 0, Lc)

  const faceMat = isNeutral(art.color) ? faceSteel() : canMat
  const meshes: THREE.Object3D[] = [part(can, canMat), part(face, faceMat)]
  if (can.userData.holeWalls) meshes.push(part(can.userData.holeWalls as THREE.BufferGeometry, cutSteel()))
  // Stamped stiffening ring around the boss.
  const ringR = Math.min(5.6, (variant === "round" ? W : H) / 2 - rf - 0.9)
  const emboss = lathe(
    fillet(
      [
        [ringR + 0.55, Lc - 0.05],
        [ringR + 0.3, Lc + 0.16],
        [ringR - 0.3, Lc + 0.16],
        [ringR - 0.55, Lc - 0.05],
      ],
      [0, 0.22, 0.22, 0],
      { seg: 4 }
    ),
    { seg }
  )
  meshes.push(part(emboss, faceMat, { r: [Math.PI / 2, 0, 0] }))

  // Front boss, sintered bronze bushing and countersunk mounting holes.
  const toZ: [number, number, number] = [Math.PI / 2, 0, 0]
  const boss = lathe(
    fillet(
      [
        [bossR, Lc],
        [bossR - 0.35, Lc],
        [bossR - 0.35, Lc + 0.95],
        [2.25, Lc + 0.95],
        [2.25, Lc + 0.2],
      ],
      [0, 0.3, 0.32, 0.18, 0],
      { seg: 5 }
    ),
    { seg }
  )
  meshes.push(part(boss, faceMat, { r: toZ }))
  const bushing = lathe(
    fillet(
      [
        [2.25, Lc + 0.3],
        [2.25, Lc + 1.45],
        [shaftR + 0.04, Lc + 1.45],
        [shaftR + 0.04, Lc + 0.4],
      ],
      [0, 0.2, 0.14, 0],
      { seg: 4 }
    ),
    { seg }
  )
  meshes.push(part(bushing, brassMetal("aged"), { r: toZ }))
  for (const x of [mountX, -mountX]) {
    const cs = lathe(
      [
        [1.0, Lc],
        [0.78, Lc - 0.22],
      ],
      { seg: 32 }
    )
    meshes.push(part(cs, cutSteel(), { r: toZ, p: [x, 0, 0] }))
    const pk = pocket(circle(0.78, 24), 2.2)
    pk.position.set(x, 0, Lc - 0.22)
    meshes.push(pk)
  }

  // Interior: dark liner + copper armature end-turns glimpsed through the vents.
  const liner = loft(
    outline,
    [
      { o: -0.33, z: 0.25 },
      { o: -0.33, z: Lc - 0.45 },
    ],
    { capStart: true, capEnd: true }
  )
  const linerMat = cavity().clone()
  linerMat.side = THREE.BackSide
  meshes.push(part(liner, linerMat, { cast: false }))
  const wr = Math.min(W / 2, H / 2) - 0.9
  const wind = enamelWire().clone()
  wind.envMapIntensity = 0.55
  const windings = lathe(
    fillet(
      [
        [2.3, 0.9],
        [wr, 0.9],
        [wr, Math.min(Lc - 1.5, vent.z1 + 2.5)],
        [2.3, Math.min(Lc - 1.5, vent.z1 + 2.5)],
      ],
      [0, 1.4, 1.4, 0],
      { seg: 6 }
    ),
    { seg: segs(ctx, 64) }
  )
  meshes.push(part(windings, wind, { r: toZ }))
  if (variant === "long") {
    const stack = lathe(
      [
        [wr + 0.3, Lc - 8],
        [wr + 0.3, Lc - 2.5],
      ],
      { seg: segs(ctx, 64) }
    )
    meshes.push(part(stack, wind, { r: toZ }))
  }

  // Label band.
  const bandLen = Math.min(12, Lc * 0.46)
  const zb0 = vent.z1 + (Lc - rf - vent.z1 - bandLen) * 0.45
  const stripe = art.secondary ?? "#ffd23f"
  const labelMap = labelTexture(
    `${variant}:${W}:${H}:${rpm}:${stripe}:${bandLen.toFixed(2)}`,
    perimeter,
    bandLen,
    [
      { s: right.s, side: 1 },
      { s: left.s, side: -1 },
    ],
    rpm,
    stripe
  )
  const band = remapUV(
    loft(outline, [
      { o: 0.03, z: zb0 },
      { o: 0.03, z: zb0 + bandLen },
    ]),
    0,
    perimeter,
    zb0,
    bandLen
  )
  meshes.push(part(band, printed(labelMap, "#101014", 0.34)))

  /* ---- Endbell --------------------------------------------------------- */
  const bellOutline = offsetOutline(outline, -0.42)
  const br = 1.25
  const bellRings: Ring[] = []
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2)
    bellRings.push({ o: -br + br * Math.sin(t), z: -Le + br - br * Math.cos(t) })
  }
  bellRings.push({ o: 0, z: 0.8 })
  meshes.push(part(loft(bellOutline, bellRings), bellMat))

  const backOutline = offsetOutline(bellOutline, -br)
  const housingR = 3.35
  const ventY = Math.min(H / 2, W / 2) - 2.55
  const slot = roundedRect(variant === "round" ? 6 : 5.2, 1.25, 0.55)
  const slotTop = slot.map(([x, y]) => [x, y + ventY] as V2)
  const slotBot = slot.map(([x, y]) => [x, y - ventY] as V2)
  const back = flatCap(
    backOutline.map(([x, y]) => [-x, y] as V2),
    [circle(housingR + 0.35, 64), slotTop.map(([x, y]) => [-x, y] as V2), slotBot.map(([x, y]) => [-x, y] as V2)]
  )
  back.rotateY(Math.PI)
  back.translate(0, 0, -Le)
  meshes.push(part(back, bellMat))
  for (const s of [slotTop, slotBot]) {
    const pk = pocket(s, 1.6)
    pk.rotation.y = Math.PI
    pk.position.z = -Le
    meshes.push(pk)
  }

  // Bearing housing + shielded (ZZ) ball bearing, lathe y → world −z.
  const toBack: [number, number, number] = [-Math.PI / 2, 0, 0]
  const housing = lathe(
    fillet(
      [
        [housingR + 0.35, 0],
        [housingR, 0],
        [housingR, 1.5],
        [2.52, 1.5],
        [2.52, 0.5],
      ],
      [0, 0.3, 0.34, 0.12, 0],
      { seg: 5 }
    ),
    { seg }
  )
  meshes.push(part(housing, bellMat, { r: toBack, p: [0, 0, -Le] }))
  const bearingAt = { r: toBack, p: [0, 0, -Le] as [number, number, number] }
  const backing = lathe(
    [
      [2.5, 0.95],
      [shaftR, 0.95],
    ],
    { seg: 48 }
  )
  meshes.push(part(backing, cavity(), { ...bearingAt, cast: false }))
  const outerRace = lathe(
    fillet(
      [
        [2.5, 0.6],
        [2.5, 1.36],
        [2.08, 1.36],
        [2.08, 1.05],
      ],
      [0, 0.1, 0.07, 0],
      { seg: 3 }
    ),
    { seg }
  )
  meshes.push(part(outerRace, steel, bearingAt))
  const shield = lathe(
    fillet(
      [
        [2.03, 1.2],
        [1.95, 1.26],
        [1.52, 1.26],
        [1.42, 1.2],
      ],
      [0, 0.05, 0.05, 0],
      { seg: 2 }
    ),
    { seg }
  )
  meshes.push(part(shield, satinSteel(0.34), bearingAt))
  const innerRace = lathe(
    fillet(
      [
        [1.37, 1.05],
        [1.37, 1.38],
        [shaftR + 0.02, 1.38],
        [shaftR + 0.02, 0.6],
      ],
      [0, 0.08, 0.05, 0],
      { seg: 3 }
    ),
    { seg }
  )
  meshes.push(part(innerRace, steel, bearingAt))

  // Brush-tab rivets and solder lugs on both sides.
  const lugX = Math.min(W / 2 - 2.2, 7.4)
  for (const side of [1, -1]) {
    const rivet = lathe(
      fillet(
        [
          [0, 0.45],
          [0.85, 0.45],
          [0.85, 0],
        ],
        [0, 0.32, 0],
        { seg: 4 }
      ).reverse(),
      { seg: 48 }
    )
    meshes.push(part(rivet, tabMat, { r: toBack, p: [side * (housingR + 1.35), 0, -Le] }))
    const lugShape = toShape(
      fillet(
        [
          [-1.3, -0.6],
          [1.3, -0.6],
          [1.3, 4.6],
          [-1.3, 4.6],
        ],
        [0.15, 0.15, 1.2, 1.2],
        { closed: true, seg: 6 }
      ),
      [circle(0.48, 24, 0, 3.4)]
    )
    const lug = slab(lugShape, 0.32, 0.08, { seg: 2 })
    lug.translate(0, 0, -0.16)
    // Shape X → world y (width), shape Y → world −z (out of the back), thickness → world x.
    const lugMesh = part(lug, tabMat, { r: [-Math.PI / 2, 0, 0] })
    const holder = group([lugMesh], { r: [0, 0, Math.PI / 2] })
    const pivot = group([holder])
    pivot.rotation.y = -side * deg(12)
    pivot.position.set(side * lugX, 0, -Le + 0.35)
    meshes.push(pivot)
    // Plastic boss the lug exits from.
    const lugBoss = slab(toShape(roundedRect(1.6, 3.6, 0.5)), 0.9, 0.3, { seg: 3 })
    meshes.push(part(lugBoss, bellMat, { p: [side * lugX, 0, -Le - 0.75], r: [0, 0, 0] }))
  }

  // Positive marking dot.
  const dotHue = hexToHsl(bellColor)
  const dotColor = dotHue.s > 0.4 && (dotHue.h < 0.06 || dotHue.h > 0.93) ? "#f3efe6" : "#ff4b3a"
  const dot = lathe(
    fillet(
      [
        [0, 0.06],
        [0.42, 0.06],
        [0.42, 0],
      ],
      [0, 0.05, 0],
      { seg: 2 }
    ).reverse(),
    { seg: 32 }
  )
  meshes.push(part(dot, plastic(dotColor, 0.35), { r: toBack, p: [lugX - 1.1, 3.05, -Le] }))

  // Crimp tabs folding the can lip over the endbell.
  const tabW = 2.6
  for (const sy of [1, -1]) {
    const yEdge = variant === "round" ? W / 2 : H / 2
    const tab = slab(toShape(roundedRect(tabW, 1.7, 0.4)), 0.3, 0.1, { seg: 2 })
    tab.translate(0, 0, -0.3)
    const y = sy > 0 ? yEdge - 0.42 : -(yEdge - 0.12)
    meshes.push(part(tab, canMat, { r: [Math.PI / 2 - sy * deg(7), 0, 0], p: [0, y, -0.55] }))
  }

  /* ---- Shaft ----------------------------------------------------------- */
  const front = Lc + 1.45 + 8.2
  const rear = -Le - 1.44 - 3.4
  const shaft = lathe(
    fillet(
      [
        [0, rear],
        [shaftR, rear],
        [shaftR, front],
        [0, front],
      ],
      [0, 0.18, 0.18, 0],
      { seg: 3 }
    ),
    { seg: segs(ctx, 48) }
  )
  meshes.push(part(shaft, steel, { r: toZ }))

  /* ---- Pose ------------------------------------------------------------ */
  const motor = group(meshes)
  const yRest = variant === "round" ? W / 2 : H / 2
  motor.position.y = yRest
  const pose = new THREE.Group()
  pose.add(motor)
  pose.rotation.y = Math.PI - deg(12)
  return {
    content: pose,
    views: {
      hero: { azimuth: 36, elevation: 16, fill: 0.88, fov: 22 },
      detail: { azimuth: 8, elevation: 11, fill: 1.24, fov: 20 },
      alt: { azimuth: 146, elevation: 20, fill: 0.88, fov: 22 },
    },
  }
}

export const MOTOR_VARIANTS = ["boxer", "round", "long"] as const
