"use client"

import dynamic from "next/dynamic"

import { useHeader } from "@/components/layout/header/header-context"
import { useIdle } from "@/lib/perf/use-idle"

const MobileMenu = dynamic(() => import("@/components/layout/header/mobile-menu").then((m) => m.MobileMenu), { ssr: false })
const MobileSearch = dynamic(() => import("@/components/layout/header/search/mobile-search").then((m) => m.MobileSearch), { ssr: false })

/** Phone menu + search overlays load after first paint, or the moment they are opened. */
export function LazyMobileOverlays() {
  const idle = useIdle()
  const { mobileMenuOpen, mobileSearchOpen } = useHeader()
  return (
    <>
      {(idle || mobileMenuOpen) && <MobileMenu />}
      {(idle || mobileSearchOpen) && <MobileSearch />}
    </>
  )
}
