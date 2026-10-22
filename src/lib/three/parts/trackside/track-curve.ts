import type { PartArt } from "@/lib/catalog/types"

import type { BuildContext } from "./context"
import { buildTrackSection, type TrackVariant } from "./track"

/** Curved 2-lane section: params.radius (centreline, mm), params.angle (deg), params.border (0 | 1). */
export function buildTrackCurve(art: PartArt, ctx: BuildContext) {
  const variant: TrackVariant = art.variant === "routed" ? "routed" : "sport"
  const angle = art.params?.angle ?? 45
  const group = buildTrackSection(
    {
      variant,
      radius: art.params?.radius ?? (variant === "routed" ? 420 : 370),
      angle,
      surface: art.color,
      marking: art.secondary ?? "#f3efe6",
      accent: art.accent ?? "#ff4b3a",
      border: Boolean(art.params?.border),
    },
    ctx
  )
  // Turn the arc so its chord runs across the frame and the bulge faces the camera.
  group.rotation.y = Math.PI / 2 + (angle * Math.PI) / 360
  group.userData.views = {
    hero: { azimuth: 24, elevation: 34, fill: 0.9 },
    detail: { azimuth: 8, elevation: 14, fill: 2.4, fov: 18 },
    alt: { azimuth: -58, elevation: 40, fill: 0.9 },
  }
  return group
}
