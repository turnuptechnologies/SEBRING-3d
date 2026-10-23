"use client"

import { useEffect, useState } from "react"

import { LogoMark } from "@/components/brand/logo"

const KEY = "sb-intro"
const MIN_MS = 900
const MAX_MS = 2400

/**
 * Race-start preloader shown on the first page view of a session.
 * Five start lights fill as real work finishes (fonts, above-the-fold images,
 * page load), then "lights out" lifts the curtain. An inline head script
 * hides it before paint on later views, and CSS retires it after 3s even if
 * JavaScript never runs.
 */
export function Preloader() {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<"loading" | "out" | "gone">("loading")

  useEffect(() => {
    const html = document.documentElement
    // Already played this session: CSS keeps it display:none.
    if (html.dataset.intro === "done") return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t0 = performance.now()
    const tasks: Promise<unknown>[] = []
    const track = (p: Promise<unknown>) => tasks.push(p.catch(() => {}))

    track(document.fonts?.ready ?? Promise.resolve())
    const fold = [...document.images].filter((img) => img.getBoundingClientRect().top < window.innerHeight && !img.complete)
    fold.forEach((img) =>
      track(
        new Promise((r) => {
          img.addEventListener("load", r, { once: true })
          img.addEventListener("error", r, { once: true })
        })
      )
    )
    if (document.readyState !== "complete") track(new Promise((r) => window.addEventListener("load", r, { once: true })))

    // Displayed progress eases toward max(real progress, elapsed-time share) so the lights fill smoothly.
    let done = 0
    let real = 0
    let raf = 0
    const total = Math.max(1, tasks.length)
    tasks.forEach((t) => t.then(() => (real = ++done / total)))
    const tick = () => {
      const timeShare = Math.min(0.9, (performance.now() - t0) / MAX_MS)
      setProgress((p) => Math.min(99, Math.max(p, Math.round(Math.max(real * 0.95, timeShare) * 100))))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      const wait = Math.max(0, (reduce ? 200 : MIN_MS) - (performance.now() - t0))
      window.setTimeout(() => {
        cancelAnimationFrame(raf)
        setProgress(100)
        setPhase("out")
        try {
          sessionStorage.setItem(KEY, "1")
        } catch {}
        window.setTimeout(() => {
          html.dataset.intro = "done"
          setPhase("gone")
        }, reduce ? 150 : 900)
      }, wait)
    }
    Promise.all(tasks).then(finish)
    const cap = window.setTimeout(finish, MAX_MS)
    return () => {
      window.clearTimeout(cap)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (phase === "gone") return null
  const lit = Math.min(5, Math.ceil(progress / 20))
  return (
    <div id="preloader" data-phase={phase} aria-hidden="true">
      <div className="preloader-inner">
        <LogoMark className="size-10" />
        <div className="preloader-lights">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} data-on={phase === "loading" && i < lit ? "" : undefined} />
          ))}
        </div>
        <p className="preloader-label">
          <span>{phase === "out" ? "Lights out" : "Grid forming"}</span>
          <span className="tabular">{String(progress).padStart(3, "0")}%</span>
        </p>
      </div>
    </div>
  )
}
