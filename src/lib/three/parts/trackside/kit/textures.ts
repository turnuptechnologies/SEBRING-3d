import * as THREE from "three"

import { canvasToTexture, makeCanvas } from "./canvas"
import { rng } from "./rng"

/**
 * Procedural, tileable micro-surface maps (normal / roughness / colour) for
 * believable plastics, metals, rubber, paper and paint. All deterministic.
 * Height fields are Float32Array squares in [0, 1].
 */

type Field = Float32Array

const textureCache = new Map<string, THREE.Texture | null>()

function cachedTexture(key: string, make: () => THREE.Texture | null): THREE.Texture | null {
  if (textureCache.has(key)) return textureCache.get(key)!
  const tex = make()
  textureCache.set(key, tex)
  return tex
}

/* ----------------------------------------------------------------- fields */

function lattice(n: number, seed: number) {
  const r = rng(seed)
  const a = new Float32Array(n * n)
  for (let i = 0; i < a.length; i++) a[i] = r()
  return a
}

function sample(lat: Float32Array, nx: number, ny: number, x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const x0 = ((xi % nx) + nx) % nx
  const y0 = ((yi % ny) + ny) % ny
  const x1 = (x0 + 1) % nx
  const y1 = (y0 + 1) % ny
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = lat[y0 * nx + x0]
  const b = lat[y0 * nx + x1]
  const c = lat[y1 * nx + x0]
  const d = lat[y1 * nx + x1]
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

export interface FbmOptions {
  cells: number
  /** Separate vertical cell count for anisotropic (brushed) noise. */
  cellsY?: number
  octaves?: number
  gain?: number
  seed?: number
}

/** Tileable fractal value noise. */
export function fbm(size: number, o: FbmOptions): Field {
  const out = new Float32Array(size * size)
  const octaves = o.octaves ?? 4
  const gain = o.gain ?? 0.5
  let amp = 1
  let norm = 0
  for (let k = 0; k < octaves; k++) {
    const nx = o.cells * 2 ** k
    const ny = (o.cellsY ?? o.cells) * 2 ** k
    const lat = new Float32Array(nx * ny)
    const r = rng((o.seed ?? 1) * 977 + k * 131)
    for (let i = 0; i < lat.length; i++) lat[i] = r()
    for (let y = 0; y < size; y++) {
      const sy = (y / size) * ny
      for (let x = 0; x < size; x++) out[y * size + x] += amp * sample(lat, nx, ny, (x / size) * nx, sy)
    }
    norm += amp
    amp *= gain
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm
  return out
}

/** Tileable Worley noise: F1 distance (0 at feature points) and a per-cell random id. */
export function worley(size: number, cells: number, seed: number): { dist: Field; id: Field; edge: Field } {
  const r = rng(seed)
  const px = new Float32Array(cells * cells)
  const py = new Float32Array(cells * cells)
  const pid = new Float32Array(cells * cells)
  for (let i = 0; i < cells * cells; i++) {
    px[i] = r()
    py[i] = r()
    pid[i] = r()
  }
  const dist = new Float32Array(size * size)
  const id = new Float32Array(size * size)
  const edge = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cells
    const cy = Math.floor(fy)
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells
      const cx = Math.floor(fx)
      let d1 = 1e9
      let d2 = 1e9
      let best = 0
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox
          const gy = cy + oy
          const wx = ((gx % cells) + cells) % cells
          const wy = ((gy % cells) + cells) % cells
          const k = wy * cells + wx
          const dx = gx + px[k] - fx
          const dy = gy + py[k] - fy
          const d = dx * dx + dy * dy
          if (d < d1) {
            d2 = d1
            d1 = d
            best = k
          } else if (d < d2) d2 = d
        }
      }
      const i = y * size + x
      dist[i] = Math.sqrt(d1)
      id[i] = pid[best]
      edge[i] = Math.sqrt(d2) - Math.sqrt(d1)
    }
  }
  return { dist, id, edge }
}

/* ----------------------------------------------------------------- encoders */

function fieldToCanvas(size: number, write: (i: number, px: Uint8ClampedArray, o: number) => void) {
  const canvas = makeCanvas(size, size)
  if (!canvas) return null
  const ctx = canvas.getContext("2d")!
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < size * size; i++) write(i, img.data, i * 4)
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Tangent-space normal map (OpenGL convention) from a height field. */
export function normalFromHeight(h: Field, size: number, strength: number) {
  return fieldToCanvas(size, (i, px, o) => {
    const x = i % size
    const y = (i - x) / size
    const l = h[y * size + ((x - 1 + size) % size)]
    const r = h[y * size + ((x + 1) % size)]
    const u = h[((y - 1 + size) % size) * size + x]
    const d = h[((y + 1) % size) * size + x]
    const nx = (l - r) * strength
    const ny = (d - u) * strength
    const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1)
    px[o] = (nx * inv * 0.5 + 0.5) * 255
    px[o + 1] = (ny * inv * 0.5 + 0.5) * 255
    px[o + 2] = (inv * 0.5 + 0.5) * 255
    px[o + 3] = 255
  })
}

/** Greyscale map: value = lo + (hi - lo) * field. Used for roughness / AO / alpha. */
export function greyFromField(h: Field, size: number, lo: number, hi: number) {
  return fieldToCanvas(size, (i, px, o) => {
    const v = (lo + (hi - lo) * h[i]) * 255
    px[o] = px[o + 1] = px[o + 2] = v
    px[o + 3] = 255
  })
}

function dataTex(canvas: HTMLCanvasElement | null, repeat = 1): THREE.Texture | null {
  if (!canvas) return null
  return canvasToTexture(canvas, { srgb: false, wrap: true, repeat: [repeat, repeat], anisotropy: 8 })
}

/* ----------------------------------------------------------------- presets */

/** Each micro-surface returns a tileable map; set `repeat` on a clone to scale it. */
export type Surface =
  | "grain" // injection-moulded plastic (VDI spark texture)
  | "fine-grain" // satin plastic, paint
  | "stipple" // soft-touch rubber
  | "brushed" // brushed aluminium, along U
  | "blasted" // bead-blasted / anodised aluminium
  | "spangle" // hot-dip galvanised steel
  | "braid" // copper braid weave
  | "fiber" // printed board / paper
  | "orange-peel" // painted MDF
  | "grit" // sandpaper
  | "windings" // wire wound on a spool, along U
  | "knurl" // diamond knurl
  | "rubber-sidewall" // tyre sidewall
  | "wood" // plywood face grain

const SIZE = 512

function heightFor(surface: Surface): { h: Field; size: number } {
  switch (surface) {
    case "grain": {
      const a = fbm(SIZE, { cells: 64, octaves: 3, gain: 0.55, seed: 11 })
      const w = worley(SIZE, 96, 12).dist
      const h = new Float32Array(a.length)
      for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.6 + Math.min(1, w[i] * 1.4) * 0.4
      return { h, size: SIZE }
    }
    case "fine-grain":
      return { h: fbm(SIZE, { cells: 96, octaves: 3, gain: 0.5, seed: 21 }), size: SIZE }
    case "stipple": {
      const { dist } = worley(SIZE, 72, 31)
      const n = fbm(SIZE, { cells: 32, octaves: 2, seed: 32 })
      const h = new Float32Array(dist.length)
      for (let i = 0; i < h.length; i++) h[i] = Math.max(0, 1 - dist[i] * 2.2) ** 1.5 * 0.85 + n[i] * 0.15
      return { h, size: SIZE }
    }
    case "brushed": {
      const a = fbm(SIZE, { cells: 2, cellsY: 256, octaves: 3, gain: 0.6, seed: 41 })
      const b = fbm(SIZE, { cells: 6, cellsY: 96, octaves: 2, gain: 0.5, seed: 42 })
      const h = new Float32Array(a.length)
      for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.75 + b[i] * 0.25
      return { h: transpose(h, SIZE), size: SIZE }
    }
    case "blasted":
      return { h: fbm(SIZE, { cells: 128, octaves: 2, gain: 0.45, seed: 51 }), size: SIZE }
    case "spangle": {
      const { id, edge } = worley(SIZE, 10, 61)
      const n = fbm(SIZE, { cells: 48, octaves: 2, seed: 62 })
      const h = new Float32Array(id.length)
      for (let i = 0; i < h.length; i++) h[i] = id[i] * 0.7 + n[i] * 0.2 + (edge[i] < 0.03 ? 0.1 : 0)
      return { h, size: SIZE }
    }
    case "braid": {
      // Flat-woven braid: bundles of fine wires crossing diagonally, over/under alternately.
      const h = new Float32Array(SIZE * SIZE)
      const bundles = 8
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const u = (x / SIZE) * bundles
          const v = (y / SIZE) * bundles
          const a = u + v
          const b = u - v
          const fa = a - Math.floor(a)
          const fb = b - Math.floor(b)
          const over = (Math.floor(a) + Math.floor(b)) % 2 === 0
          const wireA = 0.55 + 0.45 * Math.cos(fb * Math.PI * 2 * 5) * 0.5
          const wireB = 0.55 + 0.45 * Math.cos(fa * Math.PI * 2 * 5) * 0.5
          const bulge = Math.sin(Math.min(fa, fb) * Math.PI) * 0.2
          h[y * SIZE + x] = (over ? 0.6 + wireA * 0.4 : 0.35 + wireB * 0.4) + bulge * 0.3 - (Math.min(fa, 1 - fa) < 0.04 ? 0.25 : 0)
        }
      }
      return { h, size: SIZE }
    }
    case "fiber": {
      const a = fbm(SIZE, { cells: 128, cellsY: 32, octaves: 3, gain: 0.5, seed: 71 })
      const b = fbm(SIZE, { cells: 48, octaves: 2, seed: 72 })
      const h = new Float32Array(a.length)
      for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.6 + b[i] * 0.4
      return { h, size: SIZE }
    }
    case "orange-peel": {
      const a = fbm(SIZE, { cells: 24, octaves: 3, gain: 0.45, seed: 81 })
      return { h: a, size: SIZE }
    }
    case "grit": {
      const { dist } = worley(SIZE, 110, 91)
      const n = fbm(SIZE, { cells: 128, octaves: 2, seed: 92 })
      const h = new Float32Array(dist.length)
      for (let i = 0; i < h.length; i++) h[i] = Math.max(0, 1 - dist[i] * 2.6) * 0.75 + n[i] * 0.25
      return { h, size: SIZE }
    }
    case "windings": {
      const h = new Float32Array(SIZE * SIZE)
      const turns = 32
      const jitter = fbm(SIZE, { cells: 4, cellsY: 32, octaves: 2, seed: 101 })
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = y * SIZE + x
          const f = ((x / SIZE) * turns + jitter[i] * 0.25) % 1
          h[i] = Math.sqrt(Math.max(0, 1 - (f * 2 - 1) ** 2))
        }
      }
      return { h, size: SIZE }
    }
    case "knurl": {
      const h = new Float32Array(SIZE * SIZE)
      const n = 24
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const u = (x / SIZE) * n
          const v = (y / SIZE) * n
          const a = Math.abs(((u + v) % 1) - 0.5) * 2
          const b = Math.abs((((u - v) % 1) + 1) % 1 - 0.5) * 2
          h[y * SIZE + x] = Math.min(a, b)
        }
      }
      return { h, size: SIZE }
    }
    case "rubber-sidewall": {
      const a = fbm(SIZE, { cells: 48, octaves: 3, seed: 111 })
      return { h: a, size: SIZE }
    }
    case "wood": {
      const h = new Float32Array(SIZE * SIZE)
      const warp = fbm(SIZE, { cells: 3, cellsY: 8, octaves: 3, seed: 121 })
      const fine = fbm(SIZE, { cells: 128, cellsY: 8, octaves: 2, seed: 122 })
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = y * SIZE + x
          const rings = Math.sin((y / SIZE) * Math.PI * 2 * 9 + warp[i] * 14)
          h[i] = 0.5 + rings * 0.35 + fine[i] * 0.15
        }
      }
      return { h, size: SIZE }
    }
  }
}

function transpose(h: Field, size: number): Field {
  const out = new Float32Array(h.length)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out[x * size + y] = h[y * size + x]
  return out
}

const fieldCache = new Map<Surface, { h: Field; size: number }>()
function field(surface: Surface) {
  let f = fieldCache.get(surface)
  if (!f) {
    f = heightFor(surface)
    fieldCache.set(surface, f)
  }
  return f
}

const STRENGTH: Record<Surface, number> = {
  grain: 5,
  "fine-grain": 3,
  stipple: 9,
  brushed: 3,
  blasted: 4,
  spangle: 1.4,
  braid: 10,
  fiber: 2.5,
  "orange-peel": 6,
  grit: 16,
  windings: 10,
  knurl: 8,
  "rubber-sidewall": 3,
  wood: 2,
}

/** Normal map for a micro-surface, repeated `repeat` times across UV 0–1. */
export function surfaceNormal(surface: Surface, repeat = 1): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const base = cachedTexture(`n:${surface}`, () => {
    const { h, size } = field(surface)
    return dataTex(normalFromHeight(h, size, STRENGTH[surface]))
  })
  return withRepeat(base, repeat)
}

/** Roughness map for a micro-surface, mapping the height field to [lo, hi]. */
export function surfaceRoughness(surface: Surface, lo: number, hi: number, repeat = 1): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const base = cachedTexture(`r:${surface}:${lo}:${hi}`, () => {
    const { h, size } = field(surface)
    return dataTex(greyFromField(h, size, lo, hi))
  })
  return withRepeat(base, repeat)
}

/** Colour variation map (sRGB) blending two colours by the height field. */
export function surfaceColor(surface: Surface, a: string, b: string, repeat = 1, curve = 1): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const base = cachedTexture(`c:${surface}:${a}:${b}:${curve}`, () => {
    const { h, size } = field(surface)
    const ca = new THREE.Color(a)
    const cb = new THREE.Color(b)
    const tmp = new THREE.Color()
    const canvas = fieldToCanvas(size, (i, px, o) => {
      tmp.copy(ca).lerp(cb, Math.pow(h[i], curve))
      const s = tmp.clone().convertLinearToSRGB()
      px[o] = s.r * 255
      px[o + 1] = s.g * 255
      px[o + 2] = s.b * 255
      px[o + 3] = 255
    })
    return canvas ? canvasToTexture(canvas, { wrap: true }) : null
  })
  return withRepeat(base, repeat)
}

const repeatCache = new Map<string, THREE.Texture>()
function withRepeat(base: THREE.Texture | null, repeat: number | [number, number]): THREE.Texture | null {
  if (!base) return null
  const [rx, ry] = typeof repeat === "number" ? [repeat, repeat] : repeat
  if (rx === 1 && ry === 1) return base
  const key = `${base.uuid}:${rx}:${ry}`
  let t = repeatCache.get(key)
  if (!t) {
    t = base.clone()
    t.repeat.set(rx, ry)
    t.needsUpdate = true
    repeatCache.set(key, t)
  }
  return t
}

/** Repeat control with independent U/V factors. */
export function surfaceNormalUV(surface: Surface, rx: number, ry: number): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const base = surfaceNormal(surface, 1)
  return withRepeat(base, [rx, ry])
}

export function surfaceRoughnessUV(surface: Surface, lo: number, hi: number, rx: number, ry: number): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const base = surfaceRoughness(surface, lo, hi, 1)
  return withRepeat(base, [rx, ry])
}
