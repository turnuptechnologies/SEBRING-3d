import * as THREE from "three"

import { CURB_OUTER, RACEWAY, TRACK_HALF_WIDTH } from "@/lib/three/track/layout"
import { type LampUniforms, litByLamps } from "@/lib/three/track/lamp-light"
import { applyShaderPatches, type ShaderPatch } from "@/lib/three/track/shader-patch"

/**
 * Procedural routed-track surface: textured dark paint with grain and glints,
 * rubbered-in tyre lines, slots with copper braid, lane and edge paint and
 * red/white curbs. Everything is analytic in world space and box-filtered by
 * the pixel footprint (fwidth), so lines stay crisp near the lens and resolve
 * to the right average at grazing angles instead of shimmering.
 */

const NOISE = /* glsl */ `
float trHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
// Value noise with analytic derivatives: x = value (0..1), yz = gradient.
vec3 trNoised( vec2 x ) {
  vec2 i = floor( x );
  vec2 f = fract( x );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  vec2 du = 6.0 * f * ( 1.0 - f );
  float a = trHash( i );
  float b = trHash( i + vec2( 1.0, 0.0 ) );
  float c = trHash( i + vec2( 0.0, 1.0 ) );
  float d = trHash( i + vec2( 1.0, 1.0 ) );
  float k = a - b - c + d;
  return vec3( a + ( b - a ) * u.x + ( c - a ) * u.y + k * u.x * u.y, du * ( vec2( b - a, c - a ) + k * u.yx ) );
}
// Coverage of [a, b] by a box footprint of width w centred on x.
float trCover( float x, float a, float b, float w ) {
  return clamp( ( x + 0.5 * w - a ) / w, 0.0, 1.0 ) - clamp( ( x + 0.5 * w - b ) / w, 0.0, 1.0 );
}
float trStripeInt( float z, float p, float d ) {
  float k = floor( z / p );
  return k * d * p + min( z - k * p, d * p );
}
// Box-filtered square wave (period p, duty d) — exact average over the footprint.
float trStripes( float z, float p, float d, float w ) {
  float zl = mod( z, p );
  return ( trStripeInt( zl + 0.5 * w, p, d ) - trStripeInt( zl - 0.5 * w, p, d ) ) / w;
}
// 1 while a feature of frequency f is resolvable at footprint w, fading to 0 before it aliases.
float trDetail( float f, float w ) { return 1.0 - smoothstep( 0.3, 0.9, f * w ); }
`

const SURFACE_PARS = /* glsl */ `
uniform vec4 uTrackSlots;   // x lane spacing, y slot half width, z braid inner, w braid outer
uniform vec4 uTrackEdges;   // x track half width, y edge line inner, z edge line outer, w curb outer
uniform vec4 uTrackLook;    // x paint albedo, y paint roughness, z bump strength, w curb block length
uniform float uTrackLanes;
vec3 trAlbedo;
float trRough;
float trMetal;
vec2 trGrad;
${NOISE}

void trackSurface( vec2 p ) {
  float wx = max( length( vec2( dFdx( p.x ), dFdy( p.x ) ) ), 1e-5 ) * 1.25;
  float wz = max( length( vec2( dFdx( p.y ), dFdy( p.y ) ) ), 1e-5 ) * 1.25;
  float wmax = max( wx, wz );
  float bump = uTrackLook.z;

  // ---- base: textured dark paint -------------------------------------------
  vec3 big = trNoised( p * vec2( 1.1, 0.23 ) + 17.0 );
  vec3 mid = trNoised( p * vec2( 9.0, 4.0 ) + 3.0 );
  vec3 g1 = trNoised( p * 46.0 );
  vec3 g2 = trNoised( p * 150.0 + 7.0 );
  float f1 = trDetail( 46.0, wmax );
  float f2 = trDetail( 150.0, wmax );
  float fm = trDetail( 9.0, wmax );

  float paint = uTrackLook.x;
  trAlbedo = vec3( paint ) * vec3( 0.98, 0.99, 1.03 );
  trAlbedo *= 0.86 + 0.26 * big.x;
  trAlbedo *= 1.0 + 0.16 * ( mid.x - 0.5 ) * fm;
  trAlbedo *= 1.0 + ( 0.34 * ( g1.x - 0.5 ) * f1 + 0.26 * ( g2.x - 0.5 ) * f2 );
  trRough = uTrackLook.y + 0.1 * ( big.x - 0.5 ) + 0.12 * ( g2.x - 0.5 ) * f2;
  // Lost detail turns into roughness so the sheen keeps its energy at distance.
  trRough += 0.06 * ( 1.0 - f2 );
  trMetal = 0.0;
  trGrad = bump * ( g1.yz * 46.0 * 0.0011 * f1 + g2.yz * 150.0 * 0.00026 * f2 + mid.yz * 9.0 * 0.00022 * fm );
  // Aggregate glints that sparkle in the headlights.
  float glint = smoothstep( 0.84, 0.97, g2.x ) * f2 * smoothstep( 0.35, 0.75, g1.x );
  trAlbedo += vec3( 0.07 ) * glint;
  trRough = mix( trRough, 0.16, glint );

  // Sheet joints of the routed board every 9.6 units.
  float seam = trCover( mod( p.y, 9.6 ), 0.0, 0.005, wz ) * trDetail( 0.5 / 0.005, wz * 0.25 );
  trAlbedo *= 1.0 - 0.55 * seam;

  // ---- lanes ----------------------------------------------------------------
  float lanes = uTrackLanes;
  float spacing = uTrackSlots.x;
  float slotIndex = clamp( floor( p.x / spacing + ( lanes - 1.0 ) * 0.5 + 0.5 ), 0.0, lanes - 1.0 );
  float dx = p.x - ( slotIndex - ( lanes - 1.0 ) * 0.5 ) * spacing;

  // Rubbered-in tyre lines either side of each slot: darker and glossier.
  float tyre = smoothstep( 0.052, 0.018, abs( abs( dx ) - 0.168 ) );
  tyre *= 0.65 + 0.35 * trNoised( vec2( dx * 30.0, p.y * 0.8 ) ).x;
  trAlbedo *= 1.0 - 0.42 * tyre;
  trRough = mix( trRough, trRough - 0.2, tyre );

  // Braid: copper, metallic, woven.
  float braid = trCover( dx, -uTrackSlots.w, -uTrackSlots.z, wx ) + trCover( dx, uTrackSlots.z, uTrackSlots.w, wx );
  float bu = abs( dx ) - uTrackSlots.z;
  float bw = uTrackSlots.w - uTrackSlots.z;
  float weaveF = 6.2831853 / 0.0072;
  float fa = ( bu + p.y ) * weaveF;
  float fb = ( bu - p.y ) * weaveF;
  float fw = trDetail( 1.0 / 0.0072, wmax );
  float weave = sin( fa ) * sin( fb );
  vec2 weaveGrad = 0.00022 * weaveF * vec2( cos( fa ) * sin( fb ) + sin( fa ) * cos( fb ), cos( fa ) * sin( fb ) - sin( fa ) * cos( fb ) );
  weaveGrad.x *= sign( dx );
  float crown = 0.0009 * 3.14159 / bw * cos( 3.14159 * clamp( bu / bw, 0.0, 1.0 ) ) * sign( dx );
  float tarnish = trNoised( vec2( dx * 60.0, p.y * 2.6 ) + 41.0 ).x;
  vec3 copper = vec3( 0.86, 0.5, 0.34 ) * ( 0.34 + 0.46 * tarnish );
  trAlbedo = mix( trAlbedo, copper, braid );
  trMetal = mix( trMetal, 1.0, braid );
  trRough = mix( trRough, 0.3 + 0.2 * ( 1.0 - tarnish ) + 0.12 * weave * fw + 0.12 * ( 1.0 - fw ), braid );
  trGrad = mix( trGrad, vec2( crown, 0.0 ) + weaveGrad * fw * bump, braid );

  // Slot: a dark groove with chamfered lips.
  float slotHalf = uTrackSlots.y;
  float lip = trCover( dx, -slotHalf - 0.0035, -slotHalf, wx ) - trCover( dx, slotHalf, slotHalf + 0.0035, wx );
  trGrad.x -= 0.42 * lip;
  float slot = trCover( dx, -slotHalf, slotHalf, wx );
  trAlbedo = mix( trAlbedo, vec3( 0.0012 ), slot );
  trRough = mix( trRough, 0.95, slot );
  trMetal = mix( trMetal, 0.0, slot );
  trGrad = mix( trGrad, vec2( 0.0 ), slot );

  // ---- edges ----------------------------------------------------------------
  float e1 = uTrackEdges.y;
  float e2 = uTrackEdges.z;
  float edge = trCover( p.x, -e2, -e1, wx ) + trCover( p.x, e1, e2, wx );
  float edgeWear = 0.75 + 0.25 * trNoised( p * vec2( 40.0, 2.0 ) + 9.0 ).x;
  trAlbedo = mix( trAlbedo, vec3( 0.62, 0.61, 0.58 ) * edgeWear, edge );
  trRough = mix( trRough, 0.46, edge );

  // Curbs: raised, rounded, alternating red / white blocks.
  float th = uTrackEdges.x;
  float co = uTrackEdges.w;
  float curb = trCover( p.x, -co, -th, wx ) + trCover( p.x, th, co, wx );
  float block = uTrackLook.w;
  float red = trStripes( p.y + 0.11, block * 2.0, 0.5, wz );
  float joint = 1.0 - trStripes( p.y + 0.11, block, 0.965, wz );
  vec3 curbCol = mix( vec3( 0.7, 0.69, 0.66 ), vec3( 0.52, 0.012, 0.03 ), red );
  float curbDirt = trNoised( p * vec2( 14.0, 5.0 ) + 23.0 ).x;
  curbCol *= ( 0.8 + 0.2 * curbDirt ) * ( 1.0 - 0.6 * joint );
  float ct = clamp( ( abs( p.x ) - th ) / ( co - th ), 0.0, 1.0 );
  float curbSlope = 0.006 * 3.14159 / ( co - th ) * cos( 3.14159 * ct ) * sign( p.x );
  trAlbedo = mix( trAlbedo, curbCol, curb );
  trRough = mix( trRough, 0.36 + 0.14 * curbDirt, curb );
  trMetal = mix( trMetal, 0.0, curb );
  trGrad = mix( trGrad, vec2( curbSlope, 0.0 ) + g1.yz * 46.0 * 0.0006 * f1 * bump, curb );

  trRough = clamp( trRough, 0.08, 1.0 );
}
`

export interface TrackSurfaceUniforms {
  uTrackSlots: THREE.IUniform<THREE.Vector4>
  uTrackEdges: THREE.IUniform<THREE.Vector4>
  uTrackLook: THREE.IUniform<THREE.Vector4>
  uTrackLanes: THREE.IUniform<number>
}

export function createTrackSurfaceUniforms(): TrackSurfaceUniforms {
  const slotHalf = RACEWAY.slotWidth / 2
  const braidInner = slotHalf + RACEWAY.braidInset
  const edgeOuter = TRACK_HALF_WIDTH - RACEWAY.edgeLineInset
  return {
    uTrackSlots: { value: new THREE.Vector4(RACEWAY.laneSpacing, slotHalf, braidInner, braidInner + RACEWAY.braidWidth) },
    uTrackEdges: { value: new THREE.Vector4(TRACK_HALF_WIDTH, edgeOuter - RACEWAY.edgeLineWidth, edgeOuter, CURB_OUTER) },
    uTrackLook: { value: new THREE.Vector4(0.032, 0.5, 1, RACEWAY.curbBlock) },
    uTrackLanes: { value: RACEWAY.lanes },
  }
}

function surfacePatch(uniforms: TrackSurfaceUniforms): ShaderPatch {
  return {
    key: "track-surface",
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    fragment: [
      { at: "#include <common>", code: SURFACE_PARS },
      { at: "#include <map_fragment>", code: "trackSurface( vHeroWorld.xz );\ndiffuseColor.rgb = trAlbedo;", mode: "replace" },
      { at: "#include <roughnessmap_fragment>", code: "float roughnessFactor = trRough;", mode: "replace" },
      { at: "#include <metalnessmap_fragment>", code: "float metalnessFactor = trMetal;", mode: "replace" },
      {
        at: "#include <normal_fragment_maps>",
        code: "normal = normalize( ( viewMatrix * vec4( normalize( vec3( - trGrad.x, 1.0, - trGrad.y ) ), 0.0 ) ).xyz );",
        mode: "replace",
      },
    ],
  }
}

export function createTrackSurfaceMaterial(lamps: LampUniforms, uniforms: TrackSurfaceUniforms): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, metalness: 0, envMapIntensity: 1 })
  material.name = "hero:track-surface"
  return applyShaderPatches(material, [...litByLamps(lamps), surfacePatch(uniforms)])
}

/* ---------------------------------------------------------------------------
 * Verge: dirt shoulder, dark grass and the infield beyond the barriers.
 * ------------------------------------------------------------------------- */

const VERGE_PARS = /* glsl */ `
uniform float uVergeStart;
vec3 vgAlbedo;
float vgRough;
vec2 vgGrad;
${NOISE}
void vergeSurface( vec2 p ) {
  float wmax = max( max( length( vec2( dFdx( p.x ), dFdy( p.x ) ) ), length( vec2( dFdx( p.y ), dFdy( p.y ) ) ) ), 1e-5 ) * 1.25;
  float ax = abs( p.x );
  vec3 big = trNoised( p * vec2( 0.9, 0.3 ) + 5.0 );
  vec3 clump = trNoised( p * 7.0 + 11.0 );
  vec3 blade = trNoised( p * vec2( 60.0, 24.0 ) );
  float fc = trDetail( 7.0, wmax );
  float fb = trDetail( 60.0, wmax );
  vec3 grass = vec3( 0.016, 0.022, 0.011 ) * ( 0.7 + 0.6 * big.x ) * ( 1.0 + 0.5 * ( clump.x - 0.5 ) * fc ) * ( 1.0 + 0.6 * ( blade.x - 0.5 ) * fb );
  // Dusty shoulder right behind the curb, fading into the grass.
  float shoulder = 1.0 - smoothstep( uVergeStart + 0.03, uVergeStart + 0.16 + 0.05 * clump.x, ax );
  vec3 dirt = vec3( 0.045, 0.04, 0.034 ) * ( 0.75 + 0.5 * trNoised( p * 40.0 ).x * fb + 0.25 * big.x );
  vgAlbedo = mix( grass, dirt, shoulder );
  vgRough = mix( 0.92, 0.8, shoulder );
  vgGrad = ( clump.yz * 7.0 * 0.004 * fc + blade.yz * vec2( 60.0, 24.0 ) * 0.0012 * fb ) * ( 1.0 - 0.6 * shoulder );
}
`

export function createVergeMaterial(lamps: LampUniforms): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, metalness: 0, envMapIntensity: 0.6 })
  material.name = "hero:verge"
  const patch: ShaderPatch = {
    key: "verge",
    uniforms: { uVergeStart: { value: CURB_OUTER } },
    fragment: [
      { at: "#include <common>", code: VERGE_PARS },
      { at: "#include <map_fragment>", code: "vergeSurface( vHeroWorld.xz );\ndiffuseColor.rgb = vgAlbedo;", mode: "replace" },
      { at: "#include <roughnessmap_fragment>", code: "float roughnessFactor = vgRough;", mode: "replace" },
      {
        at: "#include <normal_fragment_maps>",
        code: "normal = normalize( ( viewMatrix * vec4( normalize( vec3( - vgGrad.x, 1.0, - vgGrad.y ) ), 0.0 ) ).xyz );",
        mode: "replace",
      },
    ],
  }
  return applyShaderPatches(material, [...litByLamps(lamps), patch])
}

/** A flat quad on y = 0 spanning [x0, x1] × [zNear, zFar], normal up. */
export function groundQuad(x0: number, x1: number, zNear = RACEWAY.zNear, zFar = RACEWAY.zFar, y = 0): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array([x0, y, zNear, x1, y, zNear, x1, y, zFar, x0, y, zFar])
  const nrm = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3))
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}
