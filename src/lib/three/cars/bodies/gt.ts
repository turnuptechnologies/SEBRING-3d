import * as THREE from "three"

import type { CarDef } from "../assemble"
import { pchip as P } from "../math"
import { exhaust, lampBar, louvres, mirrors, sidePlate, surfaceLamp, wing } from "../parts"
import { extrudePlan, extrudeSide, roundedPolyShape } from "../shapes"

/** Modern GT3 (front-engined, long bonnet, fastback, swan-neck wing). Real-car metres. */

const ZF = 1.3
const ZR = -1.33
const RF = 0.34
const RR = 0.355

export const gt: CarDef = {
  body: "gt",
  length: 0.98,
  front: { z: ZF, track: 1.7, wheel: { radius: RF, width: 0.3, rimRatio: 0.67, style: "multi", spokes: 10, centreLock: true, tread: "slick" } },
  rear: { z: ZR, track: 1.66, wheel: { radius: RR, width: 0.33, rimRatio: 0.645, style: "multi", spokes: 10, centreLock: true, tread: "slick" } },
  guideZ: ZF + 0.42,
  caliper: "#d8272e",
  shape: {
    zTail: -2.32,
    zNose: 2.3,
    floorY: P([
      [-2.32, 0.31],
      [-2.12, 0.27],
      [-1.86, 0.11],
      [-1.6, 0.08],
      [1.6, 0.08],
      [1.95, 0.095],
      [2.3, 0.105],
    ]),
    wellX: () => 0.6,
    lipX: P([
      [-2.32, 0.86],
      [-2.15, 0.95],
      [-1.9, 1.005],
      [-1.0, 1.012],
      [-0.82, 0.978],
      [-0.62, 0.955],
      [0.62, 0.955],
      [0.84, 0.99],
      [1.04, 1.012],
      [1.68, 1.012],
      [1.95, 0.975],
      [2.16, 0.9],
      [2.3, 0.78],
    ]),
    beltX: P([
      [-2.32, 0.9],
      [-2.15, 0.985],
      [-1.9, 1.03],
      [-1.0, 1.035],
      [-0.82, 1.0],
      [-0.62, 0.975],
      [0.62, 0.975],
      [0.84, 1.0],
      [1.04, 1.025],
      [1.68, 1.025],
      [1.95, 0.99],
      [2.16, 0.915],
      [2.3, 0.8],
    ]),
    beltY: P([
      [-2.32, 0.62],
      [-1.8, 0.63],
      [-1.2, 0.58],
      [-0.6, 0.5],
      [0.6, 0.48],
      [1.3, 0.5],
      [2.0, 0.45],
      [2.3, 0.4],
    ]),
    crownX: P([
      [-2.32, 0.82],
      [-1.9, 0.9],
      [-1.33, 0.93],
      [-0.75, 0.89],
      [0.0, 0.865],
      [0.7, 0.875],
      [1.3, 0.9],
      [1.9, 0.85],
      [2.3, 0.68],
    ]),
    crownY: P([
      [-2.32, 0.9],
      [-1.9, 0.945],
      [-1.33, 0.935],
      [-0.75, 0.85],
      [0.0, 0.8],
      [0.7, 0.79],
      [1.3, 0.8],
      [1.9, 0.72],
      [2.3, 0.5],
    ]),
    valleyX: P([
      [-2.32, 0.5],
      [-1.5, 0.56],
      [-1.2, 0.6],
      [0.3, 0.6],
      [0.6, 0.5],
      [1.3, 0.48],
      [2.3, 0.4],
    ]),
    valleyY: P([
      [-2.32, 0.88],
      [-1.9, 0.92],
      [-1.55, 0.88],
      [-1.28, 0.66],
      [0.3, 0.62],
      [0.47, 0.74],
      [0.8, 0.735],
      [1.3, 0.72],
      [1.9, 0.665],
      [2.3, 0.46],
    ]),
    topY: P([
      [-2.32, 0.89],
      [-1.9, 0.94],
      [-1.55, 0.9],
      [-1.28, 0.64],
      [0.3, 0.62],
      [0.47, 0.765],
      [0.8, 0.765],
      [1.3, 0.75],
      [1.9, 0.69],
      [2.3, 0.48],
    ]),
    arches: [
      { z: ZF, r: RF + 0.035, cy: RF },
      { z: ZR, r: RR + 0.035, cy: RR },
    ],
    rLip: () => 0.03,
    rBelt: () => 0.12,
    rCrown: () => 0.09,
    rValley: () => 0.16,
    rTop: () => 0.4,
    bevelNose: 0.07,
    bevelTail: 0.05,
    planScale: P([
      [1.8, 1],
      [2.05, 0.975],
      [2.22, 0.92],
      [2.3, 0.86],
    ]),
  },
  layout: {
    fillets: [4, 2, 2, 6, 10, 10, 10, 10],
    edges: [6, 3, 4, 12, 8, 8, 10],
  },
  cabin: {
    shape: {
      zRear: -2.05,
      zFront: 0.56,
      baseY: () => 0.66,
      baseX: P([
        [0.56, 0.76],
        [-2.05, 0.66],
      ]),
      beltX: P([
        [0.56, 0.79],
        [0.2, 0.785],
        [-0.6, 0.775],
        [-1.3, 0.74],
        [-2.05, 0.68],
      ]),
      beltY: P([
        [0.56, 0.79],
        [0.3, 0.835],
        [-0.6, 0.86],
        [-1.3, 0.885],
        [-2.05, 0.92],
      ]),
      roofX: P([
        [0.56, 0.75],
        [0.42, 0.73],
        [-0.3, 0.59],
        [-0.9, 0.565],
        [-1.5, 0.5],
        [-2.05, 0.42],
      ]),
      roofEdgeY: P([
        [0.56, 0.69],
        [0.45, 0.795],
        [-0.3, 1.16],
        [-0.6, 1.185],
        [-0.95, 1.165],
        [-1.5, 1.035],
        [-2.05, 0.9],
      ]),
      roofY: P([
        [0.56, 0.7],
        [0.45, 0.8],
        [-0.3, 1.21],
        [-0.6, 1.235],
        [-0.95, 1.215],
        [-1.5, 1.07],
        [-2.05, 0.93],
      ]),
      rBelt: () => 0.025,
      rRoof: () => 0.085,
      rTop: () => 0.35,
    },
    layout: { fillets: [2, 2, 4, 10, 10], edges: [3, 3, 12, 14] },
    windows: {
      windscreen: [-0.29, 0.56],
      side: [
        [-1.2, -0.72],
        [-0.65, 0.36],
      ],
      rear: [-1.86, -0.98],
      seal: 0.022,
    },
    interior: { zRear: -1.27, zFront: 0.31, halfWidth: () => 0.8, minY: 0.55 },
  },
  driver: { x: 0.37, y: 0.72, z: -0.5, recline: 0.32, wheel: { dz: 0.36, dy: 0.02, tilt: -0.5 } },
  plan: {
    flankNumber: { z: -0.12, y: 0.6, d: 0.46 },
    hoodNumber: { z: 1.5, d: 0.42 },
    stripes: { w: 0.2, gap: 0.06 },
    sideStripe: { y0: 0.34, y1: 0.48 },
    hoop: { z0: -1.2, z1: -0.86 },
    split: { z: -0.25, slope: 0.32 },
    sash: { zTop: 0.65, yTop: 0.84, zBottom: -0.95, yBottom: 0.1, w: 0.3 },
    chevron: { z: 2.25, slope: 0.95, w: 0.3 },
    fade: { z0: -2.32, z1: 0.2 },
    coachline: 0.68,
    sponsors: [
      { z: 0.74, y: 0.56, w: 0.36, h: 0.085 },
      { z: -0.92, y: 0.64, w: 0.4, h: 0.09 },
      { z: -0.12, y: 0.24, w: 0.92, h: 0.1 },
    ],
    banner: { z0: -0.29, z1: -0.18 },
    flankLines: [
      [
        [0.52, 0.8],
        [0.58, 0.5],
        [0.57, 0.17],
        [-0.62, 0.17],
        [-0.66, 0.5],
        [-0.72, 0.83],
      ],
    ],
    filler: { z: -1.0, y: 0.8, d: 0.12 },
  },
  views: { hero: { elevation: 12 } },
  extras(ctx) {
    const { mats } = ctx
    // splitter
    ctx.add(
      extrudePlan(
        roundedPolyShape(
          [
            [-0.99, 1.92],
            [0.99, 1.92],
            [0.97, 2.44],
            [-0.97, 2.44],
          ],
          0.06
        ),
        0.07,
        0.096,
        0.006,
        ctx.hq ? 10 : 4
      ),
      mats.carbon,
      "splitter"
    )
    // canards
    for (const sx of [-1, 1]) {
      const c = extrudePlan(
        roundedPolyShape(
          [
            [sx * 0.86, 2.08],
            [sx * 1.02, 1.94],
            [sx * 1.0, 1.88],
            [sx * 0.86, 1.98],
          ],
          0.015
        ),
        0.3,
        0.312,
        0.004,
        4
      )
      ctx.add(c, mats.carbon, "canard")
    }
    // diffuser with strakes
    const diff = extrudeSide(
      roundedPolyShape(
        [
          [-2.38, 0.07],
          [-1.72, 0.07],
          [-1.72, 0.1],
          [-2.38, 0.3],
        ],
        0.02
      ),
      1.62,
      0.01,
      4
    )
    ctx.add(diff, mats.carbon, "diffuser")
    for (const x of [-0.62, -0.25, 0.25, 0.62]) {
      const s = extrudeSide(
        roundedPolyShape(
          [
            [-2.4, 0.03],
            [-1.9, 0.03],
            [-2.4, 0.2],
          ],
          0.01
        ),
        0.014,
        0.004,
        3
      )
      s.translate(x, 0, 0)
      ctx.add(s, mats.carbon, "strake")
    }
    // swan-neck wing
    wing(ctx, {
      span: 1.86,
      chord: 0.34,
      z: -1.96,
      y: 1.2,
      aoa: -0.16,
      paint: "carbon",
      gurney: 0.025,
      endplate: [
        [0.06, -0.16],
        [-0.42, -0.2],
        [-0.46, 0.14],
        [0.0, 0.08],
      ],
      endplatePaint: "carbon",
    })
    for (const x of [-0.44, 0.44]) {
      const neck = extrudeSide(
        roundedPolyShape(
          [
            [-2.12, 0.9],
            [-1.98, 0.9],
            [-2.0, 1.02],
            [-2.07, 1.17],
            [-2.12, 1.25],
            [-2.2, 1.255],
            [-2.2, 1.215],
            [-2.12, 1.2],
            [-2.1, 1.1],
          ],
          0.03
        ),
        0.022,
        0.006,
        ctx.hq ? 8 : 3
      )
      neck.translate(x, 0, 0)
      ctx.add(neck, mats.carbon, "swan-neck")
    }
    // headlamps on the fender noses
    surfaceLamp(ctx, { z: 2.05, s: 0.6, hz: 0.18, hs: 0.13, kind: "head", shape: "rect", round: 0.55, pods: 2, podScale: 0.9, drl: 1 })
    // louvred vents on the front fenders
    louvres(ctx, { z0: 1.02, z1: 1.5, s0: 0.5, s1: 0.78, count: 9 })
    // tail light bars on the tail panel
    for (const sx of [-1, 1]) lampBar(ctx, new THREE.Vector3(sx * 0.6, 0.8, -2.322), new THREE.Vector3(0, 0, -1), 0.46, 0.05, "tail")
    // mirrors
    mirrors(ctx, { x: 0.98, y: 0.98, z: 0.2, root: [0.8, 0.88, 0.22], size: [0.17, 0.09, 0.11], paint: "base" })
    // side exhausts ahead of the rear wheels
    for (const sx of [-1, 1])
      for (const dz of [0, 0.1]) exhaust(ctx, new THREE.Vector3(sx * 0.985, 0.13, -0.78 + dz), new THREE.Vector3(sx, -0.08, 0), 0.04, 0.12)
    // side skirts
    sidePlate(
      ctx,
      [
        [-0.92, 0.05],
        [0.88, 0.05],
        [0.86, 0.13],
        [-0.9, 0.13],
      ],
      0.95,
      0.07,
      "carbon",
      0.02
    )
  },
  paintExtras(_ctx, { g, atlas }) {
    // front grille / intake on the nose face
    const r = atlas.get("capF")
    const [x0, y0] = r.px(-0.56, 0.36)
    const [x1, y1] = r.px(0.56, 0.18)
    g.fillStyle = "#08080a"
    g.beginPath()
    g.roundRect(x0, y0, x1 - x0, y1 - y0, (y1 - y0) * 0.3)
    g.fill()
    g.strokeStyle = "rgba(255,255,255,0.08)"
    g.lineWidth = Math.max(1, r.ppm * 0.006)
    for (let x = x0; x < x1; x += r.ppm * 0.03) {
      g.beginPath()
      g.moveTo(x, y0)
      g.lineTo(x + (y1 - y0) * 0.4, y1)
      g.stroke()
    }
  },
}
