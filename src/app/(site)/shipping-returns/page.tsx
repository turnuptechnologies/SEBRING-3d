import type { Metadata } from "next"

import { PageIntro, Prose } from "@/components/content/page-intro"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { formatPrice } from "@/lib/format"
import { commerce } from "@/lib/site"

export const metadata: Metadata = { title: "Shipping & returns", description: "Tracked shipping, same-day dispatch, raceway pickup and 30-day returns." }

/* SAMPLE policy text — confirm carriers, rates and the return window with Sebring before launch. */
const FAQ = [
  { q: "Do you ship internationally?", a: "Right now we ship to US addresses only. Contact us for a quote to Canada." },
  { q: "My order arrived damaged — what now?", a: "Send a photo of the box and part within 7 days and we’ll replace it or refund you, including shipping." },
  { q: "Can I return a part I’ve already fitted?", a: "Parts that have been glued, trued, soldered or run on track can’t be returned unless they’re faulty." },
  { q: "When do pre-orders ship?", a: "The day stock lands with us. We charge when the order ships, and you can cancel anytime before." },
]

export default function ShippingReturnsPage() {
  const rates = Object.values(commerce.shippingRates)
  return (
    <>
      <PageIntro crumb="Shipping & returns" eyebrow="Help" title="Shipping & returns">
        {commerce.processing} Every parcel is tracked, and standard shipping is free over {formatPrice(commerce.freeShippingThreshold, { round: true })}.
      </PageIntro>
      <Prose
        sections={[
          {
            id: "rates",
            title: "Rates & delivery times",
            body: (
              <div className="overflow-x-auto rounded-lg border border-hairline">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-carbon-850 label-mono text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium">Carrier</th>
                      <th className="px-4 py-3 font-medium">Delivery</th>
                      <th className="px-4 py-3 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-foreground">
                    {rates.map((r) => (
                      <tr key={r.label}>
                        <td className="px-4 py-3.5 font-medium">{r.label}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{r.carrier}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{r.eta}</td>
                        <td className="px-4 py-3.5 text-right tabular">
                          {r.price === 0 ? "Free" : formatPrice(r.price)}
                          {r.label === "Standard" && <span className="block text-xs text-volt">Free over {formatPrice(commerce.freeShippingThreshold, { round: true })}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          },
          { id: "processing", title: "Processing", body: <p>{commerce.processing} Orders placed on weekends ship Monday. You’ll get a tracking link by email the moment your parcel is scanned.</p> },
          { id: "pickup", title: "Raceway pickup", body: <p>Choose <strong>Raceway pickup</strong> at checkout and collect from the counter during open hours — usually within two hours. Bring your order number.</p> },
          {
            id: "returns",
            title: `${commerce.returnWindowDays}-day returns`,
            body: (
              <>
                <p>Unused items in their original packaging can be returned within {commerce.returnWindowDays} days of delivery for a full refund to the original payment method.</p>
                <p>Start a return through our <a href="/contact?topic=order">contact form</a> with your order number and we’ll send a prepaid label for faulty items or return instructions for everything else.</p>
              </>
            ),
          },
          {
            id: "faq",
            title: "Questions",
            body: (
              <Accordion type="single" collapsible>
                {FAQ.map((f) => (
                  <AccordionItem key={f.q} value={f.q} className="border-hairline">
                    <AccordionTrigger className="text-left text-base text-foreground">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ),
          },
        ]}
      />
    </>
  )
}
