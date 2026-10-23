import type { Metadata } from "next"
import { Suspense } from "react"

import { SuccessView } from "./success-view"

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } }

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="container-site min-h-[70svh] py-20" />}>
      <SuccessView />
    </Suspense>
  )
}
