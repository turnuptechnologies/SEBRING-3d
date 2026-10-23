import type { Metadata } from "next"

import { PageIntro, Prose } from "@/components/content/page-intro"
import { commerce, site } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of sale" }

/* SAMPLE legal text — have it reviewed before launch. */
export default function TermsPage() {
  return (
    <>
      <PageIntro crumb="Terms" eyebrow="Legal" title="Terms of sale">The rules of the road for buying from {site.legalName}.</PageIntro>
      <Prose
        sections={[
          { id: "orders", title: "Orders & pricing", body: <p>Prices are in US dollars and include no sales tax until checkout. We confirm every order by email; if an item turns out to be unavailable we’ll refund it in full.</p> },
          { id: "preorders", title: "Pre-orders", body: <p>Pre-order dates come from manufacturers and can move. You can cancel a pre-order any time before it ships.</p> },
          { id: "returns", title: "Returns", body: <p>Unused items can be returned within {commerce.returnWindowDays} days. See <a href="/shipping-returns">shipping & returns</a> for details.</p> },
          { id: "raceway", title: "Raceway", body: <p>Racers follow the house rules and marshal instructions. Rental cars are returned in the condition they were raced; normal wear is on us.</p> },
          { id: "contact", title: "Contact", body: <p>Questions about these terms? Email <a href={`mailto:${site.email}`}>{site.email}</a>.</p> },
        ]}
      />
    </>
  )
}
