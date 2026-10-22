"use client"

import { useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useId, useState, type KeyboardEvent } from "react"

import {
  clearRecent,
  departmentShortcuts,
  readRecent,
  rememberSearch,
  searchAll,
  searchHref,
  type BrandHit,
  type SearchResults,
  type TypeHit,
} from "@/components/layout/header/search/search-model"
import { productPath } from "@/components/layout/header/nav-data"
import { POPULAR_SEARCHES } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"

export type SearchOption =
  | { key: string; kind: "product"; href: string; product: Product }
  | { key: string; kind: "type" | "department"; href: string; hit: TypeHit }
  | { key: string; kind: "brand"; href: string; hit: BrandHit }
  | { key: string; kind: "all"; href: string; total: number; query: string }
  | { key: string; kind: "recent" | "popular"; href: string; query: string }
  | { key: string; kind: "clear" }
  | { key: string; kind: "fit"; href: string }

export interface OptionGroup {
  id: "recent" | "popular" | "departments" | "products" | "types" | "brands" | "help"
  title: string
  /** Desktop layout: main column or the narrower side column. */
  column: "main" | "side"
  options: SearchOption[]
  /** Index of the group's first option in the flat list. */
  start: number
}

export interface SearchModel {
  state: "idle" | "results" | "empty"
  groups: OptionGroup[]
  /** "See all N results" — last in keyboard order. */
  footer?: Extract<SearchOption, { kind: "all" }>
  flat: SearchOption[]
}

export const FIT_CHECK_HREF = "/contact?topic=fit-check"

function buildModel(query: string, results: SearchResults | null, recent: string[]): SearchModel {
  const groups: Omit<OptionGroup, "start">[] = []
  let footer: SearchModel["footer"]
  let state: SearchModel["state"] = "idle"

  if (!results) {
    if (recent.length) {
      groups.push({
        id: "recent",
        title: "Recent",
        column: "main",
        options: [
          ...recent.map((q): SearchOption => ({ key: `recent-${q}`, kind: "recent", href: searchHref(q), query: q })),
          { key: "clear", kind: "clear" },
        ],
      })
    }
    groups.push({
      id: "popular",
      title: "Popular right now",
      column: "main",
      options: POPULAR_SEARCHES.map((q): SearchOption => ({ key: `popular-${q}`, kind: "popular", href: searchHref(q), query: q })),
    })
    groups.push({
      id: "departments",
      title: "Departments",
      column: "side",
      options: departmentShortcuts().map((hit): SearchOption => ({ key: hit.id, kind: "department", href: hit.href, hit })),
    })
  } else if (results.total || results.types.length || results.brands.length) {
    state = "results"
    if (results.products.length) {
      groups.push({
        id: "products",
        title: "Products",
        column: "main",
        options: results.products.map((product): SearchOption => ({ key: product.slug, kind: "product", href: productPath(product), product })),
      })
    }
    if (results.types.length) {
      groups.push({ id: "types", title: "Types", column: "side", options: results.types.map((hit): SearchOption => ({ key: hit.id, kind: "type", href: hit.href, hit })) })
    }
    if (results.brands.length) {
      groups.push({ id: "brands", title: "Brands", column: "side", options: results.brands.map((hit): SearchOption => ({ key: hit.slug, kind: "brand", href: hit.href, hit })) })
    }
    if (results.total) footer = { key: "all", kind: "all", href: searchHref(query), total: results.total, query: results.query }
  } else {
    state = "empty"
    groups.push({
      id: "popular",
      title: "Try a popular search",
      column: "main",
      options: POPULAR_SEARCHES.map((q): SearchOption => ({ key: `popular-${q}`, kind: "popular", href: searchHref(q), query: q })),
    })
    groups.push({ id: "help", title: "Still stuck?", column: "side", options: [{ key: "fit", kind: "fit", href: FIT_CHECK_HREF }] })
  }

  // Keyboard order follows the DOM: main column, side column, footer.
  const ordered = [...groups.filter((g) => g.column === "main"), ...groups.filter((g) => g.column === "side")]
  const flat: SearchOption[] = []
  const withStart = ordered.map((g) => {
    const start = flat.length
    flat.push(...g.options)
    return { ...g, start }
  })
  if (footer) flat.push(footer)
  return { state, groups: withStart, footer, flat }
}

/**
 * Combobox state shared by the desktop field and the mobile overlay: query,
 * results, the active option (aria-activedescendant) and keyboard handling.
 */
export function useSearchBox({ initialQuery = "", onDone }: { initialQuery?: string; onDone: () => void }) {
  const router = useRouter()
  const uid = useId()
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState<string[]>([])
  const deferred = useDeferredValue(query)
  const results = searchAll(deferred)
  const model = buildModel(deferred, results, recent)
  const listboxId = `${uid}-listbox`
  const optionId = (i: number) => `${uid}-option-${i}`
  const activeOption = active >= 0 ? model.flat[active] : undefined

  useEffect(() => {
    if (active < 0) return
    document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [active, uid])

  const change = (q: string) => {
    setQuery(q)
    setActive(-1)
  }

  const loadRecent = () => setRecent(readRecent())

  const remember = (q: string) => {
    if (q.trim()) setRecent(rememberSearch(q))
  }

  const navigate = (href: string, rememberQuery?: string) => {
    if (rememberQuery) remember(rememberQuery)
    setActive(-1)
    onDone()
    router.push(href)
  }

  const submit = () => {
    const q = query.trim()
    if (!q) return
    navigate(searchHref(q), q)
  }

  /** `via: "pointer"` — the option is a real link and navigates itself. */
  const choose = (opt: SearchOption, via: "keyboard" | "pointer") => {
    if (opt.kind === "clear") {
      clearRecent()
      setRecent([])
      setActive(-1)
      return
    }
    const rememberQuery = opt.kind === "recent" || opt.kind === "popular" ? opt.query : query
    if (opt.kind === "recent" || opt.kind === "popular") setQuery(opt.query)
    if (via === "keyboard") return navigate(opt.href, rememberQuery)
    remember(rememberQuery)
    setActive(-1)
    onDone()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, open: boolean, setOpen: (open: boolean) => void) => {
    if (e.nativeEvent.isComposing) return
    const n = model.flat.length
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (!open) return setOpen(true)
        setActive((i) => (n ? (i + 1) % n : -1))
        break
      case "ArrowUp":
        e.preventDefault()
        if (!open) return setOpen(true)
        setActive((i) => (n ? (i <= 0 ? n - 1 : i - 1) : -1))
        break
      case "Enter":
        e.preventDefault()
        if (open && activeOption) choose(activeOption, "keyboard")
        else submit()
        break
      case "Escape":
        if (open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
          setActive(-1)
        } else if (query) {
          e.preventDefault()
          change("")
        }
        break
    }
  }

  return { query, change, active, setActive, model, results, listboxId, optionId, loadRecent, submit, choose, onKeyDown }
}

export type SearchBox = ReturnType<typeof useSearchBox>
