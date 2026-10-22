import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { segs, type BuildContext } from "./context"
import { FONT, canvasToTexture, drawDialScale, drawText, makeCanvas, mix } from "./kit/canvas"
import { filletProfile, knurledCylinder, lathe, profileX, slab } from "./kit/geometry"
import * as M from "./kit/materials"
import { surfaceNormalUV } from "./kit/textures"
import { cable, faceDecal, knob, mesh, mm, rubberFoot, socketScrew } from "./kit/parts"

/* ===========================================================================
 * Tire truer — bench machine: base, motor, sanding drum, axle sled
 * ========================================================================= */

/** Lathe along +X (profile given as [radius, x]). */
function latheX(profile: [number, number][], n: number) {
  const g = lathe(profile, n)
  g.rotateZ(-Math.PI / 2)
  return g
}

function truerBaseArt(accent: string) {
  const k = 10
  const c = makeCanvas(170 * k, 10 * k)
  if (!c) return null
  const g = c.getContext("2d")!
  drawText(g, "TIRE TRUER", 8 * k, 7.2 * k, { size: 5 * k, font: FONT.display, weight: 800, italic: true, color: "rgba(244,242,236,0.92)", tracking: 0.3 * k })
  drawText(g, "1:32 · 1:24 · 3 / 2.38 MM AXLES", 46 * k, 6.8 * k, { size: 2.2 * k, font: FONT.mono, weight: 500, color: "rgba(244,242,236,0.6)" })
  g.fillStyle = accent
  g.fillRect(128 * k, 4.2 * k, 14 * k, 1.2 * k)
  return c
}

function buildTireTruer(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const accent = art.accent ?? "#ffd23f"
  const baseMat = M.anodized(art.color, { repeat: 8, roughness: 0.4 })
  const alu = M.brushed(art.secondary ?? "#c9cdd3", { repeat: 20 })
  const dark = M.anodized("#24242a", { repeat: 20, roughness: 0.4 })
  const axisY = mm(52)

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const f = rubberFoot(mm(6), mm(3))
      f.position.set(x * mm(70), 0, z * mm(42))
      root.add(f)
    }
  }
  const base = mesh(slab(mm(170), mm(10), mm(110), { radius: mm(6), bevel: mm(1.4) }), baseMat)
  base.position.y = mm(3)
  root.add(base)
  const top = mm(13)
  root.add(faceDecal(truerBaseArt(accent), mm(170), mm(10), "+z", [0, mm(8), mm(55.05)]))

  // Motor on its bracket (left), drum on the shaft, outboard bearing block (right).
  const bracket = mesh(slab(mm(8), mm(52), mm(44), { radius: mm(2), bevel: mm(1) }), dark)
  bracket.position.set(mm(-40), top, 0)
  root.add(bracket)
  const can = mesh(
    latheX(
      filletProfile(
        [
          [0, mm(-88)],
          [mm(15), mm(-88)],
          [mm(15.5), mm(-86)],
          [mm(15.5), mm(-46)],
          [mm(14), mm(-44)],
          [0, mm(-44)],
        ],
        mm(1.2)
      ),
      segs(ctx, 56)
    ),
    M.brushed("#c3c7cc", { repeat: [8, 3], rotation: Math.PI / 2 })
  )
  can.position.y = axisY
  root.add(can)
  const endbell = mesh(
    latheX(
      filletProfile(
        [
          [0, mm(-100)],
          [mm(12), mm(-100)],
          [mm(13.5), mm(-96)],
          [mm(13.5), mm(-87)],
          [0, mm(-87)],
        ],
        mm(1.5)
      ),
      segs(ctx, 48)
    ),
    M.satin("#141418", { roughness: 0.42, repeat: 30 })
  )
  endbell.position.y = axisY
  root.add(endbell)
  for (const [z, wire] of [
    [-7, "#d3251b"],
    [7, "#151517"],
  ] as const) {
    const tab = mesh(new THREE.BoxGeometry(mm(6), mm(1), mm(3)), M.brass(), [mm(-101), axisY + mm(9), mm(z)])
    root.add(tab)
    const W = (x: number, zz: number, y: number) => new THREE.Vector3(mm(x), y, mm(zz))
    root.add(cable([W(-103, z, axisY + mm(9)), W(-108, z * 1.6, axisY + mm(2)), W(-104, z * 2.6 + 6, top + mm(8)), W(-80, 40 + z, top + mm(1.2)), W(30, 46 + z * 0.3, top + mm(1.2)), W(52, 40, top + mm(4))], mm(1), M.silicone(wire), 80, 8))
  }

  const shaft = mesh(new THREE.CylinderGeometry(mm(2.4), mm(2.4), mm(84), 24), M.steel(0.2), [mm(-2), axisY, 0], [0, 0, Math.PI / 2])
  root.add(shaft)
  const drum = mesh(new THREE.CylinderGeometry(mm(13), mm(13), mm(28), segs(ctx, 72), 1, true), M.grit("#4a423a", { repeat: [8, 3] }))
  drum.rotation.z = Math.PI / 2
  drum.position.set(mm(4), axisY, 0)
  root.add(drum)
  for (const x of [-11, 19]) {
    const hub = mesh(
      latheX(
        filletProfile(
          [
            [mm(2.4), mm(-2)],
            [mm(14), mm(-2)],
            [mm(14), mm(2)],
            [mm(2.4), mm(2)],
          ],
          mm(0.8)
        ),
        segs(ctx, 56)
      ),
      alu
    )
    hub.position.set(mm(x), axisY, 0)
    root.add(hub)
  }
  const pillow = mesh(slab(mm(12), mm(48), mm(26), { radius: mm(3), bevel: mm(1.2) }), dark)
  pillow.position.set(mm(40), top, 0)
  root.add(pillow)
  const bearing = mesh(new THREE.CylinderGeometry(mm(6), mm(6), mm(12.6), 32), M.steel(0.18), [mm(40), axisY, 0], [0, 0, Math.PI / 2])
  root.add(bearing)

  // Dovetail rail + sled carrying the axle uprights, wheel and tire against the drum.
  const rail = mesh(slab(mm(30), mm(6), mm(64), { radius: mm(1.5), bevel: mm(0.8) }), dark)
  rail.position.set(mm(6), top, mm(-50))
  root.add(rail)
  const sled = mesh(slab(mm(40), mm(12), mm(26), { radius: mm(2.4), bevel: mm(1.2) }), alu)
  sled.position.set(mm(6), top + mm(6), mm(-38))
  root.add(sled)
  const axleZ = mm(-23.6)
  for (const x of [-12, 24]) {
    const up = mesh(slab(mm(5), mm(axisY / mm(1) - 31 + 7), mm(14), { radius: mm(1.2), bevel: mm(0.8) }), alu)
    up.position.set(mm(x), top + mm(18), axleZ - mm(4))
    root.add(up)
    const brg = mesh(new THREE.CylinderGeometry(mm(3.6), mm(3.6), mm(5.6), 24), M.brass(), [mm(x), axisY, axleZ], [0, 0, Math.PI / 2])
    root.add(brg)
  }
  root.add(mesh(new THREE.CylinderGeometry(mm(1.5), mm(1.5), mm(48), 16), M.steel(0.18), [mm(6), axisY, axleZ], [0, 0, Math.PI / 2]))
  const hubW = mesh(
    latheX(
      filletProfile(
        [
          [mm(1.6), mm(-6)],
          [mm(8.4), mm(-6)],
          [mm(8.4), mm(5)],
          [mm(6), mm(6)],
          [mm(1.6), mm(6)],
        ],
        mm(0.6)
      ),
      segs(ctx, 48)
    ),
    M.brushed("#d8dbdf", { repeat: 40, rotation: Math.PI / 2 })
  )
  hubW.position.set(mm(4), axisY, axleZ)
  root.add(hubW)
  const tire = mesh(
    latheX(
      filletProfile(
        [
          [mm(8.4), mm(-5.4)],
          [mm(10.1), mm(-5.4)],
          [mm(10.5), mm(-4.4)],
          [mm(10.5), mm(4.4)],
          [mm(10.1), mm(5.4)],
          [mm(8.4), mm(5.4)],
        ],
        mm(0.6)
      ),
      segs(ctx, 64)
    ),
    M.tireRubber("#121214", { repeat: 40 })
  )
  tire.position.set(mm(4), axisY, axleZ)
  root.add(tire)

  // Micrometer feed: lead screw with a knurled, graduated thumb wheel.
  const screw = mesh(new THREE.CylinderGeometry(mm(2), mm(2), mm(40), 16), M.steel(0.25), [mm(6), top + mm(9), mm(-70)], [Math.PI / 2, 0, 0])
  root.add(screw)
  const wheel = knob({
    radius: mm(11),
    height: mm(8),
    body: M.anodized(accent, { repeat: 50 }),
    cap: M.brushed("#e2e4e8", { repeat: 60 }),
    indicator: "#0b0b0f",
    skirt: { radius: mm(12.2), height: mm(2), material: alu },
    segments: segs(ctx, 64),
  })
  wheel.rotation.x = -Math.PI / 2
  wheel.position.set(mm(6), top + mm(9), mm(-86))
  root.add(wheel)
  const scaleArt = makeCanvas(512, 512)
  if (scaleArt) {
    const g = scaleArt.getContext("2d")!
    drawDialScale(g, { cx: 256, cy: 256, r0: 214, r1: 250, from: 0, to: 350, majors: 10, minors: 4, color: "rgba(244,242,236,0.95)", width: 3 })
  }
  const scaleDisc = faceDecal(scaleArt, mm(26), mm(26), "-z", [mm(6), top + mm(9), mm(-84.1)])
  root.add(scaleDisc)

  // Toggle switch.
  const sw = new THREE.Group()
  sw.add(mesh(new THREE.CylinderGeometry(mm(5.5), mm(5.5), mm(2.4), 6), M.nickel(0.25)))
  const lever = mesh(new THREE.CylinderGeometry(mm(1.1), mm(1.6), mm(12), 16), M.chrome())
  lever.position.set(0, mm(6), mm(1.6))
  lever.rotation.x = 0.35
  sw.add(lever)
  sw.position.set(mm(56), top, mm(36))
  root.add(sw)
  for (const [x, z] of [
    [-74, -46],
    [74, -46],
    [-74, 46],
    [74, 46],
  ]) {
    const s = socketScrew(mm(2.4))
    s.position.set(mm(x), top, mm(z))
    root.add(s)
  }

  root.userData.views = {
    hero: { azimuth: 36, elevation: 22, fill: 0.88 },
    detail: { azimuth: 50, elevation: 26, fill: 1.9, fov: 20 },
    alt: { azimuth: -40, elevation: 30, fill: 0.88 },
  }
  return root
}

/* ===========================================================================
 * Driver set — hex / Phillips drivers in a machined stand
 * ========================================================================= */

interface DriverSpec {
  tip: "hex" | "phillips" | "flat"
  size: number
  band: string
  label: string
}

function driver(spec: DriverSpec, ctx: BuildContext, handleMat: THREE.Material) {
  const g = new THREE.Group()
  const shaftR = mm(Math.max(1.1, spec.size / 2 + 0.25))
  const shaftLen = mm(58)
  // Tip along −Y from y = 0; handle above.
  const shaft = mesh(new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 20), M.steel(0.2, "#c6cacf"))
  shaft.position.y = -shaftLen / 2
  g.add(shaft)
  const tipLen = mm(7)
  if (spec.tip === "hex") {
    const hex = mesh(new THREE.CylinderGeometry(mm(spec.size / 2) / Math.cos(Math.PI / 6), mm(spec.size / 2) / Math.cos(Math.PI / 6), tipLen, 6), M.steel(0.26, "#9aa0a7"))
    hex.position.y = -shaftLen - tipLen / 2 + mm(0.5)
    g.add(hex)
  } else {
    const cone = mesh(new THREE.ConeGeometry(shaftR, tipLen, 4), M.steel(0.26, "#9aa0a7"))
    cone.rotation.x = Math.PI
    cone.position.y = -shaftLen - tipLen / 2 + mm(0.5)
    g.add(cone)
  }
  const ferrule = mesh(
    lathe(
      filletProfile(
        [
          [shaftR, 0],
          [mm(4.2), mm(0.6)],
          [mm(5.6), mm(6)],
          [mm(5.8), mm(8)],
          [0, mm(8)],
        ],
        mm(0.8)
      ),
      segs(ctx, 40)
    ),
    handleMat
  )
  g.add(ferrule)
  const grip = mesh(knurledCylinder(mm(6.4), mm(46), 18, mm(0.5), mm(0.8)), handleMat)
  grip.position.y = mm(8)
  g.add(grip)
  const knurlMat = (handleMat as THREE.MeshPhysicalMaterial).clone()
  knurlMat.normalMap = surfaceNormalUV("knurl", 60, 60)
  knurlMat.normalScale = new THREE.Vector2(0.6, 0.6)
  ;(grip.material as THREE.Material) = knurlMat
  const neck = mesh(
    lathe(
      filletProfile(
        [
          [mm(6.1), 0],
          [mm(5), mm(1.6)],
          [mm(5), mm(6)],
          [0, mm(6)],
        ],
        mm(0.6)
      ),
      segs(ctx, 40)
    ),
    handleMat
  )
  neck.position.y = mm(54)
  g.add(neck)
  const swivel = mesh(
    lathe(
      filletProfile(
        [
          [0, 0],
          [mm(6.2), 0],
          [mm(6.2), mm(9)],
          [mm(5.4), mm(10)],
          [0, mm(10.4)],
        ],
        mm(1),
        3
      ),
      segs(ctx, 48)
    ),
    M.anodized("#1b1b20", { repeat: 60 })
  )
  swivel.position.y = mm(59.5)
  g.add(swivel)
  const band = mesh(new THREE.CylinderGeometry(mm(6.25), mm(6.25), mm(2.2), segs(ctx, 48), 1, true), M.anodized(spec.band, { repeat: 60 }))
  band.position.y = mm(63)
  g.add(band)
  return g
}

function buildDriverSet(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const handleMat = M.brushed(art.color, { repeat: [20, 20], rotation: Math.PI / 2 })
  const standMat = M.anodized(art.secondary ?? "#1e1e26", { repeat: 10, roughness: 0.42 })
  const accent = art.accent ?? "#ffd23f"
  const specs: DriverSpec[] = [
    { tip: "hex", size: 1.5, band: "#ff4b3a", label: "1.5" },
    { tip: "hex", size: 2, band: accent, label: "2.0" },
    { tip: "hex", size: 2.5, band: "#3d8bff", label: "2.5" },
    { tip: "hex", size: 3, band: "#34d58a", label: "3.0" },
    { tip: "phillips", size: 2.5, band: "#d08a5c", label: "PH1" },
  ]

  // Stand: stepped profile extruded along X.
  const prof = new THREE.Shape()
  prof.moveTo(mm(-24), mm(1.5))
  prof.lineTo(mm(22), mm(1.5))
  prof.lineTo(mm(22), mm(17))
  prof.lineTo(mm(4), mm(19))
  prof.lineTo(mm(-24), mm(30))
  prof.closePath()
  const standW = mm(116)
  const stand = mesh(profileX(prof, standW, { bevel: mm(1.5), bevelSegments: 3, curveSegments: 1 }), standMat)
  root.add(stand)

  const slopeY = (z: number) => mm(31.5) + ((z - mm(-24)) / (mm(4) - mm(-24))) * (mm(20.5) - mm(31.5))
  const standing = specs.slice(0, 4)
  standing.forEach((s, i) => {
    const x = mm(-42 + i * 28)
    const z = mm(-10)
    const d = driver(s, ctx, handleMat)
    const y = slopeY(z) + mm(9)
    d.position.set(x, y, z)
    d.rotation.y = i * 0.7
    root.add(d)
    const collar = mesh(new THREE.TorusGeometry(mm(3.4), mm(0.7), 10, 32), M.chrome())
    collar.rotation.x = Math.PI / 2 - Math.atan2(mm(11), mm(28))
    collar.position.set(x, slopeY(z) + mm(0.15), z)
    root.add(collar)
  })
  const labels = makeCanvas(116 * 10, 15 * 10)
  if (labels) {
    const g = labels.getContext("2d")!
    standing.forEach((s, i) => {
      const x = (58 - 42 + i * 28) * 10
      drawText(g, s.label, x, 9.4 * 10, { size: 5.4 * 10, font: FONT.din, weight: 700, color: "rgba(244,242,236,0.92)", align: "center" })
      g.fillStyle = s.band
      g.fillRect(x - 40, 12 * 10, 80, 12)
    })
  }
  root.add(faceDecal(labels, mm(116), mm(15), "+z", [0, mm(9.4), mm(23.55)]))

  // Fifth driver lying in front, tip toward the camera.
  const lying = driver(specs[4], ctx, handleMat)
  lying.rotation.set(0, 0, Math.PI / 2)
  const holder = new THREE.Group()
  holder.add(lying)
  holder.rotation.y = -0.52
  holder.position.set(mm(-6), mm(6.4), mm(56))
  root.add(holder)

  root.userData.views = {
    hero: { azimuth: 30, elevation: 18, fill: 0.88 },
    detail: { azimuth: 18, elevation: 22, fill: 1.8, fov: 20 },
    alt: { azimuth: -38, elevation: 26, fill: 0.88 },
  }
  return root
}

/* ===========================================================================
 * Oil — precision oil bottle with needle applicator
 * ========================================================================= */

function oilLabel(accent: string, ink: string) {
  const c = makeCanvas(2048, 640)
  if (!c) return null
  const g = c.getContext("2d")!
  g.fillStyle = "#f6f3ec"
  g.fillRect(0, 0, 2048, 640)
  g.fillStyle = "#0e0e12"
  g.fillRect(0, 0, 2048, 150)
  g.fillStyle = accent
  g.fillRect(0, 150, 2048, 26)
  // Front panel is centred at u = 0.5.
  const cx = 1024
  drawText(g, "PRECISION", cx, 108, { size: 92, font: FONT.display, weight: 800, italic: true, color: "#f3efe6", align: "center", tracking: 4 })
  drawText(g, "OIL", cx, 340, { size: 190, font: FONT.display, weight: 800, italic: true, color: ink, align: "center" })
  drawText(g, "LIGHT · ISO 10", cx, 432, { size: 52, font: FONT.din, weight: 700, color: ink, align: "center", tracking: 6 })
  drawText(g, "BEARINGS · BUSHINGS · GEARS", cx, 520, { size: 34, font: FONT.mono, weight: 500, color: "#55535c", align: "center" })
  drawText(g, "10 ml", cx, 600, { size: 40, font: FONT.din, weight: 700, color: ink, align: "center" })
  // Drop icon.
  g.fillStyle = accent
  g.beginPath()
  g.moveTo(cx - 300, 230)
  g.quadraticCurveTo(cx - 256, 300, cx - 270, 330)
  g.arc(cx - 300, 320, 32, 0.3, Math.PI - 0.3)
  g.quadraticCurveTo(cx - 344, 300, cx - 300, 230)
  g.fill()
  // Wrap-side copy.
  drawText(g, "SHAKE · APPLY ONE DROP", 290, 300, { size: 34, font: FONT.mono, weight: 500, color: "#55535c", align: "center" })
  drawText(g, "NON-GUMMING SYNTHETIC", 1760, 300, { size: 34, font: FONT.mono, weight: 500, color: "#55535c", align: "center" })
  return c
}

function buildOil(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const accent = art.accent ?? "#ffd23f"
  const bottleMat = M.satin(art.color, { roughness: 0.38, repeat: 30, surface: "fine-grain", grain: 0.2, clearcoat: 0.3 })
  const capMat = M.gloss(art.secondary ?? "#18181d", { roughness: 0.26 })
  const n = segs(ctx, 72)

  const body = lathe(
    filletProfile(
      [
        [0, 0],
        [mm(14), 0],
        [mm(15.5), mm(2.5)],
        [mm(15.5), mm(48)],
        [mm(13), mm(56)],
        [mm(7), mm(61)],
        [mm(6.4), mm(66)],
        [0, mm(66)],
      ],
      mm(2.4),
      6
    ),
    n
  )
  root.add(mesh(body, bottleMat))
  const collar = mesh(knurledCylinder(mm(8), mm(9), 28, mm(0.4), mm(0.8)), capMat)
  collar.position.y = mm(61)
  root.add(collar)
  const nozzle = mesh(
    lathe(
      filletProfile(
        [
          [0, 0],
          [mm(6.4), 0],
          [mm(4.2), mm(8)],
          [mm(1.4), mm(13)],
          [0, mm(13)],
        ],
        mm(1)
      ),
      n
    ),
    capMat
  )
  nozzle.position.y = mm(70)
  root.add(nozzle)
  const needle = mesh(new THREE.CylinderGeometry(mm(0.55), mm(0.7), mm(34), 16), M.chrome())
  needle.position.y = mm(83 + 17)
  root.add(needle)
  const bead = mesh(new THREE.SphereGeometry(mm(0.75), 16, 12), M.gloss("#b9852f", { roughness: 0.05, clearcoat: 1 }))
  bead.position.y = mm(117.2)
  bead.scale.y = 1.3
  root.add(bead)

  // Wrap label.
  const labelArt = oilLabel(accent, mix(art.secondary ?? "#18181d", "#000000", 0.2))
  const labelTex = labelArt ? canvasToTexture(labelArt, { anisotropy: 12 }) : null
  const label = mesh(new THREE.CylinderGeometry(mm(15.58), mm(15.58), mm(34), n, 1, true, Math.PI * 0.08, Math.PI * 1.84), M.print(labelTex, { roughness: 0.42, clearcoat: 0.5 }))
  label.position.y = mm(28)
  label.rotation.y = -Math.PI / 2 - Math.PI * 0.08 - Math.PI * 0.92 + Math.PI
  root.add(label)

  // Needle cap lying beside it, and two oil beads on the floor.
  const cap = mesh(
    lathe(
      filletProfile(
        [
          [0, 0],
          [mm(2.2), 0],
          [mm(2.2), mm(14)],
          [mm(1.6), mm(15.6)],
          [0, mm(16)],
        ],
        mm(0.8)
      ),
      segs(ctx, 32)
    ),
    M.gloss(accent, { roughness: 0.25 })
  )
  cap.rotation.set(0, 0.9, Math.PI / 2)
  cap.position.set(mm(30), mm(2.2), mm(22))
  root.add(cap)
  const dropMat = M.gloss("#c48d2e", { roughness: 0.04, clearcoat: 1 })
  for (const [x, z, r] of [
    [-24, 26, 3.2],
    [-17, 34, 1.8],
  ]) {
    const d = mesh(new THREE.SphereGeometry(mm(r), 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), dropMat)
    d.scale.y = 0.32
    d.position.set(mm(x), 0, mm(z))
    root.add(d)
  }

  root.userData.views = {
    hero: { azimuth: 26, elevation: 14, fill: 0.86 },
    detail: { azimuth: 8, elevation: 10, fill: 1.6, fov: 20 },
    alt: { azimuth: -38, elevation: 26, fill: 0.86 },
  }
  return root
}

export function buildTool(art: PartArt, ctx: BuildContext) {
  switch (art.variant) {
    case "driver-set":
      return buildDriverSet(art, ctx)
    case "oil":
      return buildOil(art, ctx)
    default:
      return buildTireTruer(art, ctx)
  }
}

