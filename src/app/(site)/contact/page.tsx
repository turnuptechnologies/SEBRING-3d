import { Clock, Mail, MapPin, Phone } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ContactForm } from "@/components/content/contact-form"
import { PageIntro } from "@/components/content/page-intro"
import { formatAddress, site } from "@/lib/site"

export const metadata: Metadata = { title: "Contact & fit check", description: "Ask the Sebring crew — fit checks, orders, returns, raceway and parties." }

export default function ContactPage() {
  const details = [
    { icon: Phone, label: "Call or text", value: site.phone, href: site.phoneHref },
    { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, label: "Raceway & counter", value: formatAddress(), href: "/raceway" },
    { icon: Clock, label: "Replies", value: "Within one business day", href: "/raceway" },
  ]
  return (
    <>
      <PageIntro crumb="Contact" eyebrow="Ask the Sebring crew" title="Not sure it fits? Ask us.">
        Tell us your car and the part you’re eyeing and we’ll confirm the fit before you order. Questions about an order, the raceway or a party go here too.
      </PageIntro>
      <section className="container-site grid gap-12 py-16 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Suspense fallback={<div className="h-[640px]" />}>
            <ContactForm />
          </Suspense>
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <ul className="grid gap-3">
            {details.map((d) => (
              <li key={d.label}>
                <Link href={d.href} className="flex gap-4 rounded-lg border border-hairline bg-card p-5 transition-colors hover:border-foreground/25">
                  <d.icon className="mt-0.5 size-5 shrink-0 text-volt" aria-hidden="true" />
                  <span>
                    <span className="block label-mono text-muted-foreground">{d.label}</span>
                    <span className="mt-1.5 block font-medium">{d.value}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </>
  )
}
