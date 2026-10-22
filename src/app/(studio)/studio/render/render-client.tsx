"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"

import { products } from "@/lib/catalog/products"
import type { ProductArt, ProductView } from "@/lib/catalog/types"
import { buildProductObject } from "@/lib/three/build"
import { disposeObject } from "@/lib/three/materials"
import { StudioStage } from "@/lib/three/studio/studio-stage"

declare global {
  interface Window {
    __RENDER_READY__?: boolean
  }
}

function decodeSpec(spec: string): ProductArt | null {
  try {
    const json = atob(spec.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json) as ProductArt
  } catch {
    return null
  }
}

export function RenderClient() {
  const params = useSearchParams()
  const slug = params.get("slug")
  const spec = params.get("spec")
  const view = (params.get("view") ?? "hero") as ProductView
  const width = Number(params.get("w") ?? 1600)
  const height = Number(params.get("h") ?? 1200)
  const background = params.get("bg")

  const art = useMemo<ProductArt | null>(() => {
    if (spec) return decodeSpec(spec)
    return products.find((p) => p.slug === slug)?.art ?? null
  }, [slug, spec])

  const object = useMemo(() => (art ? buildProductObject(art, { quality: "high" }) : null), [art])
  useEffect(() => () => void (object && disposeObject(object)), [object])

  const onReady = useCallback(() => {
    window.__RENDER_READY__ = true
    document.body.dataset.renderReady = "1"
  }, [])

  if (!art || !object) {
    return <p id="render-error" className="p-6 font-mono text-sm text-signal">Unknown product or invalid spec.</p>
  }

  return (
    <div id="render-root" style={{ width, height }}>
      <StudioStage object={object} view={view} width={width} height={height} onReady={onReady} background={background ? `#${background}` : null} />
    </div>
  )
}
