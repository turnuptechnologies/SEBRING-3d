import type * as THREE from "three"

import type { PartArt, PartModel } from "@/lib/catalog/types"
import type { BuildOptions } from "@/lib/three/build"
import { buildDrivetrainPart } from "@/lib/three/parts/drivetrain"
import { buildTracksidePart } from "@/lib/three/parts/trackside"

/** Small mechanical parts that live inside a car. Everything else is trackside gear. */
const DRIVETRAIN_MODELS: ReadonlySet<PartModel> = new Set<PartModel>([
  "motor",
  "pinion",
  "crown-gear",
  "tire",
  "wheel",
  "axle-set",
  "magnet",
  "guide",
  "chassis",
  "body-shell",
])

/**
 * Builds a part for product photography.
 * Contract: Group resting on y = 0, centred on X/Z, posed for a 3/4 shot.
 * Optional `userData.views` overrides camera angles per view (see framing.ts).
 */
export function buildPart(art: PartArt, opts: BuildOptions = {}): THREE.Group {
  return DRIVETRAIN_MODELS.has(art.model) ? buildDrivetrainPart(art, opts) : buildTracksidePart(art, opts)
}
