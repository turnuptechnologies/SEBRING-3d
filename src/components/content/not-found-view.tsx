"use client"

import { animate } from "animejs"
import { Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

const LINKS = [
  { label: "Slot cars", href: "/collections/slot-cars" },
  { label: "Parts & upgrades", href: "/collections/parts" },
  { label: "Track & sets", href: "/collections/track-sets" },
  { label: "Controllers", href: "/collections/controllers-power" },
  { label: "Sale", href: "/collections/sale" },
]

/** "Off the racing line" — a car spins out of the slot (anime.js). */
export function NotFoundView() {
  const car = useRef<SVGGElement>(null)
  const router = useRouter()
  const [q, setQ] = useState("")

  useEffect(() => {
    if (!car.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const a = animate(car.current, { translateX: [0, 210], translateY: [0, -70], rotate: [0, 260], duration: 1600, delay: 400, ease: "outQuart" })
    return () => void a.revert()
  }, [])

  return (
    <section className="container-site grid min-h-[72svh] items-center gap-12 py-16 lg:grid-cols-2">
      <div>
        <p className="label-mono text-volt">Error 404</p>
        <h1 className="mt-4 font-wide text-display font-black uppercase">Off the racing line</h1>
        <p className="mt-6 max-w-md text-lg text-muted-foreground">That page has de-slotted. Search the catalog or jump back onto the track below.</p>
        <form
          role="search"
          className="mt-8 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <label htmlFor="nf-search" className="sr-only">Search the store</label>
          <input id="nf-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cars, parts or SKU" className="h-12 flex-1 rounded-sm border border-input bg-carbon-850 px-4 outline-none focus-visible:border-volt/70" />
          <Button type="submit" size="lg" aria-label="Search"><Search /></Button>
        </form>
        <div className="mt-8 flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full border border-hairline px-4 py-2 text-sm transition-colors hover:border-volt hover:text-volt">{l.label}</Link>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 520 300" className="w-full" aria-hidden="true">
        <path d="M0 220 C 140 220 220 140 360 150 S 520 120 560 110" fill="none" stroke="rgb(243 239 230 / .08)" strokeWidth="70" />
        <path d="M0 220 C 140 220 220 140 360 150 S 520 120 560 110" fill="none" stroke="rgb(243 239 230 / .5)" strokeWidth="2" strokeDasharray="3 9" />
        <g transform="translate(160 186)">
          <g ref={car}>
            <rect x="-34" y="-14" width="68" height="28" rx="10" fill="var(--color-volt)" />
            <rect x="-10" y="-9" width="22" height="18" rx="5" fill="#0b0b0f" />
            <circle cx="30" cy="-8" r="3" fill="#fff6cc" />
            <circle cx="30" cy="8" r="3" fill="#fff6cc" />
          </g>
        </g>
        <path d="M150 200 q 40 -10 80 -40" stroke="rgb(255 75 58 / .6)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="2 8" />
      </svg>
    </section>
  )
}
