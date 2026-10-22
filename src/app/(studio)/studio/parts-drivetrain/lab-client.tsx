"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"

import type { PartArt, ProductView } from "@/lib/catalog/types"
import { disposeObject } from "@/lib/three/materials"
import { buildDrivetrainPart } from "@/lib/three/parts/drivetrain"
import { DRIVETRAIN_SAMPLES, findSample } from "@/lib/three/parts/drivetrain/samples"
import { StudioStage } from "@/lib/three/studio/studio-stage"

declare global {
  interface Window {
    __RENDER_READY__?: boolean
  }
}

const VIEWS: ProductView[] = ["hero", "detail", "alt"]
const CARDS = [
  { id: "131319", label: "Carbon card" },
  { id: "f3efe6", label: "Ivory card" },
]

const hex = (v: string | null) => (v && /^[0-9a-f]{3,8}$/i.test(v) ? `#${v}` : undefined)

/** `p.teeth=12&p.diameter=20` → { teeth: 12, diameter: 20 } */
function readParams(sp: URLSearchParams) {
  const out: Record<string, number> = {}
  for (const [k, v] of sp.entries()) {
    if (!k.startsWith("p.")) continue
    const n = Number(v)
    if (Number.isFinite(n)) out[k.slice(2)] = n
  }
  return out
}

export function LabClient() {
  const sp = useSearchParams()
  const sample = findSample(sp.get("model"))
  const variant = sp.get("variant") || sample?.variants[0]
  const view = (VIEWS as string[]).includes(sp.get("view") ?? "") ? (sp.get("view") as ProductView) : "hero"
  const width = Number(sp.get("w") ?? 1600)
  const height = Number(sp.get("h") ?? 1200)
  const background = hex(sp.get("bg")) ?? null
  const exposure = Number(sp.get("exposure") ?? 1)
  const shadow = sp.get("shadow") ? Number(sp.get("shadow")) : undefined
  const overrides = sp.toString()

  const art = useMemo<PartArt | null>(() => {
    if (!sample) return null
    const q = new URLSearchParams(overrides)
    const base = sample.art(variant)
    return {
      ...base,
      color: hex(q.get("color")) ?? base.color,
      secondary: hex(q.get("secondary")) ?? base.secondary,
      accent: hex(q.get("accent")) ?? base.accent,
      params: { ...base.params, ...readParams(q) },
    }
  }, [sample, variant, overrides])

  const object = useMemo(() => (art ? buildDrivetrainPart(art, { quality: "high" }) : null), [art])
  useEffect(() => () => void (object && disposeObject(object)), [object])

  const onReady = useCallback(() => {
    window.__RENDER_READY__ = true
    document.body.dataset.renderReady = "1"
  }, [])

  if (!art || !object) return <LabIndex />

  return (
    <div id="render-root" style={{ width, height }}>
      <StudioStage object={object} view={view} width={width} height={height} onReady={onReady} background={background} exposure={exposure} shadowOpacity={shadow} />
    </div>
  )
}

function LabIndex() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 text-ivory-100 sm:px-8">
      <p className="font-mono text-xs tracking-[0.2em] text-volt uppercase">Studio · Lab</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Drivetrain parts</h1>
      <p className="mt-3 max-w-2xl text-sm text-smoke-400">
        Procedural macro product photography for motors, gears, tires, hubs, axles, magnets, guides, chassis and body shells. Query:{" "}
        <code className="font-mono text-ivory-200">?model=&amp;variant=&amp;view=&amp;w=&amp;h=&amp;bg=&amp;color=&amp;secondary=&amp;accent=&amp;p.teeth=</code>
      </p>
      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-carbon-600 bg-carbon-600 sm:grid-cols-2">
        {DRIVETRAIN_SAMPLES.map((s) => (
          <section key={s.model} className="bg-carbon-850 p-5">
            <h2 className="font-mono text-xs tracking-[0.18em] text-smoke-400 uppercase">{s.model}</h2>
            <p className="mt-1 text-lg text-ivory-100">{s.label}</p>
            <ul className="mt-4 space-y-2">
              {s.variants.map((v) => (
                <li key={v} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="w-24 text-smoke-300">{v}</span>
                  {VIEWS.map((view) =>
                    CARDS.map((c) => (
                      <Link
                        key={`${view}-${c.id}`}
                        href={`/studio/parts-drivetrain?model=${s.model}&variant=${v}&view=${view}&w=1200&h=900&bg=${c.id}`}
                        className="rounded border border-carbon-500 px-2 py-1 text-ivory-200 transition-colors hover:border-volt hover:text-volt"
                      >
                        {view} · {c.id === "131319" ? "dark" : "ivory"}
                      </Link>
                    ))
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
