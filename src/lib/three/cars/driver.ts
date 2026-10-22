import * as THREE from "three"

import type { CarMaterials } from "./car-materials"

/** Driver bust (helmet, visor, shoulders, arms to the wheel) in real-car metres. */
export interface DriverSpec {
  x: number
  /** Shoulder height. */
  y: number
  z: number
  /** Recline, radians (positive leans back). */
  recline?: number
  /** Steering wheel position relative to the shoulders (z ahead, y up). */
  wheel?: { dz: number; dy: number; tilt?: number; r?: number } | null
  open?: boolean
}

export function buildDriver(spec: DriverSpec, mats: CarMaterials, hq: boolean): THREE.Group {
  const g = new THREE.Group()
  g.name = "driver"
  const seg = hq ? 32 : 12
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, hq ? 6 : 3, seg), mats.suit)
  torso.rotation.z = Math.PI / 2
  torso.scale.set(1, 1, 0.85)
  g.add(torso)
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.17, seg, hq ? 16 : 8), mats.suit)
  chest.scale.set(1.15, 1.2, 0.8)
  chest.position.set(0, -0.12, 0.02)
  g.add(chest)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, hq ? 16 : 8), mats.trim)
  neck.position.set(0, 0.11, 0)
  g.add(neck)

  const head = new THREE.Group()
  head.position.set(0, 0.27, 0.01)
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.14, hq ? 48 : 16, hq ? 32 : 12), mats.helmet)
  shell.scale.set(0.97, 1.02, 1.1)
  head.add(shell)
  // visor: a band of a slightly larger sphere centred on +Z (phi = π/2)
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.146, hq ? 40 : 14, hq ? 12 : 4, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.36, Math.PI * 0.16),
    mats.visor
  )
  visor.scale.set(0.97, 1.02, 1.1)
  head.add(visor)
  // centre stripe in the secondary colour, front and back halves meeting at the crown
  for (const centre of [Math.PI / 2, Math.PI * 1.5]) {
    const stripe = new THREE.Mesh(
      new THREE.SphereGeometry(0.1425, hq ? 6 : 3, hq ? 20 : 8, centre - 0.17, 0.34, 0, centre < Math.PI ? Math.PI * 0.34 : Math.PI * 0.55),
      mats.secondary
    )
    stripe.scale.set(0.97, 1.02, 1.1)
    head.add(stripe)
  }
  g.add(head)

  if (spec.wheel) {
    const w = spec.wheel
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w.r ?? 0.15, 0.018, hq ? 10 : 5, hq ? 40 : 14), mats.trim)
    ring.position.set(0, w.dy, w.dz)
    ring.rotation.x = w.tilt ?? -0.35
    g.add(ring)
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, Math.max(0.05, w.dz - 0.12), hq ? 4 : 2, hq ? 12 : 6), mats.suit)
      const from = new THREE.Vector3(sx * 0.2, -0.05, 0.02)
      const to = new THREE.Vector3(sx * 0.12, w.dy, w.dz - 0.02)
      arm.position.copy(from).add(to).multiplyScalar(0.5)
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
      g.add(arm)
    }
  }
  g.position.set(spec.x, spec.y, spec.z)
  g.rotation.x = -(spec.recline ?? 0.25)
  return g
}
