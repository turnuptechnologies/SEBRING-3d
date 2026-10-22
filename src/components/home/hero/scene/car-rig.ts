import * as THREE from "three"

import type { CarArt } from "@/lib/catalog/types"
import { buildCar } from "@/lib/three/cars"
import { disposeObject } from "@/lib/three/materials"
import { type LampUniforms, litByLamps } from "@/lib/three/track/lamp-light"
import { applyShaderPatches, ownShaderHooks } from "@/lib/three/track/shader-patch"

import type { HeroTextures } from "./textures"

/**
 * Wraps a generated car for the hero: per-car material clones lit by the
 * trackside lamps, HDR headlights, lens glows and anamorphic streaks, and a
 * soft contact shadow. The rig root sits on the track at the car's centre.
 */
export interface CarRig {
  art: CarArt
  root: THREE.Group
  car: THREE.Group
  wheels: THREE.Object3D[]
  /** Rolling radius per entry of `wheels`. */
  wheelRadii: number[]
  wheelRadius: number
  length: number
  width: number
  height: number
  /** Headlight lens positions in rig space. */
  headlights: THREE.Vector3[]
  headColor: THREE.Color
  glows: THREE.Sprite[]
  streaks: THREE.Sprite[]
  shadow: THREE.Mesh
  /** Emissive materials of the headlight lenses (and their base intensity). */
  lensMaterials: Array<{ material: THREE.MeshStandardMaterial; base: number }>
  tailMaterials: Array<{ material: THREE.MeshStandardMaterial; base: number }>
  dispose(): void
}

interface MaybeDimensions {
  length?: number
  width?: number
  height?: number
  wheelRadiusFront?: number
  wheelRadiusRear?: number
}

/** Centres of the left (x < 0) and right lamp clusters of possibly merged lamp meshes, in car space. */
function lampCentres(meshes: THREE.Mesh[], car: THREE.Object3D): THREE.Vector3[] {
  const inv = new THREE.Matrix4().copy(car.matrixWorld).invert()
  const sides = [new THREE.Box3(), new THREE.Box3()]
  const v = new THREE.Vector3()
  const m = new THREE.Matrix4()
  for (const mesh of meshes) {
    const pos = mesh.geometry?.getAttribute("position")
    if (!pos) continue
    m.multiplyMatrices(inv, mesh.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m)
      sides[v.x < 0 ? 0 : 1].expandByPoint(v)
    }
  }
  return sides.filter((b) => !b.isEmpty()).map((b) => b.getCenter(new THREE.Vector3()))
}

const HEAD_YELLOW = new THREE.Color(1, 0.8, 0.46)
const HEAD_WHITE = new THREE.Color(0.9, 0.95, 1)

function isStandard(m: THREE.Material): m is THREE.MeshStandardMaterial {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true
}

export function createCarRig(art: CarArt, lamps: LampUniforms, textures: HeroTextures): CarRig {
  const car = buildCar(art, { quality: "realtime" })
  car.updateMatrixWorld(true)
  const ud = (car.userData ?? {}) as {
    wheels?: THREE.Object3D[]
    headlights?: THREE.Mesh[]
    taillights?: THREE.Mesh[]
    dimensions?: MaybeDimensions
  }

  const box = new THREE.Box3().setFromObject(car)
  const size = box.getSize(new THREE.Vector3())
  const dims = ud.dimensions ?? {}
  const length = dims.length ?? size.z
  const width = dims.width ?? size.x
  const height = dims.height ?? size.y

  const wheels = (ud.wheels ?? []).filter(Boolean)
  // Per-wheel rolling radius (fronts and rears can differ), measured from the wheel itself.
  const wheelRadii = wheels.map((w) => {
    const wb = new THREE.Box3().setFromObject(w)
    const r = wb.isEmpty() ? 0 : wb.getSize(new THREE.Vector3()).y / 2
    if (r > 0.01) return r
    const front = w.getWorldPosition(new THREE.Vector3()).z > 0
    return (front ? dims.wheelRadiusFront : dims.wheelRadiusRear) ?? 0.07
  })
  const wheelRadius = dims.wheelRadiusRear ?? (wheelRadii.length ? Math.max(...wheelRadii) : 0.07)

  // Clone every material once per car so the lamp patch never leaks into the shared cache.
  const clones = new Map<THREE.Material, THREE.Material>()
  const cloneOf = (m: THREE.Material) => {
    let c = clones.get(m)
    if (c) return c
    c = m.clone()
    if (isStandard(c) && !(c as THREE.Material & { transmission?: number }).transmission) {
      applyShaderPatches(c, litByLamps(lamps), ownShaderHooks(m))
    }
    clones.set(m, c)
    return c
  }
  car.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneOf) : cloneOf(mesh.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
  })

  const collectEmissive = (meshes: THREE.Mesh[] | undefined, boost: number) => {
    const out: Array<{ material: THREE.MeshStandardMaterial; base: number }> = []
    const seen = new Set<THREE.Material>()
    for (const mesh of meshes ?? []) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (!isStandard(m) || seen.has(m)) continue
        seen.add(m)
        m.toneMapped = false
        out.push({ material: m, base: Math.max(m.emissiveIntensity, 1) * boost })
      }
    }
    return out
  }
  const lensMaterials = collectEmissive(ud.headlights, 2.2)
  const tailMaterials = collectEmissive(ud.taillights, 1.6)

  // Lens positions: the realtime build merges all lamps into one mesh, so split it by side.
  const headlights = lampCentres(ud.headlights ?? [], car)
  if (headlights.length === 0) {
    const y = box.min.y + height * 0.42
    const z = box.max.z - 0.035
    headlights.push(new THREE.Vector3(-width * 0.3, y, z), new THREE.Vector3(width * 0.3, y, z))
  }

  const headColor = (art.livery.headlights === "yellow" ? HEAD_YELLOW : HEAD_WHITE).clone()

  const root = new THREE.Group()
  root.name = `hero-car:${art.body}`
  root.add(car)

  const glows: THREE.Sprite[] = []
  const streaks: THREE.Sprite[] = []
  for (const p of headlights) {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textures.glow,
        color: headColor.clone(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        toneMapped: false,
        fog: false,
      })
    )
    glow.position.copy(p).add(new THREE.Vector3(0, 0, 0.02))
    glow.renderOrder = 20
    const streak = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textures.streak,
        color: new THREE.Color(0.55, 0.7, 1),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        toneMapped: false,
        fog: false,
      })
    )
    streak.position.copy(glow.position)
    streak.renderOrder = 21
    root.add(glow, streak)
    glows.push(glow)
    streaks.push(streak)
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.34, length * 1.14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: "#000000",
      alphaMap: textures.shadow,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  )
  shadow.position.set((box.min.x + box.max.x) / 2, 0.0015, (box.min.z + box.max.z) / 2)
  shadow.renderOrder = 1
  root.add(shadow)

  return {
    art,
    root,
    car,
    wheels,
    wheelRadii,
    wheelRadius,
    length,
    width,
    height,
    headlights,
    headColor,
    glows,
    streaks,
    shadow,
    lensMaterials,
    tailMaterials,
    dispose() {
      root.removeFromParent()
      for (const s of [...glows, ...streaks]) s.material.dispose()
      shadow.geometry.dispose()
      ;(shadow.material as THREE.Material).dispose()
      for (const c of clones.values()) c.dispose()
      // Geometry and the generator's own textures; cached library materials are left alone.
      disposeObject(car)
    },
  }
}
