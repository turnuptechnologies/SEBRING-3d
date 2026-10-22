import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { segs, type BuildContext } from "./context"
import { FONT, canvasToTexture, drawSegments, drawText, makeCanvas, mix, roundRectPath } from "./kit/canvas"
import { extrudeCentered, profileX, roundedRectHole, roundedRectShape, slab } from "./kit/geometry"
import * as M from "./kit/materials"
import { display, faceDecal, haloPlane, mesh, mm, rubberFoot, socketScrew } from "./kit/parts"

/**
 * Race management console: sloped wedge housing, brushed faceplate, a two-lane
 * emissive readout ("LAP 12  4.231"), membrane keys and a start-light bar.
 * params.lap / params.time (ms) drive lane 1; lane 2 trails by a lap.
 */

const WIDTH = 190
const SLOPE = Math.atan2(34, 102)

function housingShape() {
  const s = new THREE.Shape()
  s.moveTo(mm(-58), mm(4))
  s.lineTo(mm(58), mm(4))
  s.lineTo(mm(58), mm(17))
  s.lineTo(mm(54), mm(20))
  s.lineTo(mm(-48), mm(54))
  s.lineTo(mm(-54), mm(56))
  s.lineTo(mm(-58), mm(52))
  s.closePath()
  return s
}

const fmtTime = (ms: number) => (ms / 1000).toFixed(3)

function lcdArt(lap: number, time: number, accent: string) {
  const k = 14
  const Wd = 132
  const Hd = 38
  const c = makeCanvas(Wd * k, Hd * k)
  if (!c) return null
  const g = c.getContext("2d")!
  const bg = g.createLinearGradient(0, 0, 0, c.height)
  bg.addColorStop(0, "#040406")
  bg.addColorStop(1, "#09090d")
  g.fillStyle = bg
  g.fillRect(0, 0, c.width, c.height)

  const dim = mix(accent, "#050507", 0.45)
  const ghost = mix(accent, "#060608", 0.965)
  const rows = [
    { tag: "L1", tagColor: accent, lap, time, side: `BEST ${fmtTime(time - 44)}` },
    { tag: "L2", tagColor: "#ff4b3a", lap: lap - 1, time: time + 87, side: "GAP +1 LAP" },
  ]
  rows.forEach((r, i) => {
    const y0 = (1.6 + i * 18) * k
    const h = 12 * k
    const top = y0 + 3.4 * k
    g.save()
    g.fillStyle = r.tagColor
    g.shadowColor = r.tagColor
    g.shadowBlur = 0.9 * k
    roundRectPath(g, 3 * k, top + 1.6 * k, 8.6 * k, 8.6 * k, 1.3 * k)
    g.fill()
    g.restore()
    drawText(g, r.tag, 7.3 * k, top + 7.6 * k, { size: 4.8 * k, font: FONT.din, weight: 700, color: "#0b0b0f", align: "center" })
    const seg = { color: accent, ghost, glow: 1.1 * k, skew: 0.11, thickness: 0.14, aspect: 0.5, spacing: 0.2 }
    drawText(g, "LAP", 14.6 * k, y0 + 2.6 * k, { size: 2.2 * k, font: FONT.din, weight: 700, color: dim, tracking: 0.35 * k })
    drawSegments(g, String(r.lap).padStart(2, "0"), 14.6 * k, top, h, seg)
    drawText(g, "LAST LAP", 46 * k, y0 + 2.6 * k, { size: 2.2 * k, font: FONT.din, weight: 700, color: dim, tracking: 0.35 * k })
    drawSegments(g, fmtTime(r.time), 46 * k, top, h, seg)
    g.save()
    g.shadowColor = accent
    g.shadowBlur = 0.5 * k
    drawText(g, r.side, 129 * k, top + 7.4 * k, { size: 3.3 * k, font: FONT.mono, weight: 600, color: mix(accent, "#ffffff", 0.1), align: "right" })
    g.restore()
  })
  g.fillStyle = mix(accent, "#050507", 0.82)
  g.fillRect(3 * k, 18.9 * k, (Wd - 6) * k, 0.22 * k)
  return c
}

let lampTex: THREE.Texture | null | undefined
function lampTexture() {
  if (lampTex !== undefined) return lampTex
  const c = makeCanvas(256, 256)
  if (!c) return (lampTex = null)
  const g = c.getContext("2d")!
  const gr = g.createRadialGradient(118, 112, 4, 128, 128, 128)
  gr.addColorStop(0, "#fff4e8")
  gr.addColorStop(0.18, "#ffb199")
  gr.addColorStop(0.45, "#ff3a24")
  gr.addColorStop(0.85, "#b8140b")
  gr.addColorStop(1, "#5a0604")
  g.fillStyle = gr
  g.fillRect(0, 0, 256, 256)
  // Fresnel lens rings.
  g.strokeStyle = "rgba(0,0,0,0.18)"
  g.lineWidth = 3
  for (let r = 30; r < 128; r += 18) {
    g.beginPath()
    g.arc(128, 128, r, 0, Math.PI * 2)
    g.stroke()
  }
  lampTex = canvasToTexture(c)
  return lampTex
}

function faceplateArt(accent: string) {
  const k = 10
  const PW = 176
  const PH = 98
  const c = makeCanvas(PW * k, PH * k)
  if (!c) return null
  const g = c.getContext("2d")!
  // Panel coords: x −88 … 88 (left → right), y −49 … 49 (front edge → rear edge).
  const u = (x: number) => (x + PW / 2) * k
  const v = (y: number) => (PH / 2 - y) * k
  const ink = "rgba(18,18,22,0.92)"
  const inkDim = "rgba(18,18,22,0.6)"
  drawText(g, "RACE CONTROL", u(-80), v(43.2), { size: 3 * k, font: FONT.din, weight: 700, color: ink, tracking: 0.55 * k })
  drawText(g, "2-LANE TIMING · LAP COUNTER", u(80), v(43.2), { size: 1.9 * k, font: FONT.mono, weight: 500, color: inkDim, align: "right" })
  g.fillStyle = accent
  g.fillRect(u(-80), v(40.6), 10 * k, 0.7 * k)
  const keys = [
    { x: -64, label: "MENU" },
    { x: -38, label: "RESET" },
    { x: -12, label: "PAUSE" },
    { x: 52, label: "START" },
  ]
  for (const key of keys) drawText(g, key.label, u(key.x), v(-39.4), { size: 2.1 * k, font: FONT.din, weight: 700, color: ink, align: "center", tracking: 0.4 * k })
  drawText(g, "FUEL", u(20), v(-39.4), { size: 2.1 * k, font: FONT.din, weight: 700, color: ink, align: "center", tracking: 0.4 * k })
  return c
}

function keyIcon(kind: "menu" | "reset" | "pause" | "start" | "fuel", color: string) {
  const c = makeCanvas(256, 128)
  if (!c) return null
  const g = c.getContext("2d")!
  g.fillStyle = color
  g.strokeStyle = color
  g.lineWidth = 11
  g.lineCap = "round"
  const cx = 128
  const cy = 64
  if (kind === "menu") {
    for (const dy of [-24, 0, 24]) {
      g.beginPath()
      g.moveTo(cx - 32, cy + dy)
      g.lineTo(cx + 32, cy + dy)
      g.stroke()
    }
  } else if (kind === "reset") {
    g.beginPath()
    g.arc(cx, cy, 30, -Math.PI * 0.35, Math.PI * 1.45)
    g.stroke()
    g.beginPath()
    g.moveTo(cx + 34, cy - 40)
    g.lineTo(cx + 28, cy - 12)
    g.lineTo(cx + 4, cy - 26)
    g.closePath()
    g.fill()
  } else if (kind === "pause") {
    g.fillRect(cx - 24, cy - 30, 16, 60)
    g.fillRect(cx + 8, cy - 30, 16, 60)
  } else if (kind === "fuel") {
    g.beginPath()
    g.moveTo(cx, cy - 36)
    g.quadraticCurveTo(cx + 30, cy, cx + 22, cy + 18)
    g.arc(cx, cy + 14, 24, 0.15, Math.PI - 0.15)
    g.quadraticCurveTo(cx - 30, cy, cx, cy - 36)
    g.fill()
  } else {
    g.beginPath()
    g.moveTo(cx - 22, cy - 34)
    g.lineTo(cx + 34, cy)
    g.lineTo(cx - 22, cy + 34)
    g.closePath()
    g.fill()
  }
  return c
}

export function buildLapCounter(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const lap = art.params?.lap ?? 12
  const time = art.params?.time ?? 4231
  const accent = art.accent ?? "#ffd23f"
  const body = M.satin(art.color, { roughness: 0.5, repeat: 10 })

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const f = rubberFoot(mm(7), mm(3))
      f.position.set(x * mm(WIDTH / 2 - 20), 0, z * mm(44))
      root.add(f)
    }
  }
  const shell = mesh(profileX(housingShape(), mm(WIDTH), { bevel: mm(4), bevelSegments: segs(ctx, 4), curveSegments: 8 }), body)
  shell.position.y = mm(2.4)
  root.add(shell)

  // Panel space: XY on the sloped face, +Z out of it.
  const panel = new THREE.Group()
  panel.rotation.x = -(Math.PI / 2 - SLOPE)
  panel.position.set(0, mm(40.8 + 2.4), mm(4.3))
  root.add(panel)

  const plate = mesh(slab(mm(176), mm(1.6), mm(98), { radius: mm(6), bevel: mm(0.6) }), M.brushed(art.secondary ?? "#c9cdd3", { repeat: [3, 3] }))
  plate.rotation.x = Math.PI / 2
  panel.add(plate)
  const top = mm(1.6)
  panel.add(faceDecal(faceplateArt(accent), mm(176), mm(98), "+z", [0, 0, top + mm(0.03)], { roughness: 0.45 }))

  // Display: bezel + emissive readout.
  const win = roundedRectShape(mm(138), mm(44), mm(3))
  win.holes.push(roundedRectHole(mm(132), mm(38), mm(1.6)))
  const bezel = mesh(extrudeCentered(win, mm(2), { bevel: mm(0.6), bevelSegments: 2, curveSegments: 6 }), M.satin("#0c0c0f", { roughness: 0.35, repeat: 20 }))
  bezel.position.set(0, mm(12), top + mm(1))
  panel.add(bezel)
  const lcd = display(lcdArt(lap, time, accent), mm(132), mm(38), 1.75)
  lcd.position.set(0, mm(12), top + mm(0.2))
  panel.add(lcd)

  // Membrane keys.
  const keyMat = M.rubberSoft("#26262c", { repeat: 40, grain: 0.3, roughness: 0.6 })
  const keys: { x: number; w: number; icon: "menu" | "reset" | "pause" | "start" | "fuel"; mat?: THREE.Material; ink: string }[] = [
    { x: -64, w: 22, icon: "menu", ink: "#efece4" },
    { x: -38, w: 22, icon: "reset", ink: "#efece4" },
    { x: -12, w: 22, icon: "pause", ink: "#efece4" },
    { x: 20, w: 22, icon: "fuel", ink: "#efece4" },
    { x: 52, w: 34, icon: "start", mat: M.gloss(accent, { roughness: 0.25 }), ink: "#0b0b0f" },
  ]
  for (const key of keys) {
    const cap = mesh(slab(mm(key.w), mm(3.2), mm(13), { radius: mm(3), bevel: mm(1.2) }), key.mat ?? keyMat)
    cap.rotation.x = Math.PI / 2
    cap.position.set(mm(key.x), mm(-28), top)
    panel.add(cap)
    const icon = faceDecal(keyIcon(key.icon, key.ink), mm(12), mm(6), "+z", [mm(key.x), mm(-28), top + mm(3.25)], { roughness: 0.5 })
    panel.add(icon)
  }
  for (const [x, y] of [
    [-82, 43],
    [82, 43],
    [-82, -43],
    [82, -43],
  ]) {
    const s = socketScrew(mm(1.9))
    s.rotation.x = Math.PI / 2
    s.position.set(mm(x), mm(y), top)
    panel.add(s)
  }

  // Start-light bar along the rear ridge.
  const bar = new THREE.Group()
  bar.add(mesh(slab(mm(132), mm(15), mm(16), { radius: mm(4), bevel: mm(2) }), M.satin("#0f0f12", { roughness: 0.45, repeat: 12 })))
  for (let i = 0; i < 5; i++) {
    const x = mm(-52 + i * 26)
    const hood = mesh(new THREE.CylinderGeometry(mm(6.2), mm(6.2), mm(3), segs(ctx, 40), 1, true), M.satin("#0b0b0e", { roughness: 0.5, repeat: 30 }))
    hood.rotation.x = Math.PI / 2
    hood.position.set(x, mm(7.5), mm(8.6))
    bar.add(hood)
    const lensGeo = new THREE.SphereGeometry(mm(5.2), segs(ctx, 32), 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const lensMat = M.screen(lampTexture(), 1.5)
    const lamp = mesh(lensGeo, lensMat)
    lamp.rotation.x = Math.PI / 2
    lamp.scale.set(1, 0.3, 1)
    lamp.position.set(x, mm(7.5), mm(8))
    bar.add(lamp)
    const halo = haloPlane("#ff3b2a", mm(20), 0.22)
    halo.position.set(x, mm(7.5), mm(8.3))
    bar.add(halo)
  }
  bar.position.set(0, mm(58.5), mm(-52))
  bar.rotation.x = -0.18
  root.add(bar)

  root.userData.views = {
    hero: { azimuth: 30, elevation: 22, fill: 0.86 },
    detail: { azimuth: 10, elevation: 34, fill: 1.75, fov: 20 },
    alt: { azimuth: -38, elevation: 30, fill: 0.86 },
  }
  return root
}
