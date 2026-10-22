import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"
import type { BuildOptions } from "@/lib/three/build"

import { createContext, type BuildContext } from "./context"
import { buildBarrier } from "./barrier"
import { buildController } from "./controller"
import { buildElectronics } from "./electronics"
import { buildLapCounter } from "./lap-counter"
import { buildPowerSupply } from "./power-supply"
import { buildRaceSet } from "./race-set"
import { buildTool } from "./tool"
import { buildTrackCurve } from "./track-curve"
import { buildTrackStraight } from "./track-straight"

/**
 * Procedural trackside products — controllers, power, track, timing and
 * accessories — for product photography and the realtime hero.
 *
 * Contract: a Group resting on y = 0, centred on X/Z, posed for a 3/4 shot,
 * deterministic, 1 unit = 150 mm. Camera angles per view live in
 * `userData.views` (see framing.ts).
 */
type Builder = (art: PartArt, ctx: BuildContext) => THREE.Group

const BUILDERS: Partial<Record<PartArt["model"], Builder>> = {
  controller: buildController,
  "power-supply": buildPowerSupply,
  electronics: buildElectronics,
  "track-straight": buildTrackStraight,
  "track-curve": buildTrackCurve,
  "race-set": buildRaceSet,
  "lap-counter": buildLapCounter,
  barrier: buildBarrier,
  tool: buildTool,
}

export function buildTracksidePart(art: PartArt, opts: BuildOptions = {}): THREE.Group {
  const ctx = createContext(art, opts)
  const build = BUILDERS[art.model]
  const content = build ? build(art, ctx) : fallback(art)

  const root = new THREE.Group()
  root.name = `trackside:${art.model}${art.variant ? `:${art.variant}` : ""}`
  root.add(content)
  settle(root)
  root.userData = { ...content.userData, kind: "part", model: art.model, variant: art.variant ?? null }
  content.userData = {}
  return root
}

/** Rests the object on y = 0 and centres it on X/Z; flags shadow casters. */
function settle(root: THREE.Group) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const child = root.children[0]
  child.position.x -= center.x
  child.position.z -= center.z
  child.position.y -= box.min.y
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const overlay = mats.some((m) => m.transparent || m.blending === THREE.AdditiveBlending)
    mesh.castShadow = !overlay
    mesh.receiveShadow = !overlay
  })
}

function fallback(art: PartArt) {
  const g = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 48), new THREE.MeshStandardMaterial({ color: art.color }))
  mesh.position.y = 0.08
  g.add(mesh)
  return g
}
