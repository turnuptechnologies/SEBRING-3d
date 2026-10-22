import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { segs, type BuildContext } from "./context"
import { FONT, drawDialScale, drawSegments, drawText, makeCanvas, mix, roundRectPath, segmentsWidth } from "./kit/canvas"
import { extrudeCentered, roundedRectHole, roundedRectShape, slab } from "./kit/geometry"
import * as M from "./kit/materials"
import { bindingPost, display, faceDecal, haloPlane, knob, led, mesh, mm, rubberFoot } from "./kit/parts"

/**
 * Variable bench supply: brushed aluminium wrap-around cover, black anodised
 * front panel in a moulded bezel, LED readouts, knurled dials, 4 mm binding posts.
 * params.volts / params.amps drive the readouts.
 */

const W = 200
const H = 92
const D = 230
const FOOT = 5
const INK = "rgba(244,242,236,0.9)"
const INK_DIM = "rgba(244,242,236,0.55)"

function coverShape() {
  const s = new THREE.Shape()
  const hw = mm(W / 2)
  const t = mm(1.8)
  const r = mm(14)
  const y0 = mm(FOOT + 1.5)
  const y1 = mm(FOOT + H)
  s.moveTo(-hw, y0)
  s.lineTo(-hw, y1 - r)
  s.absarc(-hw + r, y1 - r, r, Math.PI, Math.PI / 2, true)
  s.lineTo(hw - r, y1)
  s.absarc(hw - r, y1 - r, r, Math.PI / 2, 0, true)
  s.lineTo(hw, y0)
  s.lineTo(hw - t, y0)
  s.lineTo(hw - t, y1 - r)
  s.absarc(hw - r, y1 - r, r - t, 0, Math.PI / 2, false)
  s.lineTo(-hw + r, y1 - t)
  s.absarc(-hw + r, y1 - r, r - t, Math.PI / 2, Math.PI, false)
  s.lineTo(-hw + t, y0)
  s.closePath()
  return s
}

function readout(text: string, unit: string, color: string, wmm: number, hmm: number, digitH: number) {
  const k = 14
  const c = makeCanvas(Math.round(wmm * k), Math.round(hmm * k))
  if (!c) return null
  const g = c.getContext("2d")!
  const bg = g.createLinearGradient(0, 0, 0, c.height)
  bg.addColorStop(0, "#07070a")
  bg.addColorStop(1, "#0b0b10")
  g.fillStyle = bg
  g.fillRect(0, 0, c.width, c.height)
  const h = digitH * k
  const style = { color, ghost: mix(color, "#08080b", 0.965), glow: 0.9 * k, skew: 0.12, thickness: 0.13, aspect: 0.52, spacing: 0.2 }
  const unitW = unit ? h * 0.42 : 0
  const tw = segmentsWidth(text, h, style) + unitW + (unit ? 0.18 * h : 0)
  const x = (c.width - tw) / 2
  const y = (c.height - h) / 2
  drawSegments(g, text, x, y, h, style)
  if (unit) {
    g.save()
    g.shadowColor = color
    g.shadowBlur = 0.6 * k
    drawText(g, unit, x + tw - unitW * 0.95, y + h, { size: h * 0.46, font: FONT.din, weight: 700, color })
    g.restore()
  }
  return c
}

function panelArt(volts: number, amps: number, accent: string) {
  const k = 10
  const PW = 192
  const PH = 84
  const c = makeCanvas(PW * k, PH * k)
  if (!c) return null
  const g = c.getContext("2d")!
  // Panel coords: x −96 … 96 mm (left → right), y 9 … 93 mm (bottom → top).
  const u = (x: number) => (x + PW / 2) * k
  const v = (y: number) => (93 - y) * k

  drawText(g, "DC POWER SUPPLY", u(-86), v(88.2), { size: 2.6 * k, font: FONT.din, weight: 700, color: INK, tracking: 0.55 * k })
  drawText(g, "SB-1505 · 0–15 V / 5 A", u(-86) , v(84.6) + 0.2 * k, { size: 1.9 * k, font: FONT.mono, weight: 500, color: INK_DIM })
  g.fillStyle = accent
  g.fillRect(u(-86), v(91.2), 8 * k, 0.6 * k)

  // Readout captions.
  drawText(g, "VOLTS", u(-20), v(53.4), { size: 1.9 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "right", tracking: 0.4 * k })
  drawText(g, "AMPS", u(-44), v(27.2), { size: 1.9 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "right", tracking: 0.4 * k })
  drawText(g, `${volts.toFixed(1)} V SET`, u(-86), v(53.4), { size: 1.7 * k, font: FONT.mono, weight: 500, color: INK_DIM })
  drawText(g, `LIMIT ${amps.toFixed(1)} A`, u(-86), v(27.2), { size: 1.7 * k, font: FONT.mono, weight: 500, color: INK_DIM })

  // Dial scales.
  drawDialScale(g, { cx: u(30), cy: v(60), r0: 20.5 * k, r1: 23 * k, from: -135, to: 135, majors: 15, minors: 1, color: INK, width: 0.24 * k })
  drawDialScale(g, {
    cx: u(30),
    cy: v(60),
    r0: 23.5 * k,
    r1: 23.6 * k,
    from: -135,
    to: 135,
    majors: 3,
    minors: 0,
    color: INK,
    width: 0.01,
    labels: ["0", "5", "10", "15"],
    labelRadius: 26 * k,
    labelSize: 2 * k,
  })
  drawText(g, "VOLTAGE", u(30), v(84.6), { size: 2.3 * k, font: FONT.din, weight: 700, color: INK, align: "center", tracking: 0.5 * k })
  drawDialScale(g, { cx: u(76), cy: v(66), r0: 13.4 * k, r1: 15.4 * k, from: -135, to: 135, majors: 10, minors: 0, color: INK, width: 0.22 * k })
  drawText(g, "CURRENT", u(76), v(84.6), { size: 2.3 * k, font: FONT.din, weight: 700, color: INK, align: "center", tracking: 0.5 * k })
  drawText(g, "MIN", u(66.5), v(52.8), { size: 1.5 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center" })
  drawText(g, "MAX", u(85.5), v(52.8), { size: 1.5 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center" })

  // Output terminals.
  g.strokeStyle = INK_DIM
  g.lineWidth = 0.22 * k
  roundRectPath(g, u(42), v(33), 50 * k, 20 * k, 2.4 * k)
  g.stroke()
  drawText(g, "OUTPUT", u(67), v(31.2), { size: 1.8 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center", tracking: 0.5 * k })
  drawText(g, "+", u(56), v(14.6), { size: 3 * k, font: FONT.din, weight: 700, color: INK, align: "center" })
  drawText(g, "−", u(80), v(14.6), { size: 3 * k, font: FONT.din, weight: 700, color: INK, align: "center" })
  drawText(g, "ON", u(22), v(14.6), { size: 1.6 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center", tracking: 0.3 * k })
  drawText(g, "POWER", u(-74), v(13.6), { size: 1.8 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center", tracking: 0.4 * k })
  drawText(g, "CV", u(-30), v(17.4), { size: 1.6 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center" })
  drawText(g, "CC", u(-18), v(17.4), { size: 1.6 * k, font: FONT.din, weight: 700, color: INK_DIM, align: "center" })
  return c
}

function ventArt() {
  const k = 8
  const c = makeCanvas(150 * k, 40 * k)
  if (!c) return null
  const g = c.getContext("2d")!
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 30; col++) {
      const x = (6 + col * 4.6 + (row % 2) * 2.3) * k
      const y = (6 + row * 4.6) * k
      const gr = g.createRadialGradient(x - 0.3 * k, y - 0.4 * k, 0.1 * k, x, y, 1.45 * k)
      gr.addColorStop(0, "rgba(2,2,3,1)")
      gr.addColorStop(0.75, "rgba(6,6,8,1)")
      gr.addColorStop(1, "rgba(30,30,36,0.9)")
      g.fillStyle = gr
      g.beginPath()
      g.arc(x, y, 1.45 * k, 0, Math.PI * 2)
      g.fill()
    }
  }
  return c
}

export function buildPowerSupply(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const volts = art.params?.volts ?? 12
  const amps = art.params?.amps ?? 2.5
  const accent = art.accent ?? "#ffd23f"
  const coverMat = M.brushed(art.color, { repeat: [2.5, 2.5], roughness: 0.3, rotation: 0 })
  const black = art.secondary ?? "#141418"
  const bezelMat = M.satin(black, { roughness: 0.5, repeat: 12 })
  const panelMat = M.anodized(mix(black, "#34343c", 0.7), { repeat: 14, roughness: 0.44 })
  const front = mm(D / 2)

  // Feet and chassis tray.
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const f = rubberFoot(mm(9), mm(FOOT + 1))
      f.position.set(x * mm(W / 2 - 22), 0, z * mm(D / 2 - 26))
      root.add(f)
    }
  }
  const tray = mesh(slab(mm(W - 3), mm(6), mm(D - 6), { radius: mm(3), bevel: mm(0.8) }), M.satin("#121215", { roughness: 0.6, repeat: 8 }))
  tray.position.y = mm(FOOT)
  root.add(tray)

  // Brushed wrap-around cover.
  const cover = extrudeCentered(coverShape(), mm(D - 8), { bevel: mm(0.5), bevelSegments: 2, curveSegments: 16 })
  root.add(mesh(cover, coverMat))

  // Moulded bezel frame + inset anodised panel (front), plain bezel (rear).
  const frameShape = roundedRectShape(mm(W + 6), mm(H + 2), mm(10))
  frameShape.holes.push(roundedRectHole(mm(W - 4), mm(H - 6), mm(5)))
  for (const side of [1, -1]) {
    const frame = mesh(extrudeCentered(frameShape, mm(12), { bevel: mm(1.6), bevelSegments: 3, curveSegments: 10 }), bezelMat)
    frame.position.set(0, mm(FOOT + H / 2), side * (front - mm(2)))
    root.add(frame)
    const plate = mesh(slab(mm(W - 3), mm(4), mm(H - 5), { radius: mm(5), bevel: mm(0.8) }), side > 0 ? panelMat : bezelMat)
    plate.rotation.x = side * (Math.PI / 2)
    plate.position.set(0, mm(FOOT + H / 2), side * (front + mm(0.4)) - side * mm(4))
    root.add(plate)
  }
  const pz = front + mm(0.45)

  root.add(faceDecal(panelArt(volts, amps, accent), mm(192), mm(84), "+z", [0, mm(51), pz + mm(0.05)]))

  // Readouts in recessed windows.
  const windows: { x: number; y: number; w: number; h: number; text: string; unit: string; digit: number; color: string }[] = [
    { x: -52, y: 70, w: 68, h: 26, text: volts.toFixed(1).padStart(4, " "), unit: "V", digit: 17, color: accent },
    { x: -63, y: 39.5, w: 46, h: 17, text: amps.toFixed(2), unit: "A", digit: 10.5, color: mix(accent, "#ff6a3d", 0.65) },
  ]
  for (const wnd of windows) {
    const bezel = roundedRectShape(mm(wnd.w + 5), mm(wnd.h + 5), mm(2.4))
    bezel.holes.push(roundedRectHole(mm(wnd.w), mm(wnd.h), mm(1.2)))
    const ring = mesh(extrudeCentered(bezel, mm(1.6), { bevel: mm(0.5), bevelSegments: 2, curveSegments: 6 }), M.satin("#0c0c0f", { roughness: 0.35, repeat: 20 }))
    ring.position.set(mm(wnd.x), mm(wnd.y), pz + mm(0.8))
    root.add(ring)
    const disp = display(readout(wnd.text, wnd.unit, wnd.color, wnd.w, wnd.h, wnd.digit), mm(wnd.w), mm(wnd.h), 1.7)
    disp.position.set(mm(wnd.x), mm(wnd.y), pz + mm(0.3))
    root.add(disp)
  }

  // Dials.
  const knobBody = M.brushed("#e4e6ea", { repeat: 50, rotation: Math.PI / 2 })
  const vKnob = knob({
    radius: mm(16),
    height: mm(13),
    body: knobBody,
    cap: M.anodized("#18181c", { repeat: 40 }),
    indicator: accent,
    skirt: { radius: mm(19), height: mm(2.4), material: M.anodized("#1d1d22", { repeat: 40 }) },
    segments: segs(ctx, 72),
  })
  vKnob.rotation.set(Math.PI / 2, 0, 0)
  vKnob.rotateY(-((volts / 15) * 270 - 135) * (Math.PI / 180))
  vKnob.position.set(mm(30), mm(60), pz)
  root.add(vKnob)
  const aKnob = knob({
    radius: mm(10.5),
    height: mm(10),
    body: knobBody,
    cap: M.anodized("#18181c", { repeat: 40 }),
    indicator: "#f4f2ec",
    skirt: { radius: mm(12.4), height: mm(1.8), material: M.anodized("#1d1d22", { repeat: 40 }) },
    segments: segs(ctx, 56),
  })
  aKnob.rotation.set(Math.PI / 2, 0, 0)
  aKnob.rotateY(-((amps / 5) * 270 - 135) * (Math.PI / 180))
  aKnob.position.set(mm(76), mm(66), pz)
  root.add(aKnob)

  // Binding posts.
  for (const [x, color] of [
    [56, "#d3251b"],
    [80, "#151517"],
  ] as const) {
    const post = bindingPost(color, 1.05)
    post.rotation.x = Math.PI / 2
    post.position.set(mm(x), mm(21), pz)
    root.add(post)
  }

  // Output button with LED, CV/CC indicators, power rocker.
  const outBtn = mesh(slab(mm(12), mm(4), mm(8), { radius: mm(2), bevel: mm(0.8) }), M.satin("#1c1c21", { roughness: 0.45, repeat: 30 }))
  outBtn.rotation.x = Math.PI / 2
  outBtn.position.set(mm(22), mm(21), pz)
  root.add(outBtn)
  const ledGeoAt = (x: number, y: number, color: string, lit: boolean) => {
    const l = led(color, mm(1.5), lit)
    l.rotation.x = Math.PI / 2
    l.position.set(mm(x), mm(y), pz)
    root.add(l)
    if (lit) {
      const h = haloPlane(color, mm(9), 0.45)
      h.position.set(mm(x), mm(y), pz + mm(0.25))
      root.add(h)
    }
  }
  ledGeoAt(22, 28.5, "#38ff8e", true)
  ledGeoAt(-30, 22.5, "#38ff8e", true)
  ledGeoAt(-18, 22.5, "#ff4b3a", false)

  const rocker = new THREE.Group()
  rocker.add(mesh(slab(mm(20), mm(3), mm(13), { radius: mm(1.6), bevel: mm(0.6) }), M.satin("#0d0d10", { roughness: 0.4, repeat: 30 })))
  const paddle = mesh(slab(mm(16.5), mm(4.5), mm(9.5), { radius: mm(1.2), bevel: mm(1) }), M.lens("#e3271c", 0.35))
  paddle.position.y = mm(1.4)
  paddle.rotation.z = 0.12
  rocker.add(paddle)
  rocker.rotation.x = Math.PI / 2
  rocker.position.set(mm(-74), mm(21), pz)
  root.add(rocker)

  // Side perforations and a folding bail handle.
  for (const side of [-1, 1]) {
    root.add(faceDecal(ventArt(), mm(150), mm(40), side > 0 ? "+x" : "-x", [side * mm(W / 2 + 0.05), mm(FOOT + 38), mm(-20)]))
    const hub = mesh(new THREE.CylinderGeometry(mm(9), mm(9), mm(5), segs(ctx, 40)), M.satin("#131316", { roughness: 0.4, repeat: 30 }))
    hub.rotation.z = Math.PI / 2
    hub.position.set(side * mm(W / 2 + 3.5), mm(FOOT + 30), mm(70))
    root.add(hub)
    const cap = mesh(new THREE.CylinderGeometry(mm(5), mm(5), mm(1.2), segs(ctx, 32)), M.chrome())
    cap.rotation.z = Math.PI / 2
    cap.position.set(side * mm(W / 2 + 6.4), mm(FOOT + 30), mm(70))
    root.add(cap)
  }
  const bx = mm(W / 2 + 4.5)
  const by = mm(FOOT + 30)
  const bz = mm(70)
  const reach = mm(60)
  const pts = [
    new THREE.Vector3(-bx, by, bz),
    new THREE.Vector3(-bx, by - reach * 0.55, bz + reach * 0.8),
    new THREE.Vector3(-bx + mm(8), mm(4.2), bz + reach),
    new THREE.Vector3(bx - mm(8), mm(4.2), bz + reach),
    new THREE.Vector3(bx, by - reach * 0.55, bz + reach * 0.8),
    new THREE.Vector3(bx, by, bz),
  ]
  const bailCurve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.08)
  root.add(mesh(new THREE.TubeGeometry(bailCurve, segs(ctx, 160), mm(3.2), 14, false), M.satin("#131316", { roughness: 0.35, repeat: 30 })))

  root.userData.views = {
    hero: { azimuth: 32, elevation: 14, fill: 0.86 },
    detail: { azimuth: -6, elevation: 7, fill: 1.45, fov: 20 },
    alt: { azimuth: -40, elevation: 30, fill: 0.86 },
  }
  return root
}
