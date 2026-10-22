#!/usr/bin/env node
/**
 * Media pipeline — renders every product view (and composed scenes) from the
 * procedural 3D studio into optimised, transparent WebP files.
 *
 *   node scripts/render-media.mjs                       # everything
 *   node scripts/render-media.mjs --only slug-a,slug-b  # some products
 *   node scripts/render-media.mjs --views hero,side     # some views
 *   node scripts/render-media.mjs --scenes-only         # composed scenes only
 *   node scripts/render-media.mjs --no-scenes           # products only
 *   node scripts/render-media.mjs --out /tmp/preview    # write elsewhere (no manifest update)
 *
 * Needs the dev server running (default http://localhost:3000, override with --base).
 * Uses the system Chrome with GPU (ANGLE/Metal on macOS).
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"
import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const arg = (name, fallback = null) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback
}
const flag = (name) => args.includes(name)

const base = arg("--base", "http://localhost:3000")
const only = arg("--only")?.split(",").filter(Boolean)
const onlyViews = arg("--views")?.split(",").filter(Boolean)
const concurrency = Number(arg("--concurrency", "3"))
const outRoot = arg("--out") ? path.resolve(arg("--out")) : path.join(root, "public")
const writeManifest = !arg("--out")
const OUT_W = 1600
const OUT_H = 1200
const SUPERSAMPLE = 1.5

const manifestRes = await fetch(`${base}/studio/manifest`).catch((e) => {
  console.error(`Cannot reach ${base}/studio/manifest — is the dev server running?\n${e}`)
  process.exit(1)
})
const manifest = await manifestRes.json()

const jobs = []
if (!flag("--scenes-only")) {
  for (const p of manifest.products) {
    if (only && !only.includes(p.slug)) continue
    for (const view of p.views) {
      if (onlyViews && !onlyViews.includes(view)) continue
      jobs.push({
        type: "product",
        key: `${p.slug}/${view}`,
        slug: p.slug,
        view,
        url: `${base}/studio/render?slug=${encodeURIComponent(p.slug)}&view=${view}&w=${Math.round(OUT_W * SUPERSAMPLE)}&h=${Math.round(OUT_H * SUPERSAMPLE)}`,
        out: path.join(outRoot, "products", p.slug, `${view}.webp`),
        width: OUT_W,
        height: OUT_H,
        transparent: true,
      })
    }
  }
}
if (!flag("--no-scenes")) {
  for (const s of manifest.scenes ?? []) {
    if (only && !only.includes(s.id)) continue
    jobs.push({
      type: "scene",
      key: s.id,
      id: s.id,
      url: `${base}/studio/scene?id=${encodeURIComponent(s.id)}&w=${Math.round(s.width * SUPERSAMPLE)}&h=${Math.round(s.height * SUPERSAMPLE)}`,
      out: path.join(outRoot, s.out),
      width: s.width,
      height: s.height,
      transparent: s.transparent,
    })
  }
}

console.log(`Rendering ${jobs.length} image(s) from ${base} with concurrency ${concurrency}…`)

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
})

const results = { ok: [], failed: [] }
let cursor = 0

async function worker() {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 2600, height: 2000 } })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(String(e)))
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
  while (cursor < jobs.length) {
    const job = jobs[cursor++]
    errors.length = 0
    const t0 = Date.now()
    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 120_000 })
      await page.waitForFunction(() => window.__RENDER_READY__ === true || document.getElementById("render-error"), null, { timeout: 120_000 })
      const failed = await page.$("#render-error")
      if (failed) throw new Error(await failed.innerText())
      const dataUrl = await page.evaluate(() => document.querySelector("canvas")?.toDataURL("image/png"))
      if (!dataUrl) throw new Error("No canvas found")
      const png = Buffer.from(dataUrl.split(",")[1], "base64")
      await fs.mkdir(path.dirname(job.out), { recursive: true })
      let img = sharp(png).resize(job.width, job.height, { kernel: "lanczos3" })
      if (!job.transparent) img = img.flatten({ background: "#0b0b0f" })
      await img.webp({ quality: 88, alphaQuality: 95, effort: 5, smartSubsample: true }).toFile(job.out)
      results.ok.push(job)
      console.log(`  ✓ ${job.key}  (${Date.now() - t0} ms)${errors.length ? `  [${errors.length} console error(s)]` : ""}`)
    } catch (e) {
      results.failed.push({ job, error: String(e).slice(0, 500), console: errors.slice(0, 5) })
      console.log(`  ✗ ${job.key}  ${String(e).slice(0, 200)}`)
    }
  }
  await context.close()
}

await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker))
await browser.close()

if (writeManifest) {
  const manifestPath = path.join(root, "src/lib/catalog/media-manifest.json")
  const current = JSON.parse(await fs.readFile(manifestPath, "utf8").catch(() => '{"items":{},"scenes":[]}'))
  // Rebuild from disk so the manifest always reflects files that exist.
  const items = {}
  for (const p of manifest.products) {
    const views = []
    for (const view of p.views) {
      try {
        await fs.access(path.join(root, "public", "products", p.slug, `${view}.webp`))
        views.push(view)
      } catch {}
    }
    if (views.length) items[p.slug] = views
  }
  const scenes = []
  for (const s of manifest.scenes ?? []) {
    try {
      await fs.access(path.join(root, "public", s.out))
      scenes.push(s.id)
    } catch {}
  }
  await fs.writeFile(manifestPath, JSON.stringify({ ...current, items, scenes }, null, 2) + "\n")
  console.log(`Manifest updated: ${Object.keys(items).length} products, ${scenes.length} scenes.`)
}

console.log(`Done: ${results.ok.length} ok, ${results.failed.length} failed.`)
if (results.failed.length) {
  for (const f of results.failed) console.log(`  FAILED ${f.job.key}: ${f.error}\n    ${f.console.join("\n    ")}`)
  process.exitCode = 1
}
