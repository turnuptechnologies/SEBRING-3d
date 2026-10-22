import { FONT, drawText, makeCanvas, mix, roundRectPath } from "./kit/canvas"
import { rng } from "./kit/rng"

/**
 * Cover artwork for the boxed race set — a nocturnal endurance scene in the
 * Night Shift palette: rim-lit prototype silhouette, headlight flare, long-
 * exposure light trails, generic title and a 1:32 scale badge. No marks.
 */

export interface BoxArtOptions {
  title: string
  subtitle: string
  scale: string
  base: string
  accent: string
  signal: string
  features: string[]
}

const IVORY = "#f3efe6"

/** Side profile of a long-tail prototype, nose at x = 0, ground at y = 0, ~1000 long (y up). */
function carPath(g: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number) {
  g.beginPath()
  g.moveTo(X(0), Y(58))
  g.bezierCurveTo(X(30), Y(96), X(110), Y(122), X(170), Y(150))
  g.bezierCurveTo(X(205), Y(172), X(270), Y(178), X(318), Y(160))
  g.bezierCurveTo(X(350), Y(152), X(372), Y(156), X(396), Y(170))
  g.bezierCurveTo(X(450), Y(222), X(520), Y(252), X(585), Y(252))
  g.bezierCurveTo(X(640), Y(250), X(676), Y(232), X(712), Y(214))
  g.bezierCurveTo(X(760), Y(200), X(820), Y(196), X(880), Y(198))
  g.lineTo(X(952), Y(204))
  g.lineTo(X(1000), Y(196))
  g.lineTo(X(1004), Y(122))
  g.bezierCurveTo(X(1000), Y(84), X(986), Y(56), X(960), Y(46))
  g.lineTo(X(26), Y(36))
  g.quadraticCurveTo(X(0), Y(38), X(0), Y(58))
  g.closePath()
}

function rimLight(g: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number, accent: string) {
  g.save()
  const grad = g.createLinearGradient(X(0), 0, X(1000), 0)
  grad.addColorStop(0, accent)
  grad.addColorStop(0.35, mix(accent, IVORY, 0.55))
  grad.addColorStop(0.7, "rgba(243,239,230,0.55)")
  grad.addColorStop(1, "rgba(243,239,230,0)")
  g.strokeStyle = grad
  g.lineWidth = 5
  g.shadowColor = mix(accent, IVORY, 0.3)
  g.shadowBlur = 26
  g.beginPath()
  g.moveTo(X(8), Y(70))
  g.bezierCurveTo(X(30), Y(96), X(110), Y(122), X(170), Y(150))
  g.bezierCurveTo(X(205), Y(172), X(270), Y(178), X(318), Y(160))
  g.bezierCurveTo(X(350), Y(152), X(372), Y(156), X(396), Y(170))
  g.bezierCurveTo(X(450), Y(222), X(520), Y(252), X(585), Y(252))
  g.bezierCurveTo(X(640), Y(250), X(676), Y(232), X(712), Y(214))
  g.bezierCurveTo(X(760), Y(200), X(820), Y(196), X(880), Y(198))
  g.stroke()
  g.restore()
}

function wheel(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, accent: string) {
  g.save()
  g.fillStyle = "#020203"
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()
  const rim = g.createRadialGradient(cx - r * 0.2, cy - r * 0.3, r * 0.05, cx, cy, r * 0.62)
  rim.addColorStop(0, "#2c2c34")
  rim.addColorStop(1, "#0b0b0f")
  g.fillStyle = rim
  g.beginPath()
  g.arc(cx, cy, r * 0.62, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = "rgba(243,239,230,0.16)"
  g.lineWidth = 2
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16)
    g.lineTo(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58)
    g.stroke()
  }
  g.strokeStyle = mix(accent, IVORY, 0.4)
  g.globalAlpha = 0.55
  g.lineWidth = 2.4
  g.beginPath()
  g.arc(cx, cy, r * 0.96, -Math.PI * 0.95, -Math.PI * 0.55)
  g.stroke()
  g.restore()
}

function glowSpot(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, alpha: number) {
  g.save()
  g.translate(x, y)
  g.scale(rx, ry)
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  gr.addColorStop(0, color)
  gr.addColorStop(0.2, color)
  gr.addColorStop(1, "rgba(0,0,0,0)")
  g.globalAlpha = alpha
  g.globalCompositeOperation = "lighter"
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, 0, 1, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

function trails(g: CanvasRenderingContext2D, W: number, H: number, accent: string, signal: string) {
  const r = rng(1212)
  g.save()
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < 38; i++) {
    const red = i % 3 !== 0
    const y0 = H * (0.58 + r() * 0.2)
    const bend = (r() - 0.5) * H * 0.12
    const x0 = W * (0.42 + r() * 0.2)
    const len = W * (0.4 + r() * 0.5)
    const color = red ? signal : accent
    g.strokeStyle = color
    g.globalAlpha = 0.08 + r() * 0.22
    g.lineWidth = 1 + r() * 3.5
    g.shadowColor = color
    g.shadowBlur = 10
    g.beginPath()
    g.moveTo(x0, y0)
    g.bezierCurveTo(x0 + len * 0.3, y0 + bend * 0.2, x0 + len * 0.7, y0 + bend, x0 + len, y0 + bend * 1.4)
    g.stroke()
  }
  g.restore()
}

function circuitMap(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, accent: string) {
  g.save()
  g.strokeStyle = color
  g.lineWidth = 3
  g.lineJoin = "round"
  g.beginPath()
  const pts: [number, number][] = [
    [-1, -0.2],
    [-0.55, -0.62],
    [0.2, -0.6],
    [0.55, -0.35],
    [1, -0.42],
    [0.98, 0.25],
    [0.45, 0.3],
    [0.25, 0.62],
    [-0.4, 0.58],
    [-0.78, 0.25],
  ]
  pts.forEach(([x, y], i) => {
    const px = cx + x * s
    const py = cy + y * s * 0.8
    if (i === 0) g.moveTo(px, py)
    else {
      const [qx, qy] = pts[i - 1]
      g.quadraticCurveTo(cx + qx * s, cy + qy * s * 0.8, (px + cx + qx * s) / 2, (py + cy + qy * s * 0.8) / 2)
      g.lineTo(px, py)
    }
  })
  g.closePath()
  g.stroke()
  g.fillStyle = accent
  g.fillRect(cx - s * 0.98, cy - s * 0.32, 10, 22)
  g.restore()
}

export function paintBoxCover(o: BoxArtOptions) {
  const W = 2400
  const H = 1600
  const c = makeCanvas(W, H)
  if (!c) return null
  const g = c.getContext("2d")!
  const r = rng(4242)

  // Night sky to tarmac.
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, "#0c0c13")
  sky.addColorStop(0.5, mix(o.base, "#22222e", 0.78))
  sky.addColorStop(0.72, mix(o.base, "#181822", 0.7))
  sky.addColorStop(1, "#0b0b10")
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  // Distant floodlight haze.
  glowSpot(g, W * 0.8, H * 0.24, W * 0.6, H * 0.4, "rgba(150,160,200,0.6)", 0.5)
  glowSpot(g, W * 0.18, H * 0.34, W * 0.4, H * 0.24, "rgba(255,210,63,0.45)", 0.16)
  // Grandstand lights.
  for (let i = 0; i < 60; i++) {
    const x = W * (0.5 + r() * 0.5)
    const y = H * (0.42 + r() * 0.08)
    glowSpot(g, x, y, 3 + r() * 6, 3 + r() * 6, i % 4 ? "rgba(255,240,210,1)" : o.accent, 0.5 + r() * 0.5)
  }

  // Tarmac with headlight pool and kerb.
  const groundY = H * 0.77
  const tar = g.createLinearGradient(0, groundY - 120, 0, H)
  tar.addColorStop(0, "#111116")
  tar.addColorStop(1, "#060608")
  g.fillStyle = tar
  g.beginPath()
  g.moveTo(0, groundY - 40)
  g.quadraticCurveTo(W * 0.5, groundY - 150, W, groundY - 70)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.closePath()
  g.fill()
  glowSpot(g, W * 0.3, groundY + 30, W * 0.34, H * 0.07, mix(o.accent, IVORY, 0.4), 0.38)
  // Kerb along the near edge, skewed for speed.
  g.save()
  for (let i = 0; i < 26; i++) {
    const x = -60 + i * 110
    g.fillStyle = i % 2 ? IVORY : o.signal
    g.globalAlpha = 0.5
    g.beginPath()
    g.moveTo(x, H * 0.9)
    g.lineTo(x + 110, H * 0.9)
    g.lineTo(x + 80, H * 0.93)
    g.lineTo(x - 30, H * 0.93)
    g.closePath()
    g.fill()
  }
  g.restore()

  trails(g, W, H, o.accent, o.signal)

  // Speed streaks across the frame.
  g.save()
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < 90; i++) {
    const y = H * (0.2 + r() * 0.7)
    const x = W * r()
    const len = 120 + r() * 600
    g.strokeStyle = "rgba(243,239,230,1)"
    g.globalAlpha = 0.02 + r() * 0.05
    g.lineWidth = 1 + r() * 2
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + len, y)
    g.stroke()
  }
  g.restore()

  // Chasing car's headlights, far behind.
  glowSpot(g, W * 0.95, groundY - 70, 60, 26, mix(o.accent, IVORY, 0.4), 0.9)
  glowSpot(g, W * 0.95, groundY - 70, 240, 30, o.accent, 0.25)

  // Hero car.
  const carLen = 1650
  const x0 = W * 0.16
  const scale = carLen / 1000
  const X = (x: number) => x0 + x * scale
  const Y = (y: number) => groundY - y * scale
  // Ground shadow + light spill under the car.
  g.save()
  g.fillStyle = "rgba(0,0,0,0.85)"
  g.beginPath()
  g.ellipse(X(500), Y(0), carLen * 0.55, 36, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
  // Headlight beam on the tarmac ahead.
  g.save()
  g.globalCompositeOperation = "lighter"
  const beam = g.createLinearGradient(X(0), 0, X(0) - 900, 0)
  beam.addColorStop(0, mix(o.accent, IVORY, 0.3))
  beam.addColorStop(1, "rgba(0,0,0,0)")
  g.fillStyle = beam
  g.globalAlpha = 0.32
  g.beginPath()
  g.moveTo(X(10), Y(70))
  g.lineTo(X(0) - 900, Y(-30))
  g.lineTo(X(0) - 900, Y(120))
  g.closePath()
  g.fill()
  g.restore()

  // Body.
  const body = g.createLinearGradient(0, Y(260), 0, Y(30))
  body.addColorStop(0, "#2c2c37")
  body.addColorStop(0.42, "#101016")
  body.addColorStop(1, "#030304")
  g.fillStyle = body
  carPath(g, X, Y)
  g.fill()
  // Soft shoulder reflection from the floodlights.
  g.save()
  carPath(g, X, Y)
  g.clip()
  g.globalCompositeOperation = "lighter"
  g.strokeStyle = "rgba(190,200,235,1)"
  g.globalAlpha = 0.16
  g.lineWidth = 34
  g.shadowColor = "rgba(190,200,235,1)"
  g.shadowBlur = 40
  g.beginPath()
  g.moveTo(X(60), Y(96))
  g.bezierCurveTo(X(140), Y(132), X(230), Y(158), X(330), Y(148))
  g.bezierCurveTo(X(520), Y(150), X(760), Y(176), X(960), Y(178))
  g.stroke()
  g.restore()
  // Canopy glass with a soft reflection.
  g.save()
  carPath(g, X, Y)
  g.clip()
  const glass = g.createLinearGradient(X(440), Y(250), X(640), Y(170))
  glass.addColorStop(0, "rgba(160,170,200,0.22)")
  glass.addColorStop(0.5, "rgba(40,44,56,0.15)")
  glass.addColorStop(1, "rgba(0,0,0,0)")
  g.fillStyle = glass
  g.beginPath()
  g.moveTo(X(410), Y(178))
  g.bezierCurveTo(X(460), Y(228), X(520), Y(248), X(585), Y(246))
  g.bezierCurveTo(X(630), Y(244), X(660), Y(228), X(690), Y(212))
  g.lineTo(X(640), Y(188))
  g.lineTo(X(430), Y(176))
  g.closePath()
  g.fill()
  // Accent livery stripe along the flank.
  g.fillStyle = o.accent
  g.globalAlpha = 0.9
  g.beginPath()
  g.moveTo(X(120), Y(108))
  g.lineTo(X(980), Y(150))
  g.lineTo(X(980), Y(132))
  g.lineTo(X(130), Y(96))
  g.closePath()
  g.fill()
  g.globalAlpha = 1
  // Number roundel.
  g.fillStyle = IVORY
  g.beginPath()
  g.arc(X(760), Y(150), 46, 0, Math.PI * 2)
  g.fill()
  drawText(g, "12", X(760), Y(150) + 22, { size: 62, font: FONT.display, weight: 800, italic: true, color: "#0b0b0f", align: "center" })
  g.restore()
  // Rear wing.
  g.fillStyle = "#050507"
  g.beginPath()
  g.moveTo(X(900), Y(200))
  g.lineTo(X(916), Y(286))
  g.lineTo(X(1012), Y(300))
  g.lineTo(X(1014), Y(272))
  g.lineTo(X(948), Y(262))
  g.lineTo(X(938), Y(200))
  g.closePath()
  g.fill()
  g.strokeStyle = "rgba(243,239,230,0.5)"
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(X(916), Y(287))
  g.lineTo(X(1012), Y(301))
  g.stroke()
  rimLight(g, X, Y, o.accent)
  wheel(g, X(232), Y(84), 84 * scale, o.accent)
  wheel(g, X(808), Y(86), 88 * scale, o.accent)

  // Headlight + flare, taillight + trail.
  glowSpot(g, X(22), Y(92), 70, 26, IVORY, 1)
  glowSpot(g, X(22), Y(92), 160, 44, o.accent, 0.8)
  glowSpot(g, X(22), Y(92), 900, 10, o.accent, 0.55)
  glowSpot(g, X(1004), Y(150), 40, 22, o.signal, 1)
  glowSpot(g, X(1004) + 400, Y(150), 520, 10, o.signal, 0.35)

  // Title block.
  g.save()
  g.shadowColor = "rgba(0,0,0,0.6)"
  g.shadowBlur = 24
  drawText(g, o.title.split(" ").slice(0, 2).join(" "), 120, 330, { size: 250, font: FONT.display, weight: 800, italic: true, color: IVORY, tracking: -4 })
  drawText(g, o.title.split(" ").slice(2).join(" "), 128, 520, { size: 190, font: FONT.display, weight: 800, italic: true, color: o.accent, tracking: -2 })
  g.restore()
  drawText(g, o.subtitle, 134, 596, { size: 38, font: FONT.mono, weight: 500, color: "rgba(243,239,230,0.75)", tracking: 2 })
  g.fillStyle = o.accent
  g.fillRect(134, 120, 140, 10)

  // Scale badge.
  g.save()
  g.fillStyle = o.accent
  roundRectPath(g, W - 420, 110, 300, 170, 26)
  g.fill()
  drawText(g, o.scale, W - 270, 235, { size: 130, font: FONT.display, weight: 800, italic: true, color: "#0b0b0f", align: "center" })
  drawText(g, "SCALE", W - 270, 312, { size: 30, font: FONT.din, weight: 700, color: "rgba(243,239,230,0.8)", align: "center", tracking: 8 })
  g.restore()
  circuitMap(g, W - 270, 470, 130, "rgba(243,239,230,0.55)", o.accent)
  drawText(g, "7.3 M · 2 LANES", W - 270, 610, { size: 26, font: FONT.mono, weight: 500, color: "rgba(243,239,230,0.6)", align: "center" })

  // Feature strip.
  const stripY = H - 120
  g.fillStyle = "rgba(6,6,9,0.82)"
  g.fillRect(0, stripY - 50, W, 170)
  g.fillStyle = o.accent
  g.fillRect(0, stripY - 52, W, 4)
  const step = (W - 540) / o.features.length
  o.features.forEach((f, i) => {
    const x = 120 + i * step
    drawText(g, `0${i + 1}`, x, stripY + 6, { size: 26, font: FONT.mono, weight: 500, color: o.accent })
    drawText(g, f, x + 56, stripY + 8, { size: 34, font: FONT.din, weight: 700, color: IVORY, tracking: 3 })
  })
  g.save()
  g.strokeStyle = IVORY
  g.lineWidth = 4
  roundRectPath(g, W - 300, stripY - 30, 180, 90, 14)
  g.stroke()
  drawText(g, "8+", W - 210, stripY + 36, { size: 66, font: FONT.display, weight: 800, italic: true, color: IVORY, align: "center" })
  g.restore()

  // Inset hairline frame and edge wear.
  g.strokeStyle = "rgba(243,239,230,0.18)"
  g.lineWidth = 3
  g.strokeRect(40, 40, W - 80, H - 80)
  edgeWear(g, W, H)
  return c
}

/** Light edge line so the dark board separates from dark backgrounds. */
function edgeLine(g: CanvasRenderingContext2D, W: number, H: number, px: number) {
  g.save()
  g.strokeStyle = "rgba(243,239,230,0.32)"
  g.lineWidth = px
  g.strokeRect(px / 2, px / 2, W - px, H - px)
  g.restore()
}

function edgeWear(g: CanvasRenderingContext2D, W: number, H: number) {
  edgeLine(g, W, H, Math.max(3, Math.round(Math.min(W, H) * 0.006)))
  g.save()
  const grd = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1)
    gr.addColorStop(0, "rgba(243,239,230,0.14)")
    gr.addColorStop(1, "rgba(243,239,230,0)")
    return gr
  }
  g.fillStyle = grd(0, 0, 0, 10)
  g.fillRect(0, 0, W, 10)
  g.fillStyle = grd(0, H, 0, H - 10)
  g.fillRect(0, H - 10, W, 10)
  g.fillStyle = grd(0, 0, 10, 0)
  g.fillRect(0, 0, 10, H)
  g.fillStyle = grd(W, 0, W - 10, 0)
  g.fillRect(W - 10, 0, 10, H)
  g.restore()
}

/** Narrow side panels (box depth × height). `vertical` rotates the title to read bottom → top. */
export function paintBoxSide(o: BoxArtOptions, w: number, h: number, vertical: boolean) {
  const c = makeCanvas(w, h)
  if (!c) return null
  const g = c.getContext("2d")!
  const bg = g.createLinearGradient(0, 0, w, 0)
  bg.addColorStop(0, "#0a0a0e")
  bg.addColorStop(1, mix(o.base, "#16161d", 0.6))
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  g.save()
  if (vertical) {
    g.translate(w / 2, h / 2)
    g.rotate(-Math.PI / 2)
    g.translate(-h / 2, -w / 2)
  }
  const L = vertical ? h : w
  const S = vertical ? w : h
  g.fillStyle = o.accent
  g.fillRect(0, S * 0.08, L, S * 0.05)
  drawText(g, o.title, L * 0.06, S * 0.58, { size: S * 0.3, font: FONT.display, weight: 800, italic: true, color: IVORY })
  drawText(g, o.subtitle, L * 0.06, S * 0.82, { size: S * 0.075, font: FONT.mono, weight: 500, color: "rgba(243,239,230,0.65)" })
  g.fillStyle = o.accent
  roundRectPath(g, L - S * 1.25, S * 0.24, S * 1.05, S * 0.48, S * 0.08)
  g.fill()
  drawText(g, o.scale, L - S * 0.725, S * 0.6, { size: S * 0.34, font: FONT.display, weight: 800, italic: true, color: "#0b0b0f", align: "center" })
  g.restore()
  edgeWear(g, w, h)
  return c
}
