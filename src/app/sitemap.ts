import type { MetadataRoute } from "next"

import { brands, collectionProducts, collections, productImages, products } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { absoluteUrl, productPath } from "@/lib/seo"

type Entry = MetadataRoute.Sitemap[number]

/**
 * Evergreen pages. No `lastModified` here: an accurate date is better than a
 * made-up one, and `new Date()` would make the route time-dependent.
 * Personal / transactional routes (/cart, /checkout, /garage, search results)
 * are intentionally absent — see robots.ts.
 */
const STATIC_ROUTES: Array<Pick<Entry, "changeFrequency" | "priority"> & { path: string }> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/brands", changeFrequency: "weekly", priority: 0.7 },
  { path: "/raceway", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/shipping-returns", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
]

/** The newest release date in a set — a truthful "last changed" for listings. */
const newest = (list: readonly Product[]) => list.reduce<string | undefined>((max, p) => (!max || p.releasedAt > max ? p.releasedAt : max), undefined)

const CATEGORY_COLLECTIONS = new Set(["slot-cars", "parts", "track-sets", "controllers-power"])

/**
 * One sitemap for the whole store (well under the 50,000-URL limit). If the
 * catalog ever outgrows it, split with generateSitemaps() — in Next 16 the
 * sitemap function then receives `id` as a Promise<string>.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, ...rest }) => ({
    url: absoluteUrl(path),
    ...(path === "/" && newest(products) ? { lastModified: newest(products) } : {}),
    ...rest,
  }))

  // Empty shelves are never advertised: a collection or brand needs stock to list.
  const collectionEntries: MetadataRoute.Sitemap = collections.flatMap((c) => {
    const list = collectionProducts(c)
    if (!list.length) return []
    return [
      {
        url: absoluteUrl(`/collections/${c.slug}`),
        lastModified: newest(list),
        changeFrequency: "daily" as const,
        priority: CATEGORY_COLLECTIONS.has(c.slug) ? 0.9 : 0.7,
      },
    ]
  })

  const brandEntries: MetadataRoute.Sitemap = brands.flatMap((b) => {
    const list = products.filter((p) => p.brand === b.slug)
    if (!list.length) return []
    return [{ url: absoluteUrl(`/brands/${b.slug}`), lastModified: newest(list), changeFrequency: "weekly" as const, priority: 0.6 }]
  })

  const productEntries: MetadataRoute.Sitemap = products.map((p) => {
    const images = productImages(p).map((img) => absoluteUrl(img.src))
    return {
      url: absoluteUrl(productPath(p)),
      lastModified: p.releasedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(images.length ? { images } : {}),
    }
  })

  return [...staticEntries, ...collectionEntries, ...brandEntries, ...productEntries]
}
