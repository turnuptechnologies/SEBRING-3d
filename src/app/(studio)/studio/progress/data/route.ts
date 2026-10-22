import fs from "node:fs/promises"
import path from "node:path"

import { AREAS, SCRATCH_AGENTS, WORKFLOWS } from "../sources"

interface JournalRow {
  type: string
  key?: string
  label?: string
  phase?: string
  result?: unknown
}

async function readJournal(file: string) {
  const text = await fs.readFile(file, "utf8").catch(() => "")
  const rows = text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as JournalRow)
  const byKey = new Map<string, { label: string; phase: string; done: boolean; score?: number }>()
  for (const r of rows) {
    if (r.type === "started" && r.key) byKey.set(r.key, { label: r.label ?? "agent", phase: r.phase ?? "", done: false })
    if (r.type === "result" && r.key) {
      const a = byKey.get(r.key)
      if (a) {
        a.done = true
        const score = (r.result as { score?: unknown } | null)?.score
        if (typeof score === "number") a.score = score
      }
    }
  }
  return [...byKey.values()]
}

async function walkImages(dir: string, out: { path: string; mtime: number; size: number }[] = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) await walkImages(p, out)
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) {
      const st = await fs.stat(p).catch(() => null)
      if (st) out.push({ path: p, mtime: st.mtimeMs, size: st.size })
    }
  }
  return out
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 })
  void request.url // request-time route
  const root = process.cwd()
  const areas = await Promise.all(
    AREAS.map(async (a) => {
      const text = await fs.readFile(path.join(root, a.file), "utf8").catch(() => null)
      const st = await fs.stat(path.join(root, a.file)).catch(() => null)
      // The catalog has no placeholder marker: it has landed once it holds a real assortment.
      const placeholder = a.key === "catalog" ? (text?.match(/\bslug: "/g)?.length ?? 0) < 40 : text == null || text.includes("PLACEHOLDER")
      return { ...a, exists: text != null, placeholder, updated: st?.mtimeMs ?? null }
    })
  )
  const workflows = await Promise.all(WORKFLOWS.map(async (w) => ({ id: w.id, name: w.name, agents: await readJournal(w.journal) })))
  const images = (await walkImages(SCRATCH_AGENTS))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 60)
    .map((i) => ({ ...i, rel: path.relative(SCRATCH_AGENTS, i.path), group: path.relative(SCRATCH_AGENTS, i.path).split(path.sep)[0] }))
  return Response.json({ now: Date.now(), areas, workflows, images })
}
