import * as THREE from "three"

import { BARRIER_X, lampHeadPosition, lampZ, RACEWAY } from "@/lib/three/track/layout"

/**
 * Floodlight masts (pole, cross-arm, aimed head with a glowing lens), their fog
 * halos and soft light cones, plus the volt-yellow LED markers that run along
 * the armco. Geometry is instanced; the light the masts cast on the set comes
 * from the virtual lamps in lamp-light.ts.
 */

export interface MastMeshes {
  poles: THREE.InstancedMesh
  arms: THREE.InstancedMesh
  heads: THREE.InstancedMesh
  lenses: THREE.InstancedMesh
  halos: THREE.Mesh
  cones: THREE.InstancedMesh
}

export interface MarkerMeshes {
  markers: THREE.InstancedMesh
  markerHalos: THREE.Mesh
}

export interface FixtureUniforms {
  uFogDensity: THREE.IUniform<number>
  uHaloColor: THREE.IUniform<THREE.Color>
  uConeColor: THREE.IUniform<THREE.Color>
  uMarkerColor: THREE.IUniform<THREE.Color>
}

export function createFixtureUniforms(): FixtureUniforms {
  return {
    uFogDensity: { value: 0.045 },
    uHaloColor: { value: new THREE.Color(1, 0.6, 0.3).multiplyScalar(1.5) },
    uConeColor: { value: new THREE.Color(1, 0.66, 0.38).multiplyScalar(0.035) },
    uMarkerColor: { value: new THREE.Color(1, 0.72, 0.16).multiplyScalar(1.4) },
  }
}

function lampSlots(): Array<{ k: number; side: -1 | 1 }> {
  const out: Array<{ k: number; side: -1 | 1 }> = []
  for (let k = 0; k < RACEWAY.lampCount; k++) for (const side of [-1, 1] as const) out.push({ k, side })
  return out
}

const HALO_VERTEX = /* glsl */ `
attribute vec3 aOffset;
attribute vec2 aSize;
varying vec2 vUv;
varying float vIntensity;
uniform float uFogDensity;
uniform float uGrow;
void main() {
  vec4 mv = modelViewMatrix * vec4( aOffset, 1.0 );
  float d = max( -mv.z, 0.0 );
  // Bright sources punch further through fog than surfaces do.
  float fd = uFogDensity * d;
  vIntensity = aSize.y * exp( -fd * fd * 0.42 );
  // Grow slightly with distance so far lamps stay points of light instead of sub-pixel flicker.
  float size = aSize.x * ( 1.0 + d * uGrow );
  mv.xy += position.xy * size;
  vUv = position.xy;
  gl_Position = projectionMatrix * mv;
}
`

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uHaloColor;
varying vec2 vUv;
varying float vIntensity;
void main() {
  float r2 = dot( vUv, vUv );
  float core = exp( -r2 * 120.0 ) * 2.0;
  float glow = exp( -r2 * 14.0 ) * 0.22 + exp( -r2 * 3.5 ) * 0.045;
  float a = ( core + glow ) * ( 1.0 - smoothstep( 0.6, 1.0, r2 ) );
  gl_FragColor = vec4( uHaloColor * a * vIntensity, 1.0 );
}
`

const CONE_VERTEX = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewV;
varying float vT;
varying float vFog;
uniform float uFogDensity;
void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4( position, 1.0 );
  vec4 mv = viewMatrix * world;
  vNormalV = normalize( mat3( viewMatrix ) * mat3( modelMatrix ) * mat3( instanceMatrix ) * normal );
  vViewV = -mv.xyz;
  vT = uv.y;
  float fd = uFogDensity * mv.z;
  vFog = exp( -fd * fd );
  gl_Position = projectionMatrix * mv;
}
`

const CONE_FRAGMENT = /* glsl */ `
uniform vec3 uConeColor;
varying vec3 vNormalV;
varying vec3 vViewV;
varying float vT;
varying float vFog;
void main() {
  float facing = abs( dot( normalize( vNormalV ), normalize( vViewV ) ) );
  float body = facing * facing * sqrt( facing );
  // MSAA evaluates edge pixels at the pixel centre, so varyings can overshoot [0, 1]: clamp before pow().
  float t = clamp( vT, 0.0, 1.0 );
  float fall = pow( t, 1.6 ) * smoothstep( 0.0, 0.22, t );
  gl_FragColor = vec4( uConeColor * body * fall * clamp( vFog, 0.0, 1.0 ), 1.0 );
}
`

function haloMesh(
  name: string,
  offsets: Float32Array,
  sizes: Float32Array,
  color: THREE.IUniform<THREE.Color>,
  fog: THREE.IUniform<number>,
  grow: number
) {
  const geo = new THREE.InstancedBufferGeometry()
  const quad = new THREE.PlaneGeometry(2, 2)
  geo.index = quad.index
  geo.setAttribute("position", quad.getAttribute("position"))
  geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3))
  geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 2))
  geo.instanceCount = offsets.length / 3
  const mat = new THREE.ShaderMaterial({
    name,
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    uniforms: { uFogDensity: fog, uHaloColor: color, uGrow: { value: grow } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 10
  return mesh
}

/** Floodlight masts that match the virtual lamps (optional: the hero keeps them out of frame). */
export function createMasts(uniforms: FixtureUniforms, metal: THREE.Material): MastMeshes {
  const slots = lampSlots()
  const n = slots.length
  const h = RACEWAY.lampHeight

  const poleGeo = new THREE.CylinderGeometry(0.011, 0.016, h, 8, 1)
  poleGeo.translate(0, h / 2, 0)
  const armGeo = new THREE.BoxGeometry(RACEWAY.lampOverhang + 0.02, 0.012, 0.016)
  // Floodlight head: a shallow box whose lens faces down-and-in.
  const headGeo = new THREE.BoxGeometry(0.15, 0.03, 0.2)
  const lensGeo = new THREE.PlaneGeometry(0.13, 0.17)
  lensGeo.rotateX(Math.PI / 2)

  const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.72, 0.45).multiplyScalar(9), toneMapped: false })
  lensMat.name = "hero:lamp-lens"

  const poles = new THREE.InstancedMesh(poleGeo, metal, n)
  const arms = new THREE.InstancedMesh(armGeo, metal, n)
  const heads = new THREE.InstancedMesh(headGeo, metal, n)
  const lenses = new THREE.InstancedMesh(lensGeo, lensMat, n)

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const one = new THREE.Vector3(1, 1, 1)
  const p = new THREE.Vector3()
  const e = new THREE.Euler()
  slots.forEach(({ k, side }, i) => {
    const z = lampZ(k, side)
    poles.setMatrixAt(i, m.makeTranslation(side * RACEWAY.lampX, 0, z))
    arms.setMatrixAt(i, m.makeTranslation(side * (RACEWAY.lampX - RACEWAY.lampOverhang / 2), h - 0.004, z))
    const [hx, hy, hz] = lampHeadPosition(k, side)
    // Heads tip toward the track like aimed floodlights.
    e.set(0, 0, -side * 0.55)
    q.setFromEuler(e)
    heads.setMatrixAt(i, m.compose(p.set(hx, hy + 0.016, hz), q, one))
    lenses.setMatrixAt(i, m.compose(p.set(hx, hy, hz), q, one))
  })
  for (const mesh of [poles, arms, heads, lenses]) {
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.frustumCulled = false
  }

  const offsets = new Float32Array(n * 3)
  const sizes = new Float32Array(n * 2)
  slots.forEach(({ k, side }, i) => {
    const [hx, hy, hz] = lampHeadPosition(k, side)
    offsets.set([hx - side * 0.015, hy - 0.025, hz], i * 3)
    const vary = 0.74 + 0.5 * fract(Math.sin((k * 1.73 + (side > 0 ? 13.1 : 0)) * 91.3458) * 47453.5453)
    sizes.set([0.36, vary], i * 2)
  })
  const halos = haloMesh("hero:lamp-halo", offsets, sizes, uniforms.uHaloColor, uniforms.uFogDensity, 0.03)

  // Volumetric cones from each head down to the track, tilted with the head.
  const coneGeo = new THREE.CylinderGeometry(0.05, 0.85, h * 1.04, 28, 1, true)
  coneGeo.translate(0, -h * 0.52, 0)
  const coneMat = new THREE.ShaderMaterial({
    name: "hero:lamp-cone",
    vertexShader: CONE_VERTEX,
    fragmentShader: CONE_FRAGMENT,
    uniforms: { uFogDensity: uniforms.uFogDensity, uConeColor: uniforms.uConeColor },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, n)
  slots.forEach(({ k, side }, i) => {
    const [hx, hy, hz] = lampHeadPosition(k, side)
    e.set(0, 0, -side * 0.72)
    q.setFromEuler(e)
    cones.setMatrixAt(i, m.compose(p.set(hx, hy, hz), q, one))
  })
  cones.instanceMatrix.needsUpdate = true
  cones.frustumCulled = false
  cones.renderOrder = 9

  return { poles, arms, heads, lenses, halos, cones }
}

/** Volt-yellow LEDs on top of the armco, every other post — the lines of light that run into the fog. */
export function createMarkers(uniforms: FixtureUniforms): MarkerMeshes {
  const m = new THREE.Matrix4()
  const markerZs: number[] = []
  for (let z = RACEWAY.zNear; z > RACEWAY.zFar; z -= RACEWAY.markerSpacing) markerZs.push(z)
  const markerGeo = new THREE.BoxGeometry(0.014, 0.008, 0.01)
  const markerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.2).multiplyScalar(6), toneMapped: false })
  markerMat.name = "hero:marker"
  const markers = new THREE.InstancedMesh(markerGeo, markerMat, markerZs.length * 2)
  const mOffsets = new Float32Array(markerZs.length * 2 * 3)
  const mSizes = new Float32Array(markerZs.length * 2 * 2)
  let j = 0
  for (const z of markerZs) {
    for (const side of [-1, 1] as const) {
      const x = side * (BARRIER_X + 0.004)
      const y = RACEWAY.barrierHeight + 0.006
      markers.setMatrixAt(j, m.makeTranslation(x, y, z))
      mOffsets.set([x - side * 0.012, y, z], j * 3)
      mSizes.set([0.05, 0.9 + 0.2 * fract(Math.sin(j * 12.9898) * 43758.5453)], j * 2)
      j++
    }
  }
  markers.instanceMatrix.needsUpdate = true
  markers.computeBoundingSphere()
  markers.frustumCulled = false
  const markerHalos = haloMesh("hero:marker-halo", mOffsets, mSizes, uniforms.uMarkerColor, uniforms.uFogDensity, 0.05)
  return { markers, markerHalos }
}

function fract(x: number) {
  return x - Math.floor(x)
}
