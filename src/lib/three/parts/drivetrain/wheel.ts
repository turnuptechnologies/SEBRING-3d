import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { hubBoss } from "./hardware"
import {
  circle,
  clamp,
  deg,
  dropToFloor,
  fillet,
  group,
  lathe,
  part,
  polarUV,
  segs,
  slab,
  TAU,
  toShape,
  tube,
  type BuildCtx,
  type Built,
  type V2,
} from "./kit"
import { anodizedAlu, blackOxide, brassMetal, isNeutral, polishedSteel, turnedAlu, type Finish } from "./surfaces"

type Style = "spoked" | "dish" | "wire" | "turbofan"

interface HubDims {
  D: number
  W: number
  rIn: number
  faceY: number
  faceT: number
  bossR: number
  boreR: number
}

function dims(art: PartArt): HubDims {
  const p = art.params ?? {}
  const D = clamp(p.diameter ?? 17.3, 12, 30)
  const W = clamp(p.width ?? 10, 5, 20)
  const faceT = 1.25
  return { D, W, rIn: D / 2 - 1.05, faceY: W / 2 - 1.35, faceT, bossR: Math.min(3.4, D * 0.2), boreR: 2.38 / 2 + 0.01 }
}

/** Rim barrel (tire seat, outer lip, inner flange) around +Y; outer face toward +Y. */
function rim(d: HubDims, seg: number) {
  const ro = d.D / 2
  const h = d.W / 2
  const prof: V2[] = [
    [d.rIn, -h],
    [ro + 0.28, -h],
    [ro + 0.28, -h + 0.55],
    [ro, -h + 0.85],
    [ro, h - 1.05],
    [ro + 0.6, h - 0.8],
    [ro + 0.6, h],
    [d.rIn, h],
  ]
  const f = fillet(prof, [0.2, 0.14, 0.18, 0.2, 0.25, 0.22, 0.3, 0.35], { closed: true, seg: 5 })
  f.push(f[0])
  return lathe(f, { seg })
}

/** Spoke windows between `n` spokes of constant width, as hole outlines. */
function spokeWindows(n: number, r1: number, r2: number, spokeW: number, round: number, twist = 0): V2[][] {
  const holes: V2[][] = []
  const halfAt = (r: number) => Math.asin(clamp(spokeW / 2 / r, 0, 0.99))
  for (let k = 0; k < n; k++) {
    const c0 = (k / n) * TAU
    const c1 = ((k + 1) / n) * TAU
    const pts: V2[] = []
    const steps = 10
    const rs: number[] = []
    for (let i = 0; i <= steps; i++) rs.push(r1 + ((r2 - r1) * i) / steps)
    // Leading edge (outward), outer arc, trailing edge (inward), inner arc.
    for (const r of rs) {
      const a = c0 + halfAt(r) + twist * ((r - r1) / (r2 - r1))
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    const aOut0 = c0 + halfAt(r2) + twist
    const aOut1 = c1 - halfAt(r2) + twist
    for (let i = 1; i < 12; i++) {
      const a = aOut0 + ((aOut1 - aOut0) * i) / 12
      pts.push([Math.cos(a) * r2, Math.sin(a) * r2])
    }
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i]
      const a = c1 - halfAt(r) + twist * ((r - r1) / (r2 - r1))
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    const aIn1 = c1 - halfAt(r1)
    const aIn0 = c0 + halfAt(r1)
    for (let i = 1; i < 8; i++) {
      const a = aIn1 + ((aIn0 - aIn1) * i) / 8
      pts.push([Math.cos(a) * r1, Math.sin(a) * r1])
    }
    holes.push(fillet(pts, (_i, turn) => (turn > deg(25) ? round : 0), { closed: true, seg: 6 }))
  }
  return holes
}

const toY: [number, number, number] = [-Math.PI / 2, 0, 0]

function face(style: Style, d: HubDims, mat: THREE.Material, flat: THREE.Material, accent: THREE.Material, seg: number, ctx: BuildCtx): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  const r2 = d.rIn + 0.35
  const y0 = d.faceY - d.faceT
  if (style === "spoked" || style === "turbofan") {
    const holes = style === "spoked" ? spokeWindows(5, d.bossR + 1.0, d.rIn - 0.75, 1.9, 0.7) : []
    const g = polarUV(slab(toShape(circle(r2, 192), [circle(d.boreR + 0.02, 48), ...holes]), d.faceT, 0.2, { seg: 4, curveSeg: 6 }), 6, "z")
    g.translate(0, 0, y0)
    // Extrusion runs along +Z; the hub axis is +Y → the face shape lies in XZ.
    out.push(part(g, flat, { r: [-Math.PI / 2, 0, 0], p: [0, 0, 0] }))
    if (style === "turbofan") {
      const blades: THREE.Shape[] = []
      const n = 20
      const ra = d.bossR + 0.8
      const rb = d.rIn - 0.35
      for (let k = 0; k < n; k++) {
        const pts: V2[] = []
        const sweep = deg(42)
        const base = (k / n) * TAU
        const steps = 14
        const w = 0.32
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const r = ra + (rb - ra) * t
          const a = base + sweep * t * t
          const nrm = a + Math.PI / 2
          pts.push([Math.cos(a) * r + Math.cos(nrm) * w, Math.sin(a) * r + Math.sin(nrm) * w])
        }
        for (let i = steps; i >= 0; i--) {
          const t = i / steps
          const r = ra + (rb - ra) * t
          const a = base + sweep * t * t
          const nrm = a + Math.PI / 2
          pts.push([Math.cos(a) * r - Math.cos(nrm) * w * (0.6 + 0.4 * t), Math.sin(a) * r - Math.sin(nrm) * w * (0.6 + 0.4 * t)])
        }
        blades.push(toShape(fillet(pts, (_i, turn) => (turn > deg(40) ? 0.12 : 0), { closed: true, seg: 3 })))
      }
      const bg = slab(blades, 0.85, 0.16, { seg: 3, curveSeg: 3 })
      bg.translate(0, 0, d.faceY - 0.05)
      out.push(part(bg, accent, { r: [-Math.PI / 2, 0, 0] }))
    }
  } else if (style === "dish") {
    const prof: V2[] = [
      [r2, y0],
      [r2, d.faceY - 0.1],
      [d.rIn - 0.4, d.faceY - 0.1],
      [d.bossR + 1.3, d.faceY - 0.75],
      [d.bossR + 0.6, d.faceY - 0.75],
      [d.boreR + 0.5, d.faceY + 0.15],
      [d.boreR, d.faceY + 0.15],
      [d.boreR, y0],
    ]
    const g = lathe(fillet(prof.reverse(), [0, 0.12, 0.45, 0.5, 1.2, 0.3, 0.12, 0], { seg: 6 }).reverse(), { seg })
    out.push(part(g, mat))
    // Six small socket bolts around a centre-lock ring.
    const n = 6
    const rr = (d.bossR + 1.3 + d.rIn - 0.4) / 2 + 0.1
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + deg(30)
      const slope = Math.atan2(0.65, d.rIn - 0.4 - (d.bossR + 1.3))
      const yAt = d.faceY - 0.1 - 0.65 * ((d.rIn - 0.4 - rr) / (d.rIn - 0.4 - (d.bossR + 1.3)))
      const head = lathe(
        fillet(
          [
            [0, 0.42],
            [0.55, 0.42],
            [0.55, -0.3],
          ],
          [0, 0.16, 0],
          { seg: 3 }
        ).reverse(),
        { seg: 32 }
      )
      const bolt = part(head, accent)
      const holder = group([bolt])
      holder.rotation.set(0, -a + Math.PI / 2, 0)
      bolt.rotation.z = slope
      bolt.position.set(rr, yAt, 0)
      out.push(holder)
      const socket = lathe(
        [
          [0.24, 0.43],
          [0.1, 0.22],
          [0, 0.2],
        ],
        { seg: 6 }
      )
      const sk = part(socket, blackOxide())
      sk.rotation.z = slope
      sk.position.set(rr, yAt, 0)
      holder.add(sk)
    }
  } else {
    // Wire wheel: laced steel spokes between a hub barrel and the rim.
    const barrelR = d.bossR + 0.25
    const barrelProfile: V2[] = [
      [d.boreR, d.faceY + 0.6],
      [barrelR - 0.4, d.faceY + 0.6],
      [barrelR, d.faceY],
      [barrelR + 0.55, d.faceY - 0.25],
      [barrelR + 0.55, d.faceY - 0.75],
      [barrelR, d.faceY - 1.0],
      [barrelR, -d.W / 2 + 1.4],
      [barrelR + 0.45, -d.W / 2 + 1.1],
      [barrelR + 0.45, -d.W / 2 + 0.6],
      [barrelR, -d.W / 2 + 0.4],
      [d.boreR, -d.W / 2 + 0.4],
    ]
    const barrel = lathe(
      fillet(
        barrelProfile.reverse(),
        [0, 0.12, 0.15, 0.15, 0.12, 0.12, 0.15, 0.15, 0.2, 0.15, 0]
      ).reverse(),
      { seg }
    )
    out.push(part(barrel, mat))
    const spokeMat = polishedSteel()
    const n = 18
    const rings = [
      { yh: d.faceY - 0.5, yr: d.faceY - 0.35, rh: barrelR + 0.5, lace: deg(34), phase: 0 },
      { yh: -d.W / 2 + 0.85, yr: d.faceY - 1.6, rh: barrelR + 0.4, lace: deg(-30), phase: 0.5 },
    ]
    const seg2 = Math.max(6, Math.round(10 * ctx.q))
    for (const ring of rings) {
      for (let k = 0; k < n; k++) {
        const a = ((k + ring.phase) / n) * TAU
        const p0 = new THREE.Vector3(Math.sin(a) * ring.rh, ring.yh, Math.cos(a) * ring.rh)
        const b = a + ring.lace
        const p1 = new THREE.Vector3(Math.sin(b) * (d.rIn + 0.1), ring.yr, Math.cos(b) * (d.rIn + 0.1))
        const g = tube([p0, p0.clone().lerp(p1, 0.5), p1], 0.16, { seg: 8, radial: seg2 })
        out.push(part(g, spokeMat))
        const nip = lathe(
          [
            [0.32, -0.25],
            [0.32, 0.25],
            [0.2, 0.35],
          ],
          { seg: 12 }
        )
        const nipple = part(nip, mat)
        nipple.position.copy(p1)
        nipple.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p0.clone().sub(p1).normalize())
        out.push(nipple)
      }
    }
    // Two-eared knock-off spinner.
    const spin = lathe(
      fillet(
        [
          [0, d.faceY + 2.0],
          [0.9, d.faceY + 2.0],
          [1.4, d.faceY + 1.2],
          [1.9, d.faceY + 0.6],
          [1.9, d.faceY + 0.4],
        ],
        [0, 0.3, 0.3, 0.15, 0]
      ),
      { seg: 48 }
    )
    out.push(part(spin, accent))
    for (const s of [1, -1]) {
      const ear = slab(
        toShape(
          fillet(
            [
              [0, -0.45],
              [4.6, -0.25],
              [4.9, 0],
              [4.6, 0.25],
              [0, 0.45],
            ],
            [0, 0.15, 0.2, 0.15, 0],
            { closed: true, seg: 4 }
          )
        ),
        0.7,
        0.2,
        { seg: 3 }
      )
      const e = part(ear, accent, { r: [-Math.PI / 2, 0, s > 0 ? 0 : Math.PI] })
      e.position.y = d.faceY + 0.55
      e.rotation.order = "YXZ"
      e.rotation.y = s > 0 ? deg(20) : deg(200)
      e.rotation.x = -Math.PI / 2 + deg(-10)
      out.push(e)
    }
  }
  return out
}

function hubMesh(style: Style, d: HubDims, art: PartArt, seg: number, ctx: BuildCtx): THREE.Group {
  const tinted = !isNeutral(art.color)
  const mat = (f: Finish) => (tinted ? anodizedAlu(art.color, f) : turnedAlu(f))
  const accent = style === "wire" ? (art.accent && !isNeutral(art.accent) ? brassMetal("bright", "milled") : polishedSteel("milled")) : style === "turbofan" ? mat("milled") : polishedSteel("milled")
  const meshes: THREE.Object3D[] = [part(rim(d, seg), mat("turned"))]
  meshes.push(...face(style, d, mat("turned"), mat("milled"), accent, seg, ctx))
  // Inner boss through the face, then the protruding grub-screw collar behind the rim.
  const inner = lathe(
    [
      [d.bossR, d.faceY - d.faceT + 0.05],
      [d.bossR, -d.W / 2 + 0.3],
    ].reverse() as V2[],
    { seg }
  )
  meshes.push(part(inner, mat("turned")))
  if (style !== "dish") {
    const cap = lathe(
      fillet(
        [
          [d.bossR + 0.2, d.faceY - 0.2],
          [d.bossR + 0.2, d.faceY + 0.35],
          [d.boreR, d.faceY + 0.35],
          [d.boreR, d.faceY - 1],
        ],
        [0, 0.25, 0.15, 0],
        { seg: 4 }
      ),
      { seg }
    )
    if (style !== "wire") meshes.push(part(cap, mat("turned")))
  }
  const collar = hubBoss({
    rOuter: d.bossR,
    rBore: d.boreR,
    y0: 0,
    y1: 2.6,
    chamfer: 0.25,
    screw: { phi: 0, d: 1.6, recess: 0.16 },
    material: mat("turned"),
    seg,
  })
  collar.rotation.x = Math.PI
  collar.position.y = -d.W / 2 + 0.35
  meshes.push(collar)
  return group(meshes)
}

export function buildWheel(art: PartArt, ctx: BuildCtx): Built {
  const style: Style = art.variant === "dish" || art.variant === "wire" || art.variant === "turbofan" ? art.variant : "spoked"
  const d = dims(art)
  const seg = segs(ctx, 192)
  // Hero hub stood on its rim, face turned to camera; partner lying face-up in front.
  const standing = group([group([hubMesh(style, d, art, seg, ctx)], { r: [Math.PI / 2, 0, 0] })])
  standing.rotation.y = deg(58)
  standing.position.set(2.5, 0, -3)
  const lying = hubMesh(style, d, art, seg, ctx)
  lying.rotation.y = deg(-20)
  const lyingG = group([lying])
  lyingG.position.set(-d.D * 0.95, 0, d.D * 0.42)
  const content = group([standing, lyingG])
  for (const c of content.children) dropToFloor(c)
  return {
    content,
    views: {
      hero: { azimuth: 30, elevation: 22, fill: 0.86, fov: 20 },
      detail: { azimuth: 40, elevation: 16, fill: 1.55, fov: 18 },
      alt: { azimuth: -36, elevation: 50, fill: 0.86, fov: 20 },
    },
  }
}

export const toYRotation = toY
