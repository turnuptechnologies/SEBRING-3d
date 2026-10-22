import * as THREE from "three"

/**
 * Night sky: near-black zenith, a cool haze band on the horizon that matches
 * the scene fog, a faint warm glow from the circuit lights at the end of the
 * straight, a low tree line silhouette and a few far-off floodlight towers.
 */

export interface SkyUniforms {
  uZenith: THREE.IUniform<THREE.Color>
  uHorizon: THREE.IUniform<THREE.Color>
  uGlow: THREE.IUniform<THREE.Color>
  uMoonGlow: THREE.IUniform<THREE.Color>
  uMoonDir: THREE.IUniform<THREE.Vector3>
}

export function createSkyUniforms(fog: THREE.Color): SkyUniforms {
  return {
    uZenith: { value: new THREE.Color(0.0009, 0.0011, 0.0018) },
    uHorizon: { value: fog.clone() },
    uGlow: { value: new THREE.Color(0.05, 0.026, 0.012) },
    uMoonGlow: { value: new THREE.Color(0.006, 0.009, 0.016) },
    uMoonDir: { value: new THREE.Vector3(-0.55, 0.42, -0.72).normalize() },
  }
}

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // pin to the far plane
}
`

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uMoonGlow;
uniform vec3 uMoonDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  vec3 col = mix( uHorizon, uZenith, smoothstep( 0.0, 0.32, h ) );
  // Glow of the circuit floodlights in the haze, down the straight (−Z).
  float toward = max( -d.z, 0.0 );
  col += uGlow * pow( toward, 18.0 ) * exp( -max( h, 0.0 ) * 14.0 ) * smoothstep( -0.04, 0.02, h );
  // Moonlit haze behind the far left.
  float moon = max( dot( d, uMoonDir ), 0.0 );
  col += uMoonGlow * pow( moon, 6.0 );
  gl_FragColor = vec4( col, 1.0 );
}
`

const TREE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
}
`

const TREE_FRAGMENT = /* glsl */ `
uniform vec3 uTreeColor;
uniform vec3 uHorizon;
varying vec2 vUv;
float tHash( float n ) { return fract( sin( n ) * 43758.5453 ); }
float tNoise( float x ) {
  float i = floor( x );
  float f = fract( x );
  return mix( tHash( i ), tHash( i + 1.0 ), f * f * ( 3.0 - 2.0 * f ) );
}
void main() {
  float a = vUv.x * 900.0;
  float crown = 0.34 + 0.22 * tNoise( a * 0.06 ) + 0.16 * tNoise( a * 0.21 ) + 0.07 * tNoise( a * 0.9 ) + 0.03 * tNoise( a * 3.1 );
  // Occasional gaps and tall poplars.
  crown *= 0.6 + 0.4 * smoothstep( 0.2, 0.5, tNoise( a * 0.013 + 4.0 ) );
  crown += 0.18 * smoothstep( 0.82, 0.97, tNoise( a * 0.37 + 9.0 ) );
  float aa = fwidth( vUv.y ) * 1.5;
  float tree = 1.0 - smoothstep( crown - aa, crown + aa, vUv.y );
  // Silhouettes melt into the haze toward the bottom.
  vec3 col = mix( uHorizon, uTreeColor, smoothstep( 0.0, 0.5, vUv.y ) * 0.9 );
  if ( tree < 0.01 ) discard;
  gl_FragColor = vec4( col, tree );
}
`

export interface SkyMeshes {
  dome: THREE.Mesh
  trees: THREE.Mesh
}

export function createSky(uniforms: SkyUniforms): SkyMeshes {
  const domeGeo = new THREE.SphereGeometry(400, 48, 24)
  const domeMat = new THREE.ShaderMaterial({
    name: "hero:sky",
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
  const dome = new THREE.Mesh(domeGeo, domeMat)
  dome.frustumCulled = false
  dome.renderOrder = -10

  // Tree line: an open cylinder band far beyond the end of the straight.
  const radius = 240
  const treeGeo = new THREE.CylinderGeometry(radius, radius, 26, 160, 1, true, Math.PI * 0.62, Math.PI * 0.76)
  treeGeo.translate(0, 26 / 2 - 2.5, 0)
  const treeMat = new THREE.ShaderMaterial({
    name: "hero:trees",
    vertexShader: TREE_VERTEX,
    fragmentShader: TREE_FRAGMENT,
    uniforms: { uTreeColor: { value: new THREE.Color(0.0016, 0.002, 0.003) }, uHorizon: uniforms.uHorizon },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
  })
  const trees = new THREE.Mesh(treeGeo, treeMat)
  trees.frustumCulled = false
  trees.renderOrder = -9
  return { dome, trees }
}

const GLOW_VERTEX = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aLook; // x size, y intensity, z hue (0 warm → 1 cool), w twinkle phase
uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4( aOffset, 1.0 );
  mv.xy += position.xy * aLook.x;
  vUv = position.xy;
  float tw = 0.85 + 0.15 * sin( uTime * ( 1.3 + aLook.w ) + aLook.w * 17.0 );
  vColor = mix( vec3( 1.0, 0.6, 0.3 ), vec3( 0.65, 0.78, 1.0 ), aLook.z ) * aLook.y * tw;
  gl_Position = projectionMatrix * mv;
}
`

const GLOW_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vColor;
void main() {
  float r2 = dot( vUv, vUv );
  float a = exp( -r2 * 70.0 ) * 1.6 + exp( -r2 * 7.0 ) * 0.18;
  a *= 1.0 - smoothstep( 0.6, 1.0, r2 );
  gl_FragColor = vec4( vColor * a, 1.0 );
}
`

/** Distant floodlight towers and pit lights scattered along the horizon (deterministic). */
export function createDistantLights(time: THREE.IUniform<number>): THREE.Mesh {
  const lights: Array<[number, number, number, number, number, number, number]> = []
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  // Two clusters of tower lights either side of the vanishing point.
  for (const [cx, count] of [
    [-62, 5],
    [70, 4],
    [-130, 3],
    [140, 3],
  ] as const) {
    for (let i = 0; i < count; i++) {
      lights.push([cx + (rand() - 0.5) * 22, 4 + rand() * 6, -190 - rand() * 40, 1.8 + rand() * 1.2, 0.5 + rand() * 0.7, rand() > 0.75 ? 0.55 : 0.08, rand() * 6])
    }
  }
  // A faint low string of pit lights far down the straight.
  for (let i = 0; i < 14; i++) {
    lights.push([-34 + i * 5.2 + (rand() - 0.5) * 2, 1.2 + rand() * 0.6, -205, 0.8, 0.3 + rand() * 0.35, 0.12, rand() * 6])
  }

  const geo = new THREE.InstancedBufferGeometry()
  const quad = new THREE.PlaneGeometry(2, 2)
  geo.index = quad.index
  geo.setAttribute("position", quad.getAttribute("position"))
  geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(lights.flatMap((l) => [l[0], l[1], l[2]])), 3))
  geo.setAttribute("aLook", new THREE.InstancedBufferAttribute(new Float32Array(lights.flatMap((l) => [l[3], l[4], l[5], l[6]])), 4))
  geo.instanceCount = lights.length
  const mat = new THREE.ShaderMaterial({
    name: "hero:distant-lights",
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: { uTime: time },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -8
  return mesh
}

const HAZE_VERTEX = /* glsl */ `
uniform vec2 uHazeSize;
varying vec2 vUv;
void main() {
  vec4 mv = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  mv.xy += position.xy * uHazeSize;
  vUv = position.xy;
  gl_Position = projectionMatrix * mv;
}
`

const HAZE_FRAGMENT = /* glsl */ `
uniform vec3 uHazeColor;
varying vec2 vUv;
void main() {
  vec2 q = vUv;
  float r2 = q.x * q.x + q.y * q.y * 2.2;
  float a = exp( -r2 * 2.8 ) * 0.75 + exp( -r2 * 9.0 ) * 0.35;
  a *= 1.0 - smoothstep( 0.7, 1.0, dot( q, q ) );
  gl_FragColor = vec4( uHazeColor * a, 1.0 );
}
`

/**
 * Lit haze at the end of the straight: the glow of a circuit you cannot see,
 * scattered in the fog. Drawn over everything (it *is* the fog in front).
 */
export function createHaze(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    name: "hero:haze",
    vertexShader: HAZE_VERTEX,
    fragmentShader: HAZE_FRAGMENT,
    uniforms: {
      uHazeSize: { value: new THREE.Vector2(42, 12) },
      uHazeColor: { value: new THREE.Color(0.03, 0.024, 0.02) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  mesh.position.set(0, 1.2, -150)
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  return mesh
}
