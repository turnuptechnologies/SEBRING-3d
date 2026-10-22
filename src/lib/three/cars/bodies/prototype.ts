import * as THREE from "three"

import type { CarDef } from "../assemble"
import { pchip as P } from "../math"
import { cornerArc, exhaust, mirrors, nacaFlank, nacaTop, roundLamp, sidePlate, surfaceLamp, wing } from "../parts"
import { extrudePlan, extrudeSide, roundedPolyShape } from "../shapes"
import { BODY } from "../templates"

/**
 * 1980s Group C long-tail (962C LH / XJR-9 LM feel): very low and wide, wedge
 * nose between humped front fenders, bubble canopy, rear wheel spats, long
 * tail with a full-width wing between tall endplates. Real-car metres.
 */

const ZF = 1.25
const ZR = -1.52
const RF = 0.32
const RR = 0.345

export const prototype: CarDef = {
  body: "prototype",
  length: 1.02,
  front: { z: ZF, track: 1.63, wheel: { radius: RF, width: 0.29, rimRatio: 0.6, style: "disc", spokes: 10, centreLock: true, tread: "slick", dish: 0.05 } },
  rear: { z: ZR, track: 1.55, wheel: { radius: RR, width: 0.36, rimRatio: 0.62, style: "disc", spokes: 10, centreLock: true, tread: "slick", dish: 0.06 } },
  guideZ: ZF + 0.45,
  caliper: "#c9a04a",
  shape: {
    zTail: -2.36,
    zNose: 2.42,
    floorY: P([
      [-2.36, 0.4],
      [-2.1, 0.31],
      [-1.92, 0.12],
      [-1.62, 0.075],
      [1.9, 0.075],
      [2.25, 0.085],
      [2.42, 0.1],
    ]),
    wellX: P([
      [-2.0, 0.56],
      [-1.0, 0.56],
      [0.7, 0.62],
      [2.0, 0.62],
    ]),
    lipX: P([
      [-2.36, 0.93],
      [-1.9, 0.985],
      [-1.5, 0.995],
      [-0.9, 0.985],
      [0.5, 0.965],
      [1.0, 0.972],
      [1.5, 0.972],
      [1.95, 0.935],
      [2.25, 0.82],
      [2.42, 0.6],
    ]),
    beltX: P([
      [-2.36, 0.945],
      [-1.9, 1.0],
      [-1.5, 1.005],
      [-0.9, 0.995],
      [0.5, 0.978],
      [1.0, 0.985],
      [1.5, 0.985],
      [1.95, 0.948],
      [2.25, 0.83],
      [2.42, 0.62],
    ]),
    beltY: P([
      [-2.36, 0.55],
      [-1.9, 0.52],
      [-1.3, 0.45],
      [-0.5, 0.4],
      [0.6, 0.38],
      [1.25, 0.4],
      [1.9, 0.3],
      [2.42, 0.17],
    ]),
    crownX: P([
      [-2.36, 0.9],
      [-1.52, 0.865],
      [-0.7, 0.88],
      [0.2, 0.9],
      [0.8, 0.86],
      [1.25, 0.8],
      [1.9, 0.75],
      [2.25, 0.68],
      [2.42, 0.54],
    ]),
    crownY: P([
      [-2.36, 0.86],
      [-1.9, 0.845],
      [-1.52, 0.815],
      [-1.0, 0.73],
      [-0.4, 0.64],
      [0.4, 0.625],
      [0.85, 0.685],
      [1.25, 0.735],
      [1.7, 0.665],
      [2.1, 0.475],
      [2.42, 0.24],
    ]),
    valleyX: P([
      [-2.36, 0.62],
      [-1.52, 0.56],
      [-0.9, 0.62],
      [0.6, 0.64],
      [0.95, 0.56],
      [1.25, 0.5],
      [2.0, 0.44],
      [2.42, 0.36],
    ]),
    valleyY: P([
      [-2.36, 0.63],
      [-2.0, 0.67],
      [-1.52, 0.745],
      [-1.1, 0.765],
      [-0.86, 0.62],
      [0.64, 0.6],
      [0.9, 0.525],
      [1.25, 0.485],
      [1.8, 0.405],
      [2.2, 0.3],
      [2.42, 0.2],
    ]),
    topY: P([
      [-2.36, 0.61],
      [-2.0, 0.655],
      [-1.52, 0.73],
      [-1.1, 0.755],
      [-0.86, 0.36],
      [0.62, 0.32],
      [0.86, 0.51],
      [1.25, 0.47],
      [1.8, 0.39],
      [2.2, 0.29],
      [2.42, 0.19],
    ]),
    arches: [
      { z: ZF, r: RF + 0.035, cy: RF },
      { z: ZR, r: 0.43, cy: 0.37, kind: "spat", corner: 0.08 },
    ],
    rLip: () => 0.028,
    rBelt: () => 0.16,
    rCrown: () => 0.11,
    rValley: () => 0.18,
    rTop: () => 0.42,
    bevelNose: 0.05,
    bevelTail: 0.035,
    planScale: P([
      [2.0, 1],
      [2.25, 0.97],
      [2.42, 0.9],
    ]),
  },
  layout: {
    fillets: [4, 2, 2, 6, 10, 12, 12, 10],
    edges: [6, 3, 4, 10, 8, 8, 12],
  },
  cabin: {
    shape: {
      zRear: -1.0,
      zFront: 0.92,
      baseY: () => 0.36,
      baseX: P([
        [0.92, 0.5],
        [-1.0, 0.46],
      ]),
      beltX: P([
        [0.92, 0.53],
        [0.6, 0.585],
        [0.0, 0.6],
        [-0.6, 0.56],
        [-1.0, 0.48],
      ]),
      beltY: P([
        [0.92, 0.55],
        [0.6, 0.6],
        [0.0, 0.62],
        [-0.6, 0.665],
        [-1.0, 0.73],
      ]),
      roofX: P([
        [0.92, 0.47],
        [0.62, 0.5],
        [0.15, 0.41],
        [-0.3, 0.37],
        [-0.75, 0.33],
        [-1.0, 0.29],
      ]),
      roofEdgeY: P([
        [0.92, 0.5],
        [0.66, 0.65],
        [0.2, 0.935],
        [-0.15, 0.978],
        [-0.5, 0.955],
        [-0.82, 0.86],
        [-1.0, 0.77],
      ]),
      roofY: P([
        [0.92, 0.5],
        [0.66, 0.665],
        [0.2, 0.995],
        [-0.15, 1.03],
        [-0.5, 1.005],
        [-0.82, 0.9],
        [-1.0, 0.79],
      ]),
      rBelt: () => 0.04,
      rRoof: () => 0.15,
      rTop: () => 0.3,
    },
    layout: { fillets: [2, 2, 4, 12, 10], edges: [3, 3, 10, 12] },
    windows: {
      windscreen: [0.1, 0.92],
      side: [[-0.52, 0.1]],
      rear: [-0.86, -0.6],
      seal: 0.02,
      wrap: true,
    },
    interior: { zRear: -0.84, zFront: 0.62, halfWidth: () => 0.6, minY: 0.25 },
  },
  driver: { x: -0.26, y: 0.5, z: -0.18, recline: 0.5, wheel: { dz: 0.42, dy: 0.1, tilt: -0.75, r: 0.14 } },
  plan: {
    flankNumber: { z: 0.06, y: 0.4, d: 0.46 },
    hoodNumber: { z: 1.78, d: 0.4 },
    stripes: { w: 0.2, gap: 0.05 },
    sideStripe: { y0: 0.17, y1: 0.29 },
    hoop: { z0: -1.08, z1: -0.76 },
    split: { z: -0.42, slope: 0.3 },
    sash: { zTop: 0.95, yTop: 0.66, zBottom: -0.72, yBottom: 0.06, w: 0.3 },
    chevron: { z: 2.42, slope: 1.05, w: 0.32 },
    fade: { z0: -2.36, z1: 0.3 },
    coachline: 0.55,
    sponsors: [
      { z: 0.78, y: 0.36, w: 0.32, h: 0.075 },
      { z: -0.98, y: 0.25, w: 0.42, h: 0.09 },
      { z: 0.06, y: 0.15, w: 0.8, h: 0.085 },
    ],
    banner: { z0: 0.1, z1: 0.21 },
    flankLines: [
      [
        [0.62, 0.62],
        [0.66, 0.35],
        [0.63, 0.1],
        [-0.5, 0.1],
        [-0.54, 0.62],
      ],
      [
        [-1.07, 0.37],
        [-1.05, 0.74],
        [-1.98, 0.76],
        [-1.97, 0.37],
      ],
    ],
  },
  views: { hero: { elevation: 13 }, side: { elevation: 2 } },
  extras(ctx) {
    const { mats } = ctx
    // tail fins → tall wing endplates, full-width wing between them
    wing(ctx, {
      span: 1.78,
      chord: 0.42,
      z: -1.98,
      y: 0.97,
      aoa: -0.1,
      thickness: 0.1,
      paint: "base",
      gurney: 0.02,
      endplate: null,
    })
    sidePlate(
      ctx,
      [
        [-1.86, 0.8],
        [-2.2, 0.62],
        [-2.49, 0.62],
        [-2.49, 1.06],
        [-2.3, 1.08],
        [-1.95, 0.93],
      ],
      0.905,
      0.03,
      "base",
      0.04
    )
    // headlamps under clear fairings in the fender noses
    for (const z of [2.08]) {
      const s = cornerArc(ctx.body, z, BODY.crown, 0.35)
      surfaceLamp(ctx, { z, s, hz: 0.16, hs: 0.12, kind: "head", shape: "rect", round: 0.8, pods: 2, podScale: 1.1 })
    }
    // tail lamps on the fins
    for (const sx of [-1, 1]) {
      roundLamp(ctx, new THREE.Vector3(sx * 0.8, 0.7, -2.362), new THREE.Vector3(0, 0, -1), 0.05, "tail", 0.02)
      roundLamp(ctx, new THREE.Vector3(sx * 0.66, 0.7, -2.362), new THREE.Vector3(0, 0, -1), 0.05, "tail", 0.02)
    }
    mirrors(ctx, { x: 0.86, y: 0.8, z: 0.72, root: [0.74, 0.68, 0.74], size: [0.15, 0.08, 0.1], paint: "base" })
    // front lip and rear diffuser
    ctx.add(
      extrudePlan(
        roundedPolyShape(
          [
            [-0.86, 2.16],
            [0.86, 2.16],
            [0.62, 2.48],
            [-0.62, 2.48],
          ],
          0.08
        ),
        0.062,
        0.086,
        0.006,
        ctx.hq ? 10 : 4
      ),
      mats.carbon,
      "lip"
    )
    ctx.add(
      extrudeSide(
        roundedPolyShape(
          [
            [-2.4, 0.07],
            [-1.85, 0.07],
            [-1.85, 0.1],
            [-2.4, 0.4],
          ],
          0.02
        ),
        1.5,
        0.01,
        4
      ),
      mats.carbon,
      "diffuser"
    )
    exhaust(ctx, new THREE.Vector3(-0.42, 0.44, -2.4), new THREE.Vector3(0, 0.15, -1), 0.06, 0.2)
  },
  paintExtras(_ctx, { g, atlas, body }) {
    // NACA ducts on the nose and doors, radiator exit on the bonnet, side intakes
    body.clip()
    nacaTop(body, 2.08, 0.24, 0.34, 0.12)
    nacaFlank(body, 0.5, 0.45, 0.36, 0.1)
    body.topPoly(
      [
        [1.62, -0.24],
        [1.62, 0.24],
        [1.38, 0.28],
        [1.38, -0.28],
      ],
      "#08080a",
      false
    )
    body.flankPoly(
      [
        [-0.56, 0.3],
        [-0.56, 0.6],
        [-1.02, 0.66],
        [-1.0, 0.32],
      ],
      (side) => body.gradient([-0.56, side * 1.0], [-1.0, side * 1.0], [
        [0, "#030304"],
        [1, "#1a1a1f"],
      ])
    )
    body.done()
    // tail: dark mesh between the fins
    const r = atlas.get("capR")
    const [x0, y0] = r.px(0.58, 0.66)
    const [x1, y1] = r.px(-0.58, 0.42)
    g.fillStyle = "#070709"
    g.beginPath()
    g.roundRect(x0, y0, x1 - x0, y1 - y0, (y1 - y0) * 0.2)
    g.fill()
    g.strokeStyle = "rgba(255,255,255,0.07)"
    g.lineWidth = Math.max(1, r.ppm * 0.005)
    for (let x = x0; x < x1; x += r.ppm * 0.025) {
      g.beginPath()
      g.moveTo(x, y0)
      g.lineTo(x, y1)
      g.stroke()
    }
  },
}
