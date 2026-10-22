import { Suspense } from "react"

import { HeroLab } from "./hero-lab"

/** Dev lab for the realtime hero — see hero-lab.tsx for the query parameters. */
export default function HeroLabPage() {
  return (
    <Suspense fallback={null}>
      <HeroLab />
    </Suspense>
  )
}
