import * as THREE from "three"

import { createBarrierGeometry } from "@/lib/three/track/barrier"
import { createFixtureUniforms, createMarkers, createMasts, type FixtureUniforms, type MarkerMeshes, type MastMeshes } from "@/lib/three/track/fixtures"
import { createLampUniforms, type LampUniforms, litByLamps } from "@/lib/three/track/lamp-light"
import { CURB_OUTER } from "@/lib/three/track/layout"
import { createMist, createMistUniforms, type MistUniforms } from "@/lib/three/track/mist"
import { applyShaderPatches } from "@/lib/three/track/shader-patch"
import { createDistantLights, createHaze, createSky, createSkyUniforms, type SkyUniforms } from "@/lib/three/track/sky"
import {
  createTrackSurfaceMaterial,
  createTrackSurfaceUniforms,
  createVergeMaterial,
  groundQuad,
  type TrackSurfaceUniforms,
} from "@/lib/three/track/surface"

/**
 * The complete night raceway set: track, verges, armco, floodlights with fog
 * halos and light cones, sky, tree line, distant lights and drifting mist.
 * Static geometry is built once; `dispose()` frees every GPU resource.
 */
export interface RacewayOptions {
  /** Mist mote count (0 disables). */
  mist?: number
  fogDensity?: number
  /** Show the floodlight masts themselves (their light is always there). */
  masts?: boolean
}

export interface Raceway {
  group: THREE.Group
  fog: THREE.FogExp2
  uniforms: {
    time: THREE.IUniform<number>
    lamps: LampUniforms
    surface: TrackSurfaceUniforms
    fixtures: FixtureUniforms
    sky: SkyUniforms
    mist: MistUniforms
  }
  parts: {
    track: THREE.Mesh
    verges: THREE.Mesh
    rails: THREE.Mesh
    posts: THREE.InstancedMesh
    masts: MastMeshes | null
    markers: MarkerMeshes
    mist: THREE.Points | null
    dome: THREE.Mesh
    trees: THREE.Mesh
    distant: THREE.Mesh
    haze: THREE.Mesh
  }
  /** Materials that take lamp lighting (for re-use by other objects in the set). */
  lit: THREE.Material[]
  dispose(): void
}

export const FOG_COLOR = new THREE.Color(0.0062, 0.0076, 0.0112)

export function createRaceway(options: RacewayOptions = {}): Raceway {
  const fogDensity = options.fogDensity ?? 0.045
  const time: THREE.IUniform<number> = { value: 0 }
  const lamps = createLampUniforms()
  const surface = createTrackSurfaceUniforms()
  const fixturesU = createFixtureUniforms()
  fixturesU.uFogDensity.value = fogDensity
  const fog = new THREE.FogExp2(FOG_COLOR.clone(), fogDensity)
  const skyU = createSkyUniforms(FOG_COLOR)
  const mistU = createMistUniforms(fixturesU.uFogDensity, time)

  const group = new THREE.Group()
  group.name = "raceway"

  const trackMat = createTrackSurfaceMaterial(lamps, surface)
  const track = new THREE.Mesh(groundQuad(-CURB_OUTER, CURB_OUTER), trackMat)
  track.receiveShadow = true
  track.name = "track"

  const vergeMat = createVergeMaterial(lamps)
  const vergeGeo = new THREE.BufferGeometry()
  {
    const l = groundQuad(-14, -CURB_OUTER)
    const r = groundQuad(CURB_OUTER, 14)
    const pos = new Float32Array([...(l.attributes.position.array as Float32Array), ...(r.attributes.position.array as Float32Array)])
    const nrm = new Float32Array([...(l.attributes.normal.array as Float32Array), ...(r.attributes.normal.array as Float32Array)])
    vergeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    vergeGeo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3))
    vergeGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
    vergeGeo.computeBoundingSphere()
    l.dispose()
    r.dispose()
  }
  const verges = new THREE.Mesh(vergeGeo, vergeMat)
  verges.receiveShadow = true
  verges.name = "verges"

  const railMat = applyShaderPatches(
    new THREE.MeshStandardMaterial({ color: "#8f959d", metalness: 0.92, roughness: 0.3, envMapIntensity: 1.2, name: "hero:armco" }),
    litByLamps(lamps)
  )
  const postMat = applyShaderPatches(
    new THREE.MeshStandardMaterial({ color: "#2c2f34", metalness: 0.7, roughness: 0.5, name: "hero:armco-post" }),
    litByLamps(lamps)
  )

  const barrier = createBarrierGeometry()
  const rails = new THREE.Mesh(barrier.rails, railMat)
  rails.name = "armco"
  const posts = new THREE.InstancedMesh(barrier.posts, postMat, barrier.postMatrices.length)
  barrier.postMatrices.forEach((m, i) => posts.setMatrixAt(i, m))
  posts.instanceMatrix.needsUpdate = true
  posts.computeBoundingSphere()
  posts.frustumCulled = false

  const fixtureMat = options.masts
    ? applyShaderPatches(new THREE.MeshStandardMaterial({ color: "#15171b", metalness: 0.55, roughness: 0.55, name: "hero:fixture" }), litByLamps(lamps))
    : null
  const masts = fixtureMat ? createMasts(fixturesU, fixtureMat) : null
  const markers = createMarkers(fixturesU)
  const { dome, trees } = createSky(skyU)
  const distant = createDistantLights(time)
  const haze = createHaze()
  const mist = options.mist ? createMist(mistU, options.mist) : null

  group.add(track, verges, rails, posts, dome, trees, distant, haze)
  group.add(markers.markers, markers.markerHalos)
  if (masts) group.add(masts.poles, masts.arms, masts.heads, masts.lenses, masts.halos, masts.cones)
  if (mist) group.add(mist)

  const lit: THREE.Material[] = [trackMat, vergeMat, railMat, postMat]
  if (fixtureMat) lit.push(fixtureMat)

  return {
    group,
    fog,
    uniforms: { time, lamps, surface, fixtures: fixturesU, sky: skyU, mist: mistU },
    parts: { track, verges, rails, posts, masts, markers, mist, dome, trees, distant, haze },
    lit,
    dispose() {
      group.removeFromParent()
      group.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh && !(o as THREE.Points).isPoints) return
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) m?.dispose()
        if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose()
      })
    },
  }
}
