import type { MetadataRoute } from "next"

import { site } from "@/lib/site"

/** Carbon — matches the `themeColor` viewport export and the page background. */
const CARBON = "#0b0b0f"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    lang: "en-US",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: CARBON,
    theme_color: CARBON,
    categories: ["shopping", "sports", "entertainment"],
    icons: [
      // src/app/icon.svg — the volt badge; scales to any launcher size.
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      // src/app/apple-icon.tsx — badge on carbon, drawn inside the maskable safe zone.
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Slot cars", url: "/collections/slot-cars" },
      { name: "Parts & upgrades", url: "/collections/parts" },
      { name: "New arrivals", url: "/collections/new-arrivals" },
      { name: "My garage", url: "/garage" },
    ],
  }
}
