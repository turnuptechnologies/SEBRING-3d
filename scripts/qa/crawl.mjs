#!/usr/bin/env node
/**
 * Site crawler for QA: visits every route at desktop and mobile widths and
 * reports console errors, hydration warnings, failed requests, broken internal
 * links and horizontal overflow. Optionally screenshots each page.
 *
 *   node scripts/qa/crawl.mjs                         # crawl from /sitemap.xml + links found
 *   node scripts/qa/crawl.mjs --routes /,/cart        # specific routes
 *   node scripts/qa/crawl.mjs --shots ./qa-shots      # also save screenshots
 *   node scripts/qa/crawl.mjs --base http://localhost:3000 --max 400
 */
import fs from "node:fs/promises"
import path from "node:path"

import { chromium } from "playwright"

const args = process.argv.slice(2)
const arg = (n, d = null) => {
  const i = args.indexOf(n)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d
}
const base = arg("--base", "http://localhost:3000")
const shots = arg("--shots")
const max = Number(arg("--max", "300"))
const out = arg("--out", "qa-report.json")
const explicit = arg("--routes")?.split(",").filter(Boolean)

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]

async function sitemapRoutes() {
  try {
    const xml = await (await fetch(`${base}/sitemap.xml`)).text()
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  } catch {
    return []
  }
}

const queue = explicit ?? [...new Set(["/", ...(await sitemapRoutes())])]
const seen = new Set(queue)
const report = { base, startedAt: new Date().toISOString(), pages: [], brokenLinks: [] }

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] })

for (let i = 0; i < queue.length && i < max; i++) {
  const route = queue[i]
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1 })
    const page = await context.newPage()
    const entry = { route, viewport: vp.name, status: 0, console: [], pageErrors: [], failedRequests: [], overflowPx: 0, ms: 0 }
    page.on("console", (m) => {
      const t = m.text()
      if (m.type() === "error" || /hydrat|did not match|Warning:/i.test(t)) entry.console.push(`${m.type()}: ${t.slice(0, 400)}`)
    })
    page.on("pageerror", (e) => entry.pageErrors.push(String(e).slice(0, 400)))
    page.on("response", (r) => {
      const u = r.url()
      if (r.status() >= 400 && u.startsWith(base) && !u.includes("/_next/webpack-hmr")) entry.failedRequests.push(`${r.status()} ${u.replace(base, "")}`)
    })
    const t0 = Date.now()
    try {
      const res = await page.goto(base + route, { waitUntil: "networkidle", timeout: 90_000 })
      entry.status = res?.status() ?? 0
      await page.waitForTimeout(800)
      entry.overflowPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
      if (vp.name === "desktop") {
        const links = await page.evaluate(() =>
          [...document.querySelectorAll("a[href]")]
            .filter((a) => a.offsetParent !== null || a.getClientRects().length)
            .map((a) => a.getAttribute("href"))
        )
        for (const href of links) {
          if (!href || !href.startsWith("/") || href.startsWith("//")) continue
          const clean = href.split("#")[0]
          if (!clean || seen.has(clean)) continue
          seen.add(clean)
          if (!clean.startsWith("/studio")) queue.push(clean)
        }
      }
      if (shots) {
        const dir = path.resolve(shots, vp.name)
        await fs.mkdir(dir, { recursive: true })
        const name = (route === "/" ? "home" : route.replace(/^\//, "").replace(/[/?=&:]+/g, "_")).slice(0, 120)
        await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
      }
    } catch (e) {
      entry.pageErrors.push(`navigation: ${String(e).slice(0, 300)}`)
    }
    entry.ms = Date.now() - t0
    if (entry.status >= 400) report.brokenLinks.push({ route, status: entry.status })
    report.pages.push(entry)
    const flags = [entry.status >= 400 && `HTTP ${entry.status}`, entry.console.length && `${entry.console.length} console`, entry.pageErrors.length && `${entry.pageErrors.length} errors`, entry.failedRequests.length && `${entry.failedRequests.length} failed req`, entry.overflowPx > 1 && `overflow ${entry.overflowPx}px`].filter(Boolean)
    console.log(`${flags.length ? "✗" : "✓"} [${vp.name}] ${route} ${flags.join(" · ")}`)
    await context.close()
  }
}

await browser.close()
report.finishedAt = new Date().toISOString()
report.summary = {
  routes: new Set(report.pages.map((p) => p.route)).size,
  withIssues: report.pages.filter((p) => p.status >= 400 || p.console.length || p.pageErrors.length || p.failedRequests.length || p.overflowPx > 1).length,
  brokenLinks: report.brokenLinks.length,
}
await fs.writeFile(out, JSON.stringify(report, null, 2))
console.log(`\n${report.summary.routes} routes · ${report.summary.withIssues} page/viewport combos with issues · ${report.summary.brokenLinks} broken → ${out}`)
