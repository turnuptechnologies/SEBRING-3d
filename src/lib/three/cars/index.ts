import type * as THREE from "three"

import type { CarArt, CarBody } from "@/lib/catalog/types"
import { disposeObject } from "@/lib/three/materials"

import { type CarBuildOptions, type CarDef, type CarDimensions, buildFromDef } from "./assemble"
import { gt } from "./bodies/gt"
import { prototype } from "./bodies/prototype"

export type { CarBuildOptions, CarDimensions } from "./assemble"

/**
 * Procedural 1:32 slot cars.
 *
 * Contract: Y up, wheels on y = 0, centred on X/Z, nose toward +Z, ≈ 1 unit
 * long (1 unit ≈ 150 mm). userData: { kind: "car", body, wheels (roll about
 * local X, +angle = forward), frontWheels (steer about Y, +angle = left),
 * headlights, taillights, dimensions, views }.
 */

const DEFS: Partial<Record<CarBody, CarDef>> = { gt, prototype }

function defFor(body: CarBody): CarDef {
  return DEFS[body] ?? gt
}

export function buildCar(art: CarArt, opts: CarBuildOptions = {}): THREE.Group {
  return buildFromDef(defFor(art.body), art, opts)
}

const dimensionCache = new Map<CarBody, CarDimensions>()

/** Scene-unit dimensions of a body (computed once from a realtime build, then cached). */
export function getCarDimensions(body: CarBody): CarDimensions {
  const hit = dimensionCache.get(body)
  if (hit) return hit
  const car = buildFromDef(
    defFor(body),
    {
      kind: "car",
      body,
      livery: { base: "#ffffff", secondary: "#000000", accent: "#888888", pattern: "solid", number: 0, numberPlate: "none" },
    },
    { quality: "realtime" }
  )
  const dims = { ...(car.userData.dimensions as CarDimensions) }
  disposeObject(car)
  dimensionCache.set(body, dims)
  return dims
}
