/** Dev-only build-progress sources (local machine paths). */
export const SCRATCH_AGENTS = "/private/tmp/claude-502/-Users-ammarsiddiqui-Desktop-untitled-folder-2/ba57c837-e599-4614-b4c4-fbd22d08d2d0/scratchpad/agents"
const WF_ROOT = "/Users/ammarsiddiqui/.claude/projects/-Users-ammarsiddiqui-Desktop-untitled-folder-2/ba57c837-e599-4614-b4c4-fbd22d08d2d0/subagents/workflows"

export const WORKFLOWS = [
  { id: "wf_4e38dbbb-d68", name: "3D media — cars, parts, night-track hero", journal: `${WF_ROOT}/wf_4e38dbbb-d68/journal.jsonl` },
  { id: "wf_0d9e8755-c86", name: "Storefront UI — 10 areas", journal: `${WF_ROOT}/wf_0d9e8755-c86/journal.jsonl` },
]

/** Area → the file whose PLACEHOLDER marker disappears when the real thing lands, plus where to look. */
export const AREAS = [
  { key: "hero-scene", label: "WebGL hero scene", file: "src/components/home/hero/hero-scene.tsx", links: ["/studio/hero"] },
  { key: "car-gen", label: "3D car generator", file: "src/lib/three/cars/index.ts", links: ["/studio/cars"] },
  { key: "parts-drivetrain", label: "3D drivetrain parts", file: "src/lib/three/parts/drivetrain/index.ts", links: ["/studio/parts-drivetrain"] },
  { key: "parts-trackside", label: "3D controllers & track", file: "src/lib/three/parts/trackside/index.ts", links: ["/studio/parts-trackside"] },
  { key: "catalog", label: "Catalog (~60 products)", file: "src/lib/catalog/products.ts", links: ["/studio/catalog-check"] },
  { key: "header", label: "Header, search & mega menus", file: "src/components/layout/site-header.tsx", links: ["/"] },
  { key: "footer-seo", label: "Footer, newsletter & SEO", file: "src/components/layout/site-footer.tsx", links: ["/", "/sitemap.xml"] },
  { key: "home-a", label: "Home: hero, categories, featured", file: "src/components/home/hero/hero-section.tsx", links: ["/"] },
  { key: "home-b", label: "Home: starting grid, parts, brands, raceway", file: "src/components/home/starting-grid.tsx", links: ["/"] },
  { key: "collections", label: "Listings, filters, brands & search", file: "src/app/(site)/collections/[slug]/page.tsx", links: ["/collections/slot-cars", "/collections/parts", "/brands", "/search?q=tires"] },
  { key: "product", label: "Product pages", file: "src/app/(site)/products/[slug]/page.tsx", links: ["/products/porsche-962c-night-shift-12"] },
  { key: "commerce", label: "Cart, checkout & garage", file: "src/components/cart/cart-sheet.tsx", links: ["/cart", "/checkout", "/garage"] },
  { key: "raceway", label: "Raceway & events", file: "src/app/(site)/raceway/page.tsx", links: ["/raceway"] },
  { key: "content", label: "Contact, policies, tech, 404", file: "src/app/(site)/contact/page.tsx", links: ["/contact", "/tech", "/shipping-returns"] },
] as const
