import * as THREE from "three"

import type { PartArt, PartModel } from "@/lib/catalog/types"
import type { BuildOptions } from "@/lib/three/build"

import { finalize, lathe, part, type BuildCtx, type Built } from "./kit"
import { buildCrownGear } from "./crown-gear"
import { buildMotor } from "./motor"
import { buildPinion } from "./pinion"
import { buildTire } from "./tire"
import { turnedAlu } from "./surfaces"

type Builder = (art: PartArt, ctx: BuildCtx) => Built

const BUILDERS: Partial<Record<PartModel, Builder>> = {
  motor: buildMotor,
  pinion: buildPinion,
  "crown-gear": buildCrownGear,
  tire: buildTire,
}

function fallback(art: PartArt): Built {
  const g = lathe(
    [
      [0, 0],
      [8, 0],
      [8, 6],
      [0, 6],
    ],
    { seg: 64 }
  )
  return { content: part(g, turnedAlu(), { name: `todo:${art.model}` }) }
}

/**
 * Procedural drivetrain parts for macro product photography: motors, pinions,
 * crown / spur gears, tires, hubs, axle kits, magnets, guides, chassis and
 * body shells. Modelled in millimetres, returned in world units
 * (1 unit = 150 mm), resting on y = 0 and centred on X/Z, with per-view camera
 * overrides in `userData.views`. Deterministic for a given art spec.
 */
export function buildDrivetrainPart(art: PartArt, opts: BuildOptions = {}): THREE.Group {
  const ctx: BuildCtx = { q: opts.quality === "realtime" ? 0.5 : 1 }
  const builder = BUILDERS[art.model]
  const { content, views } = builder ? builder(art, ctx) : fallback(art)
  return finalize(content, art.model, views ?? {}, { variant: art.variant ?? null })
}
