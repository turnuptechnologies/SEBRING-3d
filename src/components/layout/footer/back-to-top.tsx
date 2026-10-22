"use client"

import { useLenis } from "lenis/react"
import { ArrowUp } from "lucide-react"
import type { MouseEvent } from "react"

import { cn } from "@/lib/utils"

/** easeInOutQuint — a long, smooth return run. */
const easeInOutQuint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2)

/**
 * Scrolls home with Lenis when it is running (reduced motion turns Lenis off),
 * otherwise natively. Keyboard users land on the first focusable element —
 * the skip link — exactly as if the page had just loaded.
 */
export function BackToTop({ className }: { className?: string }) {
  const lenis = useLenis()

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const viaKeyboard = e.detail === 0
    const button = e.currentTarget
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const settle = () => {
      if (viaKeyboard) document.querySelector<HTMLElement>("a[href='#main-content'], header a, header button")?.focus({ preventScroll: true })
      else button.blur()
    }
    if (lenis && !reduce) {
      lenis.scrollTo(0, { duration: 1.5, easing: easeInOutQuint, onComplete: settle })
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
      settle()
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/top inline-flex h-11 items-center gap-3 rounded-sm pr-1 pl-3 font-semiwide text-[11px] font-bold tracking-[0.12em] text-smoke-300 uppercase",
        "transition-colors duration-300 hover:text-foreground focus-visible:text-foreground active:translate-y-px",
        className
      )}
    >
      <span>Back to top</span>
      <span
        aria-hidden="true"
        className="relative grid size-9 place-items-center overflow-hidden rounded-sm border border-hairline transition-[border-color,background-color] duration-300 group-hover/top:border-volt/60 group-hover/top:bg-volt/[0.06] group-focus-visible/top:border-volt"
      >
        {/* Two arrows: the first leaves upward as the second arrives from below. */}
        <ArrowUp className="size-4 transition-transform duration-500 ease-out-expo group-hover/top:-translate-y-[180%]" />
        <ArrowUp className="absolute size-4 translate-y-[180%] text-volt transition-transform duration-500 ease-out-expo group-hover/top:translate-y-0" />
      </span>
    </button>
  )
}
