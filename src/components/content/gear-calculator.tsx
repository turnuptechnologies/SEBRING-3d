"use client"

import { useState } from "react"

import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

/**
 * Gear ratio = crown ÷ pinion. Rollout = tire circumference ÷ ratio (mm the car
 * travels per motor revolution). Scale speed = real speed × scale factor.
 */
export function gearMath({ pinion, crown, tire, rpm, scale }: { pinion: number; crown: number; tire: number; rpm: number; scale: number }) {
  const ratio = crown / pinion
  const rollout = (Math.PI * tire) / ratio
  const realMs = (rpm * rollout) / 60 / 1000
  return { ratio, rollout, realMph: realMs * 2.23694, scaleMph: realMs * 2.23694 * scale }
}

const CONTROLS = [
  { key: "pinion", label: "Pinion teeth", min: 8, max: 14, step: 1, unit: "T" },
  { key: "crown", label: "Crown / spur teeth", min: 24, max: 40, step: 1, unit: "T" },
  { key: "tire", label: "Rear tire diameter", min: 17, max: 30, step: 0.1, unit: "mm" },
  { key: "rpm", label: "Motor speed", min: 15000, max: 30000, step: 500, unit: "rpm" },
] as const

export function GearCalculator() {
  const [v, setV] = useState({ pinion: 11, crown: 27, tire: 20, rpm: 21500, scale: 32 })
  const r = gearMath(v)
  return (
    <div className="grid gap-8 rounded-lg border border-hairline bg-card p-6 md:p-8 lg:grid-cols-2">
      <div className="grid gap-7">
        {CONTROLS.map((c) => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between">
              <label id={`gc-${c.key}`} className="text-sm font-medium">{c.label}</label>
              <span className="font-mono text-sm text-volt tabular">
                {c.key === "rpm" ? v.rpm.toLocaleString("en-US") : v[c.key]} {c.unit}
              </span>
            </div>
            <Slider aria-labelledby={`gc-${c.key}`} className="mt-3" min={c.min} max={c.max} step={c.step} value={[v[c.key]]} onValueChange={([x]) => setV((s) => ({ ...s, [c.key]: x }))} />
          </div>
        ))}
        <div className="flex gap-2" role="group" aria-label="Scale">
          {[32, 24].map((s) => (
            <button key={s} type="button" onClick={() => setV((x) => ({ ...x, scale: s }))} aria-pressed={v.scale === s} className={cn("rounded-full border px-4 py-2 font-mono text-sm transition-colors", v.scale === s ? "border-volt bg-volt text-carbon-900" : "border-hairline hover:border-foreground/30")}>
              1:{s}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 self-start" aria-live="polite">
        <Stat label="Gear ratio" value={`${r.ratio.toFixed(2)}:1`} big />
        <Stat label="Rollout" value={`${r.rollout.toFixed(1)} mm`} big />
        <Stat label="Real top speed" value={`${r.realMph.toFixed(1)} mph`} />
        <Stat label={`Scale speed (1:${v.scale})`} value={`${Math.round(r.scaleMph)} mph`} />
        <p className="col-span-2 mt-2 text-xs text-muted-foreground">Theoretical, before tire slip and voltage drop. Lower rollout = more acceleration; higher = more top speed.</p>
      </dl>
    </div>
  )
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-md border border-hairline bg-carbon-850 p-4">
      <dt className="label-mono text-muted-foreground">{label}</dt>
      <dd className={cn("mt-2 font-wide font-black tabular", big ? "text-3xl text-volt" : "text-xl")}>{value}</dd>
    </div>
  )
}
