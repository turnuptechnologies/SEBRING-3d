import { useId, type ReactNode } from "react"

import type { Livery } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

/** The livery band for each pattern, drawn in a 120 × 90 box. */
function patternShape(livery: Livery, gradientId: string): ReactNode {
  const { secondary, accent } = livery
  switch (livery.pattern) {
    case "center-stripes":
      return (
        <>
          <rect x="47" y="0" width="10" height="90" fill={secondary} />
          <rect x="63" y="0" width="10" height="90" fill={secondary} />
          <rect x="59.2" y="0" width="1.6" height="90" fill={accent} opacity="0.8" />
        </>
      )
    case "side-stripe":
      return (
        <>
          <rect x="0" y="50" width="120" height="14" fill={secondary} />
          <rect x="0" y="66" width="120" height="1.6" fill={accent} opacity="0.8" />
        </>
      )
    case "split":
      return <rect x="60" y="0" width="60" height="90" fill={secondary} />
    case "sash":
      return (
        <>
          <polygon points="18,90 46,90 112,0 84,0" fill={secondary} />
          <polygon points="48,90 52,90 118,0 114,0" fill={accent} opacity="0.8" />
        </>
      )
    case "chevron":
      return <polygon points="120,10 86,10 60,45 86,80 120,80 94,45" fill={secondary} />
    case "hoop":
      return (
        <>
          <rect x="72" y="0" width="16" height="90" fill={secondary} />
          <rect x="69" y="0" width="1.6" height="90" fill={accent} opacity="0.8" />
        </>
      )
    case "fade":
      return <rect x="0" y="0" width="120" height="90" fill={`url(#${gradientId}-fade)`} />
    default:
      return null
  }
}

/**
 * A paint chip of a car's livery — base, pattern and race number. Used where a
 * product render is not available yet, so each car still reads as itself.
 */
export function LiveryChip({ livery, className }: { livery: Livery; className?: string }) {
  const id = useId().replace(/:/g, "")
  const plate = livery.numberPlate ?? "roundel"
  return (
    <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" className={cn("absolute inset-0 size-full", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.25" stopColor={livery.base} />
          <stop offset="1" stopColor={livery.secondary} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill={livery.base} />
      {patternShape(livery, id)}
      {plate !== "none" && (
        <g>
          {plate === "roundel" ? <circle cx="30" cy="45" r="17" fill="#f4f4f2" /> : <rect x="13" y="29" width="34" height="32" rx="2" fill="#f4f4f2" />}
          <text
            x="30"
            y="45"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#0b0b0f"
            style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"wdth" 112', fontWeight: 900, fontSize: livery.number > 99 ? 13 : 17, letterSpacing: "-0.04em" }}
          >
            {livery.number}
          </text>
        </g>
      )}
      <rect width="120" height="90" fill={`url(#${id}-gloss)`} />
    </svg>
  )
}
