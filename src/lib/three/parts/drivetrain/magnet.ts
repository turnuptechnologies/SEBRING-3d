import type { PartArt } from "@/lib/catalog/types"

import { deg, dropToFloor, group, lathe, part, rbox, segs, type BuildCtx, type Built } from "./kit"
import { nickel } from "./surfaces"

/** A pair of nickel-plated neodymium traction magnets — bar (default) or disc. */
export function buildMagnet(art: PartArt, ctx: BuildCtx): Built {
  const disc = art.variant === "disc"
  const make = () => {
    if (disc) {
      const d = art.params?.diameter ?? 10
      const h = art.params?.height ?? 3
      const r = d / 2
      const c = 0.35
      return part(lathe([[0, 0], [r - c, 0], [r, c], [r, h - c], [r - c, h], [0, h]], { seg: segs(ctx, 96) }), nickel(), { name: "magnet" })
    }
    const l = art.params?.length ?? 18
    const w = art.params?.width ?? 6
    const h = art.params?.height ?? 3
    const m = part(rbox(l, h, w, 0.45, 4), nickel(), { name: "magnet" })
    m.position.y = h / 2
    return m
  }
  const a = group([make()], { r: [0, deg(18), 0] })
  const b = group([make()], { r: [disc ? deg(70) : 0, deg(-14), 0] })
  if (disc) {
    b.position.set(art.params?.diameter ?? 10, 0, 2)
  } else {
    // second bar leans on the first for a more photographic arrangement
    b.position.set(2, 0, (art.params?.width ?? 6) * 1.35)
  }
  const content = group([a, b])
  for (const c of content.children) dropToFloor(c)
  return { content, views: { hero: { elevation: 24 }, detail: { elevation: 30, fill: 1.5 }, alt: { azimuth: 120, elevation: 32 } } }
}
