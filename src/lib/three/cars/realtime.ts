import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import type { Atlas } from "./atlas"
import type { CarMaterials } from "./car-materials"

/**
 * Realtime pass: consolidates materials (solid paints become swatches in the
 * livery atlas, near-black plastics share one material, metals share one) and
 * merges every static mesh by material. Wheels stay separate so they can
 * spin/steer; head and tail lamps become one mesh each.
 */

type Target = { mat: THREE.Material; swatch?: string }

function aliasMap(m: CarMaterials): Map<THREE.Material, Target> {
  return new Map<THREE.Material, Target>([
    [m.trim, { mat: m.dark }],
    [m.seal, { mat: m.dark }],
    [m.chassis, { mat: m.dark }],
    [m.grille, { mat: m.dark }],
    [m.interior, { mat: m.dark }],
    [m.visor, { mat: m.glass }],
    [m.lens, { mat: m.glass }],
    [m.chrome, { mat: m.steel }],
    [m.exhaust, { mat: m.steel }],
    [m.reflector, { mat: m.steel }],
    [m.copper, { mat: m.steel }],
    [m.disc, { mat: m.rim }],
    [m.rimAccent, { mat: m.rim }],
    [m.base, { mat: m.paint, swatch: "sw:base" }],
    [m.secondary, { mat: m.paint, swatch: "sw:secondary" }],
    [m.accent, { mat: m.paint, swatch: "sw:accent" }],
    [m.helmet, { mat: m.paint, swatch: "sw:accent" }],
    [m.suit, { mat: m.paint, swatch: "sw:secondary" }],
    [m.caliper, { mat: m.paint, swatch: "sw:caliper" }],
  ])
}

function normalise(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name)
  const count = g.getAttribute("position").count
  if (!g.getAttribute("normal")) g.computeVertexNormals()
  if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2))
  if (!g.getIndex()) g.setIndex(Array.from({ length: count }, (_, i) => i))
  g.morphAttributes = {}
  return g
}

function setUv(g: THREE.BufferGeometry, uv: readonly [number, number]) {
  const a = g.getAttribute("uv") as THREE.BufferAttribute
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0], uv[1])
  a.needsUpdate = true
}

/** Splits a mesh into (geometry, material) pieces, baked by `matrix`. */
function pieces(mesh: THREE.Mesh, matrix: THREE.Matrix4, alias: Map<THREE.Material, Target>, atlas: Atlas) {
  const out: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material }> = []
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const src = mesh.geometry
  const groups = Array.isArray(mesh.material) && src.groups.length ? src.groups : [{ start: 0, count: src.getIndex()?.count ?? src.getAttribute("position").count, materialIndex: 0 }]
  for (const gr of groups) {
    const mat = mats[gr.materialIndex ?? 0]
    if (!mat) continue
    let g = src.clone()
    g.clearGroups()
    if (src.getIndex()) {
      const idx = src.getIndex()!.array
      g.setIndex(Array.from(idx.slice(gr.start, gr.start + gr.count)))
    } else if (groups.length > 1) {
      g = g.toNonIndexed()
    }
    g.applyMatrix4(matrix)
    if (matrix.determinant() < 0) {
      const ix = g.getIndex()
      if (ix) {
        const arr = ix.array as Uint32Array
        for (let i = 0; i < arr.length; i += 3) {
          const t = arr[i + 1]
          arr[i + 1] = arr[i + 2]
          arr[i + 2] = t
        }
      }
    }
    normalise(g)
    const t = alias.get(mat)
    if (t?.swatch && atlas.has(t.swatch)) setUv(g, atlas.get(t.swatch).centreUv())
    out.push({ geo: g, mat: t?.mat ?? mat })
  }
  return out
}

function mergeInto(parent: THREE.Object3D, list: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material }>, name: string) {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  for (const p of list) {
    const arr = buckets.get(p.mat) ?? []
    arr.push(p.geo)
    buckets.set(p.mat, arr)
  }
  const meshes: THREE.Mesh[] = []
  for (const [mat, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false)
    if (!merged) continue
    merged.computeBoundingSphere()
    const mesh = new THREE.Mesh(merged, mat)
    mesh.name = `${name}:${mat.name}`
    const transparent = (mat as THREE.MeshStandardMaterial).transparent || (mat as THREE.MeshStandardMaterial).emissiveIntensity > 0.5
    mesh.castShadow = !transparent
    mesh.receiveShadow = true
    parent.add(mesh)
    meshes.push(mesh)
  }
  for (const g of list.map((p) => p.geo)) if (![...buckets.values()].some((a) => a.length === 1 && a[0] === g)) g.dispose()
  return meshes
}

export function mergeForRealtime(car: THREE.Group, mats: CarMaterials, atlas: Atlas) {
  const alias = aliasMap(mats)
  car.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(car.matrixWorld).invert()
  const model = car.children[0]
  const ud = car.userData as { wheels: THREE.Object3D[]; frontWheels: THREE.Object3D[]; headlights: THREE.Mesh[]; taillights: THREE.Mesh[] }
  const spins = new Set(ud.wheels)
  const hubs = ud.wheels.map((w) => w.parent!).filter(Boolean)
  const hubSet = new Set(hubs)
  const lamps = new Set<THREE.Object3D>([...ud.headlights, ...ud.taillights])

  // statics
  const statics: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material }> = []
  const old: THREE.Mesh[] = []
  const walk = (o: THREE.Object3D) => {
    if (hubSet.has(o) || lamps.has(o)) return
    const m = o as THREE.Mesh
    if (m.isMesh) {
      statics.push(...pieces(m, new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), alias, atlas))
      old.push(m)
    }
    for (const c of o.children) walk(c)
  }
  walk(model)

  // lamps → one mesh per kind
  const lampMesh = (list: THREE.Mesh[], name: string) => {
    if (!list.length) return []
    const geos = list.map((m) => normalise(m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))))
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false)
    if (!merged) return []
    const mesh = new THREE.Mesh(merged, list[0].material)
    mesh.name = name
    mesh.castShadow = false
    for (const m of list) m.geometry.dispose()
    return [mesh]
  }
  const head = lampMesh(ud.headlights, "headlights")
  const tail = lampMesh(ud.taillights, "taillights")

  // wheels: re-parent hubs to the car, merge each wheel's parts by material
  for (const hub of hubs) {
    const local = new THREE.Matrix4().multiplyMatrices(inv, hub.matrixWorld)
    const spin = hub.children.find((c) => spins.has(c))!
    const spinInv = new THREE.Matrix4().copy(spin.matrixWorld).invert()
    const wheelParts: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material }> = []
    spin.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) wheelParts.push(...pieces(m, new THREE.Matrix4().multiplyMatrices(spinInv, m.matrixWorld), alias, atlas))
    })
    const hubInv = new THREE.Matrix4().copy(hub.matrixWorld).invert()
    const hubParts: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material }> = []
    for (const c of [...hub.children]) {
      const m = c as THREE.Mesh
      if (m.isMesh) {
        hubParts.push(...pieces(m, new THREE.Matrix4().multiplyMatrices(hubInv, m.matrixWorld), alias, atlas))
        m.geometry.dispose()
        hub.remove(m)
      }
    }
    for (const c of [...spin.children]) {
      c.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      spin.remove(c)
    }
    mergeInto(spin, wheelParts, "wheel")
    mergeInto(hub, hubParts, "upright")
    hub.parent?.remove(hub)
    local.decompose(hub.position, hub.quaternion, hub.scale)
    car.add(hub)
  }

  for (const m of old) m.geometry.dispose()
  car.remove(model)
  mergeInto(car, statics, "car")
  for (const m of [...head, ...tail]) car.add(m)
  ud.headlights = head
  ud.taillights = tail
}
