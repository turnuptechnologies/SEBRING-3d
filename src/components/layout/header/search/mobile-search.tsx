"use client"

import { Search, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useEffect, useId, useRef, type RefObject } from "react"

import { useHeader } from "@/components/layout/header/header-context"
import { SEARCH_PLACEHOLDER, useRouteQuery } from "@/components/layout/header/search/header-search"
import { SearchPanel } from "@/components/layout/header/search/search-panel"
import { useSearchBox } from "@/components/layout/header/search/use-search-box"

/** Full-screen search for phones and tablets — the same type-ahead as desktop. */
export function MobileSearch() {
  const { mobileSearchOpen: open, setMobileSearchOpen: setOpen } = useHeader()
  const routeQuery = useRouteQuery()
  const inputRef = useRef<HTMLInputElement>(null)

  // Growing past the breakpoint hands over to the desktop field.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [open, setOpen])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-carbon-950/80 backdrop-blur-sm duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className="fixed inset-0 z-50 flex flex-col bg-carbon-900 outline-none duration-300 ease-out-expo data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-3 data-closed:animate-out data-closed:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">Search the store</DialogPrimitive.Title>
          <MobileSearchBody key={routeQuery} initialQuery={routeQuery} inputRef={inputRef} onClose={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function MobileSearchBody({ initialQuery, inputRef, onClose }: { initialQuery: string; inputRef: RefObject<HTMLInputElement | null>; onClose: () => void }) {
  const inputId = useId()
  const box = useSearchBox({ initialQuery, onDone: onClose })

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-3 pt-[env(safe-area-inset-top)]">
        <form
          role="search"
          action="/search"
          onSubmit={(e) => {
            e.preventDefault()
            box.submit()
          }}
          className="relative my-2.5 flex-1"
        >
          <label htmlFor={inputId} className="sr-only">
            Search the store
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-volt" />
          <input
            ref={inputRef}
            id={inputId}
            name="q"
            type="search"
            role="combobox"
            aria-expanded={box.model.flat.length > 0}
            aria-controls={box.listboxId}
            aria-autocomplete="list"
            aria-activedescendant={box.active >= 0 ? box.optionId(box.active) : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={SEARCH_PLACEHOLDER}
            value={box.query}
            onChange={(e) => box.change(e.target.value)}
            onFocus={box.loadRecent}
            onKeyDown={(e) => box.onKeyDown(e, true, (o) => !o && onClose())}
            className="h-12 w-full rounded-sm border border-white/12 bg-white/[0.04] pr-11 pl-11 text-base text-ivory-50 outline-none transition-[border-color,background-color] duration-300 placeholder:text-smoke-500 focus:border-volt/55 focus:bg-carbon-850 focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {box.query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                box.change("")
                inputRef.current?.focus()
              }}
              className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-sm text-smoke-400 outline-none active:bg-white/[0.06]"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
        <DialogPrimitive.Close className="h-12 shrink-0 rounded-sm px-3 font-semiwide text-[0.6875rem] font-bold tracking-[0.12em] text-ivory-100 uppercase outline-none active:bg-white/[0.06] focus-visible:outline-offset-[-2px]">
          Cancel
        </DialogPrimitive.Close>
      </div>
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SearchPanel box={box} variant="screen" />
      </div>
    </>
  )
}
