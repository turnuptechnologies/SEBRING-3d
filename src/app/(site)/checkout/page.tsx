import type { Metadata } from "next"
import { Suspense } from "react"

import { CheckoutView } from "./checkout-view"

export const metadata: Metadata = { title: "Checkout", robots: { index: false } }

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container-site min-h-[70svh] py-20" />}>
      <CheckoutView />
    </Suspense>
  )
}
