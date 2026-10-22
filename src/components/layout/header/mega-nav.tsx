"use client"

import { ChevronDown, Flag } from "lucide-react"
import Link from "next/link"
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { useHeader } from "@/components/layout/header/header-context"
import { sectionFor, type MenuKey, type Section } from "@/components/layout/header/nav-data"
import { cn } from "@/lib/utils"

export interface MegaNavItem {
  key: MenuKey
  label: string
  count: number
}

interface MegaNavProps {
  items: MegaNavItem[]
  /** Server-rendered panel content, keyed by menu. */
  panels: Record<MenuKey, ReactNode>
  links: readonly { label: string; href: string }[]
  raceway: { label: string; href: string }
}

/** Hover intent before the first menu opens, ms. */
const OPEN_DELAY = 110
/** Sweeping between triggers while a menu is open. */
const SWITCH_DELAY = 70
/** Grace period after the pointer leaves the menu. */
const CLOSE_DELAY = 260

type OpenMode = "hover" | "pinned"

/**
 * Desktop department nav with mega menus (disclosure pattern: each trigger is
 * a button that owns the panel right after it in the DOM, so Tab flows from a
 * trigger into its panel).
 *
 * Mouse: hover intent opens, leaving closes, a click pins the menu open.
 * Touch / pen: tap toggles. Keyboard: Enter/Space toggle, ↓ opens and enters
 * the panel, ←/→/Home/End move between departments, Esc closes and returns focus.
 */
export function MegaNav({ items, panels, links, raceway }: MegaNavProps) {
  const { menu, setMenu, compact, scrolled, route, searchOpen } = useHeader()
  const uid = useId()
  const navRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const triggers = useRef(new Map<MenuKey, HTMLButtonElement>())
  const panelEls = useRef(new Map<MenuKey, HTMLDivElement>())
  const anchors = useRef(new Map<Section, HTMLElement>())
  const mode = useRef<OpenMode>("hover")
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const wasOpen = useRef(false)
  // Panels stay display:none until the first sign of intent (pointer over the nav,
  // focus, touch), so their images don't load with the page and the first open
  // still animates from the closed state.
  const [primed, setPrimed] = useState(false)

  const activeIndex = menu ? items.findIndex((i) => i.key === menu) : -1
  const section = route ? sectionFor(route.pathname) : null
  const marked: Section | null = menu ?? section
  const triggerId = (key: MenuKey) => `${uid}-trigger-${key}`
  const panelId = (key: MenuKey) => `${uid}-panel-${key}`

  const clearTimers = () => {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
  }

  const prime = () => setPrimed(true)

  const open = (key: MenuKey, how: OpenMode) => {
    clearTimers()
    mode.current = how
    setPrimed(true)
    setMenu(key)
  }

  const close = () => {
    clearTimers()
    setMenu(null)
  }

  const scheduleClose = (delay = CLOSE_DELAY) => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setMenu(null), delay)
  }

  /* Pointer ---------------------------------------------------------------- */

  const onTriggerEnter = (key: MenuKey) => (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    clearTimers()
    if (menu === key) return
    const how = menu ? mode.current : "hover"
    openTimer.current = window.setTimeout(() => open(key, how), menu ? SWITCH_DELAY : OPEN_DELAY)
  }

  const onTriggerLeave = (e: PointerEvent) => {
    if (e.pointerType === "mouse") window.clearTimeout(openTimer.current)
  }

  const onRegionEnter = (e: PointerEvent) => {
    prime()
    if (e.pointerType === "mouse") window.clearTimeout(closeTimer.current)
  }

  const onRegionLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    window.clearTimeout(openTimer.current)
    if (menu && mode.current === "hover") scheduleClose()
  }

  /** Hovering a plain link while a hover-opened menu is showing closes it. */
  const onPlainEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    window.clearTimeout(openTimer.current)
    if (menu && mode.current === "hover") scheduleClose(140)
  }

  const onTriggerClick = (key: MenuKey) => {
    window.clearTimeout(openTimer.current)
    if (menu !== key) return open(key, "pinned")
    // A click on a menu that hover just opened keeps it open (pins it) instead of closing it.
    if (mode.current === "hover") {
      mode.current = "pinned"
      return
    }
    close()
  }

  /* Keyboard --------------------------------------------------------------- */

  const focusTrigger = (key: MenuKey) => triggers.current.get(key)?.focus()

  const focusPanel = (key: MenuKey) =>
    requestAnimationFrame(() => panelEls.current.get(key)?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus())

  const onTriggerKeyDown = (key: MenuKey, index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const go = (next: number) => {
      e.preventDefault()
      const target = items[(next + items.length) % items.length].key
      focusTrigger(target)
      if (menu) open(target, "pinned")
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (menu !== key) open(key, "pinned")
        else mode.current = "pinned"
        focusPanel(key)
        break
      case "ArrowRight":
        go(index + 1)
        break
      case "ArrowLeft":
        go(index - 1)
        break
      case "Home":
        go(0)
        break
      case "End":
        go(items.length - 1)
        break
      case "Escape":
        if (menu) {
          e.preventDefault()
          e.stopPropagation()
          close()
        }
        break
    }
  }

  const onPanelKeyDown = (key: MenuKey) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return
    e.preventDefault()
    e.stopPropagation()
    close()
    focusTrigger(key)
  }

  /** Focus moving out of a department (e.g. Tab past its last link) closes its panel. */
  const onItemBlur = (key: MenuKey) => (e: FocusEvent<HTMLLIElement>) => {
    const next = e.relatedTarget as Node | null
    if (!next || menu !== key || e.currentTarget.contains(next)) return
    close()
  }

  /** Any link inside a panel closes the menu as navigation starts. */
  const onPanelClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("a[href]")) close()
  }

  /* Effects ---------------------------------------------------------------- */

  // Outside press and Escape (the menu may be open with focus elsewhere).
  useEffect(() => {
    if (!menu) return
    const onDown = (e: globalThis.PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null)
    }
    document.addEventListener("pointerdown", onDown, true)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [menu, setMenu])

  // Timers never outlive the nav (unmount or Activity hide).
  useLayoutEffect(() => () => {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
  }, [])

  // The shared backdrop morphs to the open panel's height. Opening from closed
  // snaps the height (only the fade + drop animate); switching morphs it.
  useLayoutEffect(() => {
    const backdrop = backdropRef.current
    const panel = menu ? panelEls.current.get(menu) : undefined
    if (!backdrop || !panel) {
      wasOpen.current = false
      return
    }
    const apply = () => {
      backdrop.style.height = `${panel.offsetHeight}px`
    }
    if (!wasOpen.current) {
      backdrop.style.transitionProperty = "opacity, transform"
      apply()
      void backdrop.offsetHeight
      backdrop.style.transitionProperty = ""
    } else {
      apply()
    }
    wasOpen.current = true
    const ro = new ResizeObserver(apply)
    ro.observe(panel)
    return () => ro.disconnect()
  }, [menu])

  // Indicator: a hairline under the open department, or the current section.
  useLayoutEffect(() => {
    const bar = indicatorRef.current
    const list = listRef.current
    if (!bar || !list) return
    const place = () => {
      const target = marked ? anchors.current.get(marked) : undefined
      if (!target) {
        bar.style.opacity = "0"
        return
      }
      const appearing = bar.style.opacity !== "1"
      if (appearing) bar.style.transitionProperty = "opacity"
      bar.style.transform = `translateX(${target.offsetLeft + 12}px) scaleX(${Math.max(0, target.offsetWidth - 24) / 100})`
      bar.style.opacity = "1"
      if (appearing) {
        void bar.offsetWidth
        bar.style.transitionProperty = ""
      }
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(list)
    return () => ro.disconnect()
  }, [marked])

  const anchor = (key: Section) => (el: HTMLElement | null) => {
    if (el) anchors.current.set(key, el)
    else anchors.current.delete(key)
  }

  const glass = scrolled || menu !== null || searchOpen
  const markTone = marked === "sale" ? "bg-signal" : menu ? "bg-volt" : "bg-ivory-100/55"

  return (
    <nav
      ref={navRef}
      aria-label="Shop by department"
      onPointerEnter={onRegionEnter}
      onPointerLeave={onRegionLeave}
      className={cn(
        "pointer-events-auto relative z-10 hidden lg:block",
        "transition-[transform,opacity] duration-500 ease-out-expo",
        compact && "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      {/* Row glass */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-500",
          glass && "border-hairline bg-carbon-900/80 backdrop-blur-xl backdrop-saturate-150",
          menu && "bg-carbon-900/95"
        )}
      />

      <div className="container-site flex h-11 items-center gap-6">
        <ul ref={listRef} className="flex items-center">
          {items.map((item, index) => {
            const isOpen = menu === item.key
            const sale = item.key === "sale"
            return (
              <li key={item.key} onBlur={onItemBlur(item.key)}>
                <button
                  ref={(el) => {
                    if (el) {
                      triggers.current.set(item.key, el)
                      anchors.current.set(item.key, el)
                    } else {
                      triggers.current.delete(item.key)
                      anchors.current.delete(item.key)
                    }
                  }}
                  id={triggerId(item.key)}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId(item.key)}
                  onPointerEnter={onTriggerEnter(item.key)}
                  onPointerLeave={onTriggerLeave}
                  onPointerDown={prime}
                  onFocus={prime}
                  onClick={() => onTriggerClick(item.key)}
                  onKeyDown={onTriggerKeyDown(item.key, index)}
                  className={cn(
                    "group/trigger relative flex h-11 items-center gap-1.5 px-3 font-semiwide text-[0.71875rem] font-bold tracking-[0.11em] uppercase outline-none select-none",
                    "transition-colors duration-300 focus-visible:outline-offset-[-2px]",
                    sale ? "text-signal hover:text-[#ff6a5c] aria-expanded:text-[#ff6a5c]" : "text-ivory-100/75 hover:text-ivory-50 aria-expanded:text-ivory-50"
                  )}
                >
                  <RollLabel text={item.label} />
                  {item.count > 0 && (
                    <span aria-hidden="true" className="-mt-2 font-mono text-[0.5625rem] font-medium tracking-normal text-smoke-500 tabular">
                      {item.count}
                    </span>
                  )}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-3 opacity-60 transition-transform duration-500 ease-out-expo group-hover/trigger:opacity-100 group-aria-expanded/trigger:rotate-180"
                  />
                </button>

                <div
                  ref={(el) => {
                    if (el) panelEls.current.set(item.key, el)
                    else panelEls.current.delete(item.key)
                  }}
                  id={panelId(item.key)}
                  data-state={isOpen ? "open" : "closed"}
                  hidden={!primed}
                  inert={!isOpen}
                  onKeyDown={onPanelKeyDown(item.key)}
                  onClick={onPanelClick}
                  className={cn(
                    "group/panel absolute inset-x-0 top-full z-[2] transition-[opacity,transform,visibility] duration-500 ease-out-expo",
                    isOpen ? "visible translate-x-0 translate-y-0 opacity-100" : "invisible opacity-0",
                    !isOpen && menu && (index < activeIndex ? "-translate-x-10" : "translate-x-10"),
                    !menu && "-translate-y-2"
                  )}
                >
                  <div className="container-site">{panels[item.key]}</div>
                </div>
              </li>
            )
          })}
          {links.map((l) => (
            <li key={l.href}>
              <Link
                ref={anchor("brands")}
                href={l.href}
                onPointerEnter={onPlainEnter}
                className="group/trigger flex h-11 items-center px-3 font-semiwide text-[0.71875rem] font-bold tracking-[0.11em] text-ivory-100/75 uppercase outline-none transition-colors duration-300 hover:text-ivory-50 focus-visible:outline-offset-[-2px]"
              >
                <RollLabel text={l.label} />
              </Link>
            </li>
          ))}
        </ul>

        <Link
          ref={anchor("raceway")}
          href={raceway.href}
          onPointerEnter={onPlainEnter}
          className={cn(
            "group/race ml-auto inline-flex h-8 items-center gap-2 rounded-sm border border-white/14 px-3 font-semiwide text-[0.65625rem] font-bold tracking-[0.12em] text-ivory-100/80 uppercase outline-none",
            "transition-[border-color,color,background-color] duration-300 hover:border-white/40 hover:bg-white/[0.04] hover:text-ivory-50 focus-visible:border-volt"
          )}
        >
          <Flag aria-hidden="true" className="size-3.5 text-smoke-400 transition-colors duration-300 group-hover/race:text-ivory-50" />
          {raceway.label}
        </Link>
      </div>

      <span
        ref={indicatorRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 z-[3] h-0.5 w-[100px] origin-left opacity-0",
          "transition-[transform,opacity,background-color] duration-500 ease-out-expo",
          markTone
        )}
      />

      {/* Shared panel surface; panels crossfade above it. */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-full z-[1] h-0 overflow-hidden border-b border-hairline bg-carbon-900/[0.965] shadow-lift backdrop-blur-2xl",
          "transition-[height,opacity,transform] duration-500 ease-out-expo",
          menu ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-hairline-grid opacity-40 [--grid-size:72px] mask-fade-b" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      </div>
    </nav>
  )
}

/** Label that rolls up to a fresh copy on hover. */
function RollLabel({ text }: { text: string }) {
  return (
    <span className="relative block h-[1.15em] overflow-hidden leading-[1.15]">
      <span className="block transition-transform duration-500 ease-out-expo group-hover/trigger:-translate-y-full">{text}</span>
      <span aria-hidden="true" className="absolute inset-x-0 top-full block transition-transform duration-500 ease-out-expo group-hover/trigger:-translate-y-full">
        {text}
      </span>
    </span>
  )
}
