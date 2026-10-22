import type * as THREE from "three"

import type { ProductArt } from "@/lib/catalog/types"
import { buildCar } from "@/lib/three/cars"
import { buildPart } from "@/lib/three/parts"

export type BuildQuality = "high" | "realtime"

export interface BuildOptions {
  /** "high" for offline product renders, "realtime" for the WebGL hero (fewer segments). */
  quality?: BuildQuality
}

/**
 * Builds a ready-to-render Object3D for any product art spec.
 * Conventions: Y up, resting on y = 0, centred on X/Z, facing +Z (nose toward +Z),
 * a 1:32 car is ~1.0 units long.
 */
export function buildProductObject(art: ProductArt, opts: BuildOptions = {}): THREE.Group {
  return art.kind === "car" ? buildCar(art, opts) : buildPart(art, opts)
}
