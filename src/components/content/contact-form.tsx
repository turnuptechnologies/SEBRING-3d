"use client"

import { CheckCircle2, Send } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useLayoutEffect, useRef, useState, useTransition } from "react"

import { sendContact } from "@/app/actions/contact"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { brandName, getProduct, products } from "@/lib/catalog"
import { TOPICS } from "@/lib/contact-topics"
import { cn } from "@/lib/utils"

const TOPIC_LABEL: Record<(typeof TOPICS)[number], string> = {
  "fit-check": "Fit check — will this part fit my car?",
  order: "An order or a return",
  raceway: "Raceway & events",
  party: "Parties & groups",
  other: "Something else",
}

const field = "h-12 rounded-sm border-input bg-carbon-850 px-4 text-[0.9375rem]"

export function ContactForm() {
  const sp = useSearchParams()
  const initialTopic = (TOPICS as readonly string[]).includes(sp.get("topic") ?? "") ? (sp.get("topic") as (typeof TOPICS)[number]) : "fit-check"
  const initialProduct = getProduct(sp.get("product") ?? "")?.slug ?? ""
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: initialTopic, product: initialProduct, car: "", message: "", website: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const sentRef = useRef(false)

  useLayoutEffect(
    () => () => {
      if (sentRef.current) {
        sentRef.current = false
        setSent(null)
      }
    },
    []
  )

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const product = getProduct(form.product)

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-5 rounded-lg border border-go/30 bg-go/[0.06] p-8" role="status">
        <CheckCircle2 className="size-8 text-go" aria-hidden="true" />
        <p className="font-semiwide text-xl font-bold">Message received</p>
        <p className="text-muted-foreground">{sent}</p>
        <Button variant="outline" onClick={() => setSent(null)}>Send another message</Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await sendContact({ ...form, product: form.product || undefined, car: form.car || undefined, phone: form.phone || undefined })
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {})
            return
          }
          setErrors({})
          sentRef.current = true
          setSent(res.message)
        })
      }}
    >
      <F id="c-name" label="Name" error={errors.name}>
        <Input id="c-name" className={field} autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </F>
      <F id="c-email" label="Email" error={errors.email}>
        <Input id="c-email" className={field} type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
      </F>
      <F id="c-topic" label="What’s it about?" className="sm:col-span-2">
        <select id="c-topic" value={form.topic} onChange={set("topic")} className={cn(field, "w-full appearance-none border")}>
          {TOPICS.map((t) => (
            <option key={t} value={t} className="bg-carbon-800">
              {TOPIC_LABEL[t]}
            </option>
          ))}
        </select>
      </F>
      <F id="c-product" label="Product (optional)" className="sm:col-span-2" hint={product ? `${brandName(product.brand)} · ${product.sku}` : "Pick the part or car you’re asking about."}>
        <select id="c-product" value={form.product} onChange={set("product")} className={cn(field, "w-full appearance-none border")}>
          <option value="" className="bg-carbon-800">No specific product</option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug} className="bg-carbon-800">
              {brandName(p.brand)} — {p.name}
            </option>
          ))}
        </select>
      </F>
      {form.topic === "fit-check" && (
        <F id="c-car" label="Your car / chassis" className="sm:col-span-2" hint="e.g. Slot.it Porsche 962, anglewinder, 3/32 in axles">
          <Input id="c-car" className={field} value={form.car} onChange={set("car")} />
        </F>
      )}
      <F id="c-phone" label="Phone (optional)" className="sm:col-span-2">
        <Input id="c-phone" className={field} type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
      </F>
      <F id="c-message" label="Message" className="sm:col-span-2" error={errors.message}>
        <Textarea id="c-message" rows={6} className="rounded-sm border-input bg-carbon-850 px-4 py-3 text-[0.9375rem]" value={form.message} onChange={set("message")} aria-invalid={!!errors.message} />
      </F>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="hidden" aria-hidden="true" />
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          <Send /> {pending ? "Sending…" : "Send to the crew"}
        </Button>
      </div>
    </form>
  )
}

function F({ id, label, error, hint, className, children }: { id: string; label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="text-[0.8125rem] text-ivory-200">{label}</Label>
      {children}
      {error ? <p className="text-xs text-signal">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
