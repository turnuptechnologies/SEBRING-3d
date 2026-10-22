import * as THREE from "three"

import { BARRIER_X, RACEWAY } from "@/lib/three/track/layout"

/**
 * Double W-beam guard rail (armco) on posts, along both sides of the straight.
 * The beams are one long extrusion per side; posts are a single InstancedMesh.
 */

interface ProfilePoint {
  x: number
  y: number
  nx: number
  ny: number
}

/** W-beam cross-section facing +X: two crests toward the track, flanges back at the post. */
function wBeamProfile(y0: number, height: number, depth: number, samples = 14): ProfilePoint[] {
  const pts: ProfilePoint[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const w = 0.5 - 0.5 * Math.cos(4 * Math.PI * t)
    const dw = 2 * Math.PI * Math.sin(4 * Math.PI * t)
    const x = depth * w
    const y = y0 + height * t
    // Tangent (depth·w', height) → outward normal (height, −depth·w').
    const nx = height
    const ny = -depth * dw
    const len = Math.hypot(nx, ny)
    pts.push({ x, y, nx: nx / len, ny: ny / len })
  }
  return pts
}

/** Extrudes profiles along Z. `side` −1 = left barrier (faces +X), +1 = right barrier (faces −X). */
function extrudeAlongZ(profiles: ProfilePoint[][], side: -1 | 1, xBase: number, zNear: number, zFar: number): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const zs = [zNear, zFar]
  for (const profile of profiles) {
    const base = positions.length / 3
    for (const z of zs) {
      for (const p of profile) {
        // Left barrier sits at −X and bulges toward +X; mirror for the right one.
        const x = side < 0 ? -xBase + p.x : xBase - p.x
        positions.push(x, p.y, z)
        normals.push(side < 0 ? p.nx : -p.nx, p.ny, 0)
        uvs.push(p.y, z)
      }
    }
    const n = profile.length
    for (let i = 0; i < n - 1; i++) {
      const a = base + i
      const b = base + i + 1
      const c = base + n + i
      const d = base + n + i + 1
      if (side < 0) indices.push(a, c, b, b, c, d)
      else indices.push(a, b, c, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

export interface BarrierGeometry {
  rails: THREE.BufferGeometry
  posts: THREE.BoxGeometry
  postMatrices: THREE.Matrix4[]
}

export function createBarrierGeometry(): BarrierGeometry {
  const h = 0.064
  const depth = 0.017
  const lower = wBeamProfile(0.052, h, depth)
  const upper = wBeamProfile(0.052 + h + 0.008, h, depth)
  const zNear = RACEWAY.zNear
  const zFar = RACEWAY.zFar
  const left = extrudeAlongZ([lower, upper], -1, BARRIER_X, zNear, zFar)
  const right = extrudeAlongZ([lower, upper], 1, BARRIER_X, zNear, zFar)
  const rails = mergeGeometries([left, right])
  left.dispose()
  right.dispose()

  const postHeight = RACEWAY.barrierHeight
  const posts = new THREE.BoxGeometry(0.02, postHeight, 0.016)
  posts.translate(0, postHeight / 2, 0)
  const postMatrices: THREE.Matrix4[] = []
  for (let z = zNear; z > zFar; z -= RACEWAY.barrierPostSpacing) {
    for (const side of [-1, 1] as const) {
      postMatrices.push(new THREE.Matrix4().makeTranslation(side * (BARRIER_X + 0.014), 0, z))
    }
  }
  return { rails, posts, postMatrices }
}

/** Minimal non-indexed-safe merge for geometries that share the same attribute layout. */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry()
  const names = Object.keys(geometries[0].attributes)
  const indices: number[] = []
  let offset = 0
  for (const g of geometries) {
    const count = g.attributes.position.count
    const index = g.getIndex()
    if (index) for (let i = 0; i < index.count; i++) indices.push(index.getX(i) + offset)
    else for (let i = 0; i < count; i++) indices.push(i + offset)
    offset += count
  }
  for (const name of names) {
    const itemSize = geometries[0].attributes[name].itemSize
    const total = geometries.reduce((n, g) => n + g.attributes[name].count * itemSize, 0)
    const array = new Float32Array(total)
    let cursor = 0
    for (const g of geometries) {
      const attr = g.attributes[name] as THREE.BufferAttribute
      array.set(attr.array as Float32Array, cursor)
      cursor += attr.array.length
    }
    merged.setAttribute(name, new THREE.BufferAttribute(array, itemSize))
  }
  merged.setIndex(indices)
  merged.computeBoundingSphere()
  merged.computeBoundingBox()
  return merged
}
