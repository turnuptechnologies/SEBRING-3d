"use client"

import { createContext, use, type RefObject } from "react"

import type { MenuKey } from "@/components/layout/header/nav-data"

export interface RouteInfo {
  pathname: string
  search: string
}

export interface HeaderContextValue {
  /** Open mega menu (desktop). */
  menu: MenuKey | null
  setMenu: (menu: MenuKey | null) => void
  /** Desktop type-ahead popover. */
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  mobileSearchOpen: boolean
  setMobileSearchOpen: (open: boolean) => void
  closeAll: () => void
  /** Null until the client knows the URL (it is read inside a Suspense leaf). */
  route: RouteInfo | null
  /** The desktop search input, so "/" and ⌘K can focus it. */
  searchInputRef: RefObject<HTMLInputElement | null>
  /** Header is tucked (desktop: nav row hidden, mobile: bar hidden). */
  compact: boolean
  /** Page has scrolled under the header (glass on). */
  scrolled: boolean
}

export const HeaderContext = createContext<HeaderContextValue | null>(null)

export function useHeader() {
  const ctx = use(HeaderContext)
  if (!ctx) throw new Error("useHeader must be used inside <HeaderFrame>")
  return ctx
}
