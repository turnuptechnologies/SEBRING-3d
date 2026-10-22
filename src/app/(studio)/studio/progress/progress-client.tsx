"use client"

import { useEffect, useState } from "react"

import { Logo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

interface Data {
  now: number
  areas: { key: string; label: string; file: string; links: readonly string[]; exists: boolean; placeholder: boolean; updated: number | null }[]
  workflows: { id: string; name: string; agents: { label: string; phase: string; done: boolean; score?: number }[] }[]
  images: { rel: string; group: string; mtime: number; size: number }[]
}

const ago = (now: number, t: number | null) => {
  if (!t) return "—"
  const s = Math.max(0, Math.round((now - t) / 1000))
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`
}

/** Live build dashboard — refreshes every 10 seconds. */
export function ProgressClient() {
  const [data, setData] = useState<Data | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch("/studio/progress/data", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: Data) => alive && setData(d))
        .catch(() => {})
    load()
    const id = window.setInterval(load, 10_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  if (!data) return <p className="p-10 label-mono text-muted-foreground">Loading build status…</p>
  const done = data.areas.filter((a) => !a.placeholder).length

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 text-foreground">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-hairline pb-8">
        <div>
          <Logo />
          <h1 className="mt-6 font-wide text-headline font-black uppercase">Build progress</h1>
          <p className="mt-3 text-muted-foreground">Live view of the agents building the site. Auto-refreshes every 10 seconds.</p>
        </div>
        <div className="text-right">
          <p className="font-wide text-display font-black text-volt">
            {done}/{data.areas.length}
          </p>
          <p className="label-mono text-muted-foreground">areas landed (placeholders replaced)</p>
        </div>
      </header>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.areas.map((a) => (
          <div key={a.key} className="rounded-lg border border-hairline bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semiwide font-bold">{a.label}</p>
              <span className={cn("label-mono rounded-[3px] px-2 py-1", a.placeholder ? "bg-carbon-700 text-smoke-400" : "bg-volt text-carbon-900")}>
                {a.placeholder ? "In progress" : "Landed"}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {a.file} · updated {ago(data.now, a.updated)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.links.map((l) => (
                <a key={l} href={l} target="_blank" rel="noreferrer" className="rounded-sm border border-hairline px-2 py-1 font-mono text-xs hover:border-volt hover:text-volt">
                  {l}
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        {data.workflows.map((w) => (
          <div key={w.id} className="rounded-lg border border-hairline bg-card p-5">
            <p className="font-semiwide font-bold">{w.name}</p>
            <p className="label-mono mt-1 text-muted-foreground">
              {w.agents.filter((a) => a.done).length} finished · {w.agents.filter((a) => !a.done).length} running
            </p>
            <ul className="mt-4 grid gap-1.5 font-mono text-xs">
              {w.agents.map((a, i) => (
                <li key={`${a.label}-${i}`} className="flex items-center justify-between gap-3 border-b border-hairline/50 pb-1.5">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", a.done ? "bg-go" : "animate-live bg-volt")} />
                    {a.label}
                  </span>
                  <span className="text-muted-foreground">{a.score != null ? `score ${a.score}/10` : a.done ? "done" : a.phase}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-wide text-title font-black uppercase">Latest screenshots from the agents</h2>
        <p className="mt-2 text-sm text-muted-foreground">Newest first — renders, contact sheets and page captures the agents are reviewing. Click to enlarge.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {data.images.map((img) => (
            <button key={img.rel} type="button" onClick={() => setZoom(img.rel)} className="group overflow-hidden rounded-lg border border-hairline bg-carbon-850 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/studio/progress/file?p=${encodeURIComponent(img.rel)}&t=${img.mtime}`} alt={img.rel} loading="lazy" className="aspect-[4/3] w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
              <span className="block truncate px-3 py-2 font-mono text-[11px] text-muted-foreground">
                <span className="text-volt">{img.group}</span> · {ago(data.now, img.mtime)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {zoom && (
        <button type="button" onClick={() => setZoom(null)} className="fixed inset-0 z-[90] grid place-items-center bg-black/90 p-6" aria-label="Close preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/studio/progress/file?p=${encodeURIComponent(zoom)}`} alt={zoom} className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </div>
  )
}
