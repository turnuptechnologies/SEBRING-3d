import { TRACKSIDE_PRESETS } from "@/lib/three/parts/trackside/presets"

/** Trackside reference specs for the lab tooling. Dev-only. */
export function GET() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STUDIO !== "1") {
    return new Response("Not found", { status: 404 })
  }
  return Response.json({ presets: TRACKSIDE_PRESETS })
}
