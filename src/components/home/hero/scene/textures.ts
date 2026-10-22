import * as THREE from "three"

/**
 * Small procedural textures for the hero (drawn once on 2D canvases):
 * headlight glow and anamorphic streak, a soft contact shadow and the
 * dipped-beam pattern projected by the headlight spot lights.
 */
export interface HeroTextures {
  glow: THREE.CanvasTexture
  streak: THREE.CanvasTexture
  shadow: THREE.CanvasTexture
  beam: THREE.CanvasTexture
  dispose(): void
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) throw new Error("2D canvas unavailable")
  return [c, ctx]
}

function linearTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

/** Per-pixel painter: f(u, v) → intensity 0..1 written to RGB (and alpha). */
function paint(w: number, h: number, f: (u: number, v: number) => number, alphaToo = true): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h)
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.max(0, Math.min(1, f((x + 0.5) / w, (y + 0.5) / h)))
      const i = (y * w + x) * 4
      const b = Math.round(v * 255)
      img.data[i] = b
      img.data[i + 1] = b
      img.data[i + 2] = b
      img.data[i + 3] = alphaToo ? b : 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

let shared: HeroTextures | null = null
let users = 0

/** Ref-counted: textures are built on first use and freed when the last scene unmounts. */
export function acquireHeroTextures(): HeroTextures {
  users++
  if (shared) return shared

  const glow = linearTexture(
    paint(128, 128, (u, v) => {
      const r2 = (u - 0.5) ** 2 + (v - 0.5) ** 2
      return Math.exp(-r2 * 160) + 0.35 * Math.exp(-r2 * 26) + 0.08 * Math.exp(-r2 * 7)
    })
  )

  const streak = linearTexture(
    paint(512, 64, (u, v) => {
      const x = (u - 0.5) * 2
      const y = (v - 0.5) * 2
      const core = Math.exp(-y * y * 220) * (Math.exp(-x * x * 6) * 0.8 + Math.exp(-Math.abs(x) * 2.2) * 0.4)
      const soft = Math.exp(-y * y * 30) * Math.exp(-x * x * 14) * 0.25
      return (core + soft) * (1 - Math.abs(x) ** 6)
    })
  )

  const shadow = linearTexture(
    paint(
      128,
      256,
      (u, v) => {
        // Rounded-rectangle distance field, softened: darkest under the chassis.
        const x = Math.abs(u - 0.5) * 2
        const y = Math.abs(v - 0.5) * 2
        const dx = Math.max(x - 0.62, 0)
        const dy = Math.max(y - 0.76, 0)
        const d = Math.hypot(dx / 0.38, dy / 0.24)
        const inner = 1 - Math.min(1, Math.max(0, (Math.max(x / 0.62, y / 0.76) - 0.2) * 0.6))
        return Math.pow(Math.max(0, 1 - d), 1.7) * (0.55 + 0.45 * inner)
      },
      true
    )
  )

  // Dipped-beam pattern as seen from the lamp: two lobes just under a sharp cut-off (with the
  // kerb-side kick-up), little light straight down so there is no hot spot under the nose.
  const beam = linearTexture(
    paint(
      256,
      256,
      (u, v) => {
        const x = (u - 0.5) * 2
        const y = (0.5 - v) * 2 // +1 = up
        const cutY = 0.05 + (x > 0.05 ? Math.min(0.16, (x - 0.05) * 0.45) : 0)
        const cutoff = 1 / (1 + Math.exp((y - cutY) * 36))
        const lobe = (cx: number) => Math.exp(-((x - cx) ** 2) * 4.2 - (y + 0.06) ** 2 * 26)
        const hot = Math.exp(-(x * x) * 10 - (y + 0.02) ** 2 * 60) * 0.7
        const spread = Math.exp(-(x * x) * 1.1 - (y + 0.12) ** 2 * 9) * 0.3
        const near = Math.min(1, Math.max(0, (y + 0.62) / 0.5)) ** 2
        const disc = 1 - Math.min(1, Math.max(0, (Math.hypot(x, y) - 0.84) / 0.16))
        return (0.6 * (lobe(-0.26) + lobe(0.26)) + hot + spread) * cutoff * near * disc
      },
      false
    )
  )
  beam.generateMipmaps = false
  beam.minFilter = THREE.LinearFilter

  shared = {
    glow,
    streak,
    shadow,
    beam,
    dispose() {
      glow.dispose()
      streak.dispose()
      shadow.dispose()
      beam.dispose()
    },
  }
  return shared
}

export function releaseHeroTextures() {
  users = Math.max(0, users - 1)
  if (users === 0 && shared) {
    shared.dispose()
    shared = null
  }
}
