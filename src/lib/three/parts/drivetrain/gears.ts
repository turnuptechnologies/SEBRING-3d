import * as THREE from "three"

import { clamp, creaseNormals, fillet, lerp, TAU, type V2 } from "./kit"

/** Gear geometry shared by pinions, spur gears and crown / anglewinder gears. */

export interface SpurSpec {
  teeth: number
  module: number
  pressure?: number
  addendum?: number
  dedendum?: number
  backlash?: number
  /** Profile shift × module (positive keeps small pinions from undercutting). */
  shift?: number
  tipRound?: number
  rootRound?: number
  flankPts?: number
}

const inv = (a: number) => Math.tan(a) - a
const polar = (r: number, a: number): V2 => [Math.cos(a) * r, Math.sin(a) * r]

export function spurDims(spec: SpurSpec) {
  const { teeth: N, module: m, addendum = 1, dedendum = 1.25, shift = 0 } = spec
  const rp = (m * N) / 2
  return { rp, ra: rp + m * (addendum + shift), rf: rp - m * (dedendum - shift) }
}

/** Closed, counter-clockwise involute gear outline (XY), tooth 0 on +X. */
export function spurOutline(spec: SpurSpec): V2[] {
  const { teeth: N, module: m, pressure = 20, backlash = 0.03, shift = 0, flankPts = 10 } = spec
  const tipRound = spec.tipRound ?? m * 0.12
  const rootRound = spec.rootRound ?? m * 0.28
  const alpha = (pressure * Math.PI) / 180
  const { rp, ra, rf } = spurDims(spec)
  const rb = rp * Math.cos(alpha)
  const sp = m * (Math.PI / 2 + 2 * shift * Math.tan(alpha)) - backlash
  const psiP = sp / (2 * rp)
  const half = (r: number) => psiP + inv(alpha) - inv(Math.acos(Math.min(1, rb / r)))
  let rTip = ra
  while (half(rTip) * rTip < m * 0.21 && rTip > rp) rTip -= 0.01 * m
  const pitch = TAU / N
  const r0 = Math.max(rb, rf + 0.02 * m)
  const h0 = half(r0)
  const pts: V2[] = []
  const radiusOf: number[] = []
  const push = (p: V2, kind: "tip" | "root" | "none") => {
    pts.push(p)
    radiusOf.push(kind === "tip" ? tipRound : kind === "root" ? rootRound : 0)
  }
  for (let k = 0; k < N; k++) {
    const c = k * pitch
    // Root land: from the gap centre before this tooth to the lower flank foot.
    const gapA = c - pitch / 2
    const footA = c - h0
    for (let i = 0; i < 3; i++) push(polar(rf, lerp(gapA, footA, i / 3)), "none")
    push(polar(rf, footA), "root")
    for (let i = rf < rb ? 0 : 1; i <= flankPts; i++) {
      const t = i / flankPts
      const r = lerp(r0, rTip, Math.pow(t, 0.85))
      push(polar(r, c - half(r)), i === flankPts ? "tip" : "none")
    }
    const ht = half(rTip)
    for (let i = 1; i < 3; i++) push(polar(rTip, lerp(c - ht, c + ht, i / 3)), "none")
    for (let i = flankPts; i >= (rf < rb ? 0 : 1); i--) {
      const t = i / flankPts
      const r = lerp(r0, rTip, Math.pow(t, 0.85))
      push(polar(r, c + half(r)), i === flankPts ? "tip" : "none")
    }
    push(polar(rf, c + h0), "root")
    for (let i = 1; i < 3; i++) push(polar(rf, lerp(c + h0, c + pitch / 2, i / 3)), "none")
  }
  return fillet(pts, (i) => radiusOf[i], { closed: true, seg: 3 })
}

/* ------------------------------------------------------------------------- */
/* Face teeth (crown / bevel)                                                 */
/* ------------------------------------------------------------------------- */

export interface FaceTeethSpec {
  teeth: number
  rIn: number
  rOut: number
  /** y of the root plane. */
  y0: number
  height: number
  /** Top land and root land as fractions of the pitch. */
  land?: number
  rootLand?: number
  /** Total angular twist of each tooth from rIn to rOut (radians). */
  skew?: number
  /** Cone slope: tooth tips drop by tan(cone) per mm of radius outward. */
  cone?: number
  chamfer?: number
  perTooth?: number
  radial?: number
  /** How far the band extends below y0 to seat into the gear web. */
  sink?: number
}

/** Ramp clamped to [0,1] with rounded (box-filtered) corners. */
function softRamp(x: number, w: number) {
  if (x <= -w / 2) return 0
  if (x < w / 2) return ((x + w / 2) * (x + w / 2)) / (2 * w)
  if (x <= 1 - w / 2) return x
  if (x < 1 + w / 2) return 1 - ((1 + w / 2 - x) * (1 + w / 2 - x)) / (2 * w)
  return 1
}

/**
 * Tooth band of a face gear around +Y: each tooth is a rack profile in the
 * angular direction, radial (or skewed) across [rIn, rOut], with a chamfered
 * outer edge. Non-indexed, crease-shaded.
 */
export function faceTeeth(spec: FaceTeethSpec): THREE.BufferGeometry {
  const {
    teeth: N,
    rIn,
    rOut,
    y0,
    height,
    land = 0.3,
    rootLand = 0.2,
    skew = 0,
    cone = 0,
    perTooth = 28,
    radial = 6,
    sink = 0.4,
  } = spec
  const ch = spec.chamfer ?? height * 0.18
  const flank = (1 - land - rootLand) / 2
  const pitch = TAU / N
  const profileAt = (phase: number) => {
    // phase ∈ [0,1): 0.5 = tooth centre.
    const d = Math.abs(phase - 0.5)
    const x = (land / 2 + flank - d) / flank
    return softRamp(x, 0.16)
  }
  const base = (r: number) => y0 - Math.tan(cone) * (r - rIn)
  // The sampling grid is sheared along the skewed teeth, so the tooth profile
  // depends only on the grid angle and no triangle cuts across a flank.
  const shear = (r: number) => skew * ((r - rIn) / (rOut - rIn) - 0.5)
  const top = (theta: number, r: number) => base(r) + height * profileAt((((theta / pitch) % 1) + 1) % 1)
  const samples = N * perTooth
  // Cross-section (r, y) at angle θ, counter-clockwise: outer wall up, top inward, inner wall down.
  const section = (theta: number): V2[] => {
    const bo = base(rOut)
    const bi = base(rIn)
    const yo = top(theta, rOut)
    const yi = top(theta, rIn)
    const co = ch * clamp((yo - bo) / height, 0, 1)
    const ci = ch * 0.5 * clamp((yi - bi) / height, 0, 1)
    const pts: V2[] = [
      [rOut, bo - sink],
      [rOut, yo - co],
      [rOut - co, yo],
    ]
    for (let k = 1; k < radial; k++) {
      const r = lerp(rOut - co, rIn + ci, k / radial)
      pts.push([r, top(theta, r)])
    }
    pts.push([rIn + ci, yi], [rIn, yi - ci], [rIn, bi - sink])
    return pts
  }
  const rows: V2[][] = []
  for (let i = 0; i <= samples; i++) rows.push(section((i / samples) * TAU))
  const P = rows[0].length
  const pos: number[] = []
  const uv: number[] = []
  const vtx = (i: number, j: number) => {
    const [r, y] = rows[i][j]
    const theta = (i / samples) * TAU + shear(r)
    pos.push(r * Math.sin(theta), y, r * Math.cos(theta))
    uv.push(theta * rOut, j)
  }
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < P - 1; j++) {
      vtx(i, j)
      vtx(i + 1, j)
      vtx(i, j + 1)
      vtx(i + 1, j)
      vtx(i + 1, j + 1)
      vtx(i, j + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  return creaseNormals(g, 40)
}

export const gearTeeth = (n: number | undefined, lo: number, hi: number, fallback: number) =>
  Math.round(clamp(n ?? fallback, lo, hi))
