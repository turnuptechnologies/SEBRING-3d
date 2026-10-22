import * as THREE from "three"

import { RACEWAY } from "@/lib/three/track/layout"

/**
 * Drifting mist motes near the lens. They only show where light hits them —
 * under the floodlights and inside a car's headlight beams — which is what
 * sells the night air.
 */

export const MAX_BEAMS = 2

export interface MistUniforms {
  uTime: THREE.IUniform<number>
  uScale: THREE.IUniform<number>
  uFogDensity: THREE.IUniform<number>
  uBeamPos: THREE.IUniform<THREE.Vector3[]>
  uBeamColor: THREE.IUniform<THREE.Color[]>
  uLampTint: THREE.IUniform<THREE.Color>
}

export function createMistUniforms(fogDensity: THREE.IUniform<number>, time: THREE.IUniform<number>): MistUniforms {
  return {
    uTime: time,
    uScale: { value: 800 },
    uFogDensity: fogDensity,
    uBeamPos: { value: Array.from({ length: MAX_BEAMS }, () => new THREE.Vector3(0, -10, -200)) },
    uBeamColor: { value: Array.from({ length: MAX_BEAMS }, () => new THREE.Color(0, 0, 0)) },
    uLampTint: { value: new THREE.Color(1, 0.64, 0.36).multiplyScalar(0.55) },
  }
}

const VERTEX = /* glsl */ `
#define MAX_BEAMS ${MAX_BEAMS}
attribute vec4 aSeed;
uniform float uTime;
uniform float uScale;
uniform float uFogDensity;
uniform vec3 uBeamPos[ MAX_BEAMS ];
uniform vec3 uBeamColor[ MAX_BEAMS ];
uniform vec3 uLampTint;
uniform vec4 uBox; // x minY, y maxY, z minZ, w maxZ
uniform vec4 uLamp; // x z0, y spacing, z head |x|, w head y
varying vec3 vColor;
void main() {
  vec3 p = position;
  float t = uTime;
  p.x += sin( t * 0.19 * aSeed.y + aSeed.x * 6.283 ) * 0.07;
  p.y += sin( t * 0.13 * aSeed.y + aSeed.x * 3.7 ) * 0.035 + t * 0.006 * aSeed.y;
  p.z += t * 0.045 * aSeed.y;
  p.y = uBox.x + mod( p.y - uBox.x, uBox.y - uBox.x );
  p.z = uBox.z + mod( p.z - uBox.z, uBox.w - uBox.z );

  float kl = floor( ( uLamp.x - p.z ) / uLamp.y + 0.5 );
  float zr = uLamp.x - 0.5 * uLamp.y;
  float kr = floor( ( zr - p.z ) / uLamp.y + 0.5 );
  float dl = min( distance( p, vec3( -uLamp.z, uLamp.w, uLamp.x - kl * uLamp.y ) ), distance( p, vec3( uLamp.z, uLamp.w, zr - kr * uLamp.y ) ) );
  vec3 light = uLampTint / ( 1.0 + dl * dl * 2.4 );

  for ( int i = 0; i < MAX_BEAMS; i ++ ) {
    vec3 rel = p - uBeamPos[ i ];
    float along = rel.z;
    float spread = 0.08 + along * 0.42;
    float lateral = length( vec2( rel.x, ( rel.y + along * 0.08 ) * 1.6 ) );
    float inBeam = step( 0.0, along ) * smoothstep( spread, spread * 0.35, lateral );
    light += uBeamColor[ i ] * inBeam * exp( -along * 0.45 ) * 2.6;
    // Halo right around the lamps themselves.
    light += uBeamColor[ i ] * 0.6 / ( 1.0 + dot( rel, rel ) * 40.0 );
  }

  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  float d = -mv.z;
  float fd = uFogDensity * d;
  float fog = exp( -fd * fd );
  // Fade out motes that sit right on the lens.
  float near = smoothstep( 0.12, 0.45, d );
  vColor = light * aSeed.w * fog * near;
  gl_PointSize = clamp( aSeed.z * uScale / max( d, 0.05 ), 1.0, 26.0 );
  gl_Position = projectionMatrix * mv;
}
`

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( c, c );
  if ( r2 > 1.0 ) discard;
  float a = exp( -r2 * 3.2 ) - 0.04;
  gl_FragColor = vec4( vColor * max( a, 0.0 ), 1.0 );
}
`

export function createMist(uniforms: MistUniforms, count: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  let seed = 1234567
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const box = { minY: 0.01, maxY: 1.5, minZ: -26, maxZ: 1.2 }
  for (let i = 0; i < count; i++) {
    positions.set([(rand() - 0.5) * 5.6, box.minY + rand() * (box.maxY - box.minY), box.minZ + rand() * (box.maxZ - box.minZ)], i * 3)
    seeds.set([rand(), 0.5 + rand(), 0.0012 + rand() * rand() * 0.0042, 0.35 + rand() * 0.65], i * 4)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.7, -12), 20)
  const mat = new THREE.ShaderMaterial({
    name: "hero:mist",
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...(uniforms as unknown as Record<string, THREE.IUniform>),
      uBox: { value: new THREE.Vector4(box.minY, box.maxY, box.minZ, box.maxZ) },
      uLamp: { value: new THREE.Vector4(RACEWAY.lampZ0, RACEWAY.lampSpacing, RACEWAY.lampX - RACEWAY.lampOverhang, RACEWAY.lampHeight - 0.03) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = 11
  return points
}
