import { cn } from "@/lib/utils"

/** Viewfinder corner brackets — the "telemetry" framing used on media and focus states. */
export function HudCorners({ className, size = 14, inset = 10 }: { className?: string; size?: number; inset?: number }) {
  const s = { width: size, height: size }
  const base = "absolute border-volt/80"
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 z-[1]", className)} style={{ margin: inset }}>
      <span className={cn(base, "top-0 left-0 border-t border-l")} style={s} />
      <span className={cn(base, "top-0 right-0 border-t border-r")} style={s} />
      <span className={cn(base, "bottom-0 left-0 border-b border-l")} style={s} />
      <span className={cn(base, "right-0 bottom-0 border-r border-b")} style={s} />
    </div>
  )
}
