"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Search, X } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react"

import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { useHeader } from "@/components/layout/header/header-context"
import { useSearchBox } from "@/components/layout/header/search/use-search-box"
import { cn } from "@/lib/utils"

/** Results panel code loads when the search first opens. */
const SearchPanel = dynamic(() => import("@/components/layout/header/search/search-panel").then((m) => m.SearchPanel), { ssr: false })

export const SEARCH_PLACEHOLDER = "Search cars, parts, brands or SKU"

const noop = () => () => {}
/** "⌘" on Apple platforms, "Ctrl" elsewhere; null while server rendering. */
export function useShortcutKey() {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"),
    () => null
  )
}

/** The query the current URL is showing (only on /search). */
export function useRouteQuery() {
  const { route } = useHeader()
  if (route?.pathname !== "/search") return ""
  return new URLSearchParams(route.search).get("q") ?? ""
}

/** Centre slot of the main bar: a pill that opens the overlay on tablets, the full combobox on desktop. */
export function HeaderSearch() {
  const routeQuery = useRouteQuery()
  return (
    <div className="hidden min-w-0 flex-1 justify-center md:flex">
      <TabletSearchTrigger />
      {/* Re-keying on the URL's query keeps the field in step with /search without syncing state in an effect. */}
      <SearchCombobox key={routeQuery} initialQuery={routeQuery} />
    </div>
  )
}

function TabletSearchTrigger() {
  const { mobileSearchOpen, setMobileSearchOpen } = useHeader()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={mobileSearchOpen}
      onClick={() => setMobileSearchOpen(true)}
      className="flex h-11 w-full max-w-[26rem] items-center gap-3 rounded-sm border border-white/12 bg-white/[0.035] px-3.5 text-left text-sm text-smoke-400 outline-none transition-[border-color,background-color] duration-300 hover:border-white/25 hover:bg-white/[0.06] focus-visible:border-volt/60 lg:hidden"
    >
      <Search aria-hidden="true" className="size-4 shrink-0 text-smoke-400" />
      <span className="truncate">{SEARCH_PLACEHOLDER}</span>
    </button>
  )
}

function SearchCombobox({ initialQuery }: { initialQuery: string }) {
  const { searchOpen: open, setSearchOpen, searchInputRef } = useHeader()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const shortcut = useShortcutKey()
  const box = useSearchBox({
    initialQuery,
    onDone: () => {
      setSearchOpen(false)
      searchInputRef.current?.blur()
    },
  })

  // Close on a press anywhere outside the field and its popover.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("pointerdown", onDown, true)
    return () => document.removeEventListener("pointerdown", onDown, true)
  }, [open, setSearchOpen])

  const expanded = open && box.model.flat.length > 0

  return (
    <div
      ref={rootRef}
      className="relative hidden w-full max-w-[40rem] lg:block"
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null
        if (next && !e.currentTarget.contains(next)) setSearchOpen(false)
      }}
    >
      <form
        role="search"
        action="/search"
        onSubmit={(e) => {
          e.preventDefault()
          box.submit()
        }}
        className="group/field relative"
      >
        <label htmlFor={inputId} className="sr-only">
          Search the store
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-smoke-400 transition-colors duration-300 group-focus-within/field:text-volt"
        />
        <input
          ref={searchInputRef}
          id={inputId}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={box.listboxId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && box.active >= 0 ? box.optionId(box.active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={SEARCH_PLACEHOLDER}
          value={box.query}
          onChange={(e) => {
            box.change(e.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => {
            box.loadRecent()
            setSearchOpen(true)
          }}
          onClick={() => setSearchOpen(true)}
          onKeyDown={(e) => box.onKeyDown(e, open, setSearchOpen)}
          className={cn(
            "h-11 w-full rounded-sm border border-white/12 bg-white/[0.035] pr-24 pl-11 text-[0.9375rem] text-ivory-50 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] outline-none",
            "transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-smoke-500 hover:border-white/22",
            "focus:border-volt/55 focus:bg-carbon-850 focus:shadow-[0_0_0_4px_rgb(255_210_63/0.09)] focus-visible:outline-none",
            "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          )}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
          {box.query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                box.change("")
                searchInputRef.current?.focus()
              }}
              className="grid size-8 place-items-center rounded-sm text-smoke-400 outline-none transition-colors hover:bg-white/[0.06] hover:text-ivory-50 focus-visible:text-ivory-50"
            >
              <X className="size-4" />
            </button>
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                "mr-1.5 flex items-center gap-1 transition-opacity duration-300 group-focus-within/field:opacity-0",
                shortcut ? "opacity-100" : "opacity-0"
              )}
            >
              <KeyCap>{shortcut ?? "⌘"}</KeyCap>
              <KeyCap>K</KeyCap>
            </span>
          )}
        </div>
      </form>

      <AnimatePresence>
        {open && (
          <div className="absolute top-[calc(100%+0.625rem)] left-1/2 z-30 w-[max(100%,46rem)] -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT_EXPO } }}
              exit={{ opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.18 } }}
              className="origin-top overflow-hidden rounded-lg border border-white/10 bg-carbon-850/[0.97] shadow-lift backdrop-blur-2xl"
            >
              <div data-lenis-prevent className="max-h-[min(72vh,42rem)] overflow-y-auto overscroll-contain scrollbar-none">
                <SearchPanel box={box} variant="popover" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KeyCap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border border-white/12 bg-white/[0.04] px-1.5 font-mono text-[0.625rem] leading-none text-smoke-400">
      {children}
    </kbd>
  )
}
