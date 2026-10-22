"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useEffectEvent } from "react"

import type { RouteInfo } from "@/components/layout/header/header-context"

/**
 * Reports the current URL to the header. Reading the URL can suspend under
 * Cache Components, so this leaf renders nothing and lives in its own
 * <Suspense> — the rest of the header stays in the static shell.
 */
export function RouteWatcher({ onChange }: { onChange: (route: RouteInfo) => void }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const notify = useEffectEvent(onChange)

  useEffect(() => {
    notify({ pathname, search })
  }, [pathname, search])

  return null
}
