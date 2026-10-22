import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { gearTeeth, spurDims, spurOutline } from "./gears"
import { hubBoss } from "./hardware"
import { boundsOf, circle, deg, dropToFloor, group, part, polarUV, segs, slab, toShape, type BuildCtx, type Built } from "./kit"
import { anodizedAlu, brassMetal, isNeutral } from "./surfaces"

export interface PinionOptions {
  teeth: number
  module?: number
  face?: number
  bore?: number
  material: THREE.Material
  /** Material for the extruded toothed body (isotropic finish). */
  bodyMaterial?: THREE.Material
  hubMaterial?: THREE.Material
  screwPhi?: number
  seg?: number
}

/** One pinion around +Y: toothed body y ∈ [0, face], hub boss above it. */
export function pinionMesh(o: PinionOptions): THREE.Group {
  const m = o.module ?? 0.5
  const face = o.face ?? 4
  const boreR = (o.bore ?? 2) / 2
  const shift = o.teeth < 14 ? 0.28 : 0.1
  const spec = { teeth: o.teeth, module: m, shift }
  const { rf } = spurDims(spec)
  const outline = spurOutline(spec)
  const body = polarUV(slab(toShape(outline, [circle(boreR + 0.02, 48)]), face, 0.12, { seg: 3, curveSeg: 4 }), 4, "z")
  const gear = part(body, o.bodyMaterial ?? o.material, { r: [-Math.PI / 2, 0, 0] })
  const hubR = Math.max(boreR + 0.9, Math.min(rf + 0.45, 2.45))
  const hub = hubBoss({
    rOuter: hubR,
    rBore: boreR + 0.02,
    y0: face,
    y1: face + 2.7,
    chamfer: 0.22,
    screw: { phi: o.screwPhi ?? 0, d: 1.6, recess: 0.16 },
    material: o.hubMaterial ?? o.material,
    seg: o.seg ?? 96,
  })
  return group([gear, hub])
}

/** Spins a rolled-up gear about its axis until it rests on two teeth (highest low point). */
export function settleSpin(spinner: THREE.Object3D, root: THREE.Object3D, pitch: number, steps = 12) {
  let best = 0
  let bestY = -Infinity
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * pitch
    spinner.rotation.y = a
    const box = boundsOf(root)
    if (box.min.y > bestY + 1e-6) {
      bestY = box.min.y
      best = a
    }
  }
  spinner.rotation.y = best
}

export function buildPinion(art: PartArt, ctx: BuildCtx): Built {
  const n = gearTeeth(art.params?.teeth, 8, 14, 11)
  const alu = isNeutral(art.color)
  const mat = alu ? anodizedAlu("#d9dde2") : brassMetal("bright")
  const bodyMat = alu ? anodizedAlu("#d9dde2", "milled") : brassMetal("bright", "milled")
  const seg = segs(ctx, 96)
  const others = n >= 13 ? [n - 2, n - 4] : n <= 9 ? [n + 2, n + 4] : [n + 2, n - 2]
  const [big, small] = others[0] > others[1] ? others : [others[1], others[0]]

  // Hero pinion: sitting on its gear face, hub up, screw toward camera.
  const hero = pinionMesh({ teeth: n, material: mat, bodyMaterial: bodyMat, seg, screwPhi: deg(40) })
  hero.rotation.y = deg(4)

  // Larger pinion stood up on two teeth behind-left, hub face turned to camera.
  const tall = pinionMesh({ teeth: big, material: mat, bodyMaterial: bodyMat, seg, screwPhi: deg(-90) })
  const spinner = group([tall])
  const standing = group([group([spinner], { r: [Math.PI / 2, 0, 0] })])
  standing.rotation.y = deg(64)
  standing.position.set(-12.4, 0, -3.6)
  settleSpin(spinner, standing, (Math.PI * 2) / big)

  // Smaller pinion flipped onto its hub, front-right.
  const short = pinionMesh({ teeth: small, material: mat, bodyMaterial: bodyMat, seg, screwPhi: deg(10) })
  const flipped = group([short])
  short.rotation.set(Math.PI, 0, 0)
  flipped.rotation.y = deg(-18)
  flipped.position.set(8.6, 0, 2.2)

  const content = group([hero, standing, flipped])
  for (const c of content.children) dropToFloor(c)
  return {
    content,
    views: {
      hero: { azimuth: 28, elevation: 27, fill: 0.86, fov: 20 },
      detail: { azimuth: 22, elevation: 30, fill: 1.75, fov: 18 },
      alt: { azimuth: -38, elevation: 48, fill: 0.86, fov: 20 },
    },
  }
}
