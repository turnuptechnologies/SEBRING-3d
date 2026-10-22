import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { segs, type BuildContext } from "./context"
import { FONT, drawText, makeCanvas, mix, roundRectPath } from "./kit/canvas"
import { filletProfile, lathe, planExtrude, slab, spline } from "./kit/geometry"
import * as M from "./kit/materials"
import { surfaceNormalUV } from "./kit/textures"
import { CLIP_REST, alligatorClip, cable, faceDecal, haloPlane, led, mesh, mm, socketScrew, strandedEnd } from "./kit/parts"
import { buildTrackSection } from "./track"

/* ===========================================================================
 * Lead wire — spool of silicone wire
 * ========================================================================= */

function swapUV(geo: THREE.BufferGeometry) {
  const uv = geo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
  uv.needsUpdate = true
  return geo
}

function spoolLabel(color: string, awg: number) {
  const S = 1024
  const c = makeCanvas(S, S)
  if (!c) return null
  const g = c.getContext("2d")!
  const cx = S / 2
  const cy = S / 2
  // Ring geometry maps r 10 … 29 mm onto the canvas square (r = 512 px at 29 mm).
  const px = (r: number) => (r / 29) * (S / 2)
  g.fillStyle = "#f1eee6"
  g.beginPath()
  g.arc(cx, cy, px(29), 0, Math.PI * 2)
  g.fill()
  g.fillStyle = color
  g.beginPath()
  g.arc(cx, cy, px(29), 0, Math.PI * 2)
  g.arc(cx, cy, px(24.2), 0, Math.PI * 2, true)
  g.fill()
  g.fillStyle = "#0b0b0f"
  g.beginPath()
  g.arc(cx, cy, px(12.6), 0, Math.PI * 2)
  g.fill()
  // Circular caption on the coloured band.
  const ring = "SILICONE HOOK-UP WIRE  ·  ULTRA FLEX  ·  200 °C  ·  "
  g.save()
  g.translate(cx, cy)
  g.font = `700 ${px(2.7)}px ${FONT.din}`
  g.fillStyle = "#ffffff"
  g.textAlign = "center"
  g.textBaseline = "middle"
  const total = ring.length
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2
    g.save()
    g.rotate(a + Math.PI / 2)
    g.fillText(ring[i], 0, -px(26.6))
    g.restore()
  }
  g.restore()
  drawText(g, `${awg}`, cx, cy + px(-14.5), { size: px(8.4), font: FONT.display, weight: 800, italic: true, color: "#0b0b0f", align: "center" })
  drawText(g, "AWG", cx, cy + px(-11.2), { size: px(2.4), font: FONT.din, weight: 700, color: "#0b0b0f", align: "center", tracking: px(0.5) })
  drawText(g, "10 m · 0.34 mm²", cx, cy + px(17.2), { size: px(2.3), font: FONT.mono, weight: 500, color: "#3b3a40", align: "center" })
  drawText(g, "60 × 0.08 TINNED", cx, cy + px(20.4), { size: px(1.8), font: FONT.mono, weight: 500, color: "#5c5a65", align: "center" })
  return c
}

function buildLeadWire(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const spool = new THREE.Group()
  const wireColor = art.color
  const flangeMat = M.gloss(art.secondary ?? "#18181d", { roughness: 0.22 })
  const axisY = mm(32)

  const flangeProfile = filletProfile(
    [
      [mm(8), 0],
      [mm(30.6), 0],
      [mm(32), mm(0.9)],
      [mm(32), mm(1.9)],
      [mm(30.6), mm(2.8)],
      [mm(8), mm(2.8)],
    ],
    mm(0.6),
    3
  )
  for (const x of [-24.4, 21.6]) {
    const f = mesh(lathe(flangeProfile, segs(ctx, 96)), flangeMat)
    f.rotation.z = -Math.PI / 2
    f.position.set(mm(x), axisY, 0)
    spool.add(f)
  }
  const hubInner = mesh(new THREE.CylinderGeometry(mm(8), mm(8), mm(49), segs(ctx, 40), 1, true), M.satin("#0c0c0f", { roughness: 0.6, repeat: 20 }))
  hubInner.material = hubInner.material as THREE.Material
  hubInner.rotation.z = Math.PI / 2
  hubInner.position.set(mm(-1.4), axisY, 0)
  spool.add(hubInner)
  const hubOuter = mesh(new THREE.CylinderGeometry(mm(12), mm(12), mm(43.6), segs(ctx, 40), 1, true), flangeMat)
  hubOuter.rotation.z = Math.PI / 2
  hubOuter.position.set(mm(-1.4), axisY, 0)
  spool.add(hubOuter)

  const woundMat = M.silicone(wireColor).clone()
  woundMat.normalMap = surfaceNormalUV("windings", 0.9, 3)
  woundMat.normalScale = new THREE.Vector2(0.9, 0.9)
  const wound = mesh(swapUV(new THREE.CylinderGeometry(mm(26), mm(26), mm(43.4), segs(ctx, 128), 1, true)), woundMat)
  wound.rotation.z = Math.PI / 2
  wound.position.set(mm(-1.4), axisY, 0)
  spool.add(wound)

  const label = new THREE.Mesh(new THREE.RingGeometry(mm(10), mm(29), segs(ctx, 96), 1), M.print(null))
  const labelArt = spoolLabel(wireColor, art.params?.awg ?? 22)
  if (labelArt) {
    const tex = new THREE.CanvasTexture(labelArt)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const pos = label.geometry.attributes.position as THREE.BufferAttribute
    const uv = label.geometry.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / mm(58), 0.5 + pos.getY(i) / mm(58))
    label.material = M.print(tex, { roughness: 0.5, clearcoat: 0.1 })
  }
  label.rotation.y = Math.PI / 2
  label.position.set(mm(24.45), axisY, 0)
  spool.add(label)

  spool.rotation.y = -0.52
  root.add(spool)

  // Loose end peeling off the roll and curling across the floor.
  const wr = mm(0.85)
  const exit = new THREE.Vector3(mm(6), axisY - mm(25.6) * Math.cos(0.5), mm(25.6) * Math.sin(0.5)).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.52)
  const W = (x: number, z: number, y = wr) => new THREE.Vector3(mm(x), y, mm(z))
  const pts = [exit, exit.clone().add(new THREE.Vector3(mm(4), -mm(6), mm(8))), W(16, 44), W(34, 66), W(64, 70), W(84, 52), W(82, 30), W(66, 26)]
  const curve = spline(pts)
  root.add(mesh(new THREE.TubeGeometry(curve, segs(ctx, 140), wr, 10, false), M.silicone(wireColor)))
  const end = curve.getPointAt(1)
  const dir = curve.getTangentAt(1)
  const tip = strandedEnd(mm(7), wr * 0.78, 9, M.nickel(0.32))
  tip.position.copy(end)
  tip.lookAt(end.clone().add(dir))
  root.add(tip)

  root.userData.views = {
    hero: { azimuth: 30, elevation: 16, fill: 0.86 },
    detail: { azimuth: 52, elevation: 18, fill: 1.7, fov: 20 },
    alt: { azimuth: -32, elevation: 30, fill: 0.86 },
  }
  return root
}

/* ===========================================================================
 * Clips — insulated alligator clip set
 * ========================================================================= */

function buildClips(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const a = art.color
  const b = art.secondary ?? "#18181d"
  const n = 6
  for (let i = 0; i < n; i++) {
    const boot = i % 2 ? b : a
    const open = i === 4 ? 0.3 : 0
    const yaw = (i - (n - 1) / 2) * 0.05
    const holder = new THREE.Group()
    const clip = alligatorClip({ boot, open, quality: ctx.q })
    // An opened clip rocks back onto its lower jaw.
    clip.rotation.x = open ? -0.09 : 0
    clip.position.y = CLIP_REST + (open ? mm(1.6) : 0)
    holder.add(clip)
    holder.position.set(mm(-34 + i * 13.6), 0, mm(i % 2 ? 4 : -4))
    holder.rotation.y = yaw
    root.add(holder)

    // Pigtail lead with a stripped, tinned end.
    const lr = mm(0.95)
    const local = (x: number, y: number, z: number) => holder.localToWorld(new THREE.Vector3(x, y, z))
    holder.updateMatrixWorld(true)
    const sway = mm(i % 2 ? 3.5 : -3.5)
    const curve = spline([
      local(0, CLIP_REST * 0.9, mm(0.6)),
      local(0, lr * 1.8, -mm(8)),
      local(sway, lr, -mm(22)),
      local(sway * 0.4, lr, -mm(36)),
    ])
    root.add(mesh(new THREE.TubeGeometry(curve, segs(ctx, 60), lr, 10, false), M.silicone(boot === b ? mix(b, "#3a3a44", 0.25) : boot)))
    const end = curve.getPointAt(1)
    const tip = strandedEnd(mm(5.5), lr * 0.78, 7, M.nickel(0.32))
    tip.position.copy(end)
    tip.lookAt(end.clone().add(curve.getTangentAt(1)))
    root.add(tip)
  }
  root.userData.views = {
    hero: { azimuth: 30, elevation: 30, fill: 0.88 },
    detail: { azimuth: 16, elevation: 24, fill: 2.3, fov: 20 },
    alt: { azimuth: -36, elevation: 42, fill: 0.88 },
  }
  return root
}

/* ===========================================================================
 * Timer — lap-timing sensor gantry over a track section
 * ========================================================================= */

/** 15 mm aluminium extrusion with a T-slot in each face (plan shape, centred). */
function extrusionShape(size: number) {
  const s = new THREE.Shape()
  const h = mm(size / 2)
  const slot = mm(2.1)
  const depth = mm(3.2)
  const lip = mm(1.2)
  const pts: [number, number][] = []
  // Walk the four faces counter-clockwise, notching a T-slot in the middle of each.
  const face = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const tx = (bx - ax) / Math.hypot(bx - ax, by - ay)
    const ty = (by - ay) / Math.hypot(bx - ax, by - ay)
    pts.push([ax, ay])
    pts.push([mx - tx * slot, my - ty * slot])
    pts.push([mx - tx * slot - nx * lip, my - ty * slot - ny * lip])
    pts.push([mx - tx * slot * 1.9 - nx * lip, my - ty * slot * 1.9 - ny * lip])
    pts.push([mx - tx * slot * 1.9 - nx * depth, my - ty * slot * 1.9 - ny * depth])
    pts.push([mx + tx * slot * 1.9 - nx * depth, my + ty * slot * 1.9 - ny * depth])
    pts.push([mx + tx * slot * 1.9 - nx * lip, my + ty * slot * 1.9 - ny * lip])
    pts.push([mx + tx * slot - nx * lip, my + ty * slot - ny * lip])
    pts.push([mx + tx * slot, my + ty * slot])
  }
  face(-h, -h, h, -h, 0, -1)
  face(h, -h, h, h, 1, 0)
  face(h, h, -h, h, 0, 1)
  face(-h, h, -h, -h, -1, 0)
  s.moveTo(pts[0][0], pts[0][1])
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y)
  s.closePath()
  return s
}

function beamArt(accent: string) {
  const k = 12
  const BW = 196
  const BH = 20
  const c = makeCanvas(BW * k, BH * k)
  if (!c) return null
  const g = c.getContext("2d")!
  // Checkered band at the left, caption, lane tags.
  const sq = 2.5 * k
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 10; col++) {
      g.fillStyle = (row + col) % 2 ? "rgba(244,242,236,0.92)" : "rgba(0,0,0,0)"
      g.fillRect(4 * k + col * sq, row * sq, sq, sq)
    }
  }
  drawText(g, "LAP TIMING", 34 * k, 9.6 * k, { size: 5.2 * k, font: FONT.display, weight: 800, italic: true, color: "rgba(244,242,236,0.94)", tracking: 0.25 * k })
  drawText(g, "IR SENSOR BRIDGE · 0.001 s", 34.5 * k, 15.4 * k, { size: 2 * k, font: FONT.mono, weight: 500, color: "rgba(244,242,236,0.6)" })
  g.fillStyle = accent
  g.fillRect(34.5 * k, 17.4 * k, 12 * k, 0.6 * k)
  for (const [x, label] of [
    [124, "LANE 1"],
    [166, "LANE 2"],
  ] as const) {
    g.strokeStyle = "rgba(244,242,236,0.5)"
    g.lineWidth = 0.25 * k
    roundRectPath(g, (x - 15) * k, 4 * k, 30 * k, 12 * k, 1.8 * k)
    g.stroke()
    drawText(g, label, (x + 4) * k, 11.6 * k, { size: 2.6 * k, font: FONT.din, weight: 700, color: "rgba(244,242,236,0.9)", align: "center", tracking: 0.4 * k })
  }
  return c
}

function buildTimer(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const accent = art.accent ?? "#ffd23f"
  const frame = M.anodized(art.color, { repeat: 30, roughness: 0.4 })
  const trackLen = 190
  const track = buildTrackSection({ variant: "sport", length: trackLen, surface: art.secondary ?? "#2b2c31", marking: "#f3efe6", accent }, ctx)
  track.position.z = -mm(trackLen / 2)
  root.add(track)

  const px = 92
  const height = 118
  for (const side of [-1, 1]) {
    const pillar = mesh(planExtrude(extrusionShape(15), mm(height - 4), { bevel: mm(0.35), bevelSegments: 1, curveSegments: 1 }), frame)
    pillar.position.set(side * mm(px), mm(4), 0)
    root.add(pillar)
    const foot = mesh(slab(mm(30), mm(4), mm(44), { radius: mm(4), bevel: mm(0.8) }), frame)
    foot.position.set(side * mm(px), 0, 0)
    root.add(foot)
    for (const z of [-15, 15]) {
      const s = socketScrew(mm(2.2))
      s.position.set(side * mm(px), mm(4), mm(z))
      root.add(s)
    }
    const cap = mesh(slab(mm(17), mm(2), mm(17), { radius: mm(1.5), bevel: mm(0.5) }), M.satin("#0d0d10", { roughness: 0.45, repeat: 30 }))
    cap.position.set(side * mm(px), mm(height), 0)
    root.add(cap)
  }

  // Cross beam with printed face, lane LEDs and sensor heads.
  const beamY = mm(height - 26)
  const beam = mesh(slab(mm(px * 2 + 18), mm(24), mm(20), { radius: mm(3), bevel: mm(1.4) }), M.satin("#151518", { roughness: 0.42, repeat: 14 }))
  beam.position.set(0, beamY, 0)
  root.add(beam)
  root.add(faceDecal(beamArt(accent), mm(196), mm(20), "+z", [0, beamY + mm(12), mm(10.05)], { roughness: 0.45 }))
  const lanes = [-39, 39]
  lanes.forEach((x, i) => {
    const color = i === 0 ? "#3dff9a" : accent
    const l = led(color, mm(1.9))
    l.rotation.x = Math.PI / 2
    l.position.set(mm(i === 0 ? 4 : 46), beamY + mm(12), mm(10.05))
    root.add(l)
    const halo = haloPlane(color, mm(14), 0.5)
    halo.position.set(mm(i === 0 ? 4 : 46), beamY + mm(12), mm(10.4))
    root.add(halo)
    const head = mesh(slab(mm(14), mm(9), mm(16), { radius: mm(3), bevel: mm(1.6) }), M.satin("#101013", { roughness: 0.4, repeat: 20 }))
    head.position.set(mm(x), beamY - mm(9), 0)
    root.add(head)
    const eye = mesh(new THREE.CircleGeometry(mm(2.6), 28), M.glow("#ff2a20", 1.8))
    eye.rotation.x = Math.PI / 2
    eye.position.set(mm(x), beamY - mm(9.05), 0)
    root.add(eye)
    const beamGlow = mesh(new THREE.CylinderGeometry(mm(1.2), mm(3.8), beamY - mm(9) - mm(11), 24, 1, true), M.halo(null, "#ff2a20", 0.08))
    beamGlow.position.set(mm(x), (beamY - mm(9) + mm(11)) / 2, 0)
    root.add(beamGlow)
  })

  // Lead to the race management unit.
  const cr = mm(1.6)
  const C = (x: number, z: number, y = cr) => new THREE.Vector3(mm(x), y, mm(z))
  root.add(cable([C(px + 6, -10, mm(10)), C(px + 12, -22), C(px + 30, -48), C(px + 24, -84), C(px - 2, -112)], cr, M.gloss("#141417", { roughness: 0.3, clearcoat: 0.4 }), 80, 10))

  root.userData.views = {
    hero: { azimuth: 34, elevation: 18, fill: 0.86 },
    detail: { azimuth: 16, elevation: 10, fill: 1.55, fov: 20 },
    alt: { azimuth: -40, elevation: 28, fill: 0.86 },
  }
  return root
}

export function buildElectronics(art: PartArt, ctx: BuildContext) {
  switch (art.variant) {
    case "clips":
      return buildClips(art, ctx)
    case "timer":
      return buildTimer(art, ctx)
    default:
      return buildLeadWire(art, ctx)
  }
}
