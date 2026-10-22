"use client"

import { ContactShadows, Environment, Lightformer } from "@react-three/drei"
import { Canvas, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo } from "react"
import * as THREE from "three"

import type { ProductView } from "@/lib/catalog/types"
import { frameBox, resolveViewAngle } from "@/lib/three/framing"

/**
 * The "Night Shift" product photography rig. Reflections come from a black
 * studio with shaped light sources — a feathered overhead softbox, twin
 * overhead strips that draw crisp lines down bonnets and roofs, long side
 * strips for the flank highlight, tall back strips that streak across tops in
 * three-quarter views — plus a warm key with soft shadow, a cool rim and a
 * contact shadow on a transparent floor. Every product render goes through
 * here, so the whole catalogue shares one photographic look.
 */
export interface StudioStageProps {
  object: THREE.Object3D
  view: ProductView
  width: number
  height: number
  /** Fired once the frame is stable (environment, shadows and framing done). */
  onReady?: () => void
  exposure?: number
  shadowOpacity?: number
  /** Solid background colour for previews. Null = transparent (renders). */
  background?: string | null
}

export function StudioStage({ exposure = 1, background = null, ...props }: StudioStageProps) {
  return (
    <Canvas
      style={{ width: props.width, height: props.height }}
      dpr={1}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: exposure,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: 24, position: [3, 1, 3], near: 0.001, far: 100 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 0)
        scene.background = background ? new THREE.Color(background) : null
      }}
    >
      <StudioScene {...props} />
    </Canvas>
  )
}

let feather: THREE.CanvasTexture | null = null

/** Soft-edged light panel: bright core falling off to the rim, like a diffused softbox. */
function featherTexture() {
  if (feather || typeof document === "undefined") return feather
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 128
  const g = c.getContext("2d")!
  const img = g.createImageData(c.width, c.height)
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const u = (x / (c.width - 1)) * 2 - 1
      const v = (y / (c.height - 1)) * 2 - 1
      const d = Math.min(1, Math.pow(Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4), 0.25))
      const k = Math.pow(1 - d, 0.55) * (0.35 + 0.65 * (1 - Math.abs(v) ** 2))
      const o = (y * c.width + x) * 4
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * k)
      img.data[o + 3] = 255
    }
  g.putImageData(img, 0, 0)
  feather = new THREE.CanvasTexture(c)
  feather.colorSpace = THREE.SRGBColorSpace
  return feather
}

function StudioScene({ object, view, width, height, onReady, shadowOpacity = 0.62 }: Omit<StudioStageProps, "exposure" | "background">) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const softbox = useMemo(() => featherTexture(), [])

  const { box, radius } = useMemo(() => {
    object.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(object)
    return { box: b, radius: Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.05) }
  }, [object])

  useLayoutEffect(() => {
    frameBox(camera, box, resolveViewAngle(object, view), width / height)
  }, [camera, box, object, view, width, height])

  useEffect(() => {
    let frames = 0
    let raf = 0
    const tick = () => {
      frames += 1
      if (frames >= 12) {
        onReady?.()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onReady, object, view])

  const r = radius
  return (
    <>
      <hemisphereLight args={["#f4f1ea", "#121218", 0.38]} />
      <directionalLight
        castShadow
        position={[r * 2.2, r * 4.6, r * 2.6]}
        intensity={2.1}
        color="#fff8ee"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.012}
        shadow-camera-left={-r * 1.6}
        shadow-camera-right={r * 1.6}
        shadow-camera-top={r * 1.6}
        shadow-camera-bottom={-r * 1.6}
        shadow-camera-near={r * 0.1}
        shadow-camera-far={r * 12}
      />
      {/* Cool rim from behind separates dark parts from dark backgrounds. */}
      <directionalLight position={[-r * 3, r * 2.4, -r * 3.4]} intensity={1.35} color="#dbe6ff" />
      <directionalLight position={[r * 3.5, r * 1.2, -r * 2.5]} intensity={0.55} color="#fff2d6" />
      <directionalLight position={[-r * 2.5, r * 0.8, r * 3]} intensity={0.35} color="#ffffff" />

      <Environment resolution={1024} frames={1}>
        {/* Feathered overhead softbox */}
        <Lightformer form="rect" intensity={1.7} map={softbox ?? undefined} color="#ffffff" scale={[9, 5, 1]} position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* Twin overhead strips running nose → tail: crisp lines along bonnets and roofs */}
        <Lightformer form="rect" intensity={3.2} color="#ffffff" scale={[0.32, 13, 1]} position={[-1.35, 6.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={3.2} color="#ffffff" scale={[0.32, 13, 1]} position={[1.35, 6.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* Long side strips — the flank highlight line */}
        <Lightformer form="rect" intensity={2.4} color="#ffffff" scale={[15, 0.55, 1]} position={[-6, 2.1, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={2.4} color="#ffffff" scale={[15, 0.55, 1]} position={[6, 2.1, 0]} rotation={[0, -Math.PI / 2, 0]} />
        {/* Low side fills — lift the lower flanks off black */}
        <Lightformer form="rect" intensity={0.55} color="#e9edf5" scale={[12, 1.6, 1]} position={[-6.5, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.55} color="#e9edf5" scale={[12, 1.6, 1]} position={[6.5, 0.6, 0]} rotation={[0, -Math.PI / 2, 0]} />
        {/* Tall back strips streak across tops in three-quarter views */}
        {[-4.2, -1.4, 1.4, 4.2].map((x) => (
          <Lightformer key={x} form="rect" intensity={1.5} color="#eef2ff" scale={[0.7, 4.5, 1]} position={[x, 2.6, -7]} />
        ))}
        {/* Front panel, warm */}
        <Lightformer form="rect" intensity={0.9} color="#fff4e2" scale={[9, 1.2, 1]} position={[0, 1.5, 7]} rotation={[0, Math.PI, 0]} />
        <Lightformer form="circle" intensity={0.7} color="#ffe2a8" scale={2} position={[5, 0.6, 5]} rotation={[0, -Math.PI / 4, 0]} />
        {/* Dark floor keeps the lower bodywork moody */}
        <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={30}>
          <planeGeometry />
          <meshBasicMaterial color="#09090c" />
        </mesh>
      </Environment>

      <primitive object={object} />

      <mesh rotation-x={-Math.PI / 2} position-y={0.0004} receiveShadow>
        <planeGeometry args={[r * 14, r * 14]} />
        <shadowMaterial transparent opacity={shadowOpacity * 0.55} />
      </mesh>
      <ContactShadows
        position={[0, 0.0008, 0]}
        scale={r * 4.5}
        opacity={shadowOpacity}
        blur={2.4}
        far={Math.max(r * 0.7, 0.02)}
        resolution={1024}
        frames={1}
        color="#000000"
      />
    </>
  )
}
