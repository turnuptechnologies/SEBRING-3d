import * as THREE from "three"

import { segs, type BuildContext } from "./context"
import { bendAroundY, extrudeCentered, merge, roundedRectShape } from "./kit/geometry"
import * as M from "./kit/materials"
import { mesh, mm } from "./kit/parts"

/**
 * Two-lane track sections. Built straight along +Z (z = 0 … length), then bent
 * around a vertical axis for curves, so slots, rails, markings and borders share
 * one code path. Cross-sections are extruded with real slot grooves.
 */

export type TrackVariant = "sport" | "routed"

export interface TrackSpec {
  variant: TrackVariant
  /** Straight length in mm (ignored when `radius` is set). */
  length?: number
  /** Curve: centreline radius in mm and sweep in degrees. */
  radius?: number
  angle?: number
  surface: string
  marking: string
  accent: string
  border?: boolean
}

interface Dimensions {
  width: number
  thickness: number
  lanes: number[]
  slotW: number
  slotD: number
  stripW: number
  stripGap: number
}

const DIMS: Record<TrackVariant, Dimensions> = {
  sport: { width: 156, thickness: 11, lanes: [-39, 39], slotW: 3.6, slotD: 7.5, stripW: 2.8, stripGap: 1.3 },
  routed: { width: 232, thickness: 18, lanes: [-52, 52], slotW: 4.2, slotD: 11, stripW: 5.6, stripGap: 0.7 },
}

/** Cross-section with slot grooves, in mm (x across, y up). Outline is inset by `b` for the bevel. */
function sectionShape(d: Dimensions, b: number) {
  const s = new THREE.Shape()
  const hw = d.width / 2
  const T = d.thickness
  const sw = d.slotW / 2 + b
  s.moveTo(mm(-hw + b), mm(b))
  s.lineTo(mm(hw - b), mm(b))
  s.lineTo(mm(hw - b), mm(T - b))
  const lanes = [...d.lanes].sort((a, c) => c - a)
  for (const x of lanes) {
    s.lineTo(mm(x + sw), mm(T - b))
    s.lineTo(mm(x + sw), mm(T - d.slotD + b))
    s.lineTo(mm(x - sw), mm(T - d.slotD + b))
    s.lineTo(mm(x - sw), mm(T - b))
  }
  s.lineTo(mm(-hw + b), mm(T - b))
  s.closePath()
  return s
}

/** Extrusion along +Z from z = 0 to `length` (units). */
function alongZ(shape: THREE.Shape, length: number, o: { bevel?: number; steps?: number; curveSegments?: number } = {}) {
  const geo = extrudeCentered(shape, length, { bevel: o.bevel ?? 0, bevelSegments: 2, steps: o.steps ?? 1, curveSegments: o.curveSegments ?? 4 })
  geo.translate(0, 0, length / 2)
  return geo
}

/** A box spanning z0 … z1 with enough length segments to bend smoothly. */
function strip(x: number, y: number, w: number, h: number, z0: number, z1: number, segZ: number) {
  const g = new THREE.BoxGeometry(w, h, z1 - z0, 1, 1, Math.max(1, segZ))
  g.translate(x, y + h / 2, (z0 + z1) / 2)
  return g
}

/** Flat rail / braid strip with rounded top edges. */
function railStrip(x: number, top: number, w: number, depth: number, length: number, steps: number) {
  const shape = roundedRectShape(w - mm(0.5), depth - mm(0.5), mm(0.2))
  const geo = extrudeCentered(shape, length, { bevel: mm(0.25), bevelSegments: 2, steps, curveSegments: 3 })
  geo.translate(x, top - depth / 2, length / 2)
  return geo
}

export function buildTrackSection(spec: TrackSpec, ctx: BuildContext) {
  const d = DIMS[spec.variant]
  const curved = spec.radius !== undefined
  const R = mm(spec.radius ?? 370)
  const sweep = THREE.MathUtils.degToRad(spec.angle ?? 45)
  const L = curved ? R * sweep : mm(spec.length ?? (spec.variant === "routed" ? 400 : 350))
  const steps = curved ? segs(ctx, Math.ceil(THREE.MathUtils.radToDeg(sweep) * 1.6), 24) : 1
  const fine = curved ? steps : 1
  const T = mm(d.thickness)
  const g = new THREE.Group()
  const parts: { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[] }[] = []
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[]) => parts.push({ geo, mat })

  const bevel = spec.variant === "sport" ? 0.35 : 0.5
  const body = alongZ(sectionShape(d, bevel), L, { bevel: mm(bevel), steps })

  if (spec.variant === "sport") {
    add(body, M.trackPlastic(spec.surface, { repeat: 7 }))
  } else {
    add(body, [M.mdf({ repeat: 8 }), M.paint(spec.surface, { repeat: 3.4, roughness: 0.62, clearcoat: 0.12 })])
  }

  // Rails (sport: steel strip) or braid (routed: copper) either side of each slot.
  const railMat = spec.variant === "sport" ? M.brushed("#d6dade", { roughness: 0.3, repeat: [2, 14], rotation: Math.PI / 2, env: 1.7 }) : M.copperBraid({ repeat: [22, 22] })
  const railGeos: THREE.BufferGeometry[] = []
  for (const x of d.lanes) {
    for (const side of [-1, 1]) {
      const cx = x + side * (d.slotW / 2 + d.stripGap + d.stripW / 2)
      railGeos.push(railStrip(mm(cx), T + mm(spec.variant === "sport" ? 0.12 : 0.22), mm(d.stripW), mm(1.2), L, fine))
    }
  }
  add(merge(railGeos), railMat)

  // Printed lane markings: solid edge lines, dashed centre line.
  const inkMat = M.ink(spec.marking, 0.55)
  const lineGeos: THREE.BufferGeometry[] = []
  const edge = d.width / 2 - (spec.variant === "sport" ? 7.5 : 10)
  const lineW = mm(spec.variant === "sport" ? 2.6 : 3.2)
  for (const sx of [-1, 1]) lineGeos.push(strip(mm(sx * edge), T, lineW, mm(0.06), 0, L, fine))
  const dash = mm(spec.variant === "sport" ? 22 : 30)
  const nDash = Math.max(1, Math.floor(L / (dash * 2)))
  const pitch = L / nDash
  for (let i = 0; i < nDash; i++) {
    const z0 = i * pitch + (pitch - dash) / 2
    lineGeos.push(strip(0, T, mm(2), mm(0.06), z0, z0 + dash, curved ? 6 : 1))
  }
  add(merge(lineGeos), inkMat)

  // Slot floors read as deep shadow.
  const voidGeos = d.lanes.map((x) => strip(mm(x), T - mm(d.slotD) + mm(bevel) + mm(0.05), mm(d.slotW), mm(0.02), mm(0.5), L - mm(0.5), fine))
  add(merge(voidGeos), M.voidMat())

  if (spec.variant === "sport") {
    // Male end (z = L): clip tongues and rail pins. Female end (z = 0): sockets.
    const tabGeos: THREE.BufferGeometry[] = []
    for (const x of [-58, 58]) {
      const tab = new THREE.BoxGeometry(mm(12), mm(4.4), mm(9))
      tab.translate(mm(x), mm(4.6), L + mm(4.2))
      tabGeos.push(tab)
      const hook = new THREE.BoxGeometry(mm(12), mm(2.2), mm(2.4))
      hook.translate(mm(x), mm(7.3), L + mm(7.4))
      tabGeos.push(hook)
    }
    add(merge(tabGeos), M.trackPlastic(spec.surface, { repeat: 7 }))
    const pinGeos: THREE.BufferGeometry[] = []
    for (const x of d.lanes) {
      for (const side of [-1, 1]) {
        const cx = x + side * (d.slotW / 2 + d.stripGap + d.stripW / 2)
        const pin = new THREE.CylinderGeometry(mm(1), mm(1), mm(6), 12)
        pin.rotateX(Math.PI / 2)
        pin.translate(mm(cx), T - mm(2.2), L + mm(2.6))
        pinGeos.push(pin)
      }
    }
    add(merge(pinGeos), M.steel(0.22, "#c4c8cd"))
    const sockets: THREE.BufferGeometry[] = []
    for (const x of [-58, 58]) sockets.push(strip(mm(x), mm(2.6), mm(12.4), mm(5), -mm(0.05), mm(0.02), 1))
    for (const x of d.lanes) {
      for (const side of [-1, 1]) {
        const cx = x + side * (d.slotW / 2 + d.stripGap + d.stripW / 2)
        sockets.push(strip(mm(cx), T - mm(3.4), mm(2.4), mm(2.4), -mm(0.05), mm(0.02), 1))
      }
    }
    // Moulded skirt groove along both sides.
    const grooves = [-1, 1].map((sx) => strip(sx * (mm(d.width / 2) + mm(0.02)), mm(3.2), mm(0.12), mm(1.2), mm(2), L - mm(2), fine))
    sockets.push(...grooves)
    add(merge(sockets), M.voidMat())
  } else {
    // Alignment dowels on the far end, matching bores on the near end.
    const dowels: THREE.BufferGeometry[] = []
    const bores: THREE.BufferGeometry[] = []
    for (const x of [-80, 0, 80]) {
      const dw = new THREE.CylinderGeometry(mm(4), mm(4), mm(16), 24)
      dw.rotateX(Math.PI / 2)
      dw.translate(mm(x), T / 2, L + mm(7))
      dowels.push(dw)
      const bore = new THREE.CircleGeometry(mm(4.2), 24)
      bore.rotateY(Math.PI)
      bore.translate(mm(x), T / 2, -mm(0.05))
      bores.push(bore)
    }
    add(merge(dowels), M.satin("#c9a77a", { roughness: 0.7, repeat: 30, surface: "fiber" }))
    add(merge(bores), M.voidMat())
  }

  if (spec.border && spec.variant === "sport") {
    const kerbW = 14
    const apronW = 26
    const kerbGeosA: THREE.BufferGeometry[] = []
    const kerbGeosB: THREE.BufferGeometry[] = []
    const apron: THREE.BufferGeometry[] = []
    const block = mm(18)
    const nBlocks = Math.max(2, Math.round(L / block))
    const bl = L / nBlocks
    for (const sx of [-1, 1]) {
      const x0 = sx * (d.width / 2 + 0.8 + kerbW / 2)
      for (let i = 0; i < nBlocks; i++) {
        const kerb = new THREE.Shape()
        const hw = mm(kerbW / 2)
        kerb.moveTo(-hw, 0)
        kerb.lineTo(hw, 0)
        kerb.lineTo(hw, T + mm(1.4))
        kerb.quadraticCurveTo(0, T + mm(2.6), -hw, T + mm(0.2))
        kerb.closePath()
        const kg = extrudeCentered(kerb, bl - mm(0.6), { bevel: mm(0.3), bevelSegments: 1, steps: curved ? 3 : 1, curveSegments: 6 })
        if (sx > 0) kg.scale(-1, 1, 1)
        kg.translate(mm(x0), 0, i * bl + bl / 2)
        ;(i % 2 ? kerbGeosA : kerbGeosB).push(kg)
      }
      const ax = sx * (d.width / 2 + 0.8 + kerbW + 1 + apronW / 2)
      const ap = roundedRectShape(mm(apronW) - mm(1), T - mm(1.5) - mm(0.5), mm(0.6))
      const ag = extrudeCentered(ap, L - mm(0.6), { bevel: mm(0.5), bevelSegments: 2, steps, curveSegments: 3 })
      ag.translate(mm(ax), (T - mm(1.5)) / 2, L / 2)
      apron.push(ag)
    }
    if (kerbGeosA.length) add(merge(kerbGeosA), M.satin(spec.accent, { roughness: 0.45, repeat: 12 }))
    if (kerbGeosB.length) add(merge(kerbGeosB), M.satin("#f2f0ea", { roughness: 0.45, repeat: 12 }))
    add(merge(apron), M.trackPlastic("#3b3d42", { repeat: 9 }))
  }

  for (const p of parts) {
    if (curved) bendAroundY(p.geo, R)
    g.add(mesh(p.geo, p.mat))
  }
  return g
}
