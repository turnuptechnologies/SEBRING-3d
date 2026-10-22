import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { segs, type BuildContext } from "./context"
import { FONT, drawText, makeCanvas } from "./kit/canvas"
import { bendAroundY, extrudeCentered, filletProfile, lathe, merge, roundedRectShape, slab, tube } from "./kit/geometry"
import * as M from "./kit/materials"
import { decalPlane, mesh, mm } from "./kit/parts"

/**
 * Trackside barriers at 1:32: double W-beam armco on posts, stacked tire wall,
 * and catch fence with chain-link mesh. Long runs are laid out on a gentle arc
 * so the section photographs with depth.
 */

/** Places geometry built along +Z (0 … L) onto an arc of radius R (left-turning). */
function arc(geo: THREE.BufferGeometry, R: number) {
  return bendAroundY(geo, R)
}

/* ===========================================================================
 * Guardrail
 * ========================================================================= */

function wBeamShape(height: number, depth: number, t: number) {
  const s = new THREE.Shape()
  const n = 28
  const xAt = (y: number) => depth * (0.5 - 0.5 * Math.cos((2 * Math.PI * y) / (height / 2)))
  s.moveTo(0, 0)
  for (let i = 0; i <= n; i++) {
    const y = (i / n) * height
    s.lineTo(xAt(y), y)
  }
  for (let i = n; i >= 0; i--) {
    const y = (i / n) * height
    s.lineTo(xAt(y) - t, y)
  }
  s.closePath()
  return s
}

function buildGuardrail(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const R = mm(520)
  const L = mm(440)
  const steps = segs(ctx, 90, 30)
  const railMat = M.galvanized(art.color, { repeat: 4 })
  const postMat = M.galvanized(art.color, { repeat: 6 })
  const baseMat = M.satin(art.secondary ?? "#2a2a34", { roughness: 0.55, repeat: 10 })
  const accent = art.accent ?? "#ff4b3a"

  const geos: Record<string, THREE.BufferGeometry[]> = { rail: [], post: [], base: [], bolt: [], reflector: [], white: [] }
  // Plastic base strip with a raised spine.
  const baseShape = new THREE.Shape()
  baseShape.moveTo(mm(-7), 0)
  baseShape.lineTo(mm(7), 0)
  baseShape.lineTo(mm(6.2), mm(2.2))
  baseShape.lineTo(mm(2.6), mm(3))
  baseShape.lineTo(mm(-2.6), mm(3))
  baseShape.lineTo(mm(-6.2), mm(2.2))
  baseShape.closePath()
  const base = extrudeCentered(baseShape, L, { bevel: mm(0.4), bevelSegments: 1, steps, curveSegments: 1 })
  base.translate(0, 0, L / 2)
  geos.base.push(base)

  // Two W-beams on the traffic side (+X), bolted to spacer blocks on posts.
  for (const y0 of [mm(9), mm(21)]) {
    const beam = extrudeCentered(wBeamShape(mm(11), mm(2.4), mm(0.55)), L - mm(4), { bevel: mm(0.15), bevelSegments: 1, steps, curveSegments: 1 })
    beam.translate(mm(4.6), y0, L / 2)
    geos.rail.push(beam)
  }
  const pitch = mm(55)
  const nPosts = Math.floor((L - mm(16)) / pitch) + 1
  const start = (L - (nPosts - 1) * pitch) / 2
  for (let i = 0; i < nPosts; i++) {
    const z = start + i * pitch
    const post = slab(mm(3.6), mm(34), mm(3.2), { radius: mm(0.4), bevel: mm(0.3) })
    post.translate(0, mm(2), z)
    geos.post.push(post)
    for (const y0 of [mm(9), mm(21)]) {
      const spacer = new THREE.BoxGeometry(mm(3.2), mm(7), mm(3))
      spacer.translate(mm(2.8), y0 + mm(5.5), z)
      geos.post.push(spacer)
      for (const dy of [3, 8]) {
        const bolt = new THREE.SphereGeometry(mm(0.75), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
        bolt.rotateZ(-Math.PI / 2)
        bolt.translate(mm(4.6) + mm(2.4) * (0.5 - 0.5 * Math.cos((2 * Math.PI * mm(dy)) / mm(5.5))) + mm(0.1), y0 + mm(dy), z)
        geos.bolt.push(bolt)
      }
    }
    if (i % 2 === 0) {
      const refl = new THREE.BoxGeometry(mm(0.6), mm(5), mm(3))
      refl.translate(mm(-2.1), mm(28), z)
      geos.reflector.push(refl)
    } else {
      const refl = new THREE.BoxGeometry(mm(0.6), mm(5), mm(3))
      refl.translate(mm(-2.1), mm(28), z)
      geos.white.push(refl)
    }
  }
  const mats: Record<string, THREE.Material> = {
    rail: railMat,
    post: postMat,
    base: baseMat,
    bolt: M.steel(0.3, "#b9bec4"),
    reflector: M.lens(accent, 0.25),
    white: M.lens("#f4f2ec", 0.1),
  }
  for (const [k, list] of Object.entries(geos)) {
    if (!list.length) continue
    const g = arc(merge(list), R)
    root.add(mesh(g, mats[k]))
  }
  root.rotation.y = Math.PI / 2 + 0.42
  root.userData.views = {
    hero: { azimuth: 36, elevation: 16, fill: 0.9 },
    detail: { azimuth: 72, elevation: 10, fill: 2.1, fov: 20 },
    alt: { azimuth: -30, elevation: 30, fill: 0.9 },
  }
  return root
}

/* ===========================================================================
 * Tire wall
 * ========================================================================= */

function tireGeometry(ctx: BuildContext) {
  const prof: [number, number][] = filletProfile(
    [
      [mm(5.1), mm(0.9)],
      [mm(6.6), 0],
      [mm(9.2), 0],
      [mm(10.1), mm(1.1)],
      [mm(10.3), mm(3.25)],
      [mm(10.1), mm(5.4)],
      [mm(9.2), mm(6.5)],
      [mm(6.6), mm(6.5)],
      [mm(5.1), mm(5.6)],
      [mm(4.8), mm(3.25)],
      [mm(5.1), mm(0.9)],
    ],
    mm(0.9),
    3
  )
  return lathe(prof, segs(ctx, 40), 0, Math.PI * 2)
}

function buildTireWall(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const tire = tireGeometry(ctx)
  const black = M.tireRubber(art.color, { repeat: 30 })
  const white = M.satin(art.secondary ?? "#f4f4f2", { roughness: 0.6, repeat: 30, surface: "rubber-sidewall", grain: 0.5 })
  const red = M.satin(art.accent ?? "#ff4b3a", { roughness: 0.6, repeat: 30, surface: "rubber-sidewall", grain: 0.5 })
  const R = mm(300)
  const pitch = mm(20.6)
  const cols = 8
  const rows = 2
  const high = 3
  const groups: Record<string, THREE.BufferGeometry[]> = { black: [], white: [], red: [] }
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols - row; c++) {
      const z = mm(10) + c * pitch + row * pitch * 0.5
      const x = row === 0 ? 0 : -mm(17.2)
      const painted = row === 0 ? (c % 2 ? "red" : "white") : "black"
      for (let k = 0; k < high; k++) {
        const g = tire.clone()
        g.rotateY(((c * 37 + k * 71 + row * 13) % 360) * (Math.PI / 180))
        g.translate(x, mm(3) + k * mm(6.55), z)
        const key = painted !== "black" && k === high - 1 ? painted : row === 0 && k === 0 && c % 3 === 0 ? "white" : "black"
        groups[key].push(g)
      }
    }
  }
  const mats: Record<string, THREE.Material> = { black, white, red }
  const length = mm(10) * 2 + (cols - 1) * pitch
  const steps = segs(ctx, 60, 24)
  const plinthShape = roundedRectShape(mm(48), mm(2.6), mm(0.8))
  const plinth = extrudeCentered(plinthShape, length + mm(10), { bevel: mm(0.4), bevelSegments: 1, steps, curveSegments: 2 })
  plinth.translate(-mm(8.6), mm(1.7), length / 2)
  root.add(mesh(arc(plinth, R), M.satin(art.color === "#151518" ? "#2a2a31" : "#232329", { roughness: 0.6, repeat: 10 })))
  for (const [key, list] of Object.entries(groups)) {
    if (!list.length) continue
    root.add(mesh(arc(merge(list), R), mats[key]))
  }
  // Retaining straps across the front row.
  const strapGeos: THREE.BufferGeometry[] = []
  for (const y of [mm(7.2), mm(16.4)]) {
    const s = new THREE.BoxGeometry(mm(0.8), mm(2.4), length - mm(8), 1, 1, steps)
    s.translate(mm(10.6), y, length / 2)
    strapGeos.push(s)
  }
  root.add(mesh(arc(merge(strapGeos), R), M.satin("#0f0f12", { roughness: 0.5, repeat: 30 })))
  root.rotation.y = Math.PI / 2 + 0.3
  root.userData.views = {
    hero: { azimuth: 34, elevation: 20, fill: 0.88 },
    detail: { azimuth: 64, elevation: 14, fill: 1.9, fov: 20 },
    alt: { azimuth: -36, elevation: 32, fill: 0.88 },
  }
  return root
}

/* ===========================================================================
 * Catch fence
 * ========================================================================= */

function buildFence(art: PartArt, ctx: BuildContext) {
  const root = new THREE.Group()
  const L = mm(300)
  const R = mm(560)
  const H = mm(92)
  const y0 = mm(9)
  const steps = segs(ctx, 70, 24)
  const wireMat = M.galvanized(art.color, { repeat: 40 })
  const postMat = M.galvanized(art.color, { repeat: 12 })
  const accent = art.accent ?? "#ffd23f"

  // Concrete plinth.
  const plinthShape = new THREE.Shape()
  plinthShape.moveTo(mm(-7), 0)
  plinthShape.lineTo(mm(7), 0)
  plinthShape.lineTo(mm(5.5), mm(8))
  plinthShape.lineTo(mm(-5.5), mm(8))
  plinthShape.closePath()
  const plinth = extrudeCentered(plinthShape, L + mm(12), { bevel: mm(0.6), bevelSegments: 2, steps, curveSegments: 1 })
  plinth.translate(0, 0, L / 2)
  root.add(mesh(arc(plinth, R), M.satin("#8e8f93", { roughness: 0.85, repeat: 14, surface: "grit", grain: 0.25 })))

  // Posts.
  const postGeos: THREE.BufferGeometry[] = []
  const nPosts = 5
  for (let i = 0; i < nPosts; i++) {
    const z = (i / (nPosts - 1)) * L
    const p = new THREE.CylinderGeometry(mm(1.7), mm(1.7), H + mm(4), 16)
    p.translate(0, mm(6) + (H + mm(4)) / 2, z)
    postGeos.push(p)
    const capG = new THREE.SphereGeometry(mm(2), 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    capG.translate(0, mm(10) + H, z)
    postGeos.push(capG)
    const foot = new THREE.BoxGeometry(mm(8), mm(1.2), mm(8))
    foot.translate(0, mm(8.6), z)
    postGeos.push(foot)
  }
  root.add(mesh(arc(merge(postGeos), R), postMat))

  // Chain-link: interlocking zigzag wires.
  const cell = mm(6)
  const wires: THREE.BufferGeometry[] = []
  const nWires = Math.round(L / cell)
  const zigs = Math.round((H - mm(4)) / (cell * 0.5))
  const wr = mm(0.32)
  for (let w = 0; w < nWires; w++) {
    const pts: THREE.Vector3[] = []
    for (let k = 0; k <= zigs; k++) {
      const z = w * cell + (k % 2 ? cell * 0.5 : 0)
      const weave = (k % 2 ? 1 : -1) * mm(0.35) * (w % 2 ? 1 : -1)
      pts.push(new THREE.Vector3(weave + mm(1.9), y0 + k * cell * 0.5, z + cell * 0.25))
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1)
    wires.push(tube(curve, wr, zigs * 4, 4))
  }
  const cables: THREE.BufferGeometry[] = []
  for (const y of [y0, y0 + (H - mm(4)) / 2, y0 + H - mm(4)]) {
    const c = new THREE.CylinderGeometry(mm(0.55), mm(0.55), L, 8, steps)
    c.rotateX(Math.PI / 2)
    c.translate(mm(1.9), y, L / 2)
    cables.push(c)
  }
  root.add(mesh(arc(merge([...wires, ...cables]), R), wireMat))

  // Fabric banner along the base of the fence.
  const bannerLen = L - mm(16)
  const bannerArt = makeCanvas(2400, 160)
  if (bannerArt) {
    const g = bannerArt.getContext("2d")!
    g.fillStyle = art.secondary ?? "#2a2a34"
    g.fillRect(0, 0, 2400, 160)
    for (let i = 0; i < 3; i++) {
      const x = 80 + i * 800
      drawText(g, "SECTOR 3", x, 108, { size: 82, font: FONT.display, weight: 800, italic: true, color: "#f3efe6", tracking: 2 })
      g.fillStyle = accent
      g.fillRect(x + 420, 58, 220, 14)
      drawText(g, "CATCH FENCE · FIA-STYLE", x + 420, 124, { size: 30, font: FONT.mono, weight: 500, color: "rgba(243,239,230,0.7)" })
    }
  }
  const banner = decalPlane(bannerArt, bannerLen, mm(14), { roughness: 0.75 })
  const bannerMat = banner.material as THREE.MeshPhysicalMaterial
  bannerMat.transparent = false
  bannerMat.depthWrite = true
  bannerMat.side = THREE.DoubleSide
  bannerMat.polygonOffset = false
  bannerMat.sheen = 0.6
  bannerMat.sheenRoughness = 0.6
  const bannerGeo = new THREE.PlaneGeometry(bannerLen, mm(14), steps, 1)
  bannerGeo.rotateY(Math.PI / 2)
  bannerGeo.translate(mm(2.6), mm(19), L / 2)
  root.add(mesh(arc(bannerGeo, R), bannerMat))

  root.rotation.y = Math.PI / 2 + 0.3
  root.userData.views = {
    hero: { azimuth: 32, elevation: 12, fill: 0.88 },
    detail: { azimuth: 70, elevation: 8, fill: 2, fov: 20 },
    alt: { azimuth: -30, elevation: 24, fill: 0.88 },
  }
  return root
}

export function buildBarrier(art: PartArt, ctx: BuildContext) {
  switch (art.variant) {
    case "tire-wall":
      return buildTireWall(art, ctx)
    case "fence":
      return buildFence(art, ctx)
    default:
      return buildGuardrail(art, ctx)
  }
}

