import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { faceTeeth, gearTeeth, spurDims, spurOutline } from "./gears"
import { hubBoss } from "./hardware"
import { arc, circle, deg, dropToFloor, fillet, group, lathe, part, polarUV, segs, slab, toShape, type BuildCtx, type Built, type V2 } from "./kit"
import { anodizedAlu, isNeutral, plastic, turnedAlu } from "./surfaces"

type Kind = "crown" | "bevel" | "spur"

/**
 * Drive gears. `inline` is a straight-cut crown (face) gear — what inline
 * drivetrains actually use; `anglewinder` puts skewed bevel teeth on a conical
 * face; `sidewinder` is a spur gear. `variant: "spur" | "crown" | "bevel"`
 * selects a tooth form directly. Plastic in `color`, or alloy when the colour
 * is a neutral silver or `params.alloy = 1`.
 */
export function buildCrownGear(art: PartArt, ctx: BuildCtx): Built {
  const v = art.variant ?? "inline"
  const kind: Kind = v === "sidewinder" || v === "spur" ? "spur" : v === "anglewinder" || v === "bevel" ? "bevel" : "crown"
  const p = art.params ?? {}
  const N = gearTeeth(p.teeth, 24, 40, kind === "spur" ? 32 : kind === "bevel" ? 27 : 30)
  const m = p.module ?? 0.5
  const alloy = p.alloy === 1 || isNeutral(art.color)
  const mat = alloy ? (isNeutral(art.color) ? turnedAlu() : anodizedAlu(art.color)) : plastic(art.color, 0.38, { clearcoat: 0.12, grain: 0.04 })
  const flatMat = alloy ? (isNeutral(art.color) ? turnedAlu("milled") : anodizedAlu(art.color, "milled")) : mat
  const hubMat = alloy ? mat : turnedAlu()
  const seg = segs(ctx, 160)
  const boreR = 2.38 / 2 + 0.01
  const rh = 3.1
  const content = kind === "spur" ? spurGear(N, m, flatMat, hubMat, boreR, rh, seg) : faceGear(kind, N, m, mat, hubMat, boreR, rh, seg, ctx)
  for (const c of content.children) dropToFloor(c)
  const views =
    kind === "spur"
      ? {
          hero: { azimuth: 30, elevation: 33, fill: 0.84, fov: 20 },
          detail: { azimuth: 24, elevation: 21, fill: 1.8, fov: 18 },
          alt: { azimuth: -36, elevation: 56, fill: 0.84, fov: 20 },
        }
      : {
          hero: { azimuth: 30, elevation: 31, fill: 0.84, fov: 20 },
          detail: { azimuth: 22, elevation: 15, fill: 1.75, fov: 18 },
          alt: { azimuth: -40, elevation: 57, fill: 0.84, fov: 20 },
        }
  return { content, views }
}

function faceGear(kind: "crown" | "bevel", N: number, m: number, mat: THREE.Material, hubMat: THREE.Material, boreR: number, rh: number, seg: number, ctx: BuildCtx) {
  const rp = (m * N) / 2
  const rOut = rp + 0.45
  const rIn = rp - 2.2
  const webT = 1.5
  const cone = kind === "bevel" ? deg(13) : 0
  const topAt = (r: number) => webT - Math.tan(cone) * Math.max(0, r - rIn)
  const ringR = Math.max(boreR + 1.2, rh - 0.2)
  const prof: V2[] = [
    ...arc(rh + 0.32, -0.32, 0.32, Math.PI, Math.PI / 2, 4),
    [rOut + 0.12, 0],
    [rOut + 0.12, topAt(rOut + 0.12) - 0.05],
    [rIn - 0.1, topAt(rIn - 0.1)],
    [ringR + 0.5, webT],
    [ringR, webT + 0.55],
    [boreR, webT + 0.55],
    [boreR, -0.2],
  ]
  const radii = [0, 0, 0, 0, 0, 0.22, 0.1, 0, 0.18, 0.12, 0.1, 0]
  const web = lathe(fillet(prof, radii, { seg: 4 }), { seg })
  const teeth = faceTeeth({
    teeth: N,
    rIn,
    rOut,
    y0: webT,
    height: 2.15 * m,
    land: 0.3,
    rootLand: 0.2,
    skew: kind === "bevel" ? 0.32 : 0,
    cone,
    perTooth: Math.max(16, Math.round((kind === "bevel" ? 40 : 30) * ctx.q)),
    radial: kind === "bevel" ? 14 : 5,
    sink: 0.5,
  })
  const hub = hubBoss({ rOuter: rh, rBore: boreR, y0: 0, y1: 4.2, chamfer: 0.28, screw: { phi: deg(0), d: 2, recess: 0.16 }, material: hubMat, seg })
  hub.rotation.x = Math.PI
  const meshes: THREE.Object3D[] = [part(web, mat), part(teeth, mat), hub]
  const gear = group(meshes)
  // Sits on its hub, teeth up, turned so the screw faces the camera.
  gear.rotation.y = deg(38)
  return group([gear])
}

function spurGear(N: number, m: number, mat: THREE.Material, hubMat: THREE.Material, boreR: number, rh: number, seg: number) {
  const spec = { teeth: N, module: m, shift: 0 }
  const { rf } = spurDims(spec)
  const face = 3.2
  const rimIn = rf - 1.3
  const ring = polarUV(slab(toShape(spurOutline(spec), [circle(rimIn, 160)]), face, 0.12, { seg: 3, curveSeg: 4 }), 8, "z")
  const webT = 1.3
  const holeR = (rimIn - rh) * 0.3
  const holeC = (rimIn + rh) / 2 + 0.1
  const holes: V2[][] = [circle(rh - 0.25, 96)]
  const count = 6
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + Math.PI / count
    holes.push(circle(holeR, 48, Math.cos(a) * holeC, Math.sin(a) * holeC))
  }
  const web = polarUV(slab(toShape(circle(rimIn + 0.4, 160), holes), webT, 0.28, { seg: 4, curveSeg: 6 }), 8, "z")
  web.translate(0, 0, (face - webT) / 2)
  const toY: [number, number, number] = [-Math.PI / 2, 0, 0]
  const hub = hubBoss({ rOuter: rh, rBore: boreR, y0: face / 2, y1: face + 3.4, chamfer: 0.28, screw: { phi: 0, d: 2, recess: 0.16 }, material: hubMat, seg })
  const backBoss = lathe(
    fillet(
      [
        [boreR, face / 2],
        [boreR, -0.9],
        [rh, -0.9],
        [rh, face / 2],
      ],
      [0, 0.12, 0.25, 0],
      { seg: 4 }
    ),
    { seg }
  )
  const meshes: THREE.Object3D[] = [part(ring, mat, { r: toY }), part(web, mat, { r: toY }), hub, part(backBoss, hubMat)]
  const gear = group(meshes)
  gear.rotation.y = deg(36)
  return group([gear])
}
