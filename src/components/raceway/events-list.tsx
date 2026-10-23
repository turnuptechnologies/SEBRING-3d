"use client"

import { CalendarPlus, Check, Users } from "lucide-react"
import { useLayoutEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { registerForEvent } from "@/app/actions/raceway"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatPrice } from "@/lib/format"
import type { RaceEvent } from "@/lib/raceway"
import { cn } from "@/lib/utils"

export function EventsList({ events: initial }: { events: RaceEvent[] }) {
  const [events, setEvents] = useState(initial)
  const [open, setOpen] = useState<RaceEvent | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  useLayoutEffect(() => () => setOpen(null), [])

  return (
    <>
      <ul className="grid gap-3">
        {events.map((e) => {
          const [, m, d] = e.date.split("-")
          const full = e.spotsLeft <= 0
          return (
            <li key={e.id} className="grid items-center gap-5 rounded-lg border border-hairline bg-card p-5 transition-colors hover:border-foreground/20 sm:grid-cols-[auto_1fr_auto] sm:p-6">
              <div className="flex w-20 flex-col items-center rounded-md border border-hairline bg-carbon-850 py-3">
                <span className="label-mono text-volt">{formatDate(e.date, { month: "short" })}</span>
                <span className="font-wide text-3xl font-black tabular">{Number(d)}</span>
                <span className="label-mono text-[0.5625rem] text-muted-foreground">{formatDate(e.date, { weekday: "short" })}</span>
              </div>
              <div className="min-w-0">
                <p className="label-mono text-muted-foreground">
                  {e.className} · {e.start} · {formatPrice(e.fee, { round: true })} entry
                </p>
                <h3 className="mt-2 font-semiwide text-lg font-bold">{e.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>
                <p className={cn("mt-3 flex items-center gap-1.5 text-xs", e.spotsLeft <= 5 ? "text-caution" : "text-muted-foreground")}>
                  <Users className="size-3.5" aria-hidden="true" />
                  {full ? "Full — waitlist via contact" : `${e.spotsLeft} of ${e.capacity} spots left`}
                </p>
                <span className="sr-only">{m}</span>
              </div>
              {done.has(e.id) ? (
                <p className="flex items-center gap-2 font-semiwide text-sm font-bold text-go">
                  <Check className="size-4" aria-hidden="true" /> Registered
                </p>
              ) : (
                <Button variant={full ? "outline" : "default"} disabled={full} onClick={() => setOpen(e)}>
                  <CalendarPlus /> Register
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <RegisterDialog
        event={open}
        onClose={() => setOpen(null)}
        onDone={(id) => {
          setDone((s) => new Set(s).add(id))
          setEvents((list) => list.map((x) => (x.id === id ? { ...x, spotsLeft: Math.max(0, x.spotsLeft - 1) } : x)))
          setOpen(null)
        }}
      />
    </>
  )
}

function RegisterDialog({ event, onClose, onDone }: { event: RaceEvent | null; onClose: () => void; onDone: (id: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", rental: false, notes: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    start(async () => {
      const res = await registerForEvent({ eventId: event.id, ...form })
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      setErrors({})
      setForm({ name: "", email: "", phone: "", rental: false, notes: "" })
      onDone(event.id)
    })
  }

  return (
    <Dialog open={event != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-hairline bg-carbon-850 sm:max-w-lg" data-lenis-prevent>
        <DialogHeader>
          <p className="label-mono text-volt">{event ? `${formatDate(event.date)} · ${event.start}` : ""}</p>
          <DialogTitle className="font-wide text-2xl font-black uppercase">{event?.title}</DialogTitle>
          <DialogDescription>{event?.className} · {event ? formatPrice(event.fee, { round: true }) : ""} entry, paid at the counter.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-2 grid gap-4">
          <Field id="reg-name" label="Name" error={errors.name}>
            <Input id="reg-name" autoComplete="name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="reg-email" label="Email" error={errors.email}>
            <Input id="reg-email" type="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field id="reg-phone" label="Phone (optional)">
            <Input id="reg-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox checked={form.rental} onCheckedChange={(v) => setForm({ ...form, rental: v === true })} />
            I need a rental car and controller
          </label>
          <Field id="reg-notes" label="Notes (optional)">
            <Textarea id="reg-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Registering…" : "Confirm my spot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-signal">{error}</p>}
    </div>
  )
}
