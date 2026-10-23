import * as THREE from "three"

import type { Livery } from "@/lib/catalog/types"
import { canvasTexture } from "@/lib/three/materials"

/**
 * Per-car material set. Instances are created per build (cheap — three.js
 * shares programs), so the hero scene can tweak one car's lamps without
 * touching another. All are disposed by `disposeObject`.
 */
export interface CarMaterials {
  paint: THREE.MeshPhysicalMaterial
  /** Wheel wells, underside, voids. */
  dark: THREE.MeshStandardMaterial
  /** Cockpit tray, dashboard. */
  interior: THREE.MeshStandardMaterial
  glass: THREE.MeshPhysicalMaterial
  /** Window rubber and black trim gloss. */
  seal: THREE.MeshPhysicalMaterial
  /** Satin black plastic (grilles, mirrors bases, pods). */
  trim: THREE.MeshStandardMaterial
  carbon: THREE.MeshPhysicalMaterial
  chrome: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  rim: THREE.MeshPhysicalMaterial
  rimAccent: THREE.MeshPhysicalMaterial
  disc: THREE.MeshStandardMaterial
  caliper: THREE.MeshPhysicalMaterial
  head: THREE.MeshStandardMaterial
  tail: THREE.MeshStandardMaterial
  lens: THREE.MeshPhysicalMaterial
  reflector: THREE.MeshStandardMaterial
  chassis: THREE.MeshStandardMaterial
  copper: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  helmet: THREE.MeshPhysicalMaterial
  suit: THREE.MeshStandardMaterial
  visor: THREE.MeshPhysicalMaterial
  exhaust: THREE.MeshStandardMaterial
  grille: THREE.MeshStandardMaterial
  accent: THREE.MeshPhysicalMaterial
  secondary: THREE.MeshPhysicalMaterial
  base: THREE.MeshPhysicalMaterial
}

const RIM: Record<NonNullable<Livery["rims"]>, { color: string; metalness: number; roughness: number; clearcoat: number }> = {
  silver: { color: "#cfd3d8", metalness: 1, roughness: 0.26, clearcoat: 0.3 },
  gold: { color: "#c9a04a", metalness: 1, roughness: 0.3, clearcoat: 0.4 },
  black: { color: "#141417", metalness: 0.35, roughness: 0.32, clearcoat: 0.8 },
  white: { color: "#ecebe6", metalness: 0, roughness: 0.32, clearcoat: 0.9 },
  bronze: { color: "#8a6a42", metalness: 1, roughness: 0.34, clearcoat: 0.4 },
}

export const HEADLIGHT_COLORS = { yellow: "#ffcf3a", white: "#f4f1e6" } as const
export const TAILLIGHT_COLOR = "#ff2a1a"

let carbonTex: THREE.CanvasTexture | null = null
function carbonWeave(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null
  if (carbonTex) return carbonTex
  const c = document.createElement("canvas")
  c.width = c.height = 64
  const g = c.getContext("2d")!
  g.fillStyle = "#16171a"
  g.fillRect(0, 0, 64, 64)
  // 2×2 twill
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const on = (x + y) % 4 < 2
      const grad = g.createLinearGradient(x * 8, y * 8, x * 8 + (on ? 8 : 0), y * 8 + (on ? 0 : 8))
      grad.addColorStop(0, on ? "#26282d" : "#1b1c20")
      grad.addColorStop(1, on ? "#1c1d21" : "#2a2c31")
      g.fillStyle = grad
      g.fillRect(x * 8, y * 8, 8, 8)
    }
  carbonTex = canvasTexture(c, { anisotropy: 4 })
  carbonTex.wrapS = carbonTex.wrapT = THREE.RepeatWrapping
  carbonTex.repeat.set(28, 28)
  return carbonTex
}

export function createCarMaterials(livery: Livery, opts: { realtime: boolean }): CarMaterials {
  const rim = RIM[livery.rims ?? "silver"]
  const head = HEADLIGHT_COLORS[livery.headlights ?? "white"]
  const smoke = livery.glass === "smoke"
  const weave = carbonWeave()
  const solid = (color: string, roughness = 0.34) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1 })

  const m: CarMaterials = {
    paint: new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.36,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      envMapIntensity: 1,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#060607", roughness: 0.92, metalness: 0, envMapIntensity: 0.15 }),
    interior: new THREE.MeshStandardMaterial({ color: "#121215", roughness: 0.8, metalness: 0, envMapIntensity: 0.3 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: smoke ? "#2a3038" : "#0b0d11",
      roughness: 0.03,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: smoke ? 0.58 : 0.8,
      envMapIntensity: 1.5,
      depthWrite: false,
    }),
    seal: new THREE.MeshPhysicalMaterial({ color: "#0b0b0d", roughness: 0.42, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    trim: new THREE.MeshStandardMaterial({ color: "#121215", roughness: 0.55, metalness: 0.05, envMapIntensity: 0.7 }),
    carbon: new THREE.MeshPhysicalMaterial({
      color: weave ? "#2c2d33" : "#141519",
      map: weave,
      roughness: 0.66,
      metalness: 0.05,
      clearcoat: 0.12,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.22,
    }),
    chrome: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.07, metalness: 1, envMapIntensity: 1.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.86, metalness: 0, envMapIntensity: 0.45 }),
    rim: new THREE.MeshPhysicalMaterial({
      color: rim.color,
      metalness: rim.metalness,
      roughness: rim.roughness,
      clearcoat: rim.clearcoat,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.2,
    }),
    rimAccent: new THREE.MeshPhysicalMaterial({ color: "#d9dce0", metalness: 1, roughness: 0.18, envMapIntensity: 1.3 }),
    disc: new THREE.MeshStandardMaterial({ color: "#7d8186", metalness: 1, roughness: 0.45, envMapIntensity: 0.9 }),
    caliper: solid("#c8102e", 0.3),
    head: new THREE.MeshStandardMaterial({ color: "#000000", emissive: head, emissiveIntensity: 1.6, roughness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: "#1a0503", emissive: TAILLIGHT_COLOR, emissiveIntensity: 1.1, roughness: 0.3 }),
    lens: new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
      depthWrite: false,
    }),
    reflector: new THREE.MeshStandardMaterial({ color: "#e8eaee", roughness: 0.12, metalness: 1, envMapIntensity: 1.2 }),
    chassis: new THREE.MeshStandardMaterial({ color: "#0f0f12", roughness: 0.62, metalness: 0, envMapIntensity: 0.5 }),
    copper: new THREE.MeshStandardMaterial({ color: "#c27a4a", roughness: 0.38, metalness: 1, envMapIntensity: 1.1 }),
    steel: new THREE.MeshStandardMaterial({ color: "#b4b8be", roughness: 0.24, metalness: 1, envMapIntensity: 1.1 }),
    helmet: solid(livery.accent, 0.25),
    suit: new THREE.MeshStandardMaterial({ color: livery.secondary, roughness: 0.75, metalness: 0, envMapIntensity: 0.6 }),
    visor: new THREE.MeshPhysicalMaterial({ color: "#0a0b0e", roughness: 0.05, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.5 }),
    exhaust: new THREE.MeshStandardMaterial({ color: "#8c8378", roughness: 0.35, metalness: 1, envMapIntensity: 1 }),
    grille: new THREE.MeshStandardMaterial({ color: "#0d0d10", roughness: 0.7, metalness: 0.1, envMapIntensity: 0.4 }),
    accent: solid(livery.accent),
    secondary: solid(livery.secondary),
    base: solid(livery.base),
  }
  for (const [k, v] of Object.entries(m)) (v as THREE.Material).name = `car:${k}`
  m.head.toneMapped = false
  m.tail.toneMapped = false
  if (opts.realtime) {
    m.glass.opacity = smoke ? 0.62 : 0.84
  }
  return m
}
