import type { ReactNode } from "react"

import { AnnouncementBar } from "@/components/layout/header/announcement-bar"
import { HeaderActions } from "@/components/layout/header/header-actions"
import { HeaderFrame } from "@/components/layout/header/header-frame"
import { LogoLink } from "@/components/layout/header/logo-link"
import { MegaNav } from "@/components/layout/header/mega-nav"
import { MEGA_PANELS } from "@/components/layout/header/mega-panels"
import { LazyMobileOverlays } from "@/components/layout/header/lazy-overlays"
import { menuTotal, type MenuKey } from "@/components/layout/header/nav-data"
import { HeaderSearch } from "@/components/layout/header/search/header-search"
import { primaryNav, secondaryNav } from "@/lib/site"

/**
 * Store header: announcement strip, sticky main bar (logo · type-ahead search ·
 * garage · cart) and the department row with mega menus. The mega-menu panels
 * render here on the server; the client only toggles them.
 */
export function SiteHeader() {
  const items = primaryNav.map((item) => ({ key: item.menu, label: item.label, count: menuTotal(item.menu) }))
  const panels = Object.fromEntries(
    primaryNav.map((item) => {
      const Panel = MEGA_PANELS[item.menu]
      return [item.menu, <Panel key={item.menu} />]
    })
  ) as Record<MenuKey, ReactNode>
  const raceway = secondaryNav.find((l) => l.href === "/raceway") ?? { label: "Raceway & Events", href: "/raceway" }

  return (
    <HeaderFrame
      announcement={<AnnouncementBar />}
      logo={<LogoLink />}
      search={<HeaderSearch />}
      actions={<HeaderActions />}
      nav={<MegaNav items={items} panels={panels} links={secondaryNav.filter((l) => l.href === "/brands")} raceway={raceway} />}
      overlays={<LazyMobileOverlays />}
    />
  )
}
