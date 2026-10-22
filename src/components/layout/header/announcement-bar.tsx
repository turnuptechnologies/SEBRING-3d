"use client"

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion"
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react"

import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { InlineScript } from "@/components/layout/header/inline-script"
import { indexLabel } from "@/lib/format"
import { announcements, site } from "@/lib/site"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "sebring-announcements-dismissed"
const DISMISS_EVENT = "sebring:announcements-dismissed"
const ROTATE_MS = 5000

const subscribe = (cb: () => void) => {
  window.addEventListener(DISMISS_EVENT, cb)
  return () => window.removeEventListener(DISMISS_EVENT, cb)
}
const readDismissed = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

const slide: Variants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0, filter: "blur(4px)" }),
  center: { y: "0%", opacity: 1, filter: "blur(0px)", transition: { duration: 0.65, ease: EASE_OUT_EXPO } },
  exit: (dir: number) => ({ y: dir > 0 ? "-100%" : "100%", opacity: 0, filter: "blur(4px)", transition: { duration: 0.45, ease: EASE_OUT_EXPO } }),
}

/**
 * Slim rotating announcement strip. Auto-advances every 5 s with a telemetry
 * progress hairline, pauses on hover/focus, has prev/next and a dismiss that
 * lasts for the session (applied before first paint on reload — no shift).
 */
export function AnnouncementBar() {
  const id = useId()
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false)
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const progressRef = useRef<HTMLSpanElement>(null)
  const animRef = useRef<Animation | null>(null)

  const count = announcements.length
  const paused = hovered || focused
  const autoplay = !reduce && count > 1 && !dismissed
  const current = announcements[index]

  const go = (delta: number) => {
    setDir(delta)
    setIndex((i) => (i + delta + count) % count)
  }

  const isPaused = useEffectEvent(() => paused)
  const advance = useEffectEvent(() => go(1))

  // The progress hairline *is* the timer: when it fills, the next message rolls in.
  useEffect(() => {
    const el = progressRef.current
    if (!el || !autoplay) return
    const anim = el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ROTATE_MS, easing: "linear", fill: "both" })
    animRef.current = anim
    if (isPaused()) anim.pause()
    anim.onfinish = () => advance()
    return () => {
      anim.cancel()
      animRef.current = null
    }
  }, [index, autoplay])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (paused) anim.pause()
    else anim.play()
  }, [paused])

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    window.dispatchEvent(new Event(DISMISS_EVENT))
  }

  if (!count) return null

  return (
    <>
      <div
        id={id}
        data-dismissed={dismissed ? "" : undefined}
        suppressHydrationWarning
        className="grid grid-rows-[1fr] transition-[grid-template-rows,visibility] duration-500 ease-out-expo data-[dismissed]:invisible data-[dismissed]:grid-rows-[0fr]"
      >
        <div className="min-h-0 overflow-hidden">
          <section
            aria-roledescription="carousel"
            aria-label="Store announcements"
            onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
            className="relative border-b border-hairline bg-carbon-950"
          >
            <div className="container-site flex h-9 items-center gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6">
              <p className="hidden items-center gap-2 label-mono text-[0.625rem] text-smoke-500 md:flex" aria-hidden="true">
                <span className="text-volt tabular">{indexLabel(index + 1)}</span>
                <span className="h-px w-4 bg-current opacity-50" />
                <span className="tabular">{indexLabel(count)}</span>
              </p>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-1 md:flex-none">
                <BarButton label="Previous announcement" onClick={() => go(-1)} className="max-sm:hidden">
                  <ChevronLeft />
                </BarButton>
                <div
                  className="relative h-9 min-w-0 flex-1 overflow-hidden md:w-[min(34rem,44vw)] md:flex-none"
                  aria-live={autoplay && !paused ? "off" : "polite"}
                  aria-atomic="true"
                >
                  <AnimatePresence initial={false} custom={dir}>
                    <motion.div
                      key={index}
                      custom={dir}
                      variants={slide}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} of ${count}`}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Link
                        href={current.href}
                        className="group/msg inline-flex max-w-full items-center gap-2 font-mono text-[0.625rem] tracking-[0.12em] text-ivory-200 uppercase outline-none transition-colors duration-300 hover:text-ivory-50 focus-visible:text-ivory-50 focus-visible:outline-offset-[-2px] sm:text-[0.6875rem] sm:tracking-[0.16em]"
                      >
                        <span className="truncate">{current.text}</span>
                        <ArrowRight aria-hidden="true" className="size-3 shrink-0 text-volt transition-transform duration-500 ease-out-expo group-hover/msg:translate-x-1" />
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <BarButton label="Next announcement" onClick={() => go(1)} className="max-sm:hidden">
                  <ChevronRight />
                </BarButton>
              </div>

              <div className="flex items-center justify-end gap-3">
                <a
                  href={site.phoneHref}
                  className="hidden label-mono text-[0.625rem] text-smoke-400 outline-none transition-colors duration-300 hover:text-ivory-50 focus-visible:text-ivory-50 lg:inline"
                >
                  Help <span className="text-smoke-600">·</span> <span className="tabular">{site.phone}</span>
                </a>
                <BarButton label="Dismiss announcements" onClick={dismiss}>
                  <X />
                </BarButton>
              </div>
            </div>
            <span
              ref={progressRef}
              aria-hidden="true"
              className={cn("absolute bottom-[-1px] left-0 h-px w-full origin-left scale-x-0 bg-volt/80", !autoplay && "hidden")}
            />
          </section>
        </div>
      </div>
      <InlineScript
        html={`try{if(sessionStorage.getItem(${JSON.stringify(STORAGE_KEY)})==="1"){var e=document.getElementById(${JSON.stringify(id)});if(e)e.setAttribute("data-dismissed","")}}catch(e){}`}
      />
    </>
  )
}

function BarButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-sm text-smoke-400 outline-none transition-colors duration-300 hover:bg-white/[0.06] hover:text-ivory-50 focus-visible:text-ivory-50 focus-visible:outline-offset-[-2px]",
        "after:absolute after:-inset-1.5 after:content-[''] [&_svg]:size-3.5",
        className
      )}
    >
      {children}
    </button>
  )
}
