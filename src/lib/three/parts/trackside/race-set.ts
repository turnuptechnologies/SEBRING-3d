import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"

import type { PartArt } from "@/lib/catalog/types"

import { type BuildContext } from "./context"
import { buildControllerVariant } from "./controller"
import { canvasToTexture } from "./kit/canvas"
import * as M from "./kit/materials"
import { mesh, mm } from "./kit/parts"
import { paintBoxCover, paintBoxSide, type BoxArtOptions } from "./race-set-art"
import { buildTrackSection } from "./track"

/**
 * Premium boxed race set: laminated board box with generated cover art standing
 * on its long edge, two track sections stacked in front and a controller
 * leaning on the box. params.props = 0 shows the box alone.
 */

const BOX = { w: 600, h: 400, d: 110 }

export function buildRaceSet(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const accent = art.secondary ?? "#ffd23f"
  const signal = art.accent ?? "#ff4b3a"
  const opts: BoxArtOptions = {
    title: "GRAND PRIX 12H SET",
    subtitle: "ENDURANCE NIGHT SERIES · 1:32 ANALOG RACING",
    scale: "1:32",
    base: art.color,
    accent,
    signal,
    features: ["2 CARS", "2 CONTROLLERS", "LAP COUNTER", "7.3 M CIRCUIT"],
  }

  const tex = (c: HTMLCanvasElement | null) => (c ? canvasToTexture(c, { anisotropy: 12 }) : null)
  const cover = tex(paintBoxCover(opts))
  const sideV = tex(paintBoxSide(opts, 330, 1200, true))
  const sideH = tex(paintBoxSide(opts, 1800, 330, false))
  const back = M.print(null, { color: "#101014" })
  const mats = [
    M.print(sideV, { roughness: 0.4 }),
    M.print(sideV, { roughness: 0.4 }),
    M.print(sideH, { roughness: 0.4 }),
    back,
    M.print(cover, { roughness: 0.36, clearcoat: 0.55 }),
    back,
  ]
  const box = new THREE.Mesh(new RoundedBoxGeometry(mm(BOX.w), mm(BOX.h), mm(BOX.d), 3, mm(2.2)), mats)
  box.position.y = mm(BOX.h / 2)
  const boxGroup = new THREE.Group()
  boxGroup.add(box)
  boxGroup.rotation.y = -0.08
  root.add(boxGroup)

  if ((art.params?.props ?? 1) > 0) {
    // Two straights stacked flat in front of the box, slightly fanned.
    for (let i = 0; i < 2; i++) {
      const t = buildTrackSection({ variant: "sport", length: 350, surface: "#2b2c31", marking: "#f3efe6", accent: signal }, ctx)
      t.rotation.y = Math.PI / 2 + (i ? 0.1 : -0.04)
      t.position.set(mm(-60 + i * 14), mm(i * 11.2), mm(150 + i * 4))
      root.add(t)
    }
    // Controller leaning on the right-hand end of the box.
    const ctrl = buildControllerVariant({ kind: "part", model: "controller", variant: "plunger", color: signal, secondary: "#18181d", accent: "#c9cdd3" }, ctx, {
      cable: false,
    })
    const lean = new THREE.Group()
    ctrl.rotation.x = -0.21
    lean.add(ctrl)
    lean.rotation.y = 0.3
    lean.position.set(mm(236), 0, mm(92))
    root.add(lean)
  }

  root.userData.views = {
    hero: { azimuth: 24, elevation: 10, fill: 0.88 },
    detail: { azimuth: 8, elevation: 6, fill: 1.9, fov: 20 },
    alt: { azimuth: -34, elevation: 18, fill: 0.88 },
  }
  return root
}
