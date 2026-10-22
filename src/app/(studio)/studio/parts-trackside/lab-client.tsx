"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"

import type { PartArt, ProductView } from "@/lib/catalog/types"
import { buildProductObject } from "@/lib/three/build"
import { disposeObject } from "@/lib/three/materials"
import { TRACKSIDE_PRESETS, findTracksidePreset } from "@/lib/three/parts/trackside/presets"
import { StudioStage } from "@/lib/three/studio/studio-stage"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    __RENDER_READY__?: boolean
  }
}

const VIEWS: ProductView[] = ["hero", "detail", "alt", "side", "rear", "top"]
const BACKDROPS: Record<string, string | null> = { none: null, dark: "#131319", ivory: "#F3EFE6" }

const subscribe = () => () => {}
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false)

function decodeSpec(spec: string): PartArt | null {
  try {
    const art = JSON.parse(atob(spec.replace(/-/g, "+").replace(/_/g, "/"))) as PartArt
    return art.kind === "part" ? art : null
  } catch {
    return null
  }
}

/** Preset (by key or model + variant), then colour / param overrides from the query string. */
function resolveArt(query: URLSearchParams): PartArt | null {
  const spec = query.get("spec")
  if (spec) return decodeSpec(spec)
  const preset =
    TRACKSIDE_PRESETS.find((p) => p.key === query.get("key")) ?? findTracksidePreset(query.get("model"), query.get("variant"))
  if (!preset) return null
  const art: PartArt = { ...preset.art, params: { ...preset.art.params } }
  for (const field of ["color", "secondary", "accent"] as const) {
    const value = query.get(field)
    if (value) art[field] = value.startsWith("#") ? value : `#${value}`
  }
  for (const [name, value] of query.entries()) {
    if (name.startsWith("p.") && Number.isFinite(Number(value))) art.params = { ...art.params, [name.slice(2)]: Number(value) }
  }
  return art
}

function hrefWith(query: URLSearchParams, patch: Record<string, string | null>) {
  const next = new URLSearchParams(query)
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k)
    else next.set(k, v)
  }
  return `/studio/parts-trackside?${next.toString()}`
}

export function TracksideLab() {
  const query = useSearchParams()
  const isClient = useIsClient()
  const view = (query.get("view") ?? "hero") as ProductView
  const width = Number(query.get("w") ?? 1200)
  const height = Number(query.get("h") ?? 900)
  const backdropKey = query.get("bg") ?? "dark"
  const background = backdropKey in BACKDROPS ? BACKDROPS[backdropKey] : `#${backdropKey}`
  const showUi = query.get("ui") !== "0"
  const queryKey = query.toString()

  const art = useMemo(() => resolveArt(new URLSearchParams(queryKey)), [queryKey])
  const object = useMemo(() => (isClient && art ? buildProductObject(art, { quality: "high" }) : null), [isClient, art])
  useEffect(() => () => void (object && disposeObject(object)), [object])

  const onReady = useCallback(() => {
    window.__RENDER_READY__ = true
    document.body.dataset.renderReady = "1"
  }, [])

  if (!art) {
    return <p id="render-error" className="p-6 font-mono text-sm text-signal">Unknown trackside preset or invalid spec.</p>
  }

  return (
    <div className="flex items-start gap-6">
      <div id="render-root" style={{ width, height }}>
        {object ? (
          <StudioStage object={object} view={view} width={width} height={height} onReady={onReady} background={background} />
        ) : null}
      </div>
      {showUi ? (
        <aside className="flex w-72 shrink-0 flex-col gap-5 py-6 pr-6 font-mono text-xs text-smoke-400">
          <section className="flex flex-col gap-1.5">
            <h2 className="text-eyebrow uppercase text-ivory-100">Preset</h2>
            {TRACKSIDE_PRESETS.map((p) => (
              <Link
                key={p.key}
                href={hrefWith(query, { key: p.key, model: null, variant: null, spec: null })}
                className={cn("hover:text-volt", p.art.model === art.model && p.art.variant === art.variant && "text-volt")}
              >
                {p.label}
              </Link>
            ))}
          </section>
          <section className="flex flex-wrap gap-2">
            <h2 className="w-full text-eyebrow uppercase text-ivory-100">View</h2>
            {VIEWS.map((v) => (
              <Link key={v} href={hrefWith(query, { view: v })} className={cn("hover:text-volt", v === view && "text-volt")}>
                {v}
              </Link>
            ))}
          </section>
          <section className="flex flex-wrap gap-2">
            <h2 className="w-full text-eyebrow uppercase text-ivory-100">Backdrop</h2>
            {Object.keys(BACKDROPS).map((b) => (
              <Link key={b} href={hrefWith(query, { bg: b })} className={cn("hover:text-volt", b === backdropKey && "text-volt")}>
                {b}
              </Link>
            ))}
          </section>
          <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed text-smoke-500">{JSON.stringify(art, null, 1)}</pre>
        </aside>
      ) : null}
    </div>
  )
}
