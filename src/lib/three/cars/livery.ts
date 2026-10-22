import type { Livery } from "@/lib/catalog/types"

import type { Atlas, Region } from "./atlas"
import { type LoftData, arcAtHeight, featureArc, featurePoint } from "./loft"
import { hashString, prng } from "./math"
import type { SectionFeatures } from "./section"
import { BODY } from "./templates"

/**
 * Paints a car's livery into its atlas canvas. Patterns are defined in
 * physical space — (z, s) on lofts, heights on the flanks — so they read the
 * same on every body. Text is drawn with system sans-serif at weight 800 (no
 * web fonts), using fictional words only.
 */

export const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`

export interface LiveryPlan {
  /** Flank number roundel: centre z, centre height, diameter. */
  flankNumber: { z: number; y: number; d: number }
  /** Bonnet / nose number: centre z on the top centre-line, diameter. */
  hoodNumber?: { z: number; d: number; region?: "body" | "cabin" } | null
  /** Twin centre stripes: each stripe width and the gap between them. */
  stripes: { w: number; gap: number }
  /** Side stripe heights (bottom, top). */
  sideStripe: { y0: number; y1: number }
  /** Hoop band z-range. */
  hoop: { z0: number; z1: number }
  /** Split boundary at the centre-line and slope dz/ds toward the flanks. */
  split: { z: number; slope: number }
  /** Sash centre-line through (zTop, yTop) → (zBottom, yBottom), vertical width. */
  sash: { zTop: number; yTop: number; zBottom: number; yBottom: number; w: number }
  /** Chevron apex z on the top centre-line, slope dz/ds, band width. */
  chevron: { z: number; slope: number; w: number }
  /** Fade z-range (base at z1 → secondary at z0). */
  fade: { z0: number; z1: number }
  /** Coachline height on the flank (accent pinstripe for solid/fade). */
  coachline?: number
  /** Sponsor slots on the flanks (side projection). */
  sponsors: Array<{ z: number; y: number; w: number; h: number }>
  /** Windscreen banner height (on the cabin, top of the screen). */
  banner?: { z0: number; z1: number } | null
  /** Panel lines on the flank in side projection (z, y) polylines. */
  flankLines?: Array<Array<[number, number]>>
  /** Panel lines on the top surface (z, s) polylines (mirrored automatically when mirror = true). */
  topLines?: Array<{ pts: Array<[number, number]>; mirror?: boolean }>
  /** Fuel filler (z, y) on the +X flank only. */
  filler?: { z: number; y: number; d: number }
}

export interface LoftTarget {
  region: Region
  data: LoftData
  features: SectionFeatures
}

export interface PaintJob {
  canvas: HTMLCanvasElement
  atlas: Atlas
  livery: Livery
  plan: LiveryPlan
  body: LoftTarget
  cabin?: LoftTarget | null
  /** Additional body lofts (e.g. an open-wheeler's sidepod slab) painted like the body. */
  extras?: LoftTarget[]
  debug?: boolean
}

type Ctx = CanvasRenderingContext2D

const mid = (f: SectionFeatures, corner: number) => Math.round((f.corner[corner][0] + f.corner[corner][1]) / 2)

export function luminance(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.replace("#", ""), 16)
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, k < 0 ? c * (1 + k) : c + (255 - c) * k)))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

/* ------------------------------------------------------------------------- */

export class LoftPainter {
  constructor(
    readonly ctx: Ctx,
    readonly t: LoftTarget
  ) {}

  get r() {
    return this.t.region
  }

  clip() {
    const { x, y, w, h } = this.r
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, w, h)
    this.ctx.clip()
  }

  done() {
    this.ctx.restore()
  }

  get zMin() {
    return this.r.a0
  }

  get zMax() {
    return this.r.a1
  }

  /** Path through (z, s) points. */
  path(pts: ReadonlyArray<readonly [number, number]>, close = true) {
    const c = this.ctx
    c.beginPath()
    pts.forEach(([z, s], i) => {
      const [x, y] = this.r.px(z, s)
      if (i === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    })
    if (close) c.closePath()
  }

  fillRectZS(z0: number, z1: number, s0: number, s1: number, color: string) {
    this.path([
      [z0, s0],
      [z1, s0],
      [z1, s1],
      [z0, s1],
    ])
    this.ctx.fillStyle = color
    this.ctx.fill()
  }

  /** Arc positions of the flank features at z (+X side). */
  flank(z: number) {
    const f = this.t.features
    const d = this.t.data
    const kLip = mid(f, BODY.lip)
    const kBelt = mid(f, BODY.belt)
    const kCrown = mid(f, BODY.crown)
    return {
      kLip,
      kCrown,
      sLip: featureArc(d, z, kLip),
      sBelt: featureArc(d, z, kBelt),
      sCrown: featureArc(d, z, kCrown),
      yLip: featurePoint(d, z, kLip).y,
      yCrown: featurePoint(d, z, kCrown).y,
      sBottom: featureArc(d, z, 0),
    }
  }

  /** s on the +X flank at height y (clamped to the flank), or null when the flank is below y. */
  sAt(z: number, y: number) {
    const f = this.flank(z)
    if (y <= f.yLip) return f.sLip
    if (y >= f.yCrown) return f.sCrown
    return arcAtHeight(this.t.data, z, y, f.kLip, f.kCrown) ?? null
  }

  /**
   * Fills a band on both flanks between heights lo(z) and hi(z), sampled along z.
   * `overTop` extends the band across the top where hi exceeds the crown.
   */
  flankBand(lo: (z: number) => number, hi: (z: number) => number, color: string, opts: { z0?: number; z1?: number; overTop?: boolean } = {}) {
    const z0 = opts.z0 ?? this.zMin
    const z1 = opts.z1 ?? this.zMax
    const n = Math.max(8, Math.ceil((z1 - z0) / 0.01))
    for (const side of [1, -1]) {
      let run: Array<[number, number, number]> = []
      const flush = () => {
        if (run.length >= 2) {
          const pts: Array<[number, number]> = []
          for (const [z, a] of run) pts.push([z, side * a])
          for (let i = run.length - 1; i >= 0; i--) pts.push([run[i][0], side * run[i][2]])
          this.path(pts)
          this.ctx.fillStyle = color
          this.ctx.fill()
        }
        run = []
      }
      for (let i = 0; i <= n; i++) {
        const z = z0 + ((z1 - z0) * i) / n
        const f = this.flank(z)
        const yl = lo(z)
        const yh = hi(z)
        if (yh <= f.yLip + 0.004 || yl >= yh) {
          flush()
          continue
        }
        const top = opts.overTop && yh >= f.yCrown ? 0 : (this.sAt(z, yh) ?? f.sCrown)
        const bot = yl >= f.yCrown ? (opts.overTop ? f.sCrown : f.sCrown) : (this.sAt(z, yl) ?? f.sLip)
        if (bot - top < 0.002) {
          flush()
          continue
        }
        run.push([z, top, bot])
      }
      flush()
    }
  }

  strokeFlankLine(pts: ReadonlyArray<readonly [number, number]>, color: string, widthM: number, alpha = 1) {
    for (const side of [1, -1]) {
      const c = this.ctx
      c.beginPath()
      let started = false
      for (let i = 0; i < pts.length - 1; i++) {
        const [za, ya] = pts[i]
        const [zb, yb] = pts[i + 1]
        const steps = Math.max(2, Math.ceil(Math.hypot(zb - za, yb - ya) / 0.01))
        for (let k = 0; k <= steps; k++) {
          const z = za + ((zb - za) * k) / steps
          const y = ya + ((yb - ya) * k) / steps
          const s = this.sAt(z, y)
          if (s == null) {
            started = false
            continue
          }
          const [px, py] = this.r.px(z, side * s)
          if (!started) {
            c.moveTo(px, py)
            started = true
          } else c.lineTo(px, py)
        }
      }
      c.strokeStyle = color
      c.globalAlpha = alpha
      c.lineWidth = Math.max(1, widthM * this.r.ppm)
      c.lineJoin = "round"
      c.lineCap = "round"
      c.stroke()
      c.globalAlpha = 1
    }
  }

  /** Fills a polygon given in side projection (z, y) on one or both flanks. */
  flankPoly(pts: ReadonlyArray<readonly [number, number]>, fill: string | CanvasGradient | ((side: 1 | -1) => string | CanvasGradient), sides: ReadonlyArray<1 | -1> = [1, -1]) {
    for (const side of sides) {
      const c = this.ctx
      c.beginPath()
      let first = true
      for (let i = 0; i < pts.length; i++) {
        const [za, ya] = pts[i]
        const [zb, yb] = pts[(i + 1) % pts.length]
        const steps = Math.max(1, Math.ceil(Math.hypot(zb - za, yb - ya) / 0.01))
        for (let k = 0; k < steps; k++) {
          const z = za + ((zb - za) * k) / steps
          const y = ya + ((yb - ya) * k) / steps
          const sv = this.sAt(z, y) ?? this.flank(z).sLip
          const [px, py] = this.r.px(z, side * sv)
          if (first) c.moveTo(px, py)
          else c.lineTo(px, py)
          first = false
        }
      }
      c.closePath()
      c.fillStyle = typeof fill === "function" ? fill(side) : fill
      c.fill()
    }
  }

  /** Fills a polygon given in (z, s) on the top surface, mirrored across the centre-line. */
  topPoly(pts: ReadonlyArray<readonly [number, number]>, fill: string | CanvasGradient, mirror = true) {
    for (const sgn of mirror ? [1, -1] : [1]) {
      this.path(pts.map(([z, sv]) => [z, sv * sgn] as [number, number]))
      this.ctx.fillStyle = fill
      this.ctx.fill()
    }
  }

  /** Linear gradient between two (z, s) points in canvas space. */
  gradient(a: readonly [number, number], b: readonly [number, number], stops: ReadonlyArray<readonly [number, string]>) {
    const [x0, y0] = this.r.px(a[0], a[1])
    const [x1, y1] = this.r.px(b[0], b[1])
    const g = this.ctx.createLinearGradient(x0, y0, x1, y1)
    for (const [o, col] of stops) g.addColorStop(o, col)
    return g
  }

  /**
   * Runs fn in a local frame on the flank: x follows the constant-height line
   * toward the tail (+X flank) or the nose (−X flank) — i.e. reading direction
   * when viewed from outside — and y runs down the surface. Canvas px units.
   */
  onFlank(z: number, y: number, side: 1 | -1, fn: (c: Ctx, ppm: number) => void) {
    const s = this.sAt(z, y)
    if (s == null) return
    const dz = 0.04
    const zr = side > 0 ? z - dz : z + dz
    const sr = this.sAt(zr, y) ?? s
    const [px, py] = this.r.px(z, side * s)
    const [rx, ry] = this.r.px(zr, side * sr)
    const ppm = this.r.ppm
    const ax = (rx - px) / (dz * ppm)
    const ay = (ry - py) / (dz * ppm)
    const c = this.ctx
    c.save()
    c.transform(ax, ay, 0, side, px, py)
    fn(c, ppm)
    c.restore()
  }

  /** Runs fn on the top centre-line at z, oriented to read from the front of the car. */
  onTop(z: number, s: number, fn: (c: Ctx, ppm: number) => void) {
    const [px, py] = this.r.px(z, s)
    const c = this.ctx
    c.save()
    c.translate(px, py)
    c.rotate(Math.PI / 2)
    fn(c, this.r.ppm)
    c.restore()
  }
}

/* ------------------------------------------------------------------------- */

function numberGraphic(c: Ctx, ppm: number, d: number, livery: Livery) {
  const plate = livery.numberPlate ?? "roundel"
  const R = (d / 2) * ppm
  const lightBase = luminance(livery.base) > 0.6
  const plateColor = "#f4f3ee"
  const ink = "#0b0b0f"
  if (plate === "roundel") {
    c.beginPath()
    c.arc(0, 0, R, 0, Math.PI * 2)
    c.fillStyle = plateColor
    c.fill()
    if (lightBase) {
      c.lineWidth = R * 0.07
      c.strokeStyle = livery.accent === plateColor ? ink : livery.accent
      c.stroke()
    }
  } else if (plate === "square") {
    const w = R * 1.75
    const h = R * 1.6
    const rr = R * 0.18
    c.beginPath()
    c.roundRect(-w / 2, -h / 2, w, h, rr)
    c.fillStyle = plateColor
    c.fill()
    if (lightBase) {
      c.lineWidth = R * 0.06
      c.strokeStyle = livery.accent
      c.stroke()
    }
  }
  const txt = String(livery.number)
  const size = R * (txt.length > 1 ? 1.12 : 1.3)
  c.font = `800 ${size}px ${FONT}`
  c.textAlign = "center"
  c.textBaseline = "middle"
  const m = c.measureText(txt)
  const maxW = R * 1.5
  const sx = m.width > maxW ? maxW / m.width : 1
  c.save()
  c.scale(sx, 1)
  const dy = size * 0.035
  if (plate === "none") {
    c.lineJoin = "round"
    c.lineWidth = size * 0.12
    c.strokeStyle = luminance(livery.accent) > 0.5 ? ink : "#f4f3ee"
    c.strokeText(txt, 0, dy)
    c.fillStyle = livery.accent
    c.fillText(txt, 0, dy)
  } else {
    c.fillStyle = ink
    c.fillText(txt, 0, dy)
  }
  c.restore()
}

const SPONSORS = ["SEBRING", "NIGHT SHIFT", "12H", "PIT LANE", "GRID"] as const

function sponsorGraphic(c: Ctx, ppm: number, w: number, h: number, word: string, style: number, livery: Livery) {
  const W = w * ppm
  const H = h * ppm
  const light = luminance(livery.base) > 0.45
  const panel = style % 3 === 0 ? (light ? "#0b0b0f" : "#f4f3ee") : null
  const ink = panel ? (light ? "#f4f3ee" : "#0b0b0f") : light ? "#0b0b0f" : "#f4f3ee"
  if (panel) {
    c.beginPath()
    c.roundRect(-W / 2, -H / 2, W, H, H * 0.14)
    c.fillStyle = panel
    c.fill()
  }
  let size = H * (panel ? 0.62 : 0.8)
  c.font = `${style % 2 ? "italic " : ""}800 ${size}px ${FONT}`
  const m = c.measureText(word)
  const maxW = W * (panel ? 0.86 : 0.98)
  if (m.width > maxW) size *= maxW / m.width
  c.font = `${style % 2 ? "italic " : ""}800 ${size}px ${FONT}`
  c.textAlign = "center"
  c.textBaseline = "middle"
  c.fillStyle = word === "NIGHT SHIFT" && !panel ? (light ? "#0b0b0f" : "#ffd23f") : ink
  c.fillText(word, 0, size * 0.04)
  if (word === "12H") {
    c.fillStyle = "#ff4b3a"
    c.fillRect(-W / 2 + W * 0.06, H / 2 - H * 0.16, W * 0.88, H * 0.08)
  }
}

/* ------------------------------------------------------------------------- */

export function paintLivery(job: PaintJob) {
  const ctx = job.canvas.getContext("2d")!
  const { livery, plan, atlas } = job
  const rnd = prng(hashString(JSON.stringify(livery)))
  ctx.fillStyle = livery.base
  ctx.fillRect(0, 0, job.canvas.width, job.canvas.height)

  const body = new LoftPainter(ctx, job.body)
  const cabin = job.cabin ? new LoftPainter(ctx, job.cabin) : null
  const extras = (job.extras ?? []).map((t) => new LoftPainter(ctx, t))
  const lofts: LoftPainter[] = [body, ...(cabin ? [cabin] : []), ...extras]
  const flanks: LoftPainter[] = [body, ...extras]
  const sec = livery.secondary
  const acc = livery.accent
  const pin = 0.03

  // --- pattern -------------------------------------------------------------
  for (const L of lofts) {
    L.clip()
    const sMaxR = L.r.b1
    switch (livery.pattern) {
      case "center-stripes": {
        const { w, gap } = plan.stripes
        for (const sgn of [1, -1]) {
          const a = sgn * (gap / 2)
          const b = sgn * (gap / 2 + w)
          L.fillRectZS(L.zMin - 1, L.zMax + 1, Math.min(a, b), Math.max(a, b), sec)
          const e = sgn * (gap / 2 + w + pin * 0.9)
          L.fillRectZS(L.zMin - 1, L.zMax + 1, Math.min(b, e), Math.max(b, e), acc)
        }
        break
      }
      case "hoop": {
        const { z0, z1 } = plan.hoop
        L.fillRectZS(z0, z1, -sMaxR, sMaxR, sec)
        L.fillRectZS(z1, z1 + pin, -sMaxR, sMaxR, acc)
        L.fillRectZS(z0 - pin, z0, -sMaxR, sMaxR, acc)
        break
      }
      case "split": {
        const { z, slope } = plan.split
        const n = 24
        const edge: Array<[number, number]> = []
        for (let i = 0; i <= n; i++) {
          const s = -sMaxR + (2 * sMaxR * i) / n
          edge.push([z + slope * Math.abs(s), s])
        }
        L.path([...edge, [L.zMin - 1, sMaxR], [L.zMin - 1, -sMaxR]])
        ctx.fillStyle = sec
        ctx.fill()
        L.path(edge, false)
        ctx.strokeStyle = acc
        ctx.lineWidth = pin * 2 * L.r.ppm
        ctx.stroke()
        break
      }
      case "fade": {
        const [x1] = L.r.px(plan.fade.z1, 0)
        const [x0] = L.r.px(plan.fade.z0, 0)
        const g = ctx.createLinearGradient(x1, 0, x0, 0)
        g.addColorStop(0, livery.base)
        g.addColorStop(1, sec)
        ctx.fillStyle = g
        ctx.fillRect(L.r.x, L.r.y, L.r.w, L.r.h)
        // halftone dots across the transition
        const zA = plan.fade.z1
        const zB = plan.fade.z0
        const step = 0.07
        ctx.fillStyle = sec
        for (let z = zA; z > zB; z -= step) {
          const t = (zA - z) / (zA - zB)
          const rad = step * 0.5 * Math.min(1, t * 1.15) ** 1.4
          if (rad < 0.004) continue
          for (let s = -sMaxR; s <= sMaxR; s += step) {
            const off = Math.round((zA - z) / step) % 2 ? step / 2 : 0
            const [px, py] = L.r.px(z, s + off)
            ctx.beginPath()
            ctx.arc(px, py, rad * L.r.ppm, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        break
      }
      case "chevron": {
        const { z, slope, w } = plan.chevron
        const S = sMaxR
        for (const [dz, col, ww] of [
          [0, sec, w],
          [w + pin * 2.2, acc, pin * 2.4],
        ] as const) {
          const a = z - dz
          L.path([
            [a, 0],
            [a - slope * S, S],
            [a - slope * S - ww, S],
            [a - ww, 0],
            [a - slope * S - ww, -S],
            [a - slope * S, -S],
          ])
          ctx.fillStyle = col
          ctx.fill()
        }
        break
      }
      default:
        break
    }
    L.done()
  }

  // flank-defined patterns
  for (const F of flanks) {
    F.clip()
    if (livery.pattern === "side-stripe") {
      const { y0, y1 } = plan.sideStripe
      F.flankBand(
        () => y0,
        () => y1,
        sec
      )
      F.flankBand(
        () => y1,
        () => y1 + pin,
        acc
      )
      F.flankBand(
        () => y0 - pin,
        () => y0,
        acc
      )
    } else if (livery.pattern === "sash") {
      const sh = plan.sash
      const m = (sh.yTop - sh.yBottom) / (sh.zTop - sh.zBottom)
      const yc = (z: number) => sh.yBottom + m * (z - sh.zBottom)
      F.flankBand(
        (z) => yc(z) - sh.w / 2,
        (z) => yc(z) + sh.w / 2,
        sec,
        { overTop: true }
      )
      F.flankBand(
        (z) => yc(z) + sh.w / 2,
        (z) => yc(z) + sh.w / 2 + pin * 1.4,
        acc,
        { overTop: true }
      )
    }
    if (F === body && (livery.pattern === "solid" || livery.pattern === "fade" || livery.pattern === "hoop") && plan.coachline) {
      const y = plan.coachline
      F.flankBand(
        () => y,
        () => y + pin * 0.8,
        acc
      )
    }
    F.done()
  }
  if (cabin && livery.pattern === "sash") {
    // continue the sash over the roof as a transverse band
    const s = plan.sash
    cabin.clip()
    cabin.fillRectZS(s.zTop - s.w * 0.6, s.zTop + s.w * 0.6, -cabin.r.b1, cabin.r.b1, sec)
    cabin.done()
  }

  // --- panel lines -----------------------------------------------------------
  body.clip()
  for (const line of plan.flankLines ?? []) {
    body.strokeFlankLine(line, "rgba(0,0,0,0.55)", 0.011)
    body.strokeFlankLine(
      line.map(([z, y]) => [z - 0.006, y + 0.004] as [number, number]),
      "rgba(255,255,255,0.16)",
      0.005
    )
  }
  for (const line of plan.topLines ?? []) {
    for (const sgn of line.mirror === false ? [1] : [1, -1]) {
      body.path(
        line.pts.map(([z, s]) => [z, s * sgn] as [number, number]),
        false
      )
      ctx.strokeStyle = "rgba(0,0,0,0.5)"
      ctx.lineWidth = 0.011 * body.r.ppm
      ctx.stroke()
    }
  }
  if (plan.filler) {
    const f = plan.filler
    body.onFlank(f.z, f.y, 1, (c, ppm) => {
      c.beginPath()
      c.arc(0, 0, (f.d / 2) * ppm, 0, Math.PI * 2)
      c.fillStyle = "#c9cdd3"
      c.fill()
      c.lineWidth = 0.012 * ppm
      c.strokeStyle = "rgba(0,0,0,0.6)"
      c.stroke()
    })
  }

  // --- sponsors --------------------------------------------------------------
  const words: string[] = [...SPONSORS]
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[words[i], words[j]] = [words[j], words[i]]
  }
  plan.sponsors.forEach((sp, i) => {
    const word = words[i % words.length]
    const style = Math.floor(rnd() * 6)
    for (const side of [1, -1] as const) {
      body.onFlank(sp.z, sp.y, side, (c, ppm) => sponsorGraphic(c, ppm, sp.w, sp.h, word, style, livery))
    }
  })

  // --- numbers ---------------------------------------------------------------
  if (livery.number >= 0) {
    const fn = plan.flankNumber
    for (const side of [1, -1] as const) body.onFlank(fn.z, fn.y, side, (c, ppm) => numberGraphic(c, ppm, fn.d, livery))
    const hn = plan.hoodNumber
    if (hn) {
      const target = hn.region === "cabin" && cabin ? cabin : body
      if (target !== body) {
        body.done()
        target.clip()
      }
      target.onTop(hn.z, 0, (c, ppm) => numberGraphic(c, ppm, hn.d, livery))
      if (target !== body) {
        target.done()
        body.clip()
      }
    }
  }
  body.done()

  // --- windscreen banner -----------------------------------------------------
  if (cabin && plan.banner) {
    cabin.clip()
    const { z0, z1 } = plan.banner
    const S = cabin.r.b1
    cabin.fillRectZS(z0, z1, -S, S, "#0b0b0f")
    cabin.onTop((z0 + z1) / 2, 0, (c, ppm) => {
      const h = (z1 - z0) * 0.62 * ppm
      c.font = `800 ${h}px ${FONT}`
      c.textAlign = "center"
      c.textBaseline = "middle"
      c.fillStyle = "#f4f3ee"
      c.save()
      c.scale(1.25, 1)
      c.fillText("SEBRING", 0, h * 0.05)
      c.restore()
    })
    cabin.done()
  }

  // --- swatches ----------------------------------------------------------------
  for (const [name, color] of [
    ["sw:base", livery.base],
    ["sw:secondary", sec],
    ["sw:accent", acc],
    ["sw:black", "#0b0b0f"],
    ["sw:white", "#f4f3ee"],
  ] as const) {
    if (!atlas.has(name)) continue
    const r = atlas.get(name)
    ctx.fillStyle = color
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4)
  }

  if (job.debug) debugGrid(ctx, lofts)
}

function debugGrid(ctx: Ctx, lofts: LoftPainter[]) {
  for (const L of lofts) {
    L.clip()
    ctx.lineWidth = 2
    for (let z = Math.ceil(L.zMin * 10) / 10; z <= L.zMax; z += 0.1) {
      const major = Math.abs(Math.round(z * 10) % 5) === 0
      ctx.strokeStyle = major ? "#ff0000" : "rgba(255,0,0,0.4)"
      L.path(
        [
          [z, L.r.b0],
          [z, L.r.b1],
        ],
        false
      )
      ctx.stroke()
    }
    for (let s = Math.ceil(L.r.b0 * 10) / 10; s <= L.r.b1; s += 0.1) {
      ctx.strokeStyle = Math.abs(s) < 0.05 ? "#00ff00" : s > 0 ? "rgba(0,0,255,0.5)" : "rgba(0,160,255,0.5)"
      L.path(
        [
          [L.zMin, s],
          [L.zMax, s],
        ],
        false
      )
      ctx.stroke()
    }
    L.onTop((L.zMin + L.zMax) / 2 + 0.6, 0, (c, ppm) => {
      c.font = `800 ${0.25 * ppm}px ${FONT}`
      c.fillStyle = "#000"
      c.textAlign = "center"
      c.fillText("FRONT ↑", 0, 0)
    })
    L.done()
  }
}

export function sponsorWords() {
  return SPONSORS
}
