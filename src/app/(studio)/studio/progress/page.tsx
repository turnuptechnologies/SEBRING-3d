import { Suspense } from "react"

import { ProgressClient } from "./progress-client"

export default function ProgressPage() {
  return (
    <Suspense fallback={null}>
      <ProgressClient />
    </Suspense>
  )
}
