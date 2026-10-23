"use client"

import { Lock, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

import { placeOrder } from "@/app/(site)/checkout/actions"
import { CheckoutSummary, CheckoutSummaryMobile } from "@/app/(site)/checkout/checkout-summary"
import { CheckField, SelectField, TextField } from "@/app/(site)/checkout/form-controls"
import { saveOrder } from "@/app/(site)/checkout/order-storage"
import { cardBrand, cvcLength, formatCardNumber, formatExpiry, paymentSchema, paymentSummary, type PaymentInput } from "@/app/(site)/checkout/payment"
import { contactSchema, deliverySchema, type DeliveryInput } from "@/app/(site)/checkout/schema"
import { US_STATES } from "@/app/(site)/checkout/us-states"
import { CartEmptyState } from "@/components/cart/cart-empty"
import { useCartView } from "@/components/cart/cart-rows"
import { ShippingOptions } from "@/components/cart/shipping-options"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCart } from "@/lib/commerce/cart-store"
import { formatPrice } from "@/lib/format"
import { fieldErrorsFrom } from "@/lib/forms"
import type { ShippingMethod } from "@/lib/site"

type Errors = Record<string, string>

function Step({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline bg-card p-5 sm:p-7" aria-labelledby={`step-${n}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={`step-${n}`} className="flex items-center gap-3 font-semiwide text-lg font-bold">
          <span className="grid size-7 place-items-center rounded-full bg-volt font-mono text-xs text-carbon-900">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function CheckoutView() {
  const view = useCartView()
  const router = useRouter()
  const shippingMethod = useCart((s) => s.shippingMethod)
  const setShippingMethod = useCart((s) => s.setShippingMethod)
  const promoCode = useCart((s) => s.promoCode)
  const clear = useCart((s) => s.clear)
  const lines = useCart((s) => s.lines)

  const [email, setEmail] = useState("")
  const [newsletter, setNewsletter] = useState(true)
  const [delivery, setDelivery] = useState<Omit<DeliveryInput, "method">>({ firstName: "", lastName: "", address1: "", address2: "", city: "", state: "", zip: "", phone: "" })
  const [pay, setPay] = useState<PaymentInput>({ cardNumber: "", cardName: "", expiry: "", cvc: "", billingSame: true, billingZip: "" })
  const [errors, setErrors] = useState<Errors>({})
  const [lineErrors, setLineErrors] = useState<Errors>({})
  const [pending, start] = useTransition()

  const setD = (k: keyof typeof delivery) => (e: { target: { value: string } }) => setDelivery((d) => ({ ...d, [k]: e.target.value }))
  const pickup = shippingMethod === "pickup"
  const brand = cardBrand(pay.cardNumber)

  if (!view.ready) return <div className="container-site min-h-[70svh] py-20" aria-busy="true" />
  if (view.rows.length === 0 || view.totals.itemCount === 0) {
    return (
      <div className="container-site py-16 md:py-24">
        <CartEmptyState variant="page" title="Nothing to check out yet" description="Your cart is empty — add a car or the parts you need and come back here." />
      </div>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    const c = contactSchema.safeParse({ email, newsletter })
    if (!c.success) Object.assign(next, prefix("contact", fieldErrorsFrom(c.error)))
    const d = deliverySchema.safeParse({ ...delivery, method: shippingMethod })
    if (!d.success) Object.assign(next, prefix("delivery", fieldErrorsFrom(d.error)))
    const p = paymentSchema.safeParse(pay)
    if (!p.success) Object.assign(next, prefix("payment", fieldErrorsFrom(p.error)))
    setErrors(next)
    if (Object.keys(next).length) {
      toast.error("A few details need attention.")
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus())
      return
    }
    start(async () => {
      const res = await placeOrder({
        contact: { email, newsletter },
        delivery: { ...delivery, method: shippingMethod },
        promoCode,
        lines: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
        expectedTotal: view.totals.total,
      })
      if (!res.ok) {
        setLineErrors(res.fieldErrors ?? {})
        toast.error(res.message)
        return
      }
      if (!res.data) return
      saveOrder({ ...res.data, payment: paymentSummary(pay) })
      clear()
      router.push(`/checkout/success?order=${encodeURIComponent(res.data.orderId)}`)
    })
  }

  const err = (k: string) => errors[k]

  return (
    <div className="container-site py-10 md:py-14">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-headline font-black uppercase">Checkout</h1>
        <p className="flex items-center gap-2 label-mono text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" /> Secure checkout
        </p>
      </div>

      <div className="mt-6 lg:hidden">
        <CheckoutSummaryMobile view={view} lineErrors={lineErrors} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 lg:col-span-7">
          <Step n={1} title="Contact">
            <div className="grid gap-5">
              <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err("contact.email")} hint="Your receipt and tracking go here." />
              <CheckField checked={newsletter} onCheckedChange={setNewsletter} label="Email me new arrivals and pre-orders" description="One or two emails a month. Unsubscribe anytime." />
            </div>
          </Step>

          <Step n={2} title="Delivery">
            <ShippingOptions value={shippingMethod} onChange={(m: ShippingMethod) => setShippingMethod(m)} variant="cards" labelledBy="step-2" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <TextField label="First name" autoComplete="given-name" value={delivery.firstName} onChange={setD("firstName")} error={err("delivery.firstName")} />
              <TextField label="Last name" autoComplete="family-name" value={delivery.lastName} onChange={setD("lastName")} error={err("delivery.lastName")} />
              {!pickup && (
                <>
                  <TextField fieldClassName="sm:col-span-2" label="Street address" autoComplete="address-line1" value={delivery.address1} onChange={setD("address1")} error={err("delivery.address1")} />
                  <TextField fieldClassName="sm:col-span-2" label="Apartment, suite, etc." optional autoComplete="address-line2" value={delivery.address2} onChange={setD("address2")} />
                  <TextField label="City" autoComplete="address-level2" value={delivery.city} onChange={setD("city")} error={err("delivery.city")} />
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField label="State" autoComplete="address-level1" value={delivery.state} onChange={setD("state")} error={err("delivery.state")} required>
                      <option value="" disabled>
                        State
                      </option>
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code}
                        </option>
                      ))}
                    </SelectField>
                    <TextField label="ZIP" inputMode="numeric" autoComplete="postal-code" value={delivery.zip} onChange={setD("zip")} error={err("delivery.zip")} />
                  </div>
                </>
              )}
              <TextField fieldClassName="sm:col-span-2" label="Phone" optional type="tel" autoComplete="tel" value={delivery.phone} onChange={setD("phone")} error={err("delivery.phone")} hint={pickup ? "We’ll text you when it’s ready at the counter." : "Only used if the carrier needs you."} />
            </div>
          </Step>

          <Step
            n={3}
            title="Payment"
            aside={<span className="label-mono rounded-[3px] bg-caution/12 px-2 py-1 text-caution">Demo mode</span>}
          >
            <p className="mb-5 flex items-start gap-2 rounded-md border border-hairline bg-carbon-850 p-3.5 text-[0.8125rem] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-go" aria-hidden="true" />
              Demo checkout — no payment is taken. Card details are checked in your browser only and never sent anywhere. Try 4242 4242 4242 4242.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                fieldClassName="sm:col-span-2"
                label="Card number"
                inputMode="numeric"
                autoComplete="cc-number"
                value={pay.cardNumber}
                onChange={(e) => setPay((p) => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))}
                error={err("payment.cardNumber")}
                trailing={brand ? <span className="label-mono text-muted-foreground">{brand}</span> : null}
              />
              <TextField fieldClassName="sm:col-span-2" label="Name on card" autoComplete="cc-name" value={pay.cardName} onChange={(e) => setPay((p) => ({ ...p, cardName: e.target.value }))} error={err("payment.cardName")} />
              <TextField label="Expiry" placeholder="MM / YY" inputMode="numeric" autoComplete="cc-exp" value={pay.expiry} onChange={(e) => setPay((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))} error={err("payment.expiry")} />
              <TextField label="Security code" inputMode="numeric" autoComplete="cc-csc" maxLength={cvcLength(brand)} value={pay.cvc} onChange={(e) => setPay((p) => ({ ...p, cvc: e.target.value.replace(/\D/g, "") }))} error={err("payment.cvc")} />
              <CheckField className="sm:col-span-2" checked={pay.billingSame} onCheckedChange={(v) => setPay((p) => ({ ...p, billingSame: v }))} label="Billing address is the same as delivery" />
              {!pay.billingSame && (
                <TextField label="Billing ZIP" inputMode="numeric" value={pay.billingZip} onChange={(e) => setPay((p) => ({ ...p, billingZip: e.target.value }))} error={err("payment.billingZip")} />
              )}
            </div>
          </Step>

          <Button type="submit" size="xl" disabled={pending} className="w-full">
            {pending ? <Spinner /> : <Lock />}
            {pending ? "Placing order…" : `Place order · ${formatPrice(view.totals.total)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By placing your order you agree to our <Link href="/terms" className="underline underline-offset-2">terms</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
          </p>
        </form>

        <aside className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28">
            <CheckoutSummary view={view} lineErrors={lineErrors} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function prefix(p: string, errs: Errors): Errors {
  return Object.fromEntries(Object.entries(errs).map(([k, v]) => [`${p}.${k}`, v]))
}
