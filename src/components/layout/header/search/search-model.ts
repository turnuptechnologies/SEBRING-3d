import type { LucideIcon } from "lucide-react"
import { BadgePercent, CalendarClock, Cpu, Ruler, Sparkles } from "lucide-react"

import { categoryLink, listingLink, subcategoryLink } from "@/components/layout/header/nav-data"
import { CATEGORY_ICONS } from "@/components/site/category-icon"
import { brandHref, brands, categories, products, scales, searchProducts, subcategories, tokenize } from "@/lib/catalog"
import type { BrandSlug, Product } from "@/lib/catalog/types"

/**
 * Type-ahead model: products come from the catalog's weighted search (SKU,
 * maker code, name, brand, vehicle, tags, synonyms); departments, scales,
 * collections and brands are matched on word starts so "tire", "1/32" or
 * "slotit" land on the right shelf.
 */

export interface TypeHit {
  id: string
  label: string
  context: string
  href: string
  count: number
  icon: LucideIcon
}

export interface BrandHit {
  slug: BrandSlug
  label: string
  context: string
  href: string
  count: number
}

export interface SearchResults {
  query: string
  /** Words to highlight in labels. */
  marks: string[]
  total: number
  products: Product[]
  types: TypeHit[]
  brands: BrandHit[]
}

const STOP = new Set(["and", "for", "the", "with", "of", "in", "&"])

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")

const stem = (w: string) => (w.endsWith("ies") && w.length > 4 ? `${w.slice(0, -3)}y` : w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w)

const wordsOf = (...parts: string[]) => {
  const out = new Set<string>()
  for (const part of parts) {
    const f = fold(part)
    out.add(f)
    for (const w of f.split(/[^a-z0-9:]+/)) if (w) out.add(w)
  }
  return [...out]
}

interface Candidate<T> {
  words: string[]
  value: T
  weight: number
}

function matchScore(words: string[], tokens: string[]): number {
  let score = 0
  for (const t of tokens) {
    const st = stem(t)
    let best = 0
    for (const w of words) {
      if (w === t || stem(w) === st) best = Math.max(best, 3)
      else if (w.startsWith(t) || stem(w).startsWith(st)) best = Math.max(best, 2)
    }
    score += best
  }
  return score
}

let typeIndex: Candidate<TypeHit>[] | undefined
function typeCandidates(): Candidate<TypeHit>[] {
  if (typeIndex) return typeIndex
  const list: Candidate<TypeHit>[] = []
  for (const c of categories) {
    const l = categoryLink(c.slug)
    list.push({ words: wordsOf(c.label, c.shortLabel, c.slug), weight: 2, value: { id: `cat-${c.slug}`, label: c.label, context: "Department", href: l.href, count: l.count, icon: CATEGORY_ICONS[c.slug] } })
  }
  for (const s of subcategories) {
    const l = subcategoryLink(s.slug)
    const parent = categories.find((c) => c.slug === s.category)
    list.push({ words: wordsOf(s.label, s.slug), weight: 1, value: { id: `sub-${s.slug}`, label: s.label, context: parent?.label ?? "", href: l.href, count: l.count, icon: l.icon ?? Sparkles } })
  }
  for (const s of scales) {
    const l = listingLink("all", { scales: [s.value] }, `${s.label} scale`)
    list.push({ words: wordsOf(s.value, `${s.value} scale`), weight: 2, value: { id: `scale-${s.value}`, label: l.label, context: "Cars, parts & track", href: l.href, count: l.count, icon: Ruler } })
  }
  const collectionHits: Array<[string, string[], LucideIcon, string]> = [
    ["new-arrivals", ["new", "arrivals", "latest", "just in"], Sparkles, "New arrivals"],
    ["pre-orders", ["pre-order", "preorder", "pre-orders", "upcoming", "reserve"], CalendarClock, "Pre-orders"],
    ["digital", ["digital", "lane change", "chip", "d132", "arc"], Cpu, "Digital racing"],
    ["sale", ["sale", "deals", "discount", "clearance", "offer"], BadgePercent, "Sale"],
  ]
  for (const [slug, keywords, icon, label] of collectionHits) {
    const l = listingLink(slug, {}, label)
    list.push({ words: wordsOf(label, ...keywords), weight: 2, value: { id: `col-${slug}`, label, context: "Collection", href: l.href, count: l.count, icon } })
  }
  typeIndex = list
  return list
}

let brandIndex: Candidate<BrandHit>[] | undefined
function brandCandidates(): Candidate<BrandHit>[] {
  if (brandIndex) return brandIndex
  const counts = new Map<BrandSlug, number>()
  for (const p of products) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
  brandIndex = brands.map((b) => ({
    words: wordsOf(b.name, b.slug, b.name.replace(/[^a-z0-9]/gi, "")),
    weight: 1,
    value: { slug: b.slug, label: b.name, context: b.country, href: brandHref(b.slug), count: counts.get(b.slug) ?? 0 },
  }))
  return brandIndex
}

function rank<T extends { count: number }>(candidates: Candidate<T>[], tokens: string[], limit: number): T[] {
  return candidates
    .map((c) => ({ c, s: matchScore(c.words, tokens) }))
    .filter(({ c, s }) => s > 0 && c.value.count > 0)
    .sort((a, b) => b.s - a.s || b.c.weight - a.c.weight || b.c.value.count - a.c.value.count)
    .slice(0, limit)
    .map(({ c }) => c.value)
}

/** Raw words and their normalised forms, for highlighting. */
export function markTokens(query: string): string[] {
  const raw = fold(query).split(/\s+/)
  const all = new Set([...raw, ...tokenize(query)].map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")).filter((t) => t.length > 1 || /\d/.test(t)))
  return [...all].sort((a, b) => b.length - a.length)
}

export function searchAll(query: string, limit = 6): SearchResults | null {
  const q = query.trim()
  const tokens = tokenize(q).filter((t) => !STOP.has(t))
  if (!tokens.length) return null
  const meaningful = tokens.filter((t) => t.length > 1 || /\d/.test(t))
  const hits = searchProducts(q)
  return {
    query: q,
    marks: markTokens(q),
    total: hits.length,
    products: hits.slice(0, limit),
    types: meaningful.length ? rank(typeCandidates(), meaningful, 4) : [],
    brands: meaningful.length ? rank(brandCandidates(), meaningful, 3) : [],
  }
}

/** Department shortcuts shown before typing. */
export function departmentShortcuts(): TypeHit[] {
  return typeCandidates()
    .filter((c) => c.value.id.startsWith("cat-") && c.value.count > 0)
    .map((c) => c.value)
}

export const searchHref = (q: string) => `/search?q=${encodeURIComponent(q.trim())}`

/* ---------------------------------------------------------------------------
 * Recent searches (this browser only)
 * ------------------------------------------------------------------------- */

const RECENT_KEY = "sebring-recent-searches-v1"
const RECENT_LIMIT = 6

export function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, RECENT_LIMIT) : []
  } catch {
    return []
  }
}

export function rememberSearch(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 80)
  if (!q) return readRecent()
  const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
  return next
}

export function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {}
}
