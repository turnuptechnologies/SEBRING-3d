import { products } from "@/lib/catalog/products"
import { scenes } from "@/lib/three/scenes/registry"

/** Lists everything the media pipeline should render. Dev-only. */
export function GET() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STUDIO !== "1") {
    return new Response("Not found", { status: 404 })
  }
  return Response.json({
    products: products.map((p) => ({ slug: p.slug, views: p.views, kind: p.art.kind })),
    scenes,
  })
}
