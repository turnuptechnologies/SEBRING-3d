import type { Metadata } from "next"

import { GarageView } from "@/app/(site)/garage/garage-view"

export const metadata: Metadata = {
  title: "My Garage",
  description: "Your saved slot cars and parts, the cars you race and the parts that fit them, and everything you viewed last.",
  robots: { index: false, follow: true },
}

export default function GaragePage() {
  return <GarageView />
}
