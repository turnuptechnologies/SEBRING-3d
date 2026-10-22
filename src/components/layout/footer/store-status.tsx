"use client"

import { useEffect, useState } from "react"

import type { OpeningHours } from "@/lib/seo"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const

/**
 * Store-local time zone for the SAMPLE address (Sebring, FL — the "ET" in
 * commerce.processing). Should move to `site` with the real address.
 */
const STORE_TIME_ZONE = "America/New_York"

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** "15:00" → "3 pm" · "09:30" → "9:30 am" */
function clockLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const hour = h % 12 || 12
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`
}

function storeNow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: STORE_TIME_ZONE, weekday: "long", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return { day: WEEKDAYS.indexOf(get("weekday") as (typeof WEEKDAYS)[number]), minutes: Number(get("hour")) * 60 + Number(get("minute")) }
}

interface Status {
  open: boolean
  text: string
}

function computeStatus(sessions: OpeningHours[], date: Date): Status | null {
  const { day, minutes } = storeNow(date)
  if (day < 0 || !sessions.length) return null
  const sessionFor = (d: number) => sessions.find((s) => s.days.includes(d))
  const span = (s: OpeningHours) => {
    const opens = toMinutes(s.opens)
    let closes = toMinutes(s.closes)
    if (closes <= opens) closes += 24 * 60
    return { opens, closes }
  }

  // Yesterday's session may run past midnight.
  const yesterday = sessionFor((day + 6) % 7)
  if (yesterday) {
    const { closes } = span(yesterday)
    if (closes > 24 * 60 && minutes < closes - 24 * 60) return { open: true, text: `Open now · until ${clockLabel(yesterday.closes)}` }
  }

  const today = sessionFor(day)
  if (today) {
    const { opens, closes } = span(today)
    if (minutes >= opens && minutes < closes) {
      const soon = closes - minutes <= 60
      return { open: true, text: `${soon ? "Closing soon" : "Open now"} · until ${clockLabel(today.closes)}` }
    }
    if (minutes < opens) return { open: false, text: `Opens today at ${clockLabel(today.opens)}` }
  }

  for (let i = 1; i <= 7; i++) {
    const next = sessionFor((day + i) % 7)
    if (next) {
      const when = i === 1 ? "tomorrow" : WEEKDAYS[(day + i) % 7]
      return { open: false, text: `Closed now · opens ${when} at ${clockLabel(next.opens)}` }
    }
  }
  return null
}

/**
 * Live open/closed readout for the raceway counter (pickups, track time).
 * `sessions` comes from `openingHours()` on the server; the clock is read
 * only after mount, so the server HTML never guesses the time. Renders
 * nothing when there are no parseable hours.
 */
export function StoreStatus({ sessions, className }: { sessions: OpeningHours[]; className?: string }) {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    const tick = () => setStatus(computeStatus(sessions, new Date()))
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 60_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [sessions])

  return (
    <p className={cn("flex min-h-4 items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase", className)} aria-live="off">
      {status && (
        <>
          <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", status.open ? "animate-live bg-go" : "bg-smoke-600")} />
          <span className={status.open ? "text-smoke-300" : "text-smoke-500"}>{status.text}</span>
        </>
      )}
    </p>
  )
}
