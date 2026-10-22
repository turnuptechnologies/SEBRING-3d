import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps {
  children: ReactNode
  /** Seconds per loop. */
  duration?: number
  reverse?: boolean
  pauseOnHover?: boolean
  gap?: string
  className?: string
  /** Fade the edges. */
  fade?: boolean
}

/** Infinite, GPU-only CSS marquee. The duplicate copy is hidden from assistive tech. */
export function Marquee({ children, duration = 40, reverse = false, pauseOnHover = true, gap = "3rem", className, fade = true }: MarqueeProps) {
  const style = { "--marquee-duration": `${duration}s`, "--gap": gap } as CSSProperties
  const copy = "flex shrink-0 items-center gap-[var(--gap)] pr-[var(--gap)]"
  return (
    <div className={cn("group/marquee flex overflow-hidden", fade && "mask-fade-x", className)} style={style}>
      <div
        className={cn(
          "flex w-max animate-marquee motion-reduce:animate-none",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]"
        )}
      >
        <div className={copy}>{children}</div>
        <div className={copy} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
