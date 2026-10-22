import * as THREE from "three"

import { luminance } from "./canvas"
import { surfaceColor, surfaceNormalUV, surfaceRoughnessUV, type Surface } from "./textures"

/**
 * Trackside material library — physically based plastics, metals, rubber, paper
 * and displays tuned for the Night Shift studio rig. Cached by parameters, so a
 * build that uses twenty identical knobs compiles one program.
 *
 * `repeat` scales the micro-surface maps: geometry from `kit/geometry` uses
 * world-unit UVs (1 UV = 1 unit = 150 mm), so repeat ≈ 1 / tile size in units.
 */

const cache = new Map<string, THREE.Material>()

function memo<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const m = make()
  m.name = `trackside:${key}`
  cache.set(key, m)
  return m
}

type Repeat = number | [number, number]
const rp = (r: Repeat | undefined, fallback = 4): [number, number] =>
  r === undefined ? [fallback, fallback] : typeof r === "number" ? [r, r] : r

const v2 = (s: number) => new THREE.Vector2(s, s)

function micro(surface: Surface, r: [number, number], rough?: [number, number]) {
  return {
    normalMap: surfaceNormalUV(surface, r[0], r[1]),
    roughnessMap: rough ? surfaceRoughnessUV(surface, rough[0], rough[1], r[0], r[1]) : null,
  }
}

/* ----------------------------------------------------------------- plastics */

export interface PlasticOptions {
  roughness?: number
  repeat?: Repeat
  /** Micro-texture depth (normal scale). */
  grain?: number
  clearcoat?: number
  surface?: Surface
}

/** Satin injection-moulded plastic with a spark-eroded grain. */
export function satin(color: string, o: PlasticOptions = {}) {
  const r = rp(o.repeat, 6)
  const surface = o.surface ?? "grain"
  return memo(`satin:${color}:${o.roughness}:${r}:${o.grain}:${o.clearcoat}:${surface}`, () => {
    const { normalMap, roughnessMap } = micro(surface, r, [0.78, 1])
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: o.roughness ?? 0.55,
      metalness: 0,
      normalMap,
      normalScale: v2(o.grain ?? 0.35),
      roughnessMap,
      clearcoat: o.clearcoat ?? 0,
      clearcoatRoughness: 0.35,
      specularIntensity: 0.7,
      envMapIntensity: 0.95,
    })
  })
}

/** High-gloss moulded plastic with a clear top layer. */
export function gloss(color: string, o: PlasticOptions = {}) {
  const r = rp(o.repeat, 6)
  return memo(`gloss:${color}:${o.roughness}:${o.clearcoat}:${r}`, () => {
    const { normalMap } = micro("fine-grain", r)
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: o.roughness ?? 0.24,
      metalness: 0,
      normalMap,
      normalScale: v2(o.grain ?? 0.05),
      clearcoat: o.clearcoat ?? 0.85,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.05,
    })
  })
}

/** Soft-touch rubber / TPE overmould. */
export function rubberSoft(color: string, o: { repeat?: Repeat; roughness?: number; grain?: number } = {}) {
  const r = rp(o.repeat, 8)
  return memo(`rubber:${color}:${r}:${o.roughness}:${o.grain}`, () => {
    const { normalMap, roughnessMap } = micro("stipple", r, [0.8, 1])
    const c = new THREE.Color(color)
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: o.roughness ?? 0.78,
      metalness: 0,
      normalMap,
      normalScale: v2(o.grain ?? 0.45),
      roughnessMap,
      sheen: 0.6,
      sheenRoughness: 0.55,
      sheenColor: c.clone().lerp(new THREE.Color("#8a8f99"), 0.55),
      specularIntensity: 0.5,
      envMapIntensity: 0.7,
    })
  })
}

/** Moulded tyre / tire-wall rubber, slightly glossy where worn. */
export function tireRubber(color = "#141416", o: { repeat?: Repeat } = {}) {
  const r = rp(o.repeat, 6)
  return memo(`tire:${color}:${r}`, () => {
    const { normalMap, roughnessMap } = micro("rubber-sidewall", r, [0.7, 1])
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.72,
      metalness: 0,
      normalMap,
      normalScale: v2(0.4),
      roughnessMap,
      sheen: 0.4,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#6d717a"),
      envMapIntensity: 0.75,
    })
  })
}

/** Silicone-jacketed wire — soft, slightly glossy, saturated. */
export function silicone(color: string) {
  return memo(`silicone:${color}`, () => {
    const c = new THREE.Color(color)
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.36,
      metalness: 0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.25,
      sheen: 0.5,
      sheenRoughness: 0.4,
      sheenColor: c.clone().lerp(new THREE.Color("#ffffff"), 0.35),
      envMapIntensity: 0.9,
    })
  })
}

/** PVC insulation boots (alligator clips, strain reliefs). */
export function pvc(color: string) {
  return memo(`pvc:${color}`, () =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      normalMap: surfaceNormalUV("fine-grain", 10, 10),
      normalScale: v2(0.15),
      envMapIntensity: 0.9,
    })
  )
}

/* ----------------------------------------------------------------- metals */

export interface MetalOptions {
  roughness?: number
  repeat?: Repeat
  /** Brush direction in UV space (radians). */
  rotation?: number
  /** Environment reflection strength. */
  env?: number
}

/** Brushed aluminium with anisotropic highlights along the grain. */
export function brushed(color = "#d5d9de", o: MetalOptions = {}) {
  const r = rp(o.repeat, 3)
  return memo(`brushed:${color}:${o.roughness}:${r}:${o.rotation}:${o.env}`, () => {
    const { normalMap, roughnessMap } = micro("brushed", r, [0.72, 1])
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: 1,
      roughness: o.roughness ?? 0.34,
      roughnessMap,
      normalMap,
      normalScale: v2(0.06),
      anisotropy: 0.7,
      anisotropyRotation: o.rotation ?? 0,
      envMapIntensity: o.env ?? 1.1,
    })
  })
}

/**
 * Bead-blasted / anodised aluminium. Dyed anodising is part dielectric (the dye
 * sits in a clear oxide), so coloured and dark finishes keep a diffuse base and
 * a sealed sheen instead of reading as tinted chrome.
 */
export function anodized(color: string, o: MetalOptions = {}) {
  const r = rp(o.repeat, 6)
  const lum = luminance(color)
  const hsl = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 })
  const dyed = hsl.s > 0.25
  return memo(`anod:${color}:${o.roughness}:${r}`, () => {
    const { normalMap, roughnessMap } = micro("blasted", r, [0.82, 1])
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: dyed ? 0.5 : lum < 0.04 ? 0.5 : 0.9,
      roughness: o.roughness ?? (dyed ? 0.3 : 0.36),
      roughnessMap,
      normalMap,
      normalScale: v2(0.12),
      clearcoat: dyed ? 0.45 : lum < 0.04 ? 0.25 : 0.08,
      clearcoatRoughness: 0.28,
      envMapIntensity: 1.1,
    })
  })
}

export const chrome = () =>
  memo("chrome", () => new THREE.MeshPhysicalMaterial({ color: "#f4f5f7", metalness: 1, roughness: 0.06, envMapIntensity: 1.35 }))

export const nickel = (roughness = 0.22) =>
  memo(`nickel:${roughness}`, () => new THREE.MeshPhysicalMaterial({ color: "#c5c8cc", metalness: 1, roughness, envMapIntensity: 1.2 }))

export const steel = (roughness = 0.3, color = "#aeb3ba") =>
  memo(`steel:${roughness}:${color}`, () => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.15 }))

export const gold = (roughness = 0.2) =>
  memo(`gold:${roughness}`, () => new THREE.MeshPhysicalMaterial({ color: "#e6b960", metalness: 1, roughness, envMapIntensity: 1.2 }))

export const brass = (roughness = 0.26) =>
  memo(`brass:${roughness}`, () => new THREE.MeshPhysicalMaterial({ color: "#d1a754", metalness: 1, roughness, envMapIntensity: 1.2 }))

export const copper = (roughness = 0.3) =>
  memo(`copper:${roughness}`, () => new THREE.MeshPhysicalMaterial({ color: "#d08a5c", metalness: 1, roughness, envMapIntensity: 1.2 }))

/** Hot-dip galvanised steel with crystalline spangle. */
export function galvanized(color = "#c3c8ce", o: { repeat?: Repeat } = {}) {
  const r = rp(o.repeat, 2)
  return memo(`galv:${color}:${r}`, () => {
    const base = new THREE.Color(color)
    const dark = `#${base.clone().multiplyScalar(0.72).getHexString()}`
    return new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: surfaceColor("spangle", dark, color, r[0]),
      metalness: 1,
      roughness: 0.5,
      roughnessMap: surfaceRoughnessUV("spangle", 0.55, 1, r[0], r[1]),
      normalMap: surfaceNormalUV("spangle", r[0], r[1]),
      normalScale: v2(0.25),
      envMapIntensity: 1.1,
    })
  })
}

/** Flat copper braid (pickup braid / routed-track power strips). */
export function copperBraid(o: { repeat?: Repeat; tarnish?: number } = {}) {
  const r = rp(o.repeat, 20)
  return memo(`braid:${r}:${o.tarnish}`, () => {
    const { normalMap, roughnessMap } = micro("braid", r, [0.55, 1])
    return new THREE.MeshPhysicalMaterial({
      color: o.tarnish ? "#b77345" : "#d48a58",
      metalness: 1,
      roughness: 0.42,
      roughnessMap,
      normalMap,
      normalScale: v2(0.9),
      envMapIntensity: 1.2,
    })
  })
}

/* ----------------------------------------------------------------- paper / wood / abrasives */

/** Printed, laminated board (retail boxes). */
export function print(map: THREE.Texture | null, o: { roughness?: number; clearcoat?: number; color?: string } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: map ? "#ffffff" : (o.color ?? "#222228"),
    map,
    roughness: o.roughness ?? 0.4,
    metalness: 0,
    clearcoat: o.clearcoat ?? 0.45,
    clearcoatRoughness: 0.18,
    normalMap: surfaceNormalUV("fiber", 6, 6),
    normalScale: v2(0.04),
    envMapIntensity: 0.85,
  })
}

/** Sprayed paint with orange-peel. */
export function paint(color: string, o: { roughness?: number; repeat?: Repeat; clearcoat?: number } = {}) {
  const r = rp(o.repeat, 3)
  return memo(`paint:${color}:${o.roughness}:${r}:${o.clearcoat}`, () => {
    const { normalMap, roughnessMap } = micro("orange-peel", r, [0.8, 1])
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: o.roughness ?? 0.5,
      metalness: 0,
      normalMap,
      normalScale: v2(0.12),
      roughnessMap,
      clearcoat: o.clearcoat ?? 0.2,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.9,
    })
  })
}

/** Raw, routed MDF. */
export function mdf(o: { repeat?: Repeat } = {}) {
  const r = rp(o.repeat, 6)
  return memo(`mdf:${r}`, () =>
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: surfaceColor("fiber", "#6d4f36", "#9a774f", r[0]),
      roughness: 0.92,
      metalness: 0,
      normalMap: surfaceNormalUV("fiber", r[0], r[1]),
      normalScale: v2(0.5),
      envMapIntensity: 0.5,
    })
  )
}

/** Sanding drum / sandpaper. */
export function grit(color = "#3a3530", o: { repeat?: Repeat } = {}) {
  const r = rp(o.repeat, 10)
  return memo(`grit:${color}:${r}`, () => {
    const base = new THREE.Color(color)
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: surfaceColor("grit", `#${base.clone().multiplyScalar(0.55).getHexString()}`, `#${base.clone().multiplyScalar(1.6).getHexString()}`, r[0], 1.4),
      roughness: 0.95,
      metalness: 0,
      normalMap: surfaceNormalUV("grit", r[0], r[1]),
      normalScale: v2(1.4),
      envMapIntensity: 0.4,
    })
  })
}

/* ----------------------------------------------------------------- track */

/** Moulded sport-track plastic: satin with a fine grain and a faint clear sheen. */
export function trackPlastic(color: string, o: { repeat?: Repeat } = {}) {
  const r = rp(o.repeat, 5)
  return memo(`trackplastic:${color}:${r}`, () => {
    const { normalMap, roughnessMap } = micro("grain", r, [0.72, 1])
    const c = new THREE.Color(color)
    const lo = `#${c.clone().multiplyScalar(0.82).getHexString()}`
    const hi = `#${c.clone().lerp(new THREE.Color("#ffffff"), 0.05).getHexString()}`
    return new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: surfaceColor("fine-grain", lo, hi, r[0] * 2.2, 1.6),
      roughness: 0.58,
      metalness: 0,
      normalMap,
      normalScale: v2(0.5),
      roughnessMap,
      clearcoat: 0.16,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.9,
    })
  })
}

/** Pad-printed ink (lane lines, labels on plastic). */
export const ink = (color: string, roughness = 0.5) =>
  memo(`ink:${color}:${roughness}`, () =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      envMapIntensity: 0.85,
    })
  )

/* ----------------------------------------------------------------- decals & light */

/** Transparent printed decal (white ink on metal / plastic). */
export function decal(map: THREE.Texture | null, o: { roughness?: number; metal?: boolean } = {}) {
  return new THREE.MeshPhysicalMaterial({
    map,
    transparent: true,
    roughness: o.roughness ?? 0.45,
    metalness: o.metal ? 0.6 : 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    envMapIntensity: 0.8,
  })
}

/** Self-lit display layer (LED, VFD, LCD). Not tone mapped, so readouts stay saturated. */
export function screen(map: THREE.Texture | null, intensity = 1.6) {
  const m = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(intensity, intensity, intensity) })
  m.toneMapped = false
  return m
}

/** Reflection-only glass layered over displays (additive, so it never dims the readout). */
export const coverGlass = () =>
  memo("coverglass", () => {
    const m = new THREE.MeshPhysicalMaterial({
      color: "#000000",
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      envMapIntensity: 1.4,
    })
    return m
  })

/** Glowing LED die / lamp. */
export const glow = (color: string, intensity = 3) =>
  memo(`glow:${color}:${intensity}`, () => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    m.toneMapped = false
    return m
  })

/** Coloured, glossy lens (unlit LEDs, binding post caps). */
export const lens = (color: string, emissiveIntensity = 0) =>
  memo(`lens:${color}:${emissiveIntensity}`, () =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: color,
      emissiveIntensity,
      envMapIntensity: 1.2,
    })
  )

/** Additive halo sprite material for light spill on the object itself. */
export function halo(map: THREE.Texture | null, color: string, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  m.toneMapped = false
  return m
}

/** Matte black void for openings, slots and holes. */
export const voidMat = () =>
  memo("void", () => new THREE.MeshStandardMaterial({ color: "#040405", roughness: 1, metalness: 0, envMapIntensity: 0.05 }))
