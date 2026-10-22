import { cn } from "@/lib/utils"

const LETTERS = ["S", "E", "B", "R", "I", "N", "G"]

/*
 * CSS (not JS) so the arrival runs from the very first paint, before
 * hydration. Transform only: every letter is fully opaque at all times, so the
 * wordmark — the hero's LCP element — is visible immediately. Reduced motion
 * collapses the animation globally (globals.css).
 */
const KEYFRAMES = `
@keyframes sb-letter-in {
  from { transform: translate3d(0.38em, 0, 0) skewX(-16deg) scaleX(1.16); }
  to { transform: none; }
}
@keyframes sb-rule-in {
  from { transform: scaleX(0.15); }
  to { transform: none; }
}
`

/**
 * The hero lockup: the giant SEBRING wordmark with its "Slot cars & raceways"
 * tagline between fine rules and chequered flags. It is the page's h1.
 */
export function HeroWordmark({ id, className }: { id?: string; className?: string }) {
  return (
    <h1 id={id} aria-label="Sebring Slot Cars & Raceways" className={cn("flex w-fit flex-col items-stretch", className)}>
      <style href="sebring-hero-wordmark" precedence="default">
        {KEYFRAMES}
      </style>
      <span
        aria-hidden="true"
        className="flex justify-center font-wide text-hero font-black whitespace-nowrap select-none [filter:drop-shadow(0_18px_42px_rgb(0_0_0/0.55))]"
        // text-hero, but never wider than the viewport minus the site gutters (the word is ≈ 5.72em wide)
        // and short enough that the whole lockup ends above the scene's horizon on wide, short screens.
        style={{ fontSize: "min(var(--text-hero), calc((100cqw - 2 * clamp(1rem, 4vw, 3.5rem)) / 5.8), max(3.5rem, calc(50svh - 15rem)))" }}
      >
        {LETTERS.map((letter, i) => (
          <span
            key={letter + i}
            className="inline-block bg-[linear-gradient(180deg,#ffffff_0%,#f3efe6_42%,#d3cbba_74%,#9f9889_100%)] bg-clip-text pb-[0.04em] text-transparent"
            style={{ animation: `sb-letter-in 1.3s cubic-bezier(0.16, 1, 0.3, 1) ${60 + i * 52}ms both` }}
          >
            {letter}
          </span>
        ))}
      </span>

      <span aria-hidden="true" className="mt-[clamp(0.75rem,1.4vw,1.25rem)] flex items-center gap-[clamp(0.625rem,1.4vw,1.25rem)] px-[0.2%]">
        <span className="h-3 w-9 shrink-0 bg-checker opacity-75 [--checker-size:6px] max-sm:h-2 max-sm:w-6 max-sm:[--checker-size:4px]" />
        <Rule delay="0s" />
        <span className="shrink-0 font-mono text-[clamp(0.625rem,0.95vw,0.875rem)] leading-none font-medium tracking-[0.42em] whitespace-nowrap text-volt uppercase max-sm:tracking-[0.3em]">
          Slot cars &amp; raceways
        </span>
        <Rule delay="0.55s" />
        <span className="h-3 w-9 shrink-0 bg-checker opacity-75 [--checker-size:6px] [background-position:6px_0] max-sm:h-2 max-sm:w-6 max-sm:[--checker-size:4px] max-sm:[background-position:4px_0]" />
      </span>
    </h1>
  )
}

/** Hairline with a timing-beam glint passing through it. */
function Rule({ delay }: { delay: string }) {
  return (
    <span className="relative h-px min-w-6 flex-1 overflow-hidden" style={{ animation: "sb-rule-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both" }}>
      <span className="absolute inset-0 bg-ivory-100/28" />
      <span className="absolute inset-y-0 left-0 w-2/5 animate-sweep bg-gradient-to-r from-transparent via-volt to-transparent" style={{ animationDelay: delay }} />
    </span>
  )
}
