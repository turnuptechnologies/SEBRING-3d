import type { PartArt } from "@/lib/catalog/types"

import { deg, dropToFloor, group, lathe, part, segs, type BuildCtx, type Built, type V2 } from "./kit"
import { brassMetal, polishedSteel } from "./surfaces"

/** Hardened axle with two flanged bronze bushings and spacers, laid out as a kit. */
export function buildAxleSet(art: PartArt, ctx: BuildCtx): Built {
  const seg = segs(ctx, 64)
  const len = art.params?.length ?? 60
  const r = (art.params?.diameter ?? 2.38) / 2
  const c = 0.25
  const axleProfile: V2[] = [[0, 0], [r - c, 0], [r, c], [r, len - c], [r - c, len], [0, len]]
  const axle = group([part(lathe(axleProfile, { seg }), polishedSteel(), { name: "axle" })], { r: [0, 0, Math.PI / 2] })
  axle.position.set(len / 2, r, 0)

  const bushing = () => {
    const bore = r + 0.05
    const prof: V2[] = [[bore, 0], [3.2, 0], [3.2, 0.9], [2.4, 0.9], [2.4, 4.2], [bore, 4.2]]
    return part(lathe([...prof, prof[0]], { seg }), brassMetal("bright"), { name: "bushing" })
  }
  const spacer = (w: number) => {
    const bore = r + 0.05
    const prof: V2[] = [[bore, 0], [2.2, 0], [2.2, w], [bore, w]]
    return part(lathe([...prof, prof[0]], { seg }), polishedSteel(), { name: "spacer" })
  }
  const items = [bushing(), bushing(), spacer(1), spacer(1), spacer(0.5), spacer(0.5)]
  const laid = items.map((m, i) => {
    const g = group([m], { r: [i < 2 ? deg(90) : 0, 0, 0] })
    g.position.set(10 + i * 8.5, 0, 9)
    return g
  })
  const content = group([axle, ...laid])
  for (const ch of content.children) dropToFloor(ch)
  return { content, views: { hero: { azimuth: 28, elevation: 32 }, detail: { azimuth: 20, elevation: 36, fill: 1.6 }, alt: { azimuth: -30, elevation: 40 } } }
}
