"use client"

import { useFrame } from "@react-three/fiber"
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, ToneMapping, wrapEffect } from "@react-three/postprocessing"
import { BlendFunction, type DepthOfFieldEffect, Effect, ToneMappingMode } from "postprocessing"
import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"

/**
 * Final grade in one pass after tone mapping: split-tone (teal shadows, warm
 * highlights), gentle contrast, an elliptical vignette and luminance-weighted
 * film grain. Works in display space so the numbers read like a colourist's.
 */
const GRADE_FRAGMENT = /* glsl */ `
uniform float uGrain;
uniform float uVignette;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
float gradeHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  vec3 g = pow( max( inputColor.rgb, 0.0 ), vec3( 1.0 / 2.2 ) );
  float l = dot( g, vec3( 0.2126, 0.7152, 0.0722 ) );
  g += uShadowTint * ( 1.0 - smoothstep( 0.0, 0.5, l ) ) + uHighlightTint * smoothstep( 0.45, 1.0, l );
  g = ( g - 0.5 ) * uContrast + 0.5;
  float l2 = dot( g, vec3( 0.2126, 0.7152, 0.0722 ) );
  g = mix( vec3( l2 ), g, uSaturation );
  vec2 q = ( uv - 0.5 ) * vec2( mix( 1.0, aspect, 0.55 ), 1.0 );
  float vig = 1.0 - smoothstep( 0.22, 0.95, length( q ) * 1.08 );
  g *= mix( 1.0, vig, uVignette );
  vec2 px = uv * resolution;
  float n = gradeHash( floor( px ) + fract( time * 7.31 ) * 913.0 ) + gradeHash( floor( px * 0.5 ) + fract( time * 3.7 ) * 311.0 ) - 1.0;
  g += n * uGrain * ( 0.25 + 0.75 * ( 1.0 - l ) ) * ( 0.4 + 0.6 * smoothstep( 0.0, 0.2, l ) );
  outputColor = vec4( pow( max( g, 0.0 ), vec3( 2.2 ) ), inputColor.a );
}
`

interface GradeOptions {
  grain?: number
  vignette?: number
  contrast?: number
  saturation?: number
  shadowTint?: [number, number, number]
  highlightTint?: [number, number, number]
}

class GradeEffect extends Effect {
  constructor({
    grain = 0.05,
    vignette = 0.7,
    contrast = 1.06,
    saturation = 1.04,
    shadowTint = [-0.004, 0.004, 0.012],
    highlightTint = [0.018, 0.006, -0.012],
  }: GradeOptions = {}) {
    super("HeroGradeEffect", GRADE_FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uGrain", new THREE.Uniform(grain)],
        ["uVignette", new THREE.Uniform(vignette)],
        ["uContrast", new THREE.Uniform(contrast)],
        ["uSaturation", new THREE.Uniform(saturation)],
        ["uShadowTint", new THREE.Uniform(new THREE.Vector3(...shadowTint))],
        ["uHighlightTint", new THREE.Uniform(new THREE.Vector3(...highlightTint))],
      ]),
    })
  }
}

const Grade = wrapEffect(GradeEffect)

/** Where the lens is focused; the director moves it, the depth-of-field reads it live. */
export interface FocusState {
  point: THREE.Vector3
  /** In-focus depth range in world units. */
  range: number
  /** Bokeh size multiplier (0 = pin sharp). */
  bokeh: number
}

export function createFocusState(): FocusState {
  return { point: new THREE.Vector3(0, 0.1, -6), range: 2, bokeh: 1 }
}

function FocusPuller({ focus }: { focus: FocusState }) {
  const ref = useRef<DepthOfFieldEffect>(null)
  useLayoutEffect(() => {
    // Share the director's vector so auto-focus tracks it without React updates.
    if (ref.current) ref.current.target = focus.point
  }, [focus])
  useFrame(() => {
    const e = ref.current
    if (!e) return
    e.cocMaterial.focusRange = focus.range
    e.bokehScale = focus.bokeh
  })
  return <DepthOfField ref={ref} target={focus.point} focusRange={focus.range} bokehScale={focus.bokeh} resolutionScale={0.5} />
}

export interface HeroPostProps {
  /** 0 = everything, 1 = no chromatic aberration, 2 = lighter bloom, 3 = no bloom. */
  tier: number
  multisampling: number
  grain?: number
  focus?: FocusState
}

export function HeroPost({ tier, multisampling, grain = 0.05, focus }: HeroPostProps) {
  const caOffset = useMemo(() => new THREE.Vector2(0.00055, 0.00035), [])
  return (
    <EffectComposer multisampling={multisampling} frameBufferType={THREE.HalfFloatType} enableNormalPass={false}>
      {focus && tier < 1 ? <FocusPuller focus={focus} /> : <></>}
      {tier < 3 ? (
        <Bloom
          mipmapBlur
          luminanceThreshold={0.95}
          luminanceSmoothing={0.35}
          intensity={tier < 2 ? 0.95 : 0.75}
          radius={0.7}
          levels={tier < 2 ? 7 : 6}
        />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Grade grain={grain} />
      {tier < 1 ? <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} /> : <></>}
    </EffectComposer>
  )
}
