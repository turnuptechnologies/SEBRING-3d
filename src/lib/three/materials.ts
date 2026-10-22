import * as THREE from "three"

/**
 * Shared PBR material library for every generated asset (product renders and
 * the realtime hero). Materials are cached by key so repeated builds reuse GPU
 * programs. Units: 1 world unit ≈ one 1:32 car length.
 */

const cache = new Map<string, THREE.Material>()

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const m = make()
  m.name = key
  cache.set(key, m)
  return m
}

export interface PaintOptions {
  metallic?: number
  roughness?: number
  clearcoat?: number
  map?: THREE.Texture | null
}

/** Glossy race-car paint with clearcoat. Pass a livery canvas texture as `map`. */
export function carPaint(color: string, opts: PaintOptions = {}): THREE.MeshPhysicalMaterial {
  const { metallic = 0.35, roughness = 0.32, clearcoat = 1, map = null } = opts
  const make = () =>
    new THREE.MeshPhysicalMaterial({
      color: map ? "#ffffff" : color,
      map,
      metalness: metallic,
      roughness,
      clearcoat,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.15,
    })
  // Textured paints are unique per livery; don't cache them.
  return map ? make() : cached(`paint:${color}:${metallic}:${roughness}:${clearcoat}`, make)
}

export const rubber = (color = "#121214") =>
  cached(`rubber:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, envMapIntensity: 0.4 }))

export const chrome = () =>
  cached("chrome", () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.06, metalness: 1, envMapIntensity: 1.4 }))

export const aluminium = (roughness = 0.32) =>
  cached(`alu:${roughness}`, () => new THREE.MeshStandardMaterial({ color: "#d3d7dc", roughness, metalness: 1, envMapIntensity: 1.1 }))

export const anodized = (color: string) =>
  cached(`anod:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.85, envMapIntensity: 1.1 }))

export const brass = () =>
  cached("brass", () => new THREE.MeshStandardMaterial({ color: "#caa14a", roughness: 0.28, metalness: 1, envMapIntensity: 1.2 }))

export const copper = () =>
  cached("copper", () => new THREE.MeshStandardMaterial({ color: "#c97b4b", roughness: 0.34, metalness: 1, envMapIntensity: 1.2 }))

export const steel = () =>
  cached("steel", () => new THREE.MeshStandardMaterial({ color: "#a9adb3", roughness: 0.22, metalness: 1, envMapIntensity: 1.2 }))

export const plastic = (color: string, roughness = 0.5) =>
  cached(`plastic:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, envMapIntensity: 0.8 }))

export const glossPlastic = (color: string) =>
  cached(`gloss:${color}`, () =>
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1 })
  )

/** Tinted race glass — opaque but highly reflective (cheap, renders everywhere). */
export const glass = (tint: "dark" | "smoke" = "dark") =>
  cached(`glass:${tint}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: tint === "dark" ? "#07080b" : "#1b2026",
      roughness: 0.04,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
    })
  )

/** Clear lexan for body shells. Uses transmission — product renders only. */
export const lexan = () =>
  cached("lexan", () =>
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.06,
      metalness: 0,
      transmission: 0.92,
      thickness: 0.01,
      ior: 1.58,
      transparent: true,
      envMapIntensity: 1.2,
    })
  )

/** Self-lit material for headlights, taillights and LEDs. Not tone mapped so bloom catches it. */
export const emissive = (color: string, intensity = 3) =>
  cached(`emissive:${color}:${intensity}`, () => {
    const m = new THREE.MeshStandardMaterial({ color: "#000000", emissive: color, emissiveIntensity: intensity, roughness: 0.4 })
    m.toneMapped = false
    return m
  })

/** Matte black for undersides, voids and wheel wells — reads as ambient occlusion. */
export const voidBlack = () =>
  cached("void", () => new THREE.MeshStandardMaterial({ color: "#050506", roughness: 1, metalness: 0, envMapIntensity: 0.1 }))

/** Creates a CanvasTexture with sensible defaults for liveries and decals. */
export function canvasTexture(canvas: HTMLCanvasElement, opts: { anisotropy?: number } = {}): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = opts.anisotropy ?? 8
  tex.needsUpdate = true
  return tex
}

/** Marks every mesh in a group to cast and receive shadows. */
export function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = cast
      mesh.receiveShadow = receive
    }
  })
  return root
}

/** Frees geometries and uncached materials/textures of a generated object. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!m || cache.has(m.name)) continue
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  })
}
