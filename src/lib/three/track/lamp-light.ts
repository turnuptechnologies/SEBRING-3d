import * as THREE from "three"

import { RACEWAY } from "@/lib/three/track/layout"
import { type ShaderPatch, worldPositionPatch } from "@/lib/three/track/shader-patch"

/**
 * Trackside floodlights as *virtual* lights. The lamps sit on a regular grid
 * (two rows, one every `lampSpacing` units), so a fragment only needs the three
 * nearest lamp pairs. They go through three's own `RE_Direct`, so they shade
 * paint, braid, steel and asphalt exactly like real lights — for the cost of six
 * analytic lights instead of forty real ones (and no light-count recompiles).
 */
export interface LampUniforms {
  uLampColor: THREE.IUniform<THREE.Color>
  /** x: z of the first lamp, y: spacing (lamps run toward −Z), z: count, w: |x| of the lamp head. */
  uLampGrid: THREE.IUniform<THREE.Vector4>
  /** x: head height, y: range, z: cos(outer cone), w: cos(inner cone). */
  uLampShape: THREE.IUniform<THREE.Vector4>
  /** Inward tilt of the cone axis (x per unit of fall). */
  uLampAim: THREE.IUniform<number>
}

export function createLampUniforms(): LampUniforms {
  return {
    uLampColor: { value: new THREE.Color(1, 0.6, 0.3).multiplyScalar(5.5) },
    uLampGrid: {
      value: new THREE.Vector4(RACEWAY.lampZ0, RACEWAY.lampSpacing, RACEWAY.lampCount, RACEWAY.lampX - RACEWAY.lampOverhang),
    },
    uLampShape: {
      value: new THREE.Vector4(RACEWAY.lampHeight - 0.03, 8, Math.cos(THREE.MathUtils.degToRad(72)), Math.cos(THREE.MathUtils.degToRad(26))),
    },
    uLampAim: { value: 1.45 },
  }
}

const LAMP_PARS = /* glsl */ `
uniform vec3 uLampColor;
uniform vec4 uLampGrid;
uniform vec4 uLampShape;
uniform float uLampAim;
float heroLampHash( float n ) { return fract( sin( n * 91.3458 ) * 47453.5453 ); }
`

const LAMP_LIGHTS = /* glsl */ `
#if defined( RE_Direct )
{
  #if defined( STANDARD ) && !( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
    material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / max( material.dfg.x + material.dfg.y, 1e-4 ) - 1.0 );
  #endif
  for ( int s = 0; s < 2; s ++ ) {
    float side = float( s ) * 2.0 - 1.0;
    // The right-hand row is staggered by half a spacing.
    float z0 = uLampGrid.x - ( side > 0.0 ? 0.5 * uLampGrid.y : 0.0 );
    float centre = floor( ( z0 - vHeroWorld.z ) / uLampGrid.y + 0.5 );
    for ( int i = -1; i <= 1; i ++ ) {
      float k = centre + float( i );
      if ( k < 0.0 || k > uLampGrid.z - 1.0 ) continue;
      vec3 lampPos = vec3( side * uLampGrid.w, uLampShape.x, z0 - k * uLampGrid.y );
      vec3 toFrag = vHeroWorld - lampPos;
      float dist = max( length( toFrag ), 1e-3 );
      vec3 axis = normalize( vec3( - side * uLampAim, - 1.0, 0.0 ) );
      float cone = smoothstep( uLampShape.z, uLampShape.w, dot( toFrag / dist, axis ) );
      float vary = 0.74 + 0.5 * heroLampHash( k * 1.73 + float( s ) * 13.1 );
      vec3 lampView = ( viewMatrix * vec4( lampPos, 1.0 ) ).xyz;
      directLight.direction = normalize( lampView - geometryPosition );
      directLight.color = uLampColor * ( vary * cone * getDistanceAttenuation( dist, uLampShape.y, 2.0 ) );
      directLight.visible = true;
      RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    }
  }
}
#endif
`

export function lampLightPatch(uniforms: LampUniforms): ShaderPatch {
  return {
    key: "lamps",
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    fragment: [
      { at: "#include <common>", code: LAMP_PARS },
      { at: "#include <lights_fragment_maps>", code: LAMP_LIGHTS, mode: "before" },
      // Firefly clamp: near-mirror clearcoat under point lights can exceed half-float range (→ Inf/NaN in bloom).
      { at: "#include <dithering_fragment>", code: "gl_FragColor.rgb = min( gl_FragColor.rgb, vec3( 40.0 ) );", mode: "before" },
    ],
  }
}

/** World position + lamp lighting — the minimum patch set for anything lit by the floodlights. */
export function litByLamps(uniforms: LampUniforms): ShaderPatch[] {
  return [worldPositionPatch, lampLightPatch(uniforms)]
}
