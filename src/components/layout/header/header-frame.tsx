"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { HeaderContext, type HeaderContextValue, type RouteInfo } from "@/components/layout/header/header-context"
import type { MenuKey } from "@/components/layout/header/nav-data"
import { RouteWatcher } from "@/components/layout/header/route-watcher"
import { cn } from "@/lib/utils"

interface HeaderFrameProps {
  announcement: ReactNode
  logo: ReactNode
  search: ReactNode
  actions: ReactNode
  nav: ReactNode
  overlays: ReactNode
}

/** Distance from the top before the header may tuck, px. */
const TUCK_AFTER = 160
/** Continuous downward travel that tucks it. */
const TUCK_TRAVEL = 24
/** Upward travel that brings it back. */
const REVEAL_TRAVEL = 8
/** Resting the mouse on a tucked header brings the department row back. */
const HOVER_REVEAL_DELAY = 320

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")

/**
 * Sticky store header. The in-flow height never changes (no layout shift):
 * tucking only translates layers. Desktop tucks the department row behind the
 * main bar, mobile slides the bar away; both come back on scroll up and never
 * tuck while a menu, search or keyboard focus is inside.
 */
export function HeaderFrame({ announcement, logo, search, actions, nav, overlays }: HeaderFrameProps) {
  const [menu, setMenuState] = useState<MenuKey | null>(null)
  const [searchOpen, setSearchOpenState] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastRoute = useRef<string | null>(null)
  const revealTimer = useRef<number | undefined>(undefined)

  const setMenu = useCallback((next: MenuKey | null) => {
    setMenuState(next)
    if (next) setSearchOpenState(false)
  }, [])

  const setSearchOpen = useCallback((open: boolean) => {
    setSearchOpenState(open)
    if (open) setMenuState(null)
  }, [])

  const closeAll = useCallback(() => {
    setMenuState(null)
    setSearchOpenState(false)
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
  }, [])

  // Transient UI never survives being hidden by <Activity> (or unmounting).
  useLayoutEffect(() => closeAll, [closeAll])

  const onRoute = useCallback(
    (next: RouteInfo) => {
      const key = `${next.pathname}?${next.search}`
      if (lastRoute.current !== null && lastRoute.current !== key) closeAll()
      lastRoute.current = key
      setRoute(next)
    },
    [closeAll]
  )

  // Glass once content passes underneath; tuck on deliberate downward scroll.
  useEffect(() => {
    let lastY = window.scrollY
    let travel = 0
    let frame = 0
    const update = () => {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const dy = y - lastY
      lastY = y
      setScrolled(y > 4)
      if (y < TUCK_AFTER) {
        travel = 0
        setTucked(false)
        return
      }
      if (dy === 0) return
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy
      if (travel > TUCK_TRAVEL) setTucked(true)
      else if (travel < -REVEAL_TRAVEL) setTucked(false)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // "/" and ⌘K / Ctrl+K jump to search (the overlay on small screens).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const combo = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k"
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)
      if (!combo && !slash) return
      // Another dialog (cart, menu, search overlay) owns the keyboard.
      if (document.querySelector("[role='dialog'][data-state='open']")) return
      e.preventDefault()
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setMenuState(null)
        setTucked(false)
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else {
        setMobileSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => () => window.clearTimeout(revealTimer.current), [])

  // Only keyboard focus pins the header open (a clicked button keeps focus too).
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).matches(":focus-visible")) setFocusWithin(true)
  }
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false)
  }

  const onMainEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !tucked) return
    window.clearTimeout(revealTimer.current)
    revealTimer.current = window.setTimeout(() => setTucked(false), HOVER_REVEAL_DELAY)
  }
  const onMainLeave = () => window.clearTimeout(revealTimer.current)

  const anyOpen = menu !== null || searchOpen || mobileMenuOpen || mobileSearchOpen
  const compact = tucked && !anyOpen && !focusWithin
  const glass = scrolled || anyOpen
  const dim = menu !== null || searchOpen

  const ctx: HeaderContextValue = {
    menu,
    setMenu,
    searchOpen,
    setSearchOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileSearchOpen,
    setMobileSearchOpen,
    closeAll,
    route,
    searchInputRef,
    compact,
    scrolled,
  }

  return (
    <HeaderContext value={ctx}>
      {announcement}
      <header
        data-compact={compact || undefined}
        data-scrolled={scrolled || undefined}
        onFocus={onFocus}
        onBlur={onBlur}
        className="pointer-events-none sticky top-0 z-50 h-15 lg:h-28"
      >
        {/* Page dim behind an open mega menu or search. */}
        <div
          aria-hidden="true"
          className={cn(
            "fixed inset-0 -z-10 bg-carbon-950/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-500 ease-out-expo",
            dim && "pointer-events-auto opacity-100"
          )}
        />

        <div
          onPointerEnter={onMainEnter}
          onPointerLeave={onMainLeave}
          className={cn(
            "pointer-events-auto relative z-20 h-15 transition-transform duration-500 ease-out-expo lg:h-17",
            compact && "max-lg:-translate-y-full"
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 -z-10 border-b border-transparent transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500",
              glass && "border-hairline bg-carbon-900/80 backdrop-blur-xl backdrop-saturate-150",
              compact && "shadow-[0_18px_40px_-24px_rgb(0_0_0/0.9)]"
            )}
          />
          <div className="container-site flex h-full items-center gap-2 lg:gap-8">
            {logo}
            {search}
            {actions}
          </div>
        </div>

        {nav}
      </header>
      {overlays}
      <Suspense fallback={null}>
        <RouteWatcher onChange={onRoute} />
      </Suspense>
    </HeaderContext>
  )
}
