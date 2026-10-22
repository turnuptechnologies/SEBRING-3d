import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Dev-only render tooling, and per-shopper transactional pages with nothing to index.
      disallow: ["/studio", "/cart", "/checkout"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
