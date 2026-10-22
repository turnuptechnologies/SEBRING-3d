import * as THREE from "three"

import { clamp, circle, fillet, group, holedCylinder, lathe, part, slab, toShape, type V2 } from "./kit"
import { blackOxide, cavity, occluded, shadeVertices, threadNormal, tiled } from "./surfaces"

/** Small shared hardware: grub screws, hubs with radial screw holes, pockets. */

const screwMats = new Map<string, THREE.MeshPhysicalMaterial>()

function threadedOxide(pitch: number) {
  const key = `thread:${pitch}`
  const hit = screwMats.get(key)
  if (hit) return hit
  const base = blackOxide()
  const m = base.clone()
  m.normalMap = tiled(threadNormal(), 1, pitch * 8)
  m.normalScale = new THREE.Vector2(1.4, 1.4)
  m.name = `dt:${key}`
  screwMats.set(key, m)
  return m
}

/** Hex-socket set screw along +Y, top face at y = 0, body down to y = -length. */
export function grubScrew(d: number, length: number, seg = 48): THREE.Group {
  const r = d / 2
  const socket = d * 0.45
  const depth = Math.min(length * 0.45, d * 0.55)
  const hex: V2[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    hex.push([(Math.cos(a) * socket) / Math.cos(Math.PI / 6), Math.sin(a) * (socket / Math.cos(Math.PI / 6))])
  }
  const capShape = toShape(circle(r * 0.97, seg), [fillet(hex, socket * 0.06, { closed: true, seg: 2 })])
  const cap = slab(capShape, depth, Math.min(0.05, d * 0.03), { seg: 2, curveSeg: 4 })
  const body = lathe(
    fillet(
      [
        [0, -length],
        [r * 0.97, -length],
        [r * 0.97, -depth + 0.01],
        [r * 0.9, -depth + 0.01],
      ],
      [0, d * 0.12, 0, 0],
      { seg: 3 }
    ),
    { seg, uSpan: 1 }
  )
  // Drill-point pit at the bottom of the socket, walked inward so it faces up.
  const cone = lathe(
    [
      [socket * 1.02, -depth + 0.02],
      [0, -depth - socket * 0.4],
    ],
    { seg: 6 }
  )
  return group([
    part(cap, blackOxide(), { r: [Math.PI / 2, 0, 0] }),
    part(body, threadedOxide(Math.max(0.25, d * 0.2))),
    part(cone, cavity()),
  ])
}

export interface HubOptions {
  rOuter: number
  rBore: number
  /** Bottom (seated) and top (free) ends of the boss. */
  y0: number
  y1: number
  chamfer?: number
  screw?: { phi: number; d: number; recess?: number }
  seg?: number
  material: THREE.Material
  boreMaterial?: THREE.Material
}

/**
 * Turned hub boss around +Y with an optional radial threaded hole and a set
 * screw sitting in it. Returns meshes in hub space.
 */
export function hubBoss(o: HubOptions): THREE.Group {
  const seg = o.seg ?? 96
  const c = o.chamfer ?? Math.min(0.25, (o.y1 - o.y0) * 0.1)
  const R = o.rOuter
  const meshes: THREE.Object3D[] = []
  const wallTop = o.y1 - c - 0.06
  const cap = lathe(
    fillet(
      [
        [R, wallTop],
        [R, o.y1],
        [o.rBore, o.y1],
        [o.rBore, o.y0 - 0.2],
      ],
      [0, c, c * 0.6, 0],
      { seg: 4 }
    ),
    { seg, v0: wallTop }
  )
  // Darken the bore with depth — environment light does not reach inside it.
  shadeVertices(cap, (v) => (Math.hypot(v.x, v.z) < o.rBore + 0.06 ? 1 - 0.82 * clamp((o.y1 - v.y) / 1.6, 0, 1) : 1))
  meshes.push(part(cap, occluded(o.material)))
  if (o.screw) {
    const span = wallTop - o.y0
    const hr = Math.min(o.screw.d / 2, span * 0.42)
    const yc = o.y0 + span / 2
    const { wall, holeWalls } = holedCylinder(R, o.y0 - 0.15, wallTop, [{ phi: o.screw.phi, y: yc, r: hr, depth: R - o.rBore + 0.05 }], seg)
    const axis = new THREE.Vector3(Math.sin(o.screw.phi), 0, Math.cos(o.screw.phi))
    shadeVertices(holeWalls, (v) => 0.62 - 0.55 * clamp((R - v.dot(axis) - 0.03) / 0.2, 0, 1))
    meshes.push(part(wall, o.material), part(holeWalls, occluded(o.material)))
    const screw = grubScrew(hr * 2 * 0.97, Math.max(R - o.rBore - (o.screw.recess ?? 0.18) - 0.05, 0.4))
    const dir = new THREE.Vector3(Math.sin(o.screw.phi), 0, Math.cos(o.screw.phi))
    screw.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    screw.position.copy(dir.multiplyScalar(R - (o.screw.recess ?? 0.18))).add(new THREE.Vector3(0, yc, 0))
    meshes.push(screw)
  } else {
    meshes.push(part(lathe([[R, o.y0 - 0.15], [R, wallTop]], { seg }), o.material))
  }
  return group(meshes)
}

/**
 * Blind pocket seen through a hole: an inside-out extrusion of `outline`
 * (XY) from z = 0 down to z = -depth, rendered back faces only.
 */
export function pocket(outline: V2[], depth: number, material: THREE.Material = cavity()) {
  const g = slab(toShape(outline), depth, 0, { curveSeg: 4 })
  g.translate(0, 0, -depth)
  const m = (material as THREE.MeshStandardMaterial).clone()
  m.side = THREE.BackSide
  m.name = `${material.name}:pocket`
  return part(g, m, { cast: false })
}
