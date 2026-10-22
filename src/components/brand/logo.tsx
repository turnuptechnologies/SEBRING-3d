import { cn } from "@/lib/utils"

/** The S-track path: a slot-car lane drawn as an S, with the slot groove inside it. */
export const MARK_PATH =
  "M33.5 12.6C29.9 10.7 24.6 10.2 20.6 11.7 16.4 13.3 15 17.2 17.6 20 20.6 23.2 28.2 23 31.2 26.4 34 29.5 32.5 33.6 28 35.3 23.8 36.9 18 36.4 14.2 34.2"
/** Chamfered badge — top-left and bottom-right corners cut, like the buttons. */
export const BADGE_PATH = "M10 2H46V38L38 46H2V10Z"

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={BADGE_PATH} fill="var(--color-volt)" />
      <path d={MARK_PATH} fill="none" stroke="var(--color-carbon-900)" strokeWidth="7.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK_PATH} fill="none" stroke="var(--color-volt)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

interface LogoProps {
  className?: string
  /** "full" = mark + wordmark + tagline · "wordmark" = text only · "compact" = mark + wordmark */
  variant?: "full" | "wordmark" | "compact"
}

/**
 * Sebring lockup. Text-based wordmark (Archivo, expanded) so it stays crisp at
 * any size. Swap for the client's master logo artwork if they supply one.
 */
export function Logo({ className, variant = "full" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      {variant !== "wordmark" && <LogoMark />}
      <span className="flex flex-col leading-none" aria-hidden="true">
        <span className="font-wide text-[1.35rem] font-black tracking-[-0.045em]">SEBRING</span>
        {variant !== "compact" && (
          <span className="mt-1 font-mono text-[0.5rem] font-medium tracking-[0.34em] text-volt uppercase">Slot Cars &amp; Raceways</span>
        )}
      </span>
      <span className="sr-only">Sebring Slot Cars &amp; Raceways</span>
    </span>
  )
}
