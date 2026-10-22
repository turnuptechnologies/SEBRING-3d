import type { PartArt } from "@/lib/catalog/types"

import type { BuildContext } from "./context"
import { buildTrackSection, type TrackVariant } from "./track"

/** Straight 2-lane section: params.length (mm), params.border (0 | 1). */
export function buildTrackStraight(art: PartArt, ctx: BuildContext) {
  const variant: TrackVariant = art.variant === "routed" ? "routed" : "sport"
  const group = buildTrackSection(
    {
      variant,
      length: art.params?.length,
      surface: art.color,
      marking: art.secondary ?? "#f3efe6",
      accent: art.accent ?? "#ff4b3a",
      border: Boolean(art.params?.border),
    },
    ctx
  )
  group.rotation.y = Math.PI / 2
  group.userData.views = {
    hero: { azimuth: 30, elevation: 30, fill: 0.9 },
    detail: { azimuth: 12, elevation: 13, fill: 2.6, fov: 18 },
    alt: { azimuth: -62, elevation: 38, fill: 0.9 },
  }
  return group
}
