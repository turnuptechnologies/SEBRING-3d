import * as THREE from "three"

import { clamp, rng, smooth, TAU } from "./kit"

/**
 * Surface library for the drivetrain parts: procedural (deterministic) detail
 * maps and tuned PBR materials. UVs across the generators are in millimetres,
 * so `repeat = 1 / tileMm`.
 */

export const isBrowser = typeof document !== "undefined"

/* ------------------------------------------------------------------------- */
/* Tileable noise                                                             */
/* ------------------------------------------------------------------------- */

function hash(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function vnoise(x: number, y: number, px: number, py: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const wx = (v: number) => ((v % px) + px) % px
  const wy = (v: number) => ((v % py) + py) % py
  const a = hash(wx(x0), wy(y0), seed)
  const b = hash(wx(x0 + 1), wy(y0), seed)
  const c = hash(wx(x0), wy(y0 + 1), seed)
  const d = hash(wx(x0 + 1), wy(y0 + 1), seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/** Tileable fBm over the unit square (u, v ∈ [0,1)), base lattice fx × fy. */
function fbm(u: number, v: number, fx: number, fy: number, oct: number, seed: number) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  for (let o = 0; o < oct; o++) {
    const m = 1 << o
    sum += amp * vnoise(u * fx * m, v * fy * m, fx * m, fy * m, seed + o * 17)
    norm += amp
    amp *= 0.5
  }
  return sum / norm
}

/* ------------------------------------------------------------------------- */
/* Texture helpers                                                            */
/* ------------------------------------------------------------------------- */

const texCache = new Map<string, THREE.Texture>()

function dataTexture(key: string, sizeIn: number, fill: (data: Uint8Array, size: number) => void, srgb = false) {
  const hit = texCache.get(key)
  if (hit) return hit
  // Server builds never reach a GPU: keep them cheap with a flat 4 × 4 stand-in.
  const size = isBrowser ? sizeIn : 4
  const data = new Uint8Array(size * size * 4)
  if (isBrowser) fill(data, size)
  else data.fill(128)
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  t.name = key
  texCache.set(key, t)
  return t
}

/** Height field (0..1, row-major, tileable) → tangent-space normal map bytes. */
function heightToNormal(h: Float32Array, size: number, strength: number, data: Uint8Array) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = h[y * size + ((x - 1 + size) % size)]
      const xr = h[y * size + ((x + 1) % size)]
      const yd = h[((y - 1 + size) % size) * size + x]
      const yu = h[((y + 1) % size) * size + x]
      let nx = (xl - xr) * strength
      let ny = (yd - yu) * strength
      let nz = 1
      const l = Math.hypot(nx, ny, nz)
      nx /= l
      ny /= l
      nz /= l
      const o = (y * size + x) * 4
      data[o] = Math.round((nx * 0.5 + 0.5) * 255)
      data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      data[o + 3] = 255
    }
  }
}

function heightMap(size: number, f: (u: number, v: number) => number) {
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = f(x / size, y / size)
  return h
}

/** Fine machining lines running along U (they vary across V). */
function linesNormal(key: string, seed: number, strength: number, density = 180) {
  return dataTexture(key, 512, (data, size) => {
    const r = rng(seed)
    // Lines only vary across V, so build a 1D profile once.
    const prof = new Float32Array(size)
    for (let k = 0; k < density; k++) {
      const lv = r()
      const lw = 0.0008 + r() * 0.003
      const la = r() * r()
      for (let y = 0; y < size; y++) {
        let d = Math.abs(y / size - lv)
        d = Math.min(d, 1 - d)
        if (d < lw * 3) prof[y] += la * Math.exp(-(d * d) / (lw * lw))
      }
    }
    const h = heightMap(size, (u, v) => {
      const y = Math.min(size - 1, Math.round(v * size))
      return fbm(u, v, 2, 160, 2, seed) * 0.35 + prof[y] * (0.6 + 0.4 * vnoise(u * 6, v * 50, 6, 50, seed + 3))
    })
    heightToNormal(h, size, strength, data)
  })
}

export const brushedNormal = () => linesNormal("n:brushed", 11, 7)
/** Coarse, sparse grinding marks (trued rubber) — wide enough not to alias. */
export const truingNormal = () => linesNormal("n:truing", 37, 3, 46)
export const turnedNormal = () => linesNormal("n:turned", 23, 5, 260)

/** Isotropic fine grain — spark-eroded plastic, cast metal, rubber. */
export const grainNormal = () =>
  dataTexture("n:grain", 512, (data, size) => {
    const h = heightMap(size, (u, v) => fbm(u, v, 64, 64, 3, 5) * 0.7 + fbm(u, v, 16, 16, 2, 9) * 0.3)
    heightToNormal(h, size, 3.2, data)
  })

/** Low-frequency roughness variation (handling marks) — green channel. */
export const smudgeRoughness = () =>
  dataTexture("r:smudge", 256, (data, size) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const n = fbm(x / size, y / size, 4, 4, 4, 31)
        const v = Math.round(clamp(0.78 + (n - 0.5) * 0.5, 0, 1) * 255)
        const o = (y * size + x) * 4
        data[o] = v
        data[o + 1] = v
        data[o + 2] = v
        data[o + 3] = 255
      }
  })

/** Periodic grooves along U — screw threads and wound magnet wire. */
function grooveNormal(key: string, count: number, sharp: number, strength: number) {
  return dataTexture(key, 256, (data, size) => {
    const h = heightMap(size, (u, v) => {
      const t = (v * count) % 1
      const tri = 1 - Math.abs(t * 2 - 1)
      return Math.pow(tri, sharp) + fbm(u, v, 8, 8, 2, 77) * 0.06
    })
    heightToNormal(h, size, strength, data)
  })
}

export const threadNormal = () => grooveNormal("n:thread", 8, 0.6, 9)
export const windingNormal = () =>
  dataTexture("n:winding", 256, (data, size) => {
    const count = 16
    const h = heightMap(size, (u, v) => {
      const t = (v * count + Math.sin(u * TAU) * 0.15) % 1
      return Math.sqrt(Math.max(0, 1 - (t * 2 - 1) ** 2))
    })
    heightToNormal(h, size, 6, data)
  })

/**
 * Tubular copper braid: bundles of fine wires crossing over/under at ±45°.
 * Returns normal + cavity (colour) maps that share UVs (u along the strip).
 */
function weaveHeight(u: number, v: number) {
  const P = 4
  const a = (u + v) * P
  const b = (u - v) * P
  const ia = Math.floor(a)
  const ib = Math.floor(b)
  const fa = a - ia
  const fb = b - ib
  const wires = 5
  const ridge = (f: number) => {
    const t = (f * wires) % 1
    return Math.sqrt(Math.max(0, 1 - (t * 2 - 1) ** 2))
  }
  const edge = (f: number) => smooth(clamp(Math.min(f, 1 - f) * 7, 0, 1))
  const overA = (ia + ib) % 2 === 0
  const bulgeA = Math.sin(fa * Math.PI)
  const bulgeB = Math.sin(fb * Math.PI)
  const hA = (overA ? 0.55 + 0.45 * bulgeB : 0.25 * bulgeB) * edge(fb) + ridge(fb) * 0.28 * edge(fb)
  const hB = (!overA ? 0.55 + 0.45 * bulgeA : 0.25 * bulgeA) * edge(fa) + ridge(fa) * 0.28 * edge(fa)
  return Math.max(hA, hB)
}

export const weaveNormal = () =>
  dataTexture("n:weave", 512, (data, size) => {
    const h = heightMap(size, weaveHeight)
    heightToNormal(h, size, 9, data)
  })

export const weaveCavity = () =>
  dataTexture(
    "c:weave",
    512,
    (data, size) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const h = weaveHeight(x / size, y / size)
          const n = fbm(x / size, y / size, 32, 32, 2, 41)
          const v = Math.round(clamp(0.38 + h * 0.62 + (n - 0.5) * 0.12, 0, 1) * 255)
          const o = (y * size + x) * 4
          data[o] = v
          data[o + 1] = v
          data[o + 2] = v
          data[o + 3] = 255
        }
    },
    true
  )

/** Clones a cached texture with its own repeat (shares the GPU upload). */
export function tiled(tex: THREE.Texture, tileU: number, tileV = tileU, rotation = 0) {
  const t = tex.clone()
  t.repeat.set(1 / tileU, 1 / tileV)
  t.rotation = rotation
  t.needsUpdate = true
  return t
}

/* ------------------------------------------------------------------------- */
/* Canvas textures (labels, molded text) — client only                        */
/* ------------------------------------------------------------------------- */

export function canvasTex(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { srgb?: boolean } = {}
): THREE.Texture | null {
  if (!isBrowser) return null
  const hit = texCache.get(key)
  if (hit) return hit
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  draw(ctx, w, h)
  const t = new THREE.CanvasTexture(canvas)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.needsUpdate = true
  t.name = key
  texCache.set(key, t)
  return t
}

export const FONT_SANS = `"Helvetica Neue", Helvetica, Arial, sans-serif`
export const FONT_MONO = `ui-monospace, "SF Mono", Menlo, Consolas, monospace`

/* ------------------------------------------------------------------------- */
/* Materials                                                                  */
/* ------------------------------------------------------------------------- */

const matCache = new Map<string, THREE.Material>()

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = matCache.get(key)
  if (hit) return hit as T
  const m = make()
  m.name = key
  matCache.set(key, m)
  return m
}

type Phys = THREE.MeshPhysicalMaterialParameters

function metal(key: string, p: Phys, lines: "brushed" | "turned" | "grain" | "none" = "turned", tile = 6, normal = 0.35, rot = 0) {
  return cached(key, () => {
    const m = new THREE.MeshPhysicalMaterial({ metalness: 1, envMapIntensity: 1.15, ...p })
    // Turned marks are sub-pixel at product-shot magnification (they alias into moiré):
    // the anisotropic lobe carries the look, plus a whisper of grain.
    const kind = lines === "turned" ? "grain" : lines
    const strength = lines === "turned" ? Math.min(normal, 0.025) : normal
    if (kind !== "none") {
      const src = kind === "brushed" ? brushedNormal() : grainNormal()
      m.normalMap = tiled(src, lines === "turned" ? 3 : tile, lines === "turned" ? 3 : tile, rot)
      m.normalScale = new THREE.Vector2(strength, strength)
    }
    m.roughnessMap = tiled(smudgeRoughness(), 18)
    return m
  })
}

/**
 * "turned" = lathe parts (anisotropic, concentric highlights along U);
 * "milled" = planar / extruded parts (isotropic — anisotropy on large planar
 * triangles would facet the highlights).
 */
export type Finish = "turned" | "milled"

const aniso = (f: Finish, a: number) => (f === "turned" ? { anisotropy: a, anisotropyRotation: Math.PI / 2 } : {})

/** Hardened, polished steel (shafts, axles). */
export const polishedSteel = (f: Finish = "turned") =>
  metal(`dt:steel-polished:${f}`, { color: "#d2d6db", roughness: 0.16, envMapIntensity: 1.35, ...aniso(f, 0.5) }, "turned", 5, 0.05)

/** Satin nickel-plated steel (motor cans) — faint axial draw lines. */
export const satinSteel = (roughness = 0.34) =>
  metal(`dt:steel-satin:${roughness}`, { color: "#c9cdd3", roughness, anisotropy: 0.45, envMapIntensity: 1.3 }, "brushed", 26, 0.05, Math.PI / 2)

/** Stamped flat faces of plated parts — broad satin so they hold light in a dark studio. */
export const faceSteel = () => metal("dt:steel-face", { color: "#cdd1d6", roughness: 0.5, envMapIntensity: 1.75 }, "grain", 3, 0.06)

/** Sheared / punched edges: duller and darker than the plated faces. */
export const cutSteel = () => metal("dt:steel-cut", { color: "#8e9197", roughness: 0.55, envMapIntensity: 0.75 }, "grain", 2, 0.3)

/** Bright nickel plating (magnets). */
export const nickel = () =>
  metal("dt:nickel", { color: "#d7d6d2", roughness: 0.12, envMapIntensity: 1.4, clearcoat: 0.4, clearcoatRoughness: 0.06 }, "grain", 3, 0.03)

/** Machined free-cutting brass (pinions, bushings, chassis stock). */
export const brassMetal = (tone: "bright" | "aged" = "bright", f: Finish = "turned") =>
  metal(
    `dt:brass-${tone}:${f}`,
    tone === "bright"
      ? { color: "#e6c98a", roughness: f === "turned" ? 0.24 : 0.3, envMapIntensity: 1.4, ...aniso(f, 0.3) }
      : { color: "#c7a466", roughness: 0.36, envMapIntensity: 1.15, ...aniso(f, 0.25) },
    "turned",
    4,
    0.05
  )

/** Tinned brass for solder lugs and brush tabs. */
export const tinnedBrass = () => metal("dt:brass-tinned", { color: "#d9c48f", roughness: 0.26, envMapIntensity: 1.25 }, "grain", 3, 0.08)

export const copperMetal = () => metal("dt:copper", { color: "#e29a6f", roughness: 0.28, envMapIntensity: 1.2 }, "grain", 3, 0.08)

/** Natural machined aluminium. */
export const turnedAlu = (f: Finish = "turned") =>
  metal(`dt:alu:${f}`, { color: "#d9dde2", roughness: f === "turned" ? 0.26 : 0.32, envMapIntensity: 1.35, ...aniso(f, 0.7) }, "turned", 4, 0.05)

/** Anodised aluminium in any colour. */
export const anodizedAlu = (color: string, f: Finish = "turned") =>
  metal(
    `dt:anod:${color}:${f}`,
    { color, roughness: 0.3, envMapIntensity: 1.25, clearcoat: 0.25, clearcoatRoughness: 0.2, ...aniso(f, 0.55) },
    "turned",
    4,
    0.05
  )

/** Black-oxide hardened steel (grub screws) — partly diffuse so the key light reveals the socket. */
export const blackOxide = () => metal("dt:black-oxide", { color: "#4d5055", metalness: 0.55, roughness: 0.42, envMapIntensity: 1.3 }, "grain", 2, 0.12)

/** Dull tin-lead solder fillets. */
export const solder = () => metal("dt:solder", { color: "#b9bcbf", roughness: 0.42, envMapIntensity: 1 }, "grain", 2, 0.35)

/** Piano / music wire. */
export const springSteel = () => metal("dt:spring-steel", { color: "#babec4", roughness: 0.2, envMapIntensity: 1.2 }, "turned", 3, 0.05)

const shadedCache = new Map<string, THREE.Material>()

/**
 * Variant of a material that multiplies by vertex colours — used to fake
 * occlusion inside holes and pockets (IBL alone lights them like open faces).
 */
export function occluded<T extends THREE.Material>(m: T): T {
  const key = m.name || m.uuid
  const hit = shadedCache.get(key)
  if (hit) return hit as T
  const c = m.clone() as T
  ;(c as unknown as THREE.MeshStandardMaterial).vertexColors = true
  c.name = `${key}:occluded`
  shadedCache.set(key, c)
  return c
}

/** Writes a per-vertex darkening (1 = open, 0 = black) as a colour attribute. */
export function shadeVertices(g: THREE.BufferGeometry, f: (p: THREE.Vector3) => number) {
  const pos = g.attributes.position
  const col = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const k = clamp(f(v), 0, 1)
    col[i * 3] = k
    col[i * 3 + 1] = k
    col[i * 3 + 2] = k
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3))
  return g
}

/** Varnished copper magnet wire (armature windings). */
export const enamelWire = () =>
  cached("dt:enamel", () => {
    const m = new THREE.MeshPhysicalMaterial({
      color: "#c0612f",
      metalness: 1,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.15,
    })
    m.normalMap = tiled(windingNormal(), 3.2, 3.2)
    m.normalScale = new THREE.Vector2(0.9, 0.9)
    return m
  })

/** Woven copper pick-up braid. */
export const copperBraid = (color = "#e0956a") =>
  cached(`dt:braid:${color}`, () => {
    const m = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.3, envMapIntensity: 1.25 })
    m.normalMap = tiled(weaveNormal(), 3.6, 3.6)
    m.normalScale = new THREE.Vector2(1.15, 1.15)
    m.map = tiled(weaveCavity(), 3.6, 3.6)
    return m
  })

/** Injection-moulded plastic (POM / nylon / ABS). */
export const plastic = (color: string, roughness = 0.4, opts: { clearcoat?: number; grain?: number } = {}) =>
  cached(`dt:plastic:${color}:${roughness}:${opts.clearcoat ?? 0}:${opts.grain ?? 0.1}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      specularIntensity: 0.65,
      clearcoat: opts.clearcoat ?? 0,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.95,
    })
    m.normalMap = tiled(grainNormal(), 5)
    const g = opts.grain ?? 0.1
    m.normalScale = new THREE.Vector2(g, g)
    m.roughnessMap = tiled(smudgeRoughness(), 22)
    return m
  })

/** Race rubber — soft, slightly waxy sheen, fine circumferential truing marks. */
export const rubberCompound = (color: string) =>
  cached(`dt:rubber:${color}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.66,
      metalness: 0,
      specularIntensity: 0.5,
      sheen: 1,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color("#8d8d95"),
      envMapIntensity: 1.15,
    })
    m.normalMap = tiled(truingNormal(), 8, 8)
    m.normalScale = new THREE.Vector2(0.22, 0.22)
    m.roughnessMap = tiled(smudgeRoughness(), 14)
    return m
  })

/** Sintered ferrite (motor magnets) — dark, matte. */
export const ferrite = () =>
  cached("dt:ferrite", () => {
    const m = new THREE.MeshPhysicalMaterial({ color: "#2a2a2e", roughness: 0.78, metalness: 0.1, envMapIntensity: 0.6 })
    m.normalMap = tiled(grainNormal(), 2)
    m.normalScale = new THREE.Vector2(0.6, 0.6)
    return m
  })

/** Light-absorbing interior. */
export const cavity = () =>
  cached("dt:cavity", () => new THREE.MeshStandardMaterial({ color: "#060607", roughness: 1, metalness: 0, envMapIntensity: 0.15 }))

/** Unpainted white primer / white ABS. */
export const primer = (color = "#ecebe6") =>
  cached(`dt:primer:${color}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.5,
      metalness: 0,
      specularIntensity: 0.6,
      sheen: 0.3,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#ffffff"),
      envMapIntensity: 0.9,
    })
    m.normalMap = tiled(grainNormal(), 4)
    m.normalScale = new THREE.Vector2(0.1, 0.1)
    return m
  })

/**
 * Clear lexan / polycarbonate. Reflections are added on top of the backdrop
 * (premultiplied output) and opacity rises with Fresnel, so the shell reads as
 * glass on a transparent canvas, a dark card and an ivory card alike.
 */
export const clearLexan = (tint = "#eef3f8", base = 0.05) =>
  cached(`dt:lexan:${tint}:${base}`, () => {
    // Diffuse is black: a clear dielectric only reflects; the body tint is added in the shader.
    const m = new THREE.MeshPhysicalMaterial({
      color: "#000000",
      metalness: 0,
      roughness: 0.045,
      specularIntensity: 1,
      ior: 1.58,
      envMapIntensity: 1.7,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    })
    const t = new THREE.Color(tint)
    const tv = `vec3( ${t.r.toFixed(4)}, ${t.g.toFixed(4)}, ${t.b.toFixed(4)} )`
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <opaque_fragment>", "")
        .replace("#include <tonemapping_fragment>", "")
        .replace(
          "#include <colorspace_fragment>",
          `
          vec3 lexV = normalize( vViewPosition );
          float lexF = pow( 1.0 - clamp( abs( dot( normal, lexV ) ), 0.0, 1.0 ), 3.0 );
          vec3 lexLit = outgoingLight;
          #if defined( TONE_MAPPING )
            lexLit = toneMapping( lexLit );
          #endif
          vec4 lexOut = linearToOutputTexel( vec4( lexLit, 1.0 ) );
          float lexBody = clamp( ${base.toFixed(3)} + lexF * 0.45, 0.0, 1.0 );
          vec3 lexTint = linearToOutputTexel( vec4( ${tv}, 1.0 ) ).rgb * lexBody * 0.22;
          float lexA = max( lexBody, max( lexOut.r, max( lexOut.g, lexOut.b ) ) );
          gl_FragColor = vec4( lexOut.rgb + lexTint, clamp( lexA, 0.0, 1.0 ) );
          `
        )
    }
    m.customProgramCacheKey = () => `lexan:${base}:${tint}`
    return m
  })

/** Satin sticker / pad print with a colour map. */
export function printed(map: THREE.Texture | null, fallback: string, roughness = 0.38) {
  const m = new THREE.MeshPhysicalMaterial({
    color: map ? "#ffffff" : fallback,
    map,
    roughness,
    metalness: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
    specularIntensity: 0.7,
    envMapIntensity: 1,
  })
  m.name = "dt:print"
  return m
}

/* ------------------------------------------------------------------------- */
/* Colour helpers                                                             */
/* ------------------------------------------------------------------------- */

export function hexToHsl(hex: string) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl, THREE.SRGBColorSpace)
  return hsl
}

/** True for silvers/greys — read as natural metal rather than an anodised tint. */
export const isNeutral = (hex: string) => hexToHsl(hex).s < 0.16

export function shade(hex: string, l: number, s = 1) {
  const hsl = hexToHsl(hex)
  const c = new THREE.Color()
  c.setHSL(hsl.h, clamp(hsl.s * s, 0, 1), clamp(l, 0, 1), THREE.SRGBColorSpace)
  return `#${c.getHexString(THREE.SRGBColorSpace)}`
}
