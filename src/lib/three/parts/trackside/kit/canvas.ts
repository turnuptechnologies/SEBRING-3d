import * as THREE from "three"

/**
 * Canvas helpers for printed graphics, decals and emissive displays.
 * Builders also run during SSR (client components render on the server in dev),
 * so every canvas entry point degrades to `null` without a DOM.
 */

export const hasDom = () => typeof document !== "undefined"

export function makeCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (!hasDom()) return null
  const c = document.createElement("canvas")
  c.width = width
  c.height = height
  return c
}

/** System faces that exist on the render machines (macOS); fallbacks keep other hosts legible. */
export const FONT = {
  display: "'Avenir Next Condensed', 'DIN Condensed', 'Arial Narrow', sans-serif",
  din: "'DIN Alternate', 'DIN Condensed', 'Helvetica Neue', Arial, sans-serif",
  dinCondensed: "'DIN Condensed', 'Avenir Next Condensed', 'Arial Narrow', sans-serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "Menlo, 'SF Mono', ui-monospace, monospace",
}

export interface TextureOptions {
  repeat?: [number, number]
  wrap?: boolean
  anisotropy?: number
  /** Colour data (sRGB) vs. data maps (normal / roughness → linear). */
  srgb?: boolean
}

export function canvasToTexture(canvas: HTMLCanvasElement, opts: TextureOptions = {}): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace
  tex.anisotropy = opts.anisotropy ?? 8
  if (opts.wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1])
  tex.needsUpdate = true
  return tex
}

export interface TextStyle {
  size: number
  font?: string
  weight?: number | string
  italic?: boolean
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  /** Tracking in px. */
  tracking?: number
}

export function setFont(ctx: CanvasRenderingContext2D, s: TextStyle) {
  ctx.font = `${s.italic ? "italic " : ""}${s.weight ?? 600} ${s.size}px ${s.font ?? FONT.din}`
  ctx.fillStyle = s.color ?? "#ffffff"
  ctx.textAlign = s.align ?? "left"
  ctx.textBaseline = s.baseline ?? "alphabetic"
  const spacing = `${s.tracking ?? 0}px`
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = spacing
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: TextStyle) {
  ctx.save()
  setFont(ctx, s)
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/* ---------------------------------------------------------------------------
 * Seven-segment displays (LED / VFD / LCD readouts)
 * ------------------------------------------------------------------------- */

const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  _: "d",
  " ": "",
  A: "abcefg",
  B: "cdefg",
  C: "adef",
  D: "bcdeg",
  E: "adefg",
  F: "aefg",
  G: "acdef",
  H: "bcefg",
  I: "ef",
  J: "bcde",
  L: "def",
  N: "ceg",
  O: "cdeg",
  P: "abefg",
  R: "eg",
  S: "acdfg",
  T: "defg",
  U: "bcdef",
  V: "cde",
  Y: "bcdfg",
}

export interface SegmentStyle {
  color: string
  /** Unlit segment colour, drawn under every digit cell. */
  ghost?: string | null
  glow?: number
  /** Italic slant in radians. */
  skew?: number
  /** Stroke thickness as a fraction of digit height. */
  thickness?: number
  /** Digit width as a fraction of height. */
  aspect?: number
  /** Gap between cells as a fraction of height. */
  spacing?: number
}

/** Draws `text` as seven-segment digits with its top-left at (x, y). Returns the drawn width. */
export function drawSegments(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, style: SegmentStyle): number {
  const w = h * (style.aspect ?? 0.5)
  const t = h * (style.thickness ?? 0.115)
  const gap = h * (style.spacing ?? 0.17)
  const slant = Math.tan(style.skew ?? 0.1)
  const g = t * 0.16
  const P = (cx: number, cy: number): [number, number] => [x + cx + (h - cy) * slant, y + cy]

  const joints = {
    tl: [t / 2, t / 2],
    tr: [w - t / 2, t / 2],
    ml: [t / 2, h / 2],
    mr: [w - t / 2, h / 2],
    bl: [t / 2, h - t / 2],
    br: [w - t / 2, h - t / 2],
  } as const
  const segEnds: Record<string, [keyof typeof joints, keyof typeof joints]> = {
    a: ["tl", "tr"],
    b: ["tr", "mr"],
    c: ["mr", "br"],
    d: ["bl", "br"],
    e: ["ml", "bl"],
    f: ["tl", "ml"],
    g: ["ml", "mr"],
  }

  const segPath = (seg: string, ox: number) => {
    const [ja, jb] = segEnds[seg]
    const [ax, ay] = joints[ja]
    const [bx, by] = joints[jb]
    const horizontal = Math.abs(ay - by) < 1e-6
    const pts: [number, number][] = horizontal
      ? [
          [ax + g, ay],
          [ax + g + t / 2, ay - t / 2],
          [bx - g - t / 2, by - t / 2],
          [bx - g, by],
          [bx - g - t / 2, by + t / 2],
          [ax + g + t / 2, ay + t / 2],
        ]
      : [
          [ax, ay + g],
          [ax + t / 2, ay + g + t / 2],
          [bx + t / 2, by - g - t / 2],
          [bx, by - g],
          [bx - t / 2, by - g - t / 2],
          [ax - t / 2, ay + g + t / 2],
        ]
    ctx.beginPath()
    pts.forEach(([px, py], i) => {
      const [qx, qy] = P(px + ox, py)
      if (i === 0) ctx.moveTo(qx, qy)
      else ctx.lineTo(qx, qy)
    })
    ctx.closePath()
  }

  const dot = (ox: number) => {
    const [qx, qy] = P(ox + w + gap * 0.28, h - t * 0.55)
    ctx.beginPath()
    ctx.arc(qx, qy, t * 0.62, 0, Math.PI * 2)
  }

  const fillLit = (draw: () => void) => {
    ctx.save()
    ctx.fillStyle = style.color
    if (style.glow) {
      ctx.shadowColor = style.color
      ctx.shadowBlur = style.glow
    }
    draw()
    ctx.fill()
    ctx.restore()
  }

  const cells: { ch: string; dot: boolean }[] = []
  for (const ch of text.toUpperCase()) {
    if (ch === "." && cells.length) cells[cells.length - 1].dot = true
    else cells.push({ ch, dot: false })
  }

  let ox = 0
  for (const cell of cells) {
    if (cell.ch === ":") {
      const r = t * 0.6
      for (const fy of [0.32, 0.7]) {
        const [qx, qy] = P(ox + r, h * fy)
        if (style.ghost) {
          ctx.fillStyle = style.ghost
          ctx.beginPath()
          ctx.arc(qx, qy, r, 0, Math.PI * 2)
          ctx.fill()
        }
        fillLit(() => {
          ctx.beginPath()
          ctx.arc(qx, qy, r, 0, Math.PI * 2)
        })
      }
      ox += r * 2 + gap
      continue
    }
    if (style.ghost) {
      ctx.fillStyle = style.ghost
      for (const s of "abcdefg") {
        segPath(s, ox)
        ctx.fill()
      }
      dot(ox)
      ctx.fill()
    }
    for (const s of SEGMENTS[cell.ch] ?? "") fillLit(() => segPath(s, ox))
    if (cell.dot) fillLit(() => dot(ox))
    ox += w + gap
  }
  return ox - gap
}

/** Measures a seven-segment string without drawing it. */
export function segmentsWidth(text: string, h: number, style: Pick<SegmentStyle, "aspect" | "spacing" | "thickness">): number {
  const w = h * (style.aspect ?? 0.5)
  const gap = h * (style.spacing ?? 0.17)
  const t = h * (style.thickness ?? 0.115)
  let width = 0
  for (const ch of text) {
    if (ch === ".") continue
    width += ch === ":" ? t * 1.2 + gap : w + gap
  }
  return width - gap
}

/* ---------------------------------------------------------------------------
 * Dial scales
 * ------------------------------------------------------------------------- */

export interface DialScaleOptions {
  cx: number
  cy: number
  r0: number
  r1: number
  /** Degrees, clockwise from 12 o'clock. */
  from?: number
  to?: number
  majors?: number
  minors?: number
  color?: string
  labels?: string[]
  labelRadius?: number
  labelSize?: number
  width?: number
}

export function drawDialScale(ctx: CanvasRenderingContext2D, o: DialScaleOptions) {
  const from = ((o.from ?? -135) * Math.PI) / 180
  const to = ((o.to ?? 135) * Math.PI) / 180
  const majors = o.majors ?? 10
  const minors = o.minors ?? 4
  const total = majors * (minors + 1)
  ctx.save()
  ctx.strokeStyle = o.color ?? "#ffffff"
  ctx.fillStyle = o.color ?? "#ffffff"
  ctx.lineCap = "round"
  for (let i = 0; i <= total; i++) {
    const a = from + ((to - from) * i) / total
    const major = i % (minors + 1) === 0
    const r0 = major ? o.r0 : o.r0 + (o.r1 - o.r0) * 0.45
    ctx.lineWidth = (o.width ?? 2) * (major ? 1.5 : 1)
    ctx.beginPath()
    ctx.moveTo(o.cx + Math.sin(a) * r0, o.cy - Math.cos(a) * r0)
    ctx.lineTo(o.cx + Math.sin(a) * o.r1, o.cy - Math.cos(a) * o.r1)
    ctx.stroke()
  }
  if (o.labels?.length) {
    const lr = o.labelRadius ?? o.r1 + (o.r1 - o.r0) * 1.2
    setFont(ctx, { size: o.labelSize ?? 14, font: FONT.din, weight: 700, color: o.color ?? "#ffffff", align: "center", baseline: "middle" })
    o.labels.forEach((label, i) => {
      const a = from + ((to - from) * i) / Math.max(1, o.labels!.length - 1)
      ctx.fillText(label, o.cx + Math.sin(a) * lr, o.cy - Math.cos(a) * lr)
    })
  }
  ctx.restore()
}

/** Mixes two hex colours, t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return `#${ca.lerp(cb, t).getHexString()}`
}

/** Relative luminance of a hex colour (0–1, sRGB-ish). */
export function luminance(hex: string): number {
  const c = new THREE.Color(hex)
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}
