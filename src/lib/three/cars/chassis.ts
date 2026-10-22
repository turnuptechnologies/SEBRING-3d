import * as THREE from "three"

import type { CarMaterials } from "./car-materials"
import { extrudePlan, extrudeSide, rod, roundedPolyShape } from "./shapes"

/**
 * Slot-car running gear in real-car metres: injected chassis plate, guide
 * blade with copper braids, can motor + crown gear and steel axles.
 */
export interface ChassisSpec {
  zFront: number
  zRear: number
  trackFront: number
  trackRear: number
  tireWidthFront: number
  tireWidthRear: number
  radiusFront: number
  radiusRear: number
  guideZ: number
  /** Underside of the body shell (the plate sits just below). */
  floorY: number
  /** Plate extends this far behind the rear axle. */
  rearOverhang?: number
}

export function buildChassis(spec: ChassisSpec, mats: CarMaterials, hq: boolean): THREE.Group {
  const g = new THREE.Group()
  g.name = "chassis"
  const y1 = Math.min(spec.floorY - 0.004, 0.09)
  const y0 = Math.max(0.028, y1 - 0.05)
  const hwF = spec.trackFront / 2 - spec.tireWidthFront / 2 - 0.05
  const hwR = spec.trackRear / 2 - spec.tireWidthRear / 2 - 0.05
  const hwT = 0.16
  const zR = spec.zRear - (spec.rearOverhang ?? 0.28)
  const zF = spec.zFront
  const zG = spec.guideZ + 0.2
  // plan outline (x, z) — main pan between the axles, tongue forward to the guide
  const outline: Array<[number, number]> = [
    [-hwR, zR],
    [hwR, zR],
    [hwR, spec.zRear + 0.32],
    [hwF * 0.92, zF - 0.42],
    [hwF, zF - 0.14],
    [hwF * 0.6, zF + 0.12],
    [hwT, zF + 0.2],
    [hwT, zG],
    [-hwT, zG],
    [-hwT, zF + 0.2],
    [-hwF * 0.6, zF + 0.12],
    [-hwF, zF - 0.14],
    [-hwF * 0.92, zF - 0.42],
    [-hwR, spec.zRear + 0.32],
  ]
  const plate = new THREE.Mesh(extrudePlan(roundedPolyShape(outline, 0.05), y0, y1, 0.008, hq ? 10 : 4), mats.chassis)
  plate.name = "chassis-plate"
  g.add(plate)

  // guide: pivot boss, keel blade and braids
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.045, hq ? 28 : 10), mats.chassis)
  boss.position.set(0, y0 - 0.02, spec.guideZ)
  g.add(boss)
  const bladeShape = roundedPolyShape(
    [
      [-0.26, y0 - 0.01],
      [0.2, y0 - 0.01],
      [0.17, 0.004],
      [-0.2, 0.004],
    ],
    [0.03, 0.03, 0.06, 0.03]
  )
  const blade = new THREE.Mesh(extrudeSide(bladeShape, 0.035, 0.006, hq ? 8 : 3), mats.chassis)
  blade.position.z = spec.guideZ
  blade.name = "guide-blade"
  g.add(blade)
  for (const sx of [-1, 1]) {
    // braid: flat strip under the guide shoe, curling up behind it
    const strip = roundedPolyShape(
      [
        [0.16, y0 - 0.03],
        [0.2, y0 - 0.04],
        [0.18, 0.012],
        [-0.3, 0.012],
        [-0.36, 0.03],
        [-0.36, 0.044],
        [-0.3, 0.028],
        [0.12, 0.028],
      ],
      0.012
    )
    const br = new THREE.Mesh(extrudeSide(strip, 0.075, 0.004, hq ? 6 : 2), mats.copper)
    br.position.set(sx * 0.07, 0, spec.guideZ)
    br.name = "braid"
    g.add(br)
  }

  // axles
  const ax = (z: number, track: number, r: number) => {
    const m = new THREE.Mesh(rod(new THREE.Vector3(-track / 2, r, z), new THREE.Vector3(track / 2, r, z), 0.025, hq ? 12 : 6), mats.steel)
    m.name = "axle"
    g.add(m)
  }
  ax(spec.zFront, spec.trackFront - spec.tireWidthFront * 0.5, spec.radiusFront)
  ax(spec.zRear, spec.trackRear - spec.tireWidthRear * 0.5, spec.radiusRear)

  // inline can motor ahead of the rear axle + brass crown gear
  const motorLen = 0.75
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, motorLen, hq ? 32 : 12), mats.steel)
  can.rotation.x = Math.PI / 2
  can.position.set(0, spec.radiusRear + 0.02, spec.zRear + 0.26 + motorLen / 2)
  g.add(can)
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.12, hq ? 24 : 10), mats.chassis)
  bell.rotation.x = Math.PI / 2
  bell.position.set(0, can.position.y, spec.zRear + 0.26 + motorLen + 0.05)
  g.add(bell)
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(spec.radiusRear * 0.62, spec.radiusRear * 0.62, 0.05, hq ? 48 : 16), mats.copper)
  crown.rotation.z = Math.PI / 2
  crown.position.set(-0.06, spec.radiusRear, spec.zRear)
  g.add(crown)
  return g
}
