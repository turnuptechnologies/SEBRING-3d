import * as THREE from "three"

import type { CarArt, CarBody, Livery, ProductView } from "@/lib/catalog/types"
import type { BuildOptions } from "@/lib/three/build"
import type { ViewAngle } from "@/lib/three/framing"
import { canvasTexture, enableShadows } from "@/lib/three/materials"

import { type Atlas, type RegionRequest, layoutAtlas } from "./atlas"
import { type CarMaterials, createCarMaterials } from "./car-materials"
import { buildChassis } from "./chassis"
import { type DriverSpec, buildDriver } from "./driver"
import { type LiveryPlan, LoftPainter, type LoftTarget, paintLivery } from "./livery"
import { type LoftData, loftGeometry, maxArc, sampleLoft } from "./loft"
import { range, uniqueSorted } from "./math"
import { mergeForRealtime } from "./realtime"
import { type SectionFeatures, type SectionLayout, insetHalf, scaleLayout, sectionFeatures } from "./section"
import { flipWinding } from "./shapes"
import { BODY, CABIN, type BodyShape, type CabinShape, archStations, bevelStations, bodyHalf, cabinHalf } from "./templates"
import { type WheelSpec, buildWheel } from "./wheels"

/** Material group ids shared by every loft. */
export const G = { paint: 0, dark: 1, interior: 2, glass: 3, seal: 4 } as const

export interface CarBuildOptions extends BuildOptions {
  /** Paints a UV debug grid over the livery. */
  debug?: boolean
}

export interface CarDimensions {
  length: number
  width: number
  height: number
  wheelbase: number
  trackFront: number
  trackRear: number
  wheelRadiusFront: number
  wheelRadiusRear: number
  /** Guide blade pivot, z in the car's frame (nose toward +Z). */
  guideZ: number
}

export interface AxleDef {
  z: number
  /** Tyre centre to tyre centre. */
  track: number
  wheel: WheelSpec
}

export interface WindowZones {
  /** Side glass z-ranges [rear, front]. */
  side: Array<[number, number]>
  windscreen: [number, number] | null
  rear: [number, number] | null
  /** Seal (rubber) width around each opening. */
  seal: number
  /** Windscreen wraps into the side glass (no A-pillar). */
  wrap?: boolean
}

export interface CabinDef {
  shape: CabinShape
  layout: SectionLayout
  windows: WindowZones
  /** Body top inside this footprint is painted as cockpit interior. */
  interior: { zRear: number; zFront: number; halfWidth: (z: number) => number; minY: number }
}

export interface CarDef {
  body: CarBody
  /** Overall length in scene units after scaling. */
  length: number
  front: AxleDef
  rear: AxleDef
  guideZ: number
  shape: BodyShape
  layout: SectionLayout
  cabin?: CabinDef | null
  driver: DriverSpec
  plan: LiveryPlan
  regions?: RegionRequest[]
  views?: Partial<Record<ProductView, Partial<ViewAngle>>>
  extraStations?: number[]
  /** Additional painted lofts (an open-wheeler's sidepod slab, pods …). */
  extraLofts?: Array<{ name: string; shape: BodyShape; layout: SectionLayout; dark?: boolean }>
  /** Underside height for the chassis plate. */
  chassisFloor?: number
  caliper?: string
  extras?: (ctx: CarCtx) => void
  /** Extra painting after the livery (grilles on caps, vents …). */
  paintExtras?: (ctx: CarCtx, kit: PaintKit) => void
}

export interface PaintKit {
  g: CanvasRenderingContext2D
  atlas: Atlas
  body: LoftPainter
  cabin: LoftPainter | null
  extras: Record<string, LoftPainter>
}

export interface CarCtx {
  def: CarDef
  livery: Livery
  hq: boolean
  mats: CarMaterials
  root: THREE.Group
  atlas: Atlas
  body: LoftTarget
  cabin: LoftTarget | null
  extras: Record<string, LoftTarget>
  bodyGeometry: THREE.BufferGeometry
  headlights: THREE.Mesh[]
  taillights: THREE.Mesh[]
  add(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], name?: string): THREE.Mesh
}

function capExtent(data: LoftData, j: number) {
  const N = data.halfCount
  let mx = 0.05
  let y0 = Infinity
  let y1 = -Infinity
  for (let k = 0; k < N; k++) {
    const o = (j * N + k) * 2
    mx = Math.max(mx, data.pts[o])
    y0 = Math.min(y0, data.pts[o + 1])
    y1 = Math.max(y1, data.pts[o + 1])
  }
  return { a0: -mx, a1: mx, b0: y0, b1: Math.max(y1, y0 + 0.05) }
}

function insetData(data: LoftData, d: number): LoftData {
  const N = data.halfCount
  const pts = data.pts.slice()
  const tmp = new Float64Array(N * 2)
  for (let j = 0; j < data.stations.length; j++) {
    tmp.set(pts.subarray(j * N * 2, (j + 1) * N * 2))
    insetHalf(tmp, N, d)
    pts.set(tmp, j * N * 2)
  }
  return { ...data, pts }
}

function cabinClassifier(w: WindowZones, f: SectionFeatures) {
  const kBelt0 = f.corner[CABIN.belt][0]
  const kBelt1 = f.corner[CABIN.belt][1]
  const kRoof0 = f.corner[CABIN.roof][0]
  const kRoof1 = f.corner[CABIN.roof][1]
  const inZone = (z: number, zone: readonly [number, number]) => z >= zone[0] && z <= zone[1]
  const nearEdge = (z: number, zone: readonly [number, number]) => z - zone[0] < w.seal || zone[1] - z < w.seal
  return (_j: number, k: number, z: number): number => {
    if (k < kBelt0) return G.paint
    const sideZone = w.side.find((zone) => inZone(z, zone))
    const wsWrap = w.wrap && w.windscreen && inZone(z, w.windscreen)
    if (k < kBelt1) return sideZone || wsWrap ? G.seal : G.paint
    if (k < kRoof0) {
      if (sideZone) return nearEdge(z, sideZone) || k === kRoof0 - 1 ? G.seal : G.glass
      if (wsWrap) return G.glass
      return G.paint
    }
    if (k < kRoof1) return wsWrap ? G.glass : G.paint
    if (w.windscreen && inZone(z, w.windscreen)) return nearEdge(z, w.windscreen) || (k === kRoof1 && !w.wrap) ? G.seal : G.glass
    if (w.rear && inZone(z, w.rear)) return nearEdge(z, w.rear) || k === kRoof1 ? G.seal : G.glass
    return G.paint
  }
}

export function buildFromDef(def: CarDef, art: CarArt, opts: CarBuildOptions = {}): THREE.Group {
  const realtime = opts.quality === "realtime"
  const hq = !realtime
  const livery = art.livery
  const mats = createCarMaterials(livery, { realtime })
  if (def.caliper) mats.caliper.color.set(def.caliper)
  const root = new THREE.Group()
  root.name = `car-model:${def.body}`

  /* --- body loft ------------------------------------------------------------ */
  const shape: BodyShape = def.shape
  const stationsFor = (sh: BodyShape, extra: number[]) => {
    const st: number[] = [...range(sh.zTail, sh.zNose, hq ? 0.016 : 0.075)]
    for (const a of sh.arches) st.push(...archStations(a, hq ? 30 : 10))
    st.push(...bevelStations(sh.zNose, sh.bevelNose, 1, hq ? 8 : 3), ...bevelStations(sh.zTail, sh.bevelTail, -1, hq ? 8 : 3))
    st.push(...extra)
    return uniqueSorted(
      st.filter((z) => z >= sh.zTail && z <= sh.zNose),
      hq ? 2e-4 : 6e-3
    )
  }
  const layout = hq ? def.layout : scaleLayout(def.layout, 0.42)
  const feats = sectionFeatures(layout)
  const extraSt = [...(def.extraStations ?? [])]
  if (def.cabin) extraSt.push(def.cabin.interior.zRear, def.cabin.interior.zFront)
  const bodyData = sampleLoft(stationsFor(shape, extraSt), feats.count, bodyHalf(shape, layout))
  const extraData = (def.extraLofts ?? []).map((e) => {
    const l = hq ? e.layout : scaleLayout(e.layout, 0.42)
    const f = sectionFeatures(l)
    return { def: e, features: f, data: sampleLoft(stationsFor(e.shape, []), f.count, bodyHalf(e.shape, l)) }
  })

  /* --- greenhouse loft -------------------------------------------------------- */
  let cabinData: LoftData | null = null
  let cabinFeats: SectionFeatures | null = null
  if (def.cabin) {
    const c = def.cabin
    const cl = hq ? c.layout : scaleLayout(c.layout, 0.45)
    cabinFeats = sectionFeatures(cl)
    const cs: number[] = [...range(c.shape.zRear, c.shape.zFront, hq ? 0.014 : 0.07)]
    const w = c.windows
    for (const e of [...w.side.flat(), ...(w.windscreen ?? []), ...(w.rear ?? [])]) cs.push(e, e - w.seal, e + w.seal)
    cabinData = sampleLoft(
      uniqueSorted(
        cs.filter((z) => z >= c.shape.zRear && z <= c.shape.zFront),
        hq ? 2e-4 : 5e-3
      ),
      cabinFeats.count,
      cabinHalf(c.shape, cl)
    )
  }

  /* --- atlas --------------------------------------------------------------- */
  const regions: RegionRequest[] = []
  const sB = maxArc(bodyData)
  regions.push({ name: "body", kind: "loft", a0: shape.zTail, a1: shape.zNose, b0: -sB, b1: sB })
  if (cabinData && def.cabin) {
    const sC = maxArc(cabinData)
    regions.push({ name: "cabin", kind: "loft", a0: def.cabin.shape.zRear, a1: def.cabin.shape.zFront, b0: -sC, b1: sC })
  }
  for (const e of extraData) {
    const sE = maxArc(e.data)
    regions.push({ name: e.def.name, kind: "loft", a0: e.def.shape.zTail, a1: e.def.shape.zNose, b0: -sE, b1: sE })
  }
  regions.push({ name: "capF", kind: "capF", ...capExtent(bodyData, bodyData.stations.length - 1) })
  regions.push({ name: "capR", kind: "capR", ...capExtent(bodyData, 0) })
  for (const n of ["base", "secondary", "accent", "black", "white", "caliper"])
    regions.push({ name: `sw:${n}`, kind: "plain", a0: 0, a1: 0.04, b0: 0, b1: 0.04 })
  regions.push(...(def.regions ?? []))
  const atlas = layoutAtlas(regions, hq ? 4096 : 1024)

  const loftMats = [mats.paint, mats.dark, mats.interior, mats.glass, mats.seal]

  const kDark = Math.round((feats.corner[BODY.lip][0] + feats.corner[BODY.lip][1]) / 2)
  const inter = def.cabin?.interior
  const bodyGeometry = loftGeometry(bodyData, {
    uv: atlas.get("body").uv,
    group: (_j, k, z, _s, _side, x, y) => {
      if (k < kDark) return G.dark
      if (inter && z > inter.zRear && z < inter.zFront && y > inter.minY && Math.abs(x) < inter.halfWidth(z)) return G.interior
      return G.paint
    },
    capFront: { group: G.paint, uv: atlas.get("capF").uv },
    capRear: { group: G.paint, uv: atlas.get("capR").uv },
  })
  const bodyMesh = new THREE.Mesh(bodyGeometry, loftMats)
  bodyMesh.name = "body"
  root.add(bodyMesh)

  const extraTargets: Record<string, LoftTarget> = {}
  for (const e of extraData) {
    const region = atlas.get(e.def.name)
    const kd = Math.round((e.features.corner[BODY.lip][0] + e.features.corner[BODY.lip][1]) / 2)
    const geo = loftGeometry(e.data, {
      uv: region.uv,
      group: (_j, k) => (e.def.dark || k < kd ? G.dark : G.paint),
      capFront: { group: e.def.dark ? G.dark : G.paint, uv: region.uv },
      capRear: { group: e.def.dark ? G.dark : G.paint, uv: region.uv },
    })
    const mesh = new THREE.Mesh(geo, loftMats)
    mesh.name = e.def.name
    root.add(mesh)
    extraTargets[e.def.name] = { region, data: e.data, features: e.features }
  }

  let cabinTarget: LoftTarget | null = null
  if (cabinData && cabinFeats && def.cabin) {
    const classify = cabinClassifier(def.cabin.windows, cabinFeats)
    const cabinGeo = loftGeometry(cabinData, {
      uv: atlas.get("cabin").uv,
      group: (j, k, z) => classify(j, k, z),
      capFront: { group: G.paint, uv: atlas.get("cabin").uv },
      capRear: { group: G.paint, uv: atlas.get("cabin").uv },
    })
    const cabinMesh = new THREE.Mesh(cabinGeo, loftMats)
    cabinMesh.name = "greenhouse"
    root.add(cabinMesh)
    // inner skin so the cockpit reads dark through the glass
    const shell = loftGeometry(insetData(cabinData, 0.012), {
      uv: () => [0, 0],
      group: (j, k, z) => (classify(j, k, z) === G.glass ? -1 : G.interior),
    })
    flipWinding(shell)
    const shellMesh = new THREE.Mesh(shell, loftMats)
    shellMesh.name = "greenhouse-inner"
    root.add(shellMesh)
    cabinTarget = { region: atlas.get("cabin"), data: cabinData, features: cabinFeats }
  }

  /* --- wheels, chassis, driver ------------------------------------------- */
  const wheels: THREE.Object3D[] = []
  const frontWheels: THREE.Object3D[] = []
  for (const [axle, front] of [
    [def.front, true],
    [def.rear, false],
  ] as const) {
    for (const side of [1, -1] as const) {
      const w = buildWheel(axle.wheel, mats, { hq, side, front })
      w.hub.position.set((side * axle.track) / 2, axle.wheel.radius, axle.z)
      root.add(w.hub)
      wheels.push(w.spin)
      if (front) frontWheels.push(w.hub)
    }
  }
  let floorBetween = Infinity
  for (let z = def.rear.z; z <= def.front.z; z += 0.05) floorBetween = Math.min(floorBetween, shape.floorY(z))
  root.add(
    buildChassis(
      {
        zFront: def.front.z,
        zRear: def.rear.z,
        trackFront: def.front.track,
        trackRear: def.rear.track,
        tireWidthFront: def.front.wheel.width,
        tireWidthRear: def.rear.wheel.width,
        radiusFront: def.front.wheel.radius,
        radiusRear: def.rear.wheel.radius,
        guideZ: def.guideZ,
        floorY: def.chassisFloor ?? floorBetween,
      },
      mats,
      hq
    )
  )
  root.add(buildDriver(def.driver, mats, hq))

  /* --- body-specific details ----------------------------------------------- */
  const headlights: THREE.Mesh[] = []
  const taillights: THREE.Mesh[] = []
  const bodyTarget: LoftTarget = { region: atlas.get("body"), data: bodyData, features: feats }
  const ctx: CarCtx = {
    def,
    livery,
    hq,
    mats,
    root,
    atlas,
    body: bodyTarget,
    cabin: cabinTarget,
    extras: extraTargets,
    bodyGeometry,
    headlights,
    taillights,
    add(geometry, material, name) {
      const m = new THREE.Mesh(geometry, material)
      if (name) m.name = name
      root.add(m)
      return m
    },
  }
  def.extras?.(ctx)

  /* --- livery ---------------------------------------------------------------- */
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = atlas.size
    const extraList = Object.values(extraTargets).filter((t) => !def.extraLofts?.find((e) => e.name === t.region.name)?.dark)
    paintLivery({ canvas, atlas, livery, plan: def.plan, body: bodyTarget, cabin: cabinTarget, extras: extraList, debug: opts.debug })
    const g = canvas.getContext("2d")!
    if (atlas.has("sw:caliper")) {
      const r = atlas.get("sw:caliper")
      g.fillStyle = "#" + mats.caliper.color.getHexString()
      g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4)
    }
    if (def.paintExtras) {
      const kit: PaintKit = {
        g,
        atlas,
        body: new LoftPainter(g, bodyTarget),
        cabin: cabinTarget ? new LoftPainter(g, cabinTarget) : null,
        extras: Object.fromEntries(Object.entries(extraTargets).map(([k, t]) => [k, new LoftPainter(g, t)])),
      }
      def.paintExtras(ctx, kit)
    }
    const tex = canvasTexture(canvas, { anisotropy: hq ? 16 : 8 })
    tex.flipY = false
    mats.paint.map = tex
    mats.paint.needsUpdate = true
  } else {
    mats.paint.color.set(livery.base)
  }

  /* --- scale to scene units, centre, finish ----------------------------------- */
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const k = def.length / (box.max.z - box.min.z)
  const cz = (box.min.z + box.max.z) / 2
  root.scale.setScalar(k)
  root.position.set(0, 0, -cz * k)
  const car = new THREE.Group()
  car.name = `car:${def.body}`
  car.add(root)
  const dimensions: CarDimensions = {
    length: def.length,
    width: (box.max.x - box.min.x) * k,
    height: box.max.y * k,
    wheelbase: (def.front.z - def.rear.z) * k,
    trackFront: def.front.track * k,
    trackRear: def.rear.track * k,
    wheelRadiusFront: def.front.wheel.radius * k,
    wheelRadiusRear: def.rear.wheel.radius * k,
    guideZ: (def.guideZ - cz) * k,
  }
  car.userData = {
    kind: "car",
    body: def.body,
    wheels,
    frontWheels,
    headlights,
    taillights,
    dimensions,
    views: def.views ?? {},
  }
  enableShadows(car)
  car.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = Array.isArray(m.material) ? null : m.material
    if (mat && (mat === mats.glass || mat === mats.lens || mat === mats.head || mat === mats.tail)) m.castShadow = false
  })
  if (realtime) mergeForRealtime(car, mats, atlas)
  return car
}
