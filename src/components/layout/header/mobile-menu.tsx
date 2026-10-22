"use client"

import { ArrowRight, ArrowUpRight, BookOpen, CalendarClock, Cpu, Flag, Heart, Mail, Phone, ScanSearch, Search, Sparkles, Store, X, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { useHeader } from "@/components/layout/header/header-context"
import {
  controllersMenu,
  FIT_LINKS,
  listingLink,
  menuTotal,
  partsMenu,
  PLUG_GUIDE,
  saleMenu,
  slotCarsMenu,
  trackMenu,
  type MenuKey,
  type NavLink,
} from "@/components/layout/header/nav-data"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useHydrated } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { primaryNav, secondaryNav, site } from "@/lib/site"
import { cn } from "@/lib/utils"

const stagger = (i: number) => ({ animationDelay: `${90 + i * 45}ms` }) as CSSProperties
const RISE = "animate-in fade-in-0 slide-in-from-right-6 fill-mode-both duration-700 ease-out-expo"

/** Phone & tablet menu: departments → types, scales, quick links, raceway, contact. */
export function MobileMenu() {
  const { mobileMenuOpen: open, setMobileMenuOpen: setOpen, setMobileSearchOpen } = useHeader()
  const skipFocusReturn = useRef(false)

  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [open, setOpen])

  // Any link closes the menu as navigation starts (focus stays with the new page).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!(e.target as Element).closest("a[href]")) return
    skipFocusReturn.current = true
    setOpen(false)
  }

  const openSearch = () => {
    skipFocusReturn.current = true
    setOpen(false)
    setMobileSearchOpen(true)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onClick={onClick}
        onCloseAutoFocus={(e) => {
          if (skipFocusReturn.current) e.preventDefault()
          skipFocusReturn.current = false
        }}
        className="gap-0 border-hairline bg-carbon-900 p-0 duration-500 ease-out-expo data-[side=right]:w-full data-[side=right]:sm:max-w-[28rem] lg:hidden"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Shop by department, quick links, the raceway and how to reach us.</SheetDescription>

        <div className="flex h-15 shrink-0 items-center justify-between border-b border-hairline pr-2 pl-4 pt-[env(safe-area-inset-top)]">
          <Link href="/" aria-label={`${site.name} — home`} className="rounded-sm outline-none focus-visible:outline-offset-2">
            <Logo variant="compact" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center gap-2 rounded-sm px-3 font-semiwide text-[0.6875rem] font-bold tracking-[0.12em] text-ivory-100 uppercase outline-none active:bg-white/[0.06] focus-visible:outline-offset-[-2px]"
          >
            Close
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="px-4 pt-4" style={stagger(0)}>
            <button
              type="button"
              onClick={openSearch}
              aria-haspopup="dialog"
              className={cn(
                RISE,
                "flex h-12 w-full items-center gap-3 rounded-sm border border-white/12 bg-white/[0.04] px-4 text-left text-[0.9375rem] text-smoke-400 outline-none active:bg-white/[0.07] focus-visible:border-volt/60"
              )}
            >
              <Search aria-hidden="true" className="size-[1.125rem] text-volt" />
              Search cars, parts, brands or SKU
            </button>
          </div>

          <nav aria-label="Shop by department" className="mt-2 px-4">
            <Accordion type="single" collapsible>
              {primaryNav.map((item, i) => (
                <AccordionItem key={item.menu} value={item.menu} className={cn(RISE, "border-hairline")} style={stagger(i + 1)}>
                  <AccordionTrigger
                    className={cn(
                      "items-center rounded-none py-[1.125rem] font-wide text-[1.3125rem] leading-none font-black tracking-[-0.025em] uppercase hover:no-underline focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-offset-[-2px]",
                      "**:data-[slot=accordion-trigger-icon]:size-5",
                      item.menu === "sale" ? "text-signal" : "text-ivory-50"
                    )}
                  >
                    <span className="flex items-baseline gap-2.5">
                      {item.label}
                      <span className="font-mono text-[0.625rem] font-normal tracking-normal text-smoke-500 tabular">{menuTotal(item.menu)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5">
                    <Department menu={item.menu} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>

          <QuickLinks start={primaryNav.length + 1} />

          <div className={cn(RISE, "mt-8 px-4")} style={stagger(primaryNav.length + 3)}>
            <RacewayCard />
          </div>

          <div className={cn(RISE, "mt-8 px-4")} style={stagger(primaryNav.length + 4)}>
            <p className="label-mono text-[0.625rem] text-smoke-500">Talk to the crew</p>
            <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
              <ContactRow href={site.phoneHref} icon={Phone} label="Call" value={site.phone} />
              <ContactRow href={`mailto:${site.email}`} icon={Mail} label="Email" value={site.email} />
              <ContactRow href={FIT_LINKS[0].href} icon={ScanSearch} label="Fit check" value="Confirm a part fits" />
              {secondaryNav
                .filter((l) => l.href === "/contact")
                .map((l) => (
                  <ContactRow key={l.href} href={l.href} icon={ArrowUpRight} label={l.label} value="Hours, address & help" />
                ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Department({ menu }: { menu: MenuKey }) {
  switch (menu) {
    case "slot-cars": {
      const m = slotCarsMenu()
      return (
        <>
          <AllLink link={m.all} />
          <SubHeading>By class</SubHeading>
          <Rows links={m.byClass} />
          {m.scales.length > 0 && (
            <>
              <SubHeading>By scale</SubHeading>
              <Pills links={m.scales} noun="cars" />
            </>
          )}
          {m.quick.length > 0 && (
            <>
              <SubHeading>Quick picks</SubHeading>
              <Rows links={m.quick} />
            </>
          )}
        </>
      )
    }
    case "parts": {
      const m = partsMenu()
      return (
        <>
          <AllLink link={m.all} />
          {m.groups.map((g) => (
            <div key={g.title}>
              <SubHeading>{g.title}</SubHeading>
              <Rows links={[...g.links, { ...g.all, icon: ArrowRight }]} />
            </div>
          ))}
          <SubHeading>Find parts that fit</SubHeading>
          <Rows links={m.fit.map((f) => ({ label: f.label, href: f.href, count: -1, icon: f.icon }))} />
        </>
      )
    }
    case "track-sets": {
      const m = trackMenu()
      return (
        <>
          <AllLink link={m.all} />
          <Rows links={[...m.links, m.digital]} />
        </>
      )
    }
    case "controllers-power": {
      const m = controllersMenu()
      return (
        <>
          <AllLink link={m.all} />
          <Rows links={m.links} />
          <SubHeading>Plug guide</SubHeading>
          <Rows links={[{ label: PLUG_GUIDE.label, href: PLUG_GUIDE.href, count: -1, icon: BookOpen }]} />
        </>
      )
    }
    case "sale": {
      const m = saleMenu()
      return (
        <>
          <AllLink link={m.all} />
          <SubHeading>By category</SubHeading>
          <Rows links={m.byCategory} />
          {m.bands.length > 0 && (
            <>
              <SubHeading>Price bands</SubHeading>
              <Pills links={m.bands} noun="deals" />
            </>
          )}
        </>
      )
    }
  }
}

function SubHeading({ children }: { children: ReactNode }) {
  return <p className="mt-5 mb-1.5 label-mono text-[0.5625rem] text-smoke-500">{children}</p>
}

function AllLink({ link }: { link: NavLink }) {
  return (
    <Link
      href={link.href}
      className="flex min-h-12 items-center justify-between gap-3 rounded-sm bg-white/[0.045] px-4 font-semiwide text-[0.75rem] font-bold tracking-[0.1em] text-ivory-50 uppercase outline-none active:bg-white/[0.08] focus-visible:outline-offset-[-2px]"
    >
      <span>
        {link.label}
        <span className="ml-2 font-mono font-normal tracking-normal text-smoke-500">{link.count}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 text-volt" />
    </Link>
  )
}

/** Big touch rows. A negative count hides the count (help links). */
function Rows({ links }: { links: NavLink[] }) {
  if (!links.length) return <p className="py-2 text-sm text-smoke-400">New stock lands every week — check back soon.</p>
  return (
    <ul className="flex flex-col">
      {links.map((l) => {
        const Icon = l.icon
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              className="-mx-1 flex min-h-12 items-center gap-3.5 rounded-sm px-1 text-[0.9375rem] text-ivory-100/85 outline-none active:bg-white/[0.06] focus-visible:outline-offset-[-2px]"
            >
              {Icon && <Icon aria-hidden="true" className="size-[1.125rem] shrink-0 text-smoke-500" />}
              <span className="min-w-0 flex-1 truncate">{l.label}</span>
              {l.count >= 0 && (
                <span className="font-mono text-[0.6875rem] text-smoke-500 tabular">
                  {l.count}
                  <span className="sr-only"> products</span>
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Pills({ links, noun }: { links: NavLink[]; noun: string }) {
  return (
    <ul className="mt-1 grid grid-cols-3 gap-2">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className="flex h-[4.5rem] flex-col justify-between bg-white/[0.05] px-3 py-2.5 outline-none chamfer [--chamfer:8px] active:bg-volt active:text-carbon-900 focus-visible:bg-volt focus-visible:text-carbon-900"
          >
            <span className="font-wide text-[1.0625rem] leading-none font-black tracking-[-0.03em]">{l.label}</span>
            <span className="label-mono text-[0.5rem] text-smoke-500">
              {l.count} {noun}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function QuickLinks({ start }: { start: number }) {
  const hydrated = useHydrated()
  const saved = useGarage((s) => s.saved.length)
  const tiles: { label: string; href: string; icon: LucideIcon; meta?: string }[] = [
    { ...listingLink("new-arrivals", {}, "New arrivals"), icon: Sparkles },
    { ...listingLink("pre-orders", {}, "Pre-orders"), icon: CalendarClock },
    { ...listingLink("digital", {}, "Digital racing"), icon: Cpu },
    ...secondaryNav.filter((l) => l.href === "/brands").map((l) => ({ label: `All ${l.label.toLowerCase()}`, href: l.href, icon: Store })),
    { label: "My Garage", href: "/garage", icon: Heart, meta: hydrated && saved > 0 ? String(saved) : undefined },
    { label: "Tech guides", href: "/tech", icon: BookOpen },
  ]
  return (
    <div className={cn(RISE, "mt-8 px-4")} style={stagger(start)}>
      <p className="label-mono text-[0.625rem] text-smoke-500">Quick links</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {tiles.map(({ label, href, icon: Icon, meta }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.02] px-3.5 text-[0.875rem] leading-tight text-ivory-100 outline-none active:border-volt/50 active:bg-white/[0.05] focus-visible:border-volt"
            >
              <Icon aria-hidden="true" className="size-[1.125rem] shrink-0 text-volt" />
              <span className="min-w-0 flex-1">{label}</span>
              {meta && <span className="font-mono text-[0.6875rem] text-smoke-400 tabular">{meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RacewayCard() {
  const raceway = secondaryNav.find((l) => l.href === "/raceway")
  if (!raceway) return null
  return (
    <Link
      href={raceway.href}
      className="group/race relative flex items-center gap-4 overflow-hidden rounded-md border border-white/12 p-4 outline-none active:bg-white/[0.04] focus-visible:border-volt"
    >
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-24 bg-checker opacity-[0.06] [--checker-size:10px] mask-fade-x" />
      <span className="grid size-11 shrink-0 place-items-center rounded-sm border border-white/12 text-ivory-100">
        <Flag aria-hidden="true" className="size-[1.125rem]" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-semiwide text-[0.8125rem] font-bold tracking-[0.08em] text-ivory-50 uppercase">{raceway.label}</span>
        <span className="mt-1 block text-[0.8125rem] leading-snug text-smoke-400">Race nights, open practice and parties at the {site.address.city} track.</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="relative size-4 shrink-0 text-smoke-400" />
    </Link>
  )
}

function ContactRow({ href, icon: Icon, label, value }: { href: string; icon: LucideIcon; label: string; value: string }) {
  return (
    <li>
      <a href={href} className="flex min-h-14 items-center gap-3.5 outline-none active:bg-white/[0.04] focus-visible:outline-offset-[-2px]">
        <Icon aria-hidden="true" className="size-[1.125rem] shrink-0 text-smoke-400" />
        <span className="label-mono w-20 shrink-0 text-[0.5625rem] text-smoke-500">{label}</span>
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ivory-100">{value}</span>
      </a>
    </li>
  )
}
