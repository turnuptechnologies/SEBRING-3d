"use client"

import { animate, stagger } from "animejs"
import { ArrowRight, Check, Mail, Package, Truck } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"

import { readOrderRaw } from "@/app/(site)/checkout/order-storage"
import type { StoredOrder } from "@/app/(site)/checkout/schema"
import { Button } from "@/components/ui/button"
import { formatPrice, pluralize } from "@/lib/format"

const noop = () => () => {}

/** Checkered flag that waves in with a staggered tile cascade (anime.js). */
function Flag() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const tiles = el.querySelectorAll("[data-tile]")
    const a = animate(tiles, { opacity: [0, 1], scale: [0.4, 1], delay: stagger(18, { grid: [8, 5], from: "first" }), duration: 520, ease: "outExpo" })
    const b = animate(el, { rotate: [-4, 3, -2, 0], duration: 2400, ease: "inOutSine", delay: 300 })
    return () => {
      a.revert()
      b.revert()
    }
  }, [])
  return (
    <div ref={ref} aria-hidden="true" className="grid w-40 origin-left grid-cols-8 overflow-hidden rounded-sm shadow-lift">
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} data-tile className={`aspect-square ${(Math.floor(i / 8) + i) % 2 ? "bg-carbon-900" : "bg-ivory-100"}`} />
      ))}
    </div>
  )
}

export function SuccessView() {
  const id = useSearchParams().get("order")
  const raw = useSyncExternalStore(noop, () => readOrderRaw(id), () => null)
  const order = useMemo(() => (raw ? (JSON.parse(raw) as StoredOrder) : null), [raw])

  if (!order) {
    return (
      <div className="container-site flex min-h-[60svh] flex-col items-start justify-center gap-6 py-20">
        <p className="label-mono text-muted-foreground">Order {id ?? ""}</p>
        <h1 className="font-wide text-headline font-black uppercase">Thanks for your order</h1>
        <p className="max-w-lg text-muted-foreground">We can’t show the details on this device, but your confirmation email has everything. Questions? The crew is happy to help.</p>
        <div className="flex gap-3">
          <Button asChild><Link href="/collections/all">Keep shopping</Link></Button>
          <Button variant="outline" asChild><Link href="/contact?topic=order">Contact us</Link></Button>
        </div>
      </div>
    )
  }

  const { totals, shipping, contact } = order
  const firstName = shipping.name.split(" ")[0]
  return (
    <div className="container-site py-14 md:py-20">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Flag />
          <p className="mt-10 label-mono text-volt">Order {order.orderId} · confirmed</p>
          <h1 className="mt-4 font-wide text-display font-black uppercase">Green flag, {firstName}.</h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Your order is in. A confirmation is on its way to <span className="text-foreground">{contact.email}</span>
            {shipping.method === "pickup" ? " — we’ll text you when it’s ready at the raceway counter." : ` and it ships via ${shipping.carrier}.`}
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Mail, title: "Confirmation", body: "Receipt and order summary in your inbox now." },
              { icon: Package, title: "Packed by the crew", body: "Checked against your order and packed to survive the trip." },
              { icon: Truck, title: shipping.method === "pickup" ? "Ready to collect" : "On its way", body: shipping.eta },
            ].map((s, i) => (
              <li key={s.title} className="rounded-lg border border-hairline bg-card p-5">
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-volt" aria-hidden="true" />
                  <span className="label-mono text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-4 font-semiwide font-bold">{s.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/collections/all">
                Keep shopping <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/raceway">Come race with us</Link>
            </Button>
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="rounded-lg border border-hairline bg-card p-6">
            <p className="font-semiwide font-bold">Order summary · {pluralize(totals.itemCount, "item")}</p>
            <ul className="mt-5 divide-y divide-hairline">
              {totals.lines.map((l) => (
                <li key={l.slug} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block label-mono text-[0.5625rem] text-muted-foreground">{l.brand} · {l.scales}</span>
                    <Link href={`/products/${l.slug}`} className="line-clamp-2 hover:underline">{l.name}</Link>
                    <span className="text-xs text-muted-foreground">Qty {l.qty}{l.preorderShips ? ` · pre-order, ships ${l.preorderShips}` : ""}</span>
                  </span>
                  <span className="shrink-0 tabular">{formatPrice(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-2 border-t border-hairline pt-4 text-sm">
              <Row k="Subtotal" v={formatPrice(totals.subtotal)} />
              {totals.discount > 0 && <Row k={`Discount${totals.promo ? ` (${totals.promo.code})` : ""}`} v={`−${formatPrice(totals.discount)}`} />}
              <Row k={`Shipping · ${shipping.label}`} v={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)} />
              <Row k="Tax" v={formatPrice(totals.tax)} />
              <div className="mt-2 flex justify-between border-t border-hairline pt-3 font-semiwide text-lg font-bold">
                <dt>Total</dt>
                <dd className="tabular">{formatPrice(totals.total)}</dd>
              </div>
            </dl>
            <div className="mt-6 grid gap-4 border-t border-hairline pt-5 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <p className="label-mono text-foreground">{shipping.method === "pickup" ? "Pickup" : "Ship to"}</p>
                <p className="mt-2">{shipping.name}</p>
                {shipping.address ? (
                  <p>
                    {shipping.address.line1}
                    {shipping.address.line2 ? `, ${shipping.address.line2}` : ""}
                    <br />
                    {shipping.address.city}, {shipping.address.state} {shipping.address.zip}
                  </p>
                ) : (
                  <p>Sebring raceway counter</p>
                )}
              </div>
              {order.payment && (
                <div>
                  <p className="label-mono text-foreground">Payment</p>
                  <p className="mt-2 flex items-center gap-1.5">
                    <Check className="size-3.5 text-go" aria-hidden="true" /> {order.payment.brand} •••• {order.payment.last4}
                  </p>
                  <p className="text-xs">Demo mode — not charged</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  )
}
