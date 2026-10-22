import type * as THREE from "three"

/**
 * Tiny composable `onBeforeCompile` system. Each patch injects GLSL next to a
 * known three.js chunk include; patches stack in order and share one program
 * cache key, so every material with the same patch list shares a program.
 */
export interface ShaderInjection {
  /** Exact text in the shader to anchor on, usually an `#include <chunk>` line. */
  at: string
  code: string
  mode?: "before" | "after" | "replace"
}

export interface ShaderPatch {
  key: string
  uniforms?: Record<string, THREE.IUniform>
  vertex?: ShaderInjection[]
  fragment?: ShaderInjection[]
  defines?: Record<string, string | number | boolean>
}

function inject(source: string, { at, code, mode = "after" }: ShaderInjection, key: string): string {
  if (!source.includes(at)) {
    if (process.env.NODE_ENV !== "production") console.warn(`[shader-patch:${key}] anchor not found: ${at}`)
    return source
  }
  if (mode === "replace") return source.replace(at, code)
  return source.replace(at, mode === "before" ? `${code}\n${at}` : `${at}\n${code}`)
}

export interface PatchBase {
  /** A pre-existing `onBeforeCompile` to run first (e.g. from a cloned material). */
  onBeforeCompile?: THREE.Material["onBeforeCompile"]
  cacheKey?: string
}

/** Reads a material's own (non-prototype) shader hooks so a clone can keep them. */
export function ownShaderHooks(material: THREE.Material): PatchBase {
  const own = (k: string) => Object.prototype.hasOwnProperty.call(material, k)
  return {
    onBeforeCompile: own("onBeforeCompile") ? material.onBeforeCompile.bind(material) : undefined,
    cacheKey: own("customProgramCacheKey") ? material.customProgramCacheKey() : undefined,
  }
}

export function applyShaderPatches<T extends THREE.Material>(material: T, patches: ShaderPatch[], base: PatchBase = {}): T {
  const key = [base.cacheKey ?? "", ...patches.map((p) => p.key)].join("+")
  material.onBeforeCompile = (shader, renderer) => {
    base.onBeforeCompile?.(shader, renderer)
    for (const patch of patches) {
      if (patch.uniforms) Object.assign(shader.uniforms, patch.uniforms)
      if (patch.defines) shader.defines = { ...(shader.defines ?? {}), ...patch.defines }
      for (const inj of patch.vertex ?? []) shader.vertexShader = inject(shader.vertexShader, inj, patch.key)
      for (const inj of patch.fragment ?? []) shader.fragmentShader = inject(shader.fragmentShader, inj, patch.key)
    }
  }
  material.customProgramCacheKey = () => key
  material.needsUpdate = true
  return material
}

/** Adds `vHeroWorld` (world-space position) to vertex and fragment stages. */
export const worldPositionPatch: ShaderPatch = {
  key: "wpos",
  vertex: [
    { at: "#include <common>", code: "varying vec3 vHeroWorld;" },
    {
      at: "#include <project_vertex>",
      code: /* glsl */ `
        vec4 heroWorld = vec4( transformed, 1.0 );
        #ifdef USE_BATCHING
          heroWorld = batchingMatrix * heroWorld;
        #endif
        #ifdef USE_INSTANCING
          heroWorld = instanceMatrix * heroWorld;
        #endif
        vHeroWorld = ( modelMatrix * heroWorld ).xyz;`,
    },
  ],
  fragment: [{ at: "#include <common>", code: "varying vec3 vHeroWorld;" }],
}
