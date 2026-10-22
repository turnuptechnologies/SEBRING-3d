import * as THREE from "three"

import type { CarArt } from "@/lib/catalog/types"
import { createRaceway, laneX, MAX_BEAMS, type Raceway } from "@/lib/three/track"

import { type CarRig, createCarRig } from "./car-rig"
import { createNightEnvironment } from "./env"
import type { FocusState } from "./post"
import { acquireHeroTextures, type HeroTextures, releaseHeroTextures } from "./textures"
import { createTimeline, type RunSample, type Timeline } from "./timeline"

/**
 * Imperative owner of everything in the hero scene. React mounts it once per
 * renderer; each frame it advances the run timeline, poses the active car,
 * steers the headlight lights, and moves the camera (framing, handheld drift,
 * pointer parallax). Nothing here allocates per frame.
 */

export interface DirectorOptions {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Real-time car shadow from the moon (decided once; toggling would recompile). */
  shadows: boolean
  mist: number
  /** Shared focus state read by the depth-of-field pass. */
  focus?: FocusState
}

/** Lane the hero cars run in (0 = leftmost). Lane 1 runs just left of the lens. */
export const HERO_LANE = 1

const SPOT_INTENSITY = 4.2
const MOON_DIR = new THREE.Vector3(-0.42, 0.5, -0.76).normalize()

const tmpV = new THREE.Vector3()
const tmpV2 = new THREE.Vector3()
const tmpV3 = new THREE.Vector3()
const forward = new THREE.Vector3(0, 0, 1)

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export interface CameraBase {
  fov: number
  x: number
  y: number
  pitch: number
}

/** Lens and placement per aspect: wide 54° on desktop, a taller 72° frame on phones. */
export function cameraBase(aspect: number): CameraBase {
  const portrait = smoothstep(1.25, 0.6, aspect)
  const hfov = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(54, 38, portrait))
  let vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect)
  vfov = THREE.MathUtils.clamp(vfov, THREE.MathUtils.degToRad(22), THREE.MathUtils.degToRad(72))
  // Put the vanishing point slightly above centre (≈47% from the top; 46% on phones).
  const vpAbove = THREE.MathUtils.lerp(0.06, 0.08, portrait)
  return {
    fov: THREE.MathUtils.radToDeg(vfov),
    x: THREE.MathUtils.lerp(0.0, -0.1, portrait),
    y: THREE.MathUtils.lerp(0.265, 0.3, portrait),
    pitch: -Math.atan(vpAbove * Math.tan(vfov / 2)),
  }
}

export class HeroDirector {
  readonly root = new THREE.Group()
  readonly raceway: Raceway
  readonly timeline: Timeline
  onActiveCarChange?: (index: number) => void

  /** When set, the scene is frozen at this time (lab captures, poster, reduced motion). */
  fixedTime: number | null = null
  /** Disables handheld drift and parallax (poster / reduced motion). */
  steady = false

  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private textures: HeroTextures
  private env: THREE.WebGLRenderTarget
  private spots: THREE.SpotLight[] = []
  private moon: THREE.DirectionalLight
  private fill: THREE.PointLight
  private arts: CarArt[] = []
  private rigs = new Map<number, CarRig>()
  private pending = new Set<number>()
  private time = 0
  private lastRun = -1
  private lastIndex = -1
  private pointer = new THREE.Vector2()
  private pointerTarget = new THREE.Vector2()
  private lastAspect = 0
  private base: CameraBase = cameraBase(16 / 9)
  private disposed = false
  private idleHandle = 0
  private focus: FocusState | null

  constructor({ renderer, scene, camera, shadows, mist, focus }: DirectorOptions) {
    this.focus = focus ?? null
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.textures = acquireHeroTextures()
    this.timeline = createTimeline()
    this.raceway = createRaceway({ mist })
    this.root.name = "hero-director"
    this.root.add(this.raceway.group)

    this.env = createNightEnvironment(renderer)
    scene.environment = this.env.texture
    scene.environmentIntensity = 0.9
    // Explicit env maps keep the set's reflection strength independent of the paint's.
    for (const m of this.raceway.lit as THREE.MeshStandardMaterial[]) {
      m.envMap = this.env.texture
      m.needsUpdate = true
    }
    scene.fog = this.raceway.fog
    scene.background = new THREE.Color(0, 0, 0)

    // Moon: cool key from far down the straight on the left; casts the car's shadow toward us.
    this.moon = new THREE.DirectionalLight(new THREE.Color(0.6, 0.7, 1), 0.55)
    this.moon.castShadow = shadows
    if (shadows) {
      const s = this.moon.shadow
      s.mapSize.set(1024, 1024)
      s.camera.left = -1.3
      s.camera.right = 1.3
      s.camera.top = 1.3
      s.camera.bottom = -1.3
      s.camera.near = 1
      s.camera.far = 30
      s.bias = -0.0006
      s.normalBias = 0.01
      s.radius = 3
    }
    this.root.add(this.moon, this.moon.target)

    // Soft fill just behind the lens so the paint reads as the car arrives.
    this.fill = new THREE.PointLight(new THREE.Color(0.8, 0.86, 1), 0.65, 7, 2)
    this.root.add(this.fill)

    // Fixed pool of headlight spots (constant light count = no shader recompiles).
    for (let i = 0; i < MAX_BEAMS; i++) {
      const spot = new THREE.SpotLight(0xffffff, 0, 16, 0.66, 0.5, 2)
      spot.map = this.textures.beam
      spot.castShadow = false
      // The beam map is projected through the shadow camera; anything closer than its near
      // plane would get the raw, unmasked cone (a hard-edged hot patch under the nose).
      spot.shadow.camera.near = 0.01
      spot.shadow.camera.updateProjectionMatrix()
      spot.position.set(0, -50, -300)
      spot.target.position.set(0, -50, -296)
      this.root.add(spot, spot.target)
      this.spots.push(spot)
    }
  }

  setCars(arts: CarArt[]) {
    const same = arts.length === this.arts.length && arts.every((a, i) => JSON.stringify(a) === JSON.stringify(this.arts[i]))
    if (same) return
    for (const rig of this.rigs.values()) rig.dispose()
    this.rigs.clear()
    this.arts = arts
    this.lastRun = -1
    this.lastIndex = -1
    if (arts.length) this.ensureRig(0)
  }

  /** Builds car `i` now (blocking) if it does not exist yet. */
  private ensureRig(i: number): CarRig | null {
    if (!this.arts.length) return null
    const index = ((i % this.arts.length) + this.arts.length) % this.arts.length
    let rig = this.rigs.get(index)
    if (!rig) {
      rig = createCarRig(this.arts[index], this.raceway.uniforms.lamps, this.textures)
      rig.root.visible = false
      this.root.add(rig.root)
      this.rigs.set(index, rig)
    }
    return rig
  }

  /** Builds the next car during idle time and precompiles its shaders off the critical path. */
  private prebuild(i: number) {
    if (!this.arts.length) return
    const index = ((i % this.arts.length) + this.arts.length) % this.arts.length
    if (this.rigs.has(index) || this.pending.has(index)) return
    this.pending.add(index)
    const run = () => {
      this.pending.delete(index)
      if (this.disposed || this.rigs.has(index)) return
      const rig = this.ensureRig(index)
      if (rig && "compileAsync" in this.renderer) {
        this.renderer.compileAsync(rig.root, this.camera, this.scene).catch(() => {})
      }
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    this.idleHandle = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 1500 }) : window.setTimeout(run, 120)
  }

  /** Pointer in −1..1 (x right, y up). */
  setPointer(x: number, y: number) {
    this.pointerTarget.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1))
  }

  /** Lab diagnostics: hide named parts of the set ("car" hides every car). */
  debugHide(names: string[]) {
    const p = this.raceway.parts
    const map: Record<string, THREE.Object3D | null | undefined> = {
      track: p.track,
      verges: p.verges,
      rails: p.rails,
      posts: p.posts,
      poles: p.masts?.poles,
      arms: p.masts?.arms,
      heads: p.masts?.heads,
      lenses: p.masts?.lenses,
      halos: p.masts?.halos,
      cones: p.masts?.cones,
      markers: p.markers.markers,
      markerHalos: p.markers.markerHalos,
      sky: p.dome,
      trees: p.trees,
      distant: p.distant,
      haze: p.haze,
      mist: p.mist,
    }
    for (const n of names) {
      const o = map[n]
      if (o) o.visible = false
    }
    this.hideCars = names.includes("car")
    this.hideFlares = names.includes("flares")
  }
  private hideCars = false
  private hideFlares = false

  setTier(tier: number) {
    if (this.raceway.parts.masts) this.raceway.parts.masts.cones.visible = tier <= 1
    if (this.raceway.parts.mist) this.raceway.parts.mist.visible = tier <= 2
  }

  /** Current time on the run timeline (real seconds). */
  get now() {
    return this.fixedTime ?? this.time
  }

  /** Real time at which run `run` is in the deepest point of its slow-motion ramp. */
  heroTime(run = 0) {
    return run * this.timeline.period + this.timeline.heroU
  }

  update(dt: number) {
    if (this.fixedTime === null) this.time += Math.min(Math.max(dt, 0), 1 / 20)
    const step = this.fixedTime === null ? Math.min(Math.max(dt, 0), 1 / 20) : 0
    const s = this.timeline.sample(this.now)
    const n = this.arts.length
    const index = n ? s.run % n : -1

    if (s.run !== this.lastRun) {
      this.lastRun = s.run
      if (index !== this.lastIndex || n === 1) {
        this.lastIndex = index
        if (index >= 0) this.onActiveCarChange?.(index)
      }
      if (n > 1) this.prebuild(index + 1)
    }

    const rig = index >= 0 ? this.ensureRig(index) : null
    for (const [i, r] of this.rigs) r.root.visible = i === index && s.onTrack && !this.hideCars
    if (this.hideFlares) for (const r of this.rigs.values()) for (const f of [...r.glows, ...r.streaks]) f.visible = false

    this.updateCamera(s, step)
    if (rig && s.onTrack) this.poseCar(rig, s, step)
    else this.parkLights()
    this.pullFocus(rig && s.onTrack ? rig : null, s, step)
    this.raceway.uniforms.time.value = s.simTime
  }

  private poseCar(rig: CarRig, s: RunSample, step: number) {
    const x = laneX(HERO_LANE)
    const st = s.simTime
    const root = rig.root
    // A slot car tracks its slot, but the body still floats on its springs a little.
    root.position.set(x + 0.004 * Math.sin(st * 2.3), 0.0012 * Math.sin(st * 31) * Math.min(1, s.speed / 6), s.z)
    root.rotation.set(-0.006 * Math.sin(st * 1.7), 0.01 * Math.sin(st * 2.9) + 0.004 * Math.sin(st * 6.1), 0.004 * Math.sin(st * 4.3))
    root.updateMatrixWorld(true)

    // Wheels roll with the ground; capped so spokes never strobe backwards.
    rig.wheels.forEach((w, i) => {
      w.rotation.x += Math.min(s.speed / (rig.wheelRadii[i] || rig.wheelRadius), 26) * step
    })

    const cam = this.camera.position
    const density = this.raceway.fog.density
    const fwd = tmpV3.copy(forward).applyQuaternion(root.quaternion)
    rig.glows.forEach((glow, i) => {
      glow.getWorldPosition(tmpV)
      const d = tmpV.distanceTo(cam)
      tmpV2.copy(cam).sub(tmpV).normalize()
      const facing = Math.max(0, tmpV2.dot(fwd))
      const vis = Math.exp(-((density * d) ** 2) * 0.34)
      const beam = facing ** 3
      const size = 0.034 + 0.0058 * d
      glow.scale.set(size, size, 1)
      ;(glow.material as THREE.SpriteMaterial).color.copy(rig.headColor).multiplyScalar(1.7 * beam * vis)
      const streak = rig.streaks[i]
      streak.scale.set(0.42 + 0.045 * d, 0.0065 + 0.0008 * d, 1)
      ;(streak.material as THREE.SpriteMaterial).color.setRGB(0.46, 0.62, 1).multiplyScalar(1.1 * facing ** 8 * vis)
    })

    // One spot per headlight: two pools on the track and two glints in its sheen, like the real thing.
    this.spots.forEach((spot, i) => {
      const lamp = rig.headlights[Math.min(i, rig.headlights.length - 1)]
      const lx = x + (lamp ? lamp.x : 0)
      const ly = Math.max(0.06, lamp ? lamp.y : 0.08) + 0.02
      const lz = s.z + (lamp ? lamp.z - 0.12 : rig.length * 0.4)
      spot.color.copy(rig.headColor)
      spot.intensity = SPOT_INTENSITY / Math.max(1, Math.min(this.spots.length, rig.headlights.length))
      spot.position.set(lx, ly, lz)
      spot.target.position.set(lx + (lamp ? lamp.x * 0.6 : 0), 0, lz + 5)
      spot.target.updateMatrixWorld()
    })

    // Moon shadow camera rides with the car.
    this.moon.target.position.set(x, 0, s.z)
    this.moon.position.copy(this.moon.target.position).addScaledVector(MOON_DIR, 12)
    this.moon.target.updateMatrixWorld()

    const mist = this.raceway.uniforms.mist
    const beamVis = 0.32 * Math.exp(-((density * Math.abs(s.z)) ** 2) * 0.3)
    for (let i = 0; i < MAX_BEAMS; i++) {
      const spot = this.spots[i]
      if (spot) {
        mist.uBeamPos.value[i].copy(spot.position)
        mist.uBeamColor.value[i].copy(rig.headColor).multiplyScalar(beamVis)
      } else mist.uBeamColor.value[i].setRGB(0, 0, 0)
    }
  }

  /** A focus puller following the car: eases onto it, never snaps; rests mid-straight when empty. */
  private pullFocus(rig: CarRig | null, s: RunSample, step: number) {
    const f = this.focus
    if (!f) return
    const goal = tmpV.set(laneX(HERO_LANE), 0.1, rig ? Math.min(s.z + 0.2, -0.6) : -7)
    const k = step > 0 ? 1 - Math.exp(-step * 7) : 1
    f.point.lerp(goal, k)
    const d = Math.max(0.5, -f.point.z)
    f.range = THREE.MathUtils.clamp(d * 0.55, 1.1, 9)
    f.bokeh = THREE.MathUtils.clamp(2.6 - d * 0.04, 1.2, 2.6)
  }

  private parkLights() {
    for (const spot of this.spots) spot.intensity = 0
    for (const c of this.raceway.uniforms.mist.uBeamColor.value) c.setRGB(0, 0, 0)
  }

  private updateCamera(s: RunSample, step: number) {
    const cam = this.camera
    if (cam.aspect !== this.lastAspect) {
      this.lastAspect = cam.aspect
      this.base = cameraBase(cam.aspect)
      cam.fov = this.base.fov
      cam.near = 0.02
      cam.far = 900
      cam.updateProjectionMatrix()
    }
    const b = this.base
    const k = step > 0 ? 1 - Math.exp(-step * 2.4) : 1
    this.pointer.lerp(this.pointerTarget, this.steady ? 0 : k)

    let hx = 0
    let hy = 0
    let yaw = 0
    let pitch = 0
    let roll = 0
    if (!this.steady) {
      const t = s.simTime
      hx = 0.0042 * (Math.sin(t * 0.71) + 0.5 * Math.sin(t * 1.93 + 1.3))
      hy = 0.0028 * (Math.sin(t * 0.53 + 2.1) + 0.5 * Math.sin(t * 1.37))
      yaw = 0.0032 * Math.sin(t * 0.41 + 0.4) + 0.0014 * Math.sin(t * 1.1)
      pitch = 0.0022 * Math.sin(t * 0.37 + 1.7) + 0.0009 * Math.sin(t * 1.6)
      roll = 0.0045 * Math.sin(t * 0.29 + 0.9) + 0.0016 * Math.sin(t * 0.97)
      // Buffet as the car rips past the lens.
      const pass = s.onTrack ? Math.exp(-(((s.z - 0.2) / 0.9) ** 2)) * Math.min(1, s.speed / 20) : 0
      hy += pass * 0.0022 * Math.sin(t * 61)
      roll += pass * 0.004 * Math.sin(t * 47 + 1)
    }
    const px = this.pointer.x
    const py = this.pointer.y
    cam.position.set(b.x + hx + px * 0.07, b.y + hy + py * 0.03, 0)
    cam.rotation.set(b.pitch + pitch - py * 0.012, yaw - px * 0.018, roll, "YXZ")
    cam.updateMatrixWorld()

    this.fill.position.set(cam.position.x + 0.12, cam.position.y + 0.32, 0.55)
  }

  dispose() {
    this.disposed = true
    const w = window as Window & { cancelIdleCallback?: (h: number) => void }
    if (w.cancelIdleCallback) w.cancelIdleCallback(this.idleHandle)
    else window.clearTimeout(this.idleHandle)
    for (const rig of this.rigs.values()) rig.dispose()
    this.rigs.clear()
    this.raceway.dispose()
    this.moon.dispose()
    this.fill.dispose()
    for (const spot of this.spots) spot.dispose()
    this.root.removeFromParent()
    if (this.scene.environment === this.env.texture) this.scene.environment = null
    if (this.scene.fog === this.raceway.fog) this.scene.fog = null
    this.env.dispose()
    releaseHeroTextures()
  }
}
