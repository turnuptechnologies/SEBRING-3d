"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import * as THREE from "three"

import type { CarBody, Livery, LiveryPattern, ProductView } from "@/lib/catalog/types"
import { buildCar } from "@/lib/three/cars"
import { disposeObject } from "@/lib/three/materials"
import { StudioStage } from "@/lib/three/studio/studio-stage"

import { LAB_LIVERIES } from "./presets"

declare global {
  interface Window {
    __RENDER_READY__?: boolean
    __CAR_STATS__?: CarStats
  }
}

interface CarStats {
  triangles: number
  vertices: number
  drawCalls: number
  meshes: number
  materials: number
  dimensions: unknown
}

const BODIES: CarBody[] = ["prototype", "gt", "classic", "muscle", "openwheel", "rally", "touring"]

function stats(root: THREE.Object3D): CarStats {
  let triangles = 0
  let vertices = 0
  let drawCalls = 0
  let meshes = 0
  const mats = new Set<string>()
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    meshes++
    const g = m.geometry
    vertices += g.getAttribute("position").count
    triangles += (g.getIndex()?.count ?? g.getAttribute("position").count) / 3
    const list = Array.isArray(m.material) ? m.material : [m.material]
    drawCalls += Array.isArray(m.material) ? new Set(g.groups.map((gr) => gr.materialIndex)).size : 1
    for (const mat of list) mats.add(mat.uuid)
  })
  return { triangles: Math.round(triangles), vertices, drawCalls, meshes, materials: mats.size, dimensions: root.userData.dimensions }
}

export function CarsLab() {
  const p = useSearchParams()
  const bodyParam = p.get("body") as CarBody | null
  const body: CarBody = bodyParam && BODIES.includes(bodyParam) ? bodyParam : "gt"
  const view = (p.get("view") ?? "hero") as ProductView
  const width = Number(p.get("w") ?? 1200)
  const height = Number(p.get("h") ?? 900)
  const bg = p.get("bg")
  const quality = p.get("q") === "rt" ? "realtime" : "high"
  const debug = p.get("debug") === "1"
  const az = p.get("az")
  const el = p.get("el")
  const fill = p.get("fill")
  const key = p.toString()

  const livery = useMemo<Livery>(() => {
    const q = new URLSearchParams(key)
    const l: Livery = { ...LAB_LIVERIES[body] }
    const pattern = q.get("pattern") as LiveryPattern | null
    if (pattern) l.pattern = pattern
    if (q.get("number")) l.number = Number(q.get("number"))
    const plate = q.get("plate")
    if (plate === "roundel" || plate === "square" || plate === "none") l.numberPlate = plate
    for (const k of ["base", "secondary", "accent"] as const) {
      const v = q.get(k)
      if (v) l[k] = `#${v}`
    }
    const glass = q.get("glass")
    if (glass === "dark" || glass === "smoke") l.glass = glass
    const rims = q.get("rims")
    if (rims === "silver" || rims === "gold" || rims === "black" || rims === "white" || rims === "bronze") l.rims = rims
    const lights = q.get("headlights")
    if (lights === "yellow" || lights === "white") l.headlights = lights
    return l
  }, [body, key])

  const object = useMemo(() => {
    const car = buildCar({ kind: "car", body, livery }, { quality, debug })
    if (az || el || fill) {
      const views = { ...(car.userData.views ?? {}) }
      views[view] = {
        ...(views[view] ?? {}),
        ...(az ? { azimuth: Number(az) } : {}),
        ...(el ? { elevation: Number(el) } : {}),
        ...(fill ? { fill: Number(fill) } : {}),
      }
      car.userData.views = views
    }
    return car
  }, [body, livery, quality, debug, view, az, el, fill])

  useEffect(() => {
    window.__CAR_STATS__ = stats(object)
    return () => disposeObject(object)
  }, [object])

  const onReady = useCallback(() => {
    window.__RENDER_READY__ = true
    document.body.dataset.renderReady = "1"
  }, [])

  return (
    <div id="render-root" style={{ width, height }}>
      <StudioStage object={object} view={view} width={width} height={height} onReady={onReady} background={bg ? `#${bg}` : null} />
    </div>
  )
}
