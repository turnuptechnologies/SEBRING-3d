import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/** An original circuit outline (not any real track) — straight, sweeper, hairpin, esses, chicane. */
const CIRCUIT =
  "M140 252C173 256 246.3 254.3 300 254C353.7 253.7 420.7 255 462 250C503.3 245 528 238.7 548 224C568 209.3 577.3 183 582 162C586.7 141 582.7 114.7 576 98C569.3 81.3 555 67.7 542 62C529 56.3 509.3 58 498 64C486.7 70 482 87 474 98C466 109 461 125.3 450 130C439 134.7 420 131.3 408 126C396 120.7 389.7 106 378 98C366.3 90 359.3 82 338 78C316.7 74 279.3 75.3 250 74C220.7 72.7 187.3 68.7 162 70C136.7 71.3 114 72.7 98 82C82 91.3 69.3 111.3 66 126C62.7 140.7 70 158.7 78 170C86 181.3 110 184 114 194C118 204 97.7 220.3 102 230C106.3 239.7 107 248 140 252Z"

/* A headlight streak lapping the circuit: one dash per layer, heads aligned. */
const LAP_CSS = `
@keyframes sebring-track-lap { from { stroke-dashoffset: var(--from); } to { stroke-dashoffset: var(--to); } }
.sebring-track-streak { animation: sebring-track-lap var(--lap, 11s) linear infinite; }
`

const streak = (len: number, lap: string): CSSProperties =>
  ({ strokeDasharray: `${len} ${1000 - len}`, "--from": len, "--to": len - 1000, "--lap": lap }) as CSSProperties

const SECTORS = [
  { x: 462, y: 250, label: "S1", dx: 8, dy: 18 },
  { x: 474, y: 98, label: "S2", dx: -26, dy: 4 },
  { x: 98, y: 82, label: "S3", dx: -6, dy: -12 },
]

/** Decorative circuit map for listing headers. Purely presentational. */
export function TrackArt({ className, lap = "11s", caption }: { className?: string; lap?: string; caption?: string }) {
  return (
    <div className={cn("relative text-foreground", className)} aria-hidden="true">
      <style href="sebring-track-art" precedence="medium">
        {LAP_CSS}
      </style>
      <svg viewBox="44 44 560 236" className="h-full w-full overflow-visible" fill="none">
        <path d={CIRCUIT} stroke="currentColor" strokeOpacity={0.055} strokeWidth={14} strokeLinejoin="round" />
        <path d={CIRCUIT} stroke="currentColor" strokeOpacity={0.24} strokeWidth={0.75} />
        <path d={CIRCUIT} stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} strokeDasharray="1 5" />

        {/* Start / finish */}
        <g transform="translate(176 245)">
          {[0, 1, 2, 3].map((row) =>
            [0, 1].map((col) => (
              <rect key={`${row}-${col}`} x={col * 3} y={row * 3.5} width={3} height={3.5} fill="currentColor" fillOpacity={(row + col) % 2 ? 0.08 : 0.5} />
            ))
          )}
        </g>
        <text x={176} y={236} className="fill-current font-mono text-[7px] tracking-[0.2em] opacity-40">S/F</text>

        {SECTORS.map((s) => (
          <g key={s.label}>
            <circle cx={s.x} cy={s.y} r={2.2} fill="var(--color-background)" stroke="currentColor" strokeOpacity={0.5} strokeWidth={0.8} />
            <text x={s.x + s.dx} y={s.y + s.dy} className="fill-current font-mono text-[7.5px] tracking-[0.2em] opacity-45">
              {s.label}
            </text>
          </g>
        ))}

        <path d={CIRCUIT} pathLength={1000} className="sebring-track-streak" style={streak(130, lap)} stroke="var(--color-volt)" strokeOpacity={0.1} strokeWidth={9} strokeLinecap="round" />
        <path d={CIRCUIT} pathLength={1000} className="sebring-track-streak" style={streak(60, lap)} stroke="var(--color-volt)" strokeOpacity={0.35} strokeWidth={2.4} strokeLinecap="round" />
        <path d={CIRCUIT} pathLength={1000} className="sebring-track-streak" style={streak(7, lap)} stroke="#fff4c4" strokeWidth={3.4} strokeLinecap="round" />
      </svg>
      {caption && <p className="absolute right-0 bottom-0 label-mono text-[0.625rem] text-foreground/35">{caption}</p>}
    </div>
  )
}
