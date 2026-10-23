import { ViewTransition, type ReactNode } from "react"

import { CartSheet } from "@/components/cart/cart-sheet"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { AppProviders } from "@/components/providers/app-providers"

/** Store chrome shared by every storefront route (and the 404). */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-sm bg-volt px-4 py-3 font-semibold text-carbon-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="relative min-h-[60svh] overflow-x-clip">
        {/* Route changes crossfade + rise; the header and footer stay put. */}
        <ViewTransition default="page">{children}</ViewTransition>
      </main>
      <SiteFooter />
      <CartSheet />
      <div className="grain" aria-hidden="true" />
    </AppProviders>
  )
}
