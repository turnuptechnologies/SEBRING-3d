import fs from "node:fs/promises"
import path from "node:path"

import { SCRATCH_AGENTS } from "../sources"

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }

/** Streams an agent screenshot from the scratch folder (dev only, no traversal). */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 })
  const rel = new URL(request.url).searchParams.get("p") ?? ""
  const abs = path.resolve(SCRATCH_AGENTS, rel)
  const type = TYPES[path.extname(abs).toLowerCase()]
  if (!abs.startsWith(SCRATCH_AGENTS + path.sep) || !type) return new Response("Bad path", { status: 400 })
  const data = await fs.readFile(abs).catch(() => null)
  if (!data) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(data), { headers: { "content-type": type, "cache-control": "no-store" } })
}
