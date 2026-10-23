import type { Metadata } from "next"

import { PageIntro, Prose } from "@/components/content/page-intro"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy policy" }

/* SAMPLE legal text — have it reviewed before launch. */
export default function PrivacyPage() {
  return (
    <>
      <PageIntro crumb="Privacy" eyebrow="Legal" title="Privacy policy">How {site.legalName} collects, uses and protects your information.</PageIntro>
      <Prose
        sections={[
          { id: "collect", title: "What we collect", body: <p>The details you give us when you order, register for an event or contact us — name, email, phone, delivery address — plus basic analytics about how the site is used.</p> },
          { id: "use", title: "How we use it", body: <p>To fulfil and support your orders, run race events, answer your questions and, if you opt in, send new-arrival emails. We never sell your information.</p> },
          { id: "payments", title: "Payments", body: <p>Card payments are handled by our payment provider. We never see or store your full card number.</p> },
          { id: "cookies", title: "Cookies & local storage", body: <p>Your cart, saved garage and recently viewed items are kept in your browser’s local storage so they’re there when you come back.</p> },
          { id: "rights", title: "Your choices", body: <p>Unsubscribe from emails with one click, or ask us to access, correct or delete your data at <a href={`mailto:${site.email}`}>{site.email}</a>.</p> },
        ]}
      />
    </>
  )
}
