import * as THREE from "three"

import type { ProductView } from "@/lib/catalog/types"

/** Camera angle for a studio view. Azimuth 0° looks at the nose (objects face +Z). */
export interface ViewAngle {
  azimuth: number
  elevation: number
  /** Fraction of the frame the object should fill (0–1, >1 crops in). */
  fill: number
  fov: number
}

export const VIEW_ANGLES: Record<ProductView, ViewAngle> = {
  hero: { azimuth: 38, elevation: 15, fill: 0.84, fov: 24 },
  side: { azimuth: 90, elevation: 3, fill: 0.9, fov: 20 },
  rear: { azimuth: 148, elevation: 17, fill: 0.84, fov: 24 },
  top: { azimuth: 0, elevation: 89, fill: 0.86, fov: 24 },
  detail: { azimuth: 24, elevation: 24, fill: 1.35, fov: 22 },
  alt: { azimuth: -42, elevation: 26, fill: 0.84, fov: 24 },
}

/** Objects can override angles per view via `object.userData.views`. */
export function resolveViewAngle(object: THREE.Object3D, view: ProductView): ViewAngle {
  const overrides = (object.userData?.views ?? {}) as Partial<Record<ProductView, Partial<ViewAngle>>>
  return { ...VIEW_ANGLES[view], ...(overrides[view] ?? {}) }
}

const corners = Array.from({ length: 8 }, () => new THREE.Vector3())

/**
 * Places `camera` so `box` fills `fill` of the frame from the given angle.
 * Iterates on projected corners, so long cars and tiny pinions frame equally well.
 */
export function frameBox(
  camera: THREE.PerspectiveCamera,
  box: THREE.Box3,
  angle: ViewAngle,
  aspect: number
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const target = box.getCenter(new THREE.Vector3())
  const az = THREE.MathUtils.degToRad(angle.azimuth)
  const el = THREE.MathUtils.degToRad(angle.elevation)
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize()

  camera.fov = angle.fov
  camera.aspect = aspect
  camera.near = 0.001
  camera.far = 100
  camera.up.set(0, 1, 0)
  if (angle.elevation > 80) camera.up.set(0, 0, -1)
  camera.updateProjectionMatrix()

  const { min, max } = box
  let i = 0
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners[i++].set(x, y, z)

  let distance = box.getSize(new THREE.Vector3()).length() * 2
  const p = new THREE.Vector3()
  for (let pass = 0; pass < 6; pass++) {
    camera.position.copy(target).addScaledVector(dir, distance)
    camera.lookAt(target)
    camera.updateMatrixWorld(true)
    let extent = 0
    for (const c of corners) {
      p.copy(c).project(camera)
      extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y))
    }
    if (extent <= 0 || !Number.isFinite(extent)) break
    distance *= extent / angle.fill
  }
  camera.position.copy(target).addScaledVector(dir, distance)
  camera.lookAt(target)
  camera.updateMatrixWorld(true)
  return { position: camera.position.clone(), target }
}
