import { type Fn, smax } from "./math"
import { type Corner, type SectionLayout, insetHalf, sampleHalf, sectionFeatures } from "./section"

/**
 * Parametric half sections for closed-wheel bodies and their greenhouses.
 * Every body is described by profiles of the same eight corners, so the loft
 * topology (and the livery's feature addressing) is identical for all cars.
 *
 *   top ─── valley ─── crown            (deck / hood / fender crown)
 *                         ╲
 *                          belt          (widest point, shoulder line)
 *                          │
 *        wellTop ──────── lip            (fender underside → arch lip / sill)
 *          │
 *   floor ─ wellIn                       (underside → wheel-well inner wall)
 */

export const BODY = { floor: 0, wellIn: 1, wellTop: 2, lip: 3, belt: 4, crown: 5, valley: 6, top: 7 } as const
export const CABIN = { base: 0, baseOut: 1, belt: 2, roof: 3, top: 4 } as const

export interface Arch {
  /** Axle z. */
  z: number
  /** Opening radius. */
  r: number
  /** Arch-circle centre height (≈ wheel radius). */
  cy: number
  /** Length of the near-vertical drop from axle height to the sill. */
  blend?: number
  /**
   * "spat": a flat-topped opening at height `cy` with rounded corners of
   * radius `corner` — the skirt covers the top of the wheel (Group C spats).
   */
  kind?: "round" | "spat"
  corner?: number
}

export interface BodyShape {
  zTail: number
  zNose: number
  floorY: Fn
  wellX: Fn
  lipX: Fn
  beltX: Fn
  beltY: Fn
  crownX: Fn
  crownY: Fn
  valleyX: Fn
  valleyY: Fn
  topY: Fn
  arches: Arch[]
  rWell?: number
  rLip: Fn
  rBelt: Fn
  rCrown: Fn
  rValley: Fn
  rTop: Fn
  /** Minimum fender skin above an arch. */
  minSkin?: number
  bevelNose: number
  bevelTail: number
  /** Multiplies every x — rounds the ends in plan view. */
  planScale?: Fn
}

export interface CabinShape {
  zRear: number
  zFront: number
  baseY: Fn
  baseX: Fn
  beltX: Fn
  beltY: Fn
  roofX: Fn
  roofEdgeY: Fn
  roofY: Fn
  rBelt: Fn
  rRoof: Fn
  rTop: Fn
}

export function archHeight(arches: readonly Arch[], z: number, floor: number) {
  let y = floor
  for (const a of arches) {
    const dz = Math.abs(z - a.z)
    const blend = a.blend ?? 0.03
    let h: number
    if (a.kind === "spat") {
      const c = Math.min(a.corner ?? 0.06, a.r * 0.5, a.cy - floor)
      if (dz < a.r - c) h = a.cy
      else if (dz < a.r) h = a.cy - c + Math.sqrt(Math.max(0, c * c - (dz - (a.r - c)) ** 2))
      else if (dz < a.r + blend) {
        const t = (dz - a.r) / blend
        h = floor + (a.cy - c - floor) * (1 - t) * (1 - t)
      } else continue
      if (h < floor) continue
    } else if (dz < a.r) h = a.cy + Math.sqrt(a.r * a.r - dz * dz)
    else if (dz < a.r + blend) {
      const t = (dz - a.r) / blend
      h = floor + (a.cy - floor) * (1 - t) * (1 - t)
    } else continue
    if (h > y) y = h
  }
  return y
}

/** Quarter-circle inset used to round a loft's end into its cap. */
export function endInset(z: number, zTail: number, zNose: number, bevelTail: number, bevelNose: number) {
  let d = 0
  const dn = zNose - z
  if (bevelNose > 0 && dn < bevelNose) d = Math.max(d, bevelNose - Math.sqrt(Math.max(0, bevelNose * bevelNose - (bevelNose - dn) ** 2)))
  const dt = z - zTail
  if (bevelTail > 0 && dt < bevelTail) d = Math.max(d, bevelTail - Math.sqrt(Math.max(0, bevelTail * bevelTail - (bevelTail - dt) ** 2)))
  return d
}

/** Stations that resolve an end bevel (uniform in angle on the quarter circle). */
export function bevelStations(zEnd: number, r: number, dir: 1 | -1, n: number) {
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * (Math.PI / 2)
    out.push(zEnd - dir * (r - r * Math.sin(phi)))
  }
  return out
}

/** Stations that resolve a wheel arch (uniform in angle) plus its drop to the sill. */
export function archStations(a: Arch, n: number) {
  const out: number[] = []
  if (a.kind === "spat") {
    const c = a.corner ?? 0.06
    const blend = a.blend ?? 0.03
    for (const sgn of [-1, 1]) {
      for (let i = 0; i <= 8; i++) out.push(a.z + sgn * (a.r - c + c * Math.sin((i / 8) * (Math.PI / 2))))
      for (const f of [0.15, 0.35, 0.6, 1]) out.push(a.z + sgn * (a.r + blend * f))
    }
    for (let i = 0; i <= n; i++) out.push(a.z - a.r + (2 * a.r * i) / n)
    return out
  }
  for (let i = 0; i <= n; i++) out.push(a.z + a.r * Math.cos((i / n) * Math.PI))
  const blend = a.blend ?? 0.03
  for (const sgn of [-1, 1]) for (const f of [0.15, 0.35, 0.6, 1]) out.push(a.z + sgn * (a.r + blend * f))
  return out
}

export function bodyHalf(shape: BodyShape, layout: SectionLayout) {
  const count = sectionFeatures(layout).count
  const corners: Corner[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, r: 0 }))
  const minSkin = shape.minSkin ?? 0.03
  const rWell = shape.rWell ?? 0.012
  const set = (i: number, x: number, y: number, r: number) => {
    corners[i].x = x
    corners[i].y = y
    corners[i].r = r
  }
  return (z: number, out: Float64Array) => {
    const ps = shape.planScale ? shape.planScale(z) : 1
    const fl = shape.floorY(z)
    const ay = archHeight(shape.arches, z, fl)
    const wx = shape.wellX(z) * ps
    const lx = Math.max(shape.lipX(z) * ps, wx + 0.004)
    const bx = Math.max(shape.beltX(z) * ps, 0.01)
    const by = smax(shape.beltY(z), ay + minSkin, 0.05)
    const cx = Math.min(shape.crownX(z) * ps, bx - 0.002)
    const cy = smax(shape.crownY(z), by + 0.012, 0.04)
    const vx = Math.min(shape.valleyX(z) * ps, cx - 0.004)
    const vy = shape.valleyY(z)
    const ty = shape.topY(z)
    set(0, 0, fl, 0)
    set(1, wx, fl, rWell)
    set(2, wx, ay, rWell)
    set(3, lx, ay, shape.rLip(z))
    set(4, bx, by, shape.rBelt(z))
    set(5, cx, cy, shape.rCrown(z))
    set(6, Math.max(vx, 0.002), vy, shape.rValley(z))
    set(7, 0, ty, shape.rTop(z))
    sampleHalf(corners, layout, out)
    insetHalf(out, count, endInset(z, shape.zTail, shape.zNose, shape.bevelTail, shape.bevelNose))
  }
}

export function cabinHalf(shape: CabinShape, layout: SectionLayout) {
  const corners: Corner[] = Array.from({ length: 5 }, () => ({ x: 0, y: 0, r: 0 }))
  const set = (i: number, x: number, y: number, r: number) => {
    corners[i].x = x
    corners[i].y = y
    corners[i].r = r
  }
  return (z: number, out: Float64Array) => {
    const by = shape.beltY(z)
    const bx = shape.beltX(z)
    const rx = Math.min(shape.roofX(z), bx - 0.004)
    const ry = Math.max(shape.roofEdgeY(z), by + 0.004)
    const ty = Math.max(shape.roofY(z), ry + 0.002)
    const baseY = Math.min(shape.baseY(z), by - 0.02)
    set(0, 0, baseY, 0)
    set(1, Math.min(shape.baseX(z), bx), baseY, 0.01)
    set(2, bx, by, shape.rBelt(z))
    set(3, rx, ry, shape.rRoof(z))
    set(4, 0, ty, shape.rTop(z))
    sampleHalf(corners, layout, out)
  }
}
