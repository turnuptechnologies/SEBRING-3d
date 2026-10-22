import * as THREE from "three"

import type { PartArt } from "@/lib/catalog/types"

import { clamp, deg, dropToFloor, fillet, group, lathe, part, segs, TAU, type BuildCtx, type Built, type V2 } from "./kit"
import { canvasTex, FONT_SANS, hexToHsl, rubberCompound, shade } from "./surfaces"

export interface TireDims {
  D: number
  W: number
  /** Bore (inner) radius. */
  ri: number
  shoulder: number
}

export function tireDims(art: PartArt): TireDims {
  const p = art.params ?? {}
  const D = clamp(p.diameter ?? 20, 10, 40)
  const W = clamp(p.width ?? 10, 4, 22)
  const wall = clamp(p.hub ? (D - p.hub) / 2 : D * 0.1, 1.3, 4)
  return { D, W, ri: D / 2 - wall, shoulder: Math.min(1.15, wall * 0.55, W * 0.18) }
}

/** Closed rubber cross-section (r, y), y ∈ [-W/2, W/2], counter-clockwise. */
function tireProfile({ D, W, ri, shoulder }: TireDims): V2[] {
  const ro = D / 2
  const h = W / 2
  const rib = Math.min(1.1, W * 0.12)
  const pts: V2[] = [
    [ri, -h],
    [ro, -h],
    [ro, h],
    [ri, h],
    [ri, rib + 0.35],
    [ri - 0.22, rib],
    [ri - 0.22, -rib],
    [ri, -rib - 0.35],
  ]
  const out = fillet(pts, [0.28, shoulder, shoulder, 0.28, 0.15, 0.12, 0.12, 0.15], { closed: true, seg: 8 })
  out.push(out[0])
  return out
}

function sidewallTexture(key: string, label: string, ink: string, molded: boolean) {
  return canvasTex(`tire-wall:${key}`, 4096, 112, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = molded ? "#ffffff" : ink
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"
    const items = [label, "RACE COMPOUND", "·", "SOFT", "·", label, "TRUED", "·", "SLOT RACING", "·"]
    const sizes = [1, 0.72, 0.72, 0.72, 0.72, 1, 0.72, 0.72, 0.72, 0.72]
    const widths: number[] = []
    let total = 0
    for (let i = 0; i < items.length; i++) {
      ctx.font = `${i % 5 === 0 ? 800 : 600} ${Math.round(h * 0.62 * sizes[i])}px ${FONT_SANS}`
      const wv = ctx.measureText(items[i]).width + h * 0.9
      widths.push(wv)
      total += wv
    }
    const scale = w / total
    let x = 0
    for (let i = 0; i < items.length; i++) {
      ctx.save()
      ctx.translate(x + (widths[i] * scale) / 2, h * 0.53)
      ctx.scale(scale, 1)
      ctx.font = `${i % 5 === 0 ? 800 : 600} ${Math.round(h * 0.62 * sizes[i])}px ${FONT_SANS}`
      ctx.fillText(items[i], 0, 0)
      ctx.restore()
      x += widths[i] * scale
    }
  })
}

/** Annulus decal on the +Y sidewall with u = angle, v = radius (0 → 1). */
function sidewallDecal(r0: number, r1: number, y: number, seg: number) {
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * TAU
    for (const [k, r] of [r0, r1].entries()) {
      pos.push(Math.sin(a) * r, y, Math.cos(a) * r)
      nor.push(0, 1, 0)
      uv.push(1 - j / seg, k)
    }
  }
  for (let j = 0; j < seg; j++) {
    const a = j * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** One tire around +Y, centred at the origin. */
export function tireMesh(art: PartArt, dims: TireDims, seg: number, textRotation = 0): THREE.Group {
  const color = art.color || "#151518"
  const rubber = rubberCompound(color)
  const body = lathe(tireProfile(dims), { seg, crease: 40 })
  const meshes: THREE.Object3D[] = [part(body, rubber)]
  const label = `${dims.D % 1 === 0 ? dims.D : dims.D.toFixed(1)} × ${dims.W % 1 === 0 ? dims.W : dims.W.toFixed(1)}`
  const printedInk = art.accent ?? null
  const molded = !printedInk
  const tex = sidewallTexture(`${label}:${printedInk ?? "molded"}`, label, printedInk ?? "#ffffff", molded)
  if (tex) {
    const r0 = dims.ri + 0.42
    const r1 = dims.D / 2 - dims.shoulder - 0.02
    const l = hexToHsl(color).l
    for (const side of [1, -1]) {
      const decal = sidewallDecal(r0, r1, dims.W / 2 + 0.02, seg)
      const mat = new THREE.MeshPhysicalMaterial({
        color: molded ? shade(color, Math.min(0.42, l + 0.2), 0.6) : printedInk!,
        alphaMap: tex,
        transparent: true,
        depthWrite: false,
        roughness: molded ? 0.34 : 0.55,
        metalness: 0,
        sheen: molded ? 0.4 : 0,
        sheenColor: new THREE.Color("#5a5a60"),
        envMapIntensity: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
      })
      mat.name = "dt:tire-wall"
      const m = part(decal, mat, { cast: false, order: 2 })
      if (side < 0) m.rotation.x = Math.PI
      m.rotation.y = textRotation * side
      meshes.push(m)
    }
  }
  return group(meshes)
}

export function buildTire(art: PartArt, ctx: BuildCtx): Built {
  const dims = tireDims(art)
  const seg = segs(ctx, 192)
  // A pair stood on their treads: the back tire sits one width behind along the
  // axis and is shifted sideways, so it peeks out from behind the front one.
  const face = deg(34)
  const axis = new THREE.Vector3(Math.sin(face), 0, Math.cos(face))
  const across = new THREE.Vector3(Math.cos(face), 0, -Math.sin(face))
  const stand = (mesh: THREE.Object3D, yaw: number) => {
    const g = group([group([mesh], { r: [0, 0, Math.PI / 2] })])
    g.rotation.y = face + Math.PI / 2 + yaw
    return g
  }
  const a = stand(tireMesh(art, dims, seg, deg(-4)), 0)
  const b = stand(tireMesh(art, dims, seg, deg(64)), deg(-5))
  b.position.copy(axis.clone().multiplyScalar(-(dims.W + 1.6)).addScaledVector(across, dims.D * 0.56))
  const content = group([a, b])
  for (const c of content.children) dropToFloor(c)
  return {
    content,
    views: {
      hero: { azimuth: 30, elevation: 15, fill: 0.84, fov: 20 },
      detail: { azimuth: 22, elevation: 10, fill: 1.62, fov: 18 },
      alt: { azimuth: 104, elevation: 26, fill: 0.84, fov: 20 },
    },
  }
}
