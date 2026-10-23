import { ArrowRight, ArrowUpRight, Clock3, Lock, RotateCcw, Truck } from "lucide-react"
import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { BackToTop } from "@/components/layout/footer/back-to-top"
import { FooterWordmark } from "@/components/layout/footer/footer-wordmark"
import { LazyNewsletter } from "@/components/layout/footer/lazy-newsletter"
import { StoreStatus } from "@/components/layout/footer/store-status"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion"
import { SUBCATEGORY_ICONS } from "@/components/site/category-icon"
import { ProductImage } from "@/components/site/product-image"
import { Eyebrow } from "@/components/site/section-heading"
import { SocialLinks } from "@/components/site/social-icons"
import { brandName, brands, collectionProducts, primaryImage, products, scales } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { formatPrice } from "@/lib/format"
import { openingHours, productPath } from "@/lib/seo"
import { commerce, directionsHref, footerNav, site } from "@/lib/site"
import { cn } from "@/lib/utils"

/** Static on purpose: a server component must not read the clock (cacheComponents). Bump each January. */
const COPYRIGHT_YEAR = 2026

type NavLink = { readonly label: string; readonly href: string }

/** Live product count for collection links, so shoppers see how deep each shelf is. */
function shelfCount(href: string): number | null {
  const match = href.match(/^\/collections\/([a-z0-9-]+)$/)
  if (match) return collectionProducts(match[1]).length || null
  if (href === "/brands") return brands.length
  return null
}

/** Shipping, dispatch and returns promises, worded from `commerce`. */
function serviceFacts() {
  return [
    { icon: Truck, text: `Free tracked shipping over ${formatPrice(commerce.freeShippingThreshold, { round: true })}`, href: "/shipping-returns" },
    { icon: Clock3, text: commerce.processing, href: "/shipping-returns" },
    { icon: RotateCcw, text: `${commerce.returnWindowDays}-day returns`, href: "/shipping-returns" },
  ]
}

function latestArrival(): Product | undefined {
  return products.filter((p) => p.isNew).sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]
}

const linkClass =
  "rounded-xs text-smoke-200 underline decoration-foreground/20 underline-offset-[5px] transition-[color,text-decoration-color] duration-300 hover:text-foreground hover:decoration-volt focus-visible:text-foreground"

/**
 * Site footer: new-arrival emails, the store directory, contact & hours,
 * payment and service facts, and a scroll-drawn SEBRING sign-off.
 */
export function SiteFooter() {
  const sessions = openingHours()
  const latest = latestArrival()

  return (
    <footer className="relative isolate overflow-hidden border-t border-hairline bg-carbon-950 text-foreground">
      {/* Finish line + ambient headlight glow and fading hairline grid */}
      <div aria-hidden="true" className="h-2 bg-checker opacity-[0.12] mask-fade-x [--checker-a:var(--color-ivory-100)] [--checker-b:transparent] [--checker-size:8px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(42%_52%_at_18%_0%,rgb(255_210_63/0.065),transparent_72%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-hairline-grid opacity-70 mask-fade-b [--grid-size:72px]" />

      {/* 1 · Newsletter ------------------------------------------------------ */}
      <section aria-labelledby="site-footer-newsletter" className="container-site grid grid-cols-1 gap-12 pt-20 pb-16 md:pt-24 md:pb-20 lg:grid-cols-12 lg:gap-8 lg:pt-28 lg:pb-24">
        <Reveal className="min-w-0 lg:col-span-6" blur={false}>
          <Eyebrow>Newsletter</Eyebrow>
          <h2
            id="site-footer-newsletter"
            className="mt-6 font-wide text-[clamp(2.4rem,5.4vw,4.85rem)] leading-[0.9] font-black tracking-[-0.035em] uppercase"
          >
            <span className="block">Get</span>
            <span className="block whitespace-nowrap">new-arrival</span>
            <span className="block text-transparent [-webkit-text-stroke:1.25px_var(--color-ivory-100)]">emails</span>
          </h2>
          <p className="mt-7 max-w-md text-base leading-relaxed text-smoke-400 text-pretty">
            Fresh liveries, restocks and pre-order windows — in your inbox before they sell out.
          </p>
          {latest && <LatestArrival product={latest} />}
        </Reveal>
        <Reveal className="min-w-0 lg:col-span-5 lg:col-start-8 lg:self-end" delay={0.08} blur={false}>
          <LazyNewsletter />
        </Reveal>
      </section>

      {/* 2 · Directory ------------------------------------------------------- */}
      <div className="container-site">
        <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-14 border-t border-hairline py-16 md:grid-cols-12 md:gap-x-8 lg:py-20" stagger={0.06}>
          <RevealItem className="col-span-2 md:col-span-12 lg:col-span-4 lg:pr-6">
            <Link href="/" aria-label={`${site.name} — home`} className="inline-flex rounded-sm">
              <Logo />
            </Link>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-smoke-400 text-pretty">{site.description}</p>
            <p className="mt-6 font-mono text-[11px] tracking-[0.16em] text-smoke-500 uppercase tabular">
              {brands.length} brands <span className="text-smoke-600">·</span> Scale {scales.map((s) => s.label).join(" / ")}
            </p>
            <SocialLinks className="mt-8" />
          </RevealItem>

          <RevealItem className="md:col-span-4 lg:col-span-2">
            <FooterLinks id="site-footer-shop" title="Shop" links={footerNav.shop} counts />
          </RevealItem>
          <RevealItem className="md:col-span-4 lg:col-span-2">
            <FooterLinks id="site-footer-help" title="Help" links={footerNav.help} />
          </RevealItem>

          <RevealItem className="col-span-2 md:col-span-4 lg:col-span-4 lg:pl-4">
            <h2 className="label-mono text-smoke-500">Visit &amp; contact</h2>
            <address className="mt-6 not-italic">
              <dl className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-4 gap-y-5 text-[15px] leading-snug">
                <dt className="pt-1 label-mono text-smoke-600">Raceway</dt>
                <dd>
                  <span className="block text-smoke-200">{site.address.street}</span>
                  <span className="block text-smoke-200">
                    {site.address.city}, {site.address.region} {site.address.postalCode}
                  </span>
                  <a
                    href={directionsHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/dir mt-2 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-smoke-400 transition-colors hover:text-foreground focus-visible:text-foreground"
                  >
                    Get directions
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out-expo group-hover/dir:translate-x-px group-hover/dir:-translate-y-px" aria-hidden="true" />
                    <span className="sr-only">(opens Google Maps in a new tab)</span>
                  </a>
                </dd>

                <dt className="pt-1 label-mono text-smoke-600">Phone</dt>
                <dd>
                  <a href={site.phoneHref} className={cn(linkClass, "tabular")}>
                    {site.phone}
                  </a>
                </dd>

                <dt className="pt-1 label-mono text-smoke-600">Email</dt>
                <dd className="min-w-0">
                  <a href={`mailto:${site.email}`} className={cn(linkClass, "break-all")}>
                    {site.email}
                  </a>
                </dd>

                <dt className="pt-1 label-mono text-smoke-600">Hours</dt>
                <dd>
                  <Link href="/raceway#hours" className={linkClass}>
                    Opening hours &amp; race nights
                  </Link>
                  <StoreStatus sessions={sessions} className="mt-2.5" />
                </dd>
              </dl>
            </address>
          </RevealItem>
        </RevealGroup>
      </div>

      {/* 3 · Service facts --------------------------------------------------- */}
      <div className="container-site">
        <ul className="grid border-t border-hairline md:grid-cols-3">
          {serviceFacts().map(({ icon: Icon, text, href }) => (
            <li key={text} className="border-hairline not-first:border-t md:px-6 md:first:pl-0 md:last:pr-0 md:not-first:border-t-0 md:not-first:border-l">
              <Link
                href={href}
                className="group/fact flex min-h-11 items-center gap-3.5 py-5 text-[13px] leading-snug text-smoke-400 transition-colors duration-300 hover:text-foreground focus-visible:text-foreground"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-hairline text-smoke-300 transition-colors duration-300 group-hover/fact:border-foreground/25 group-hover/fact:text-volt">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-pretty">{text}</span>
                <ArrowRight className="ml-auto size-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-500 ease-out-expo group-hover/fact:translate-x-0 group-hover/fact:opacity-60" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* 4 · Sign-off ------------------------------------------------------------ */}
      <div className="border-t border-hairline">
        <div className="container-site flex items-center justify-between gap-6 pt-6 pb-2 md:pt-8">
          <p className="label-mono text-smoke-600">
            <span className="hidden sm:inline">{site.name} · </span>
            {site.address.city}, {site.address.region}
          </p>
          <BackToTop className="-mr-1" />
        </div>
        <FooterWordmark className="mx-auto max-w-[1920px] px-[clamp(0.75rem,1.6vw,2rem)] pt-4 pb-2" />
      </div>

      {/* 5 · Legal & payment --------------------------------------------------- */}
      <div className="container-site flex flex-col gap-5 border-t border-hairline py-6 text-[13px] text-smoke-500 lg:flex-row lg:items-center lg:justify-between">
        <p>
          © {COPYRIGHT_YEAR} {site.legalName}. All rights reserved.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="mr-2 flex items-center gap-2 label-mono text-smoke-500">
              <Lock className="size-3.5" aria-hidden="true" />
              Secure checkout
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Accepted payment methods">
              {commerce.paymentMethods.map((method) => (
                <li
                  key={method}
                  className="inline-flex h-7 items-center rounded-[3px] border border-hairline bg-carbon-900 px-2.5 font-semiwide text-[10px] font-bold tracking-[0.1em] text-smoke-300 uppercase"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
          <ul className="-mx-2 flex items-center">
            {footerNav.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-10 items-center rounded-sm px-2 transition-colors hover:text-foreground focus-visible:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

function FooterLinks({ id, title, links, counts = false }: { id: string; title: string; links: readonly NavLink[]; counts?: boolean }) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="label-mono text-smoke-500">
        {title}
      </h2>
      <ul className="mt-5">
        {links.map((link) => {
          const count = counts ? shelfCount(link.href) : null
          return (
            <li key={link.label}>
              <Link
                href={link.href}
                className="group/link -mx-2 flex min-h-10 items-center gap-2 rounded-sm px-2 text-[15px] text-smoke-300 transition-colors duration-300 hover:text-foreground focus-visible:text-foreground touch:min-h-11"
              >
                <span aria-hidden="true" className="h-px w-0 bg-volt transition-[width] duration-500 ease-out-expo group-hover/link:w-3 group-focus-visible/link:w-3" />
                <span>{link.label}</span>
                {count != null && (
                  <>
                    <span aria-hidden="true" className="ml-auto pl-3 font-mono text-[11px] text-smoke-600 tabular transition-colors duration-300 group-hover/link:text-smoke-400">
                      {String(count).padStart(2, "0")}
                    </span>
                    <span className="sr-only">
                      ({count} {link.href === "/brands" ? "brands" : count === 1 ? "product" : "products"})
                    </span>
                  </>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function LatestArrival({ product }: { product: Product }) {
  const Icon = SUBCATEGORY_ICONS[product.subcategory]
  return (
    <Link
      href={productPath(product)}
      className="group/latest mt-10 flex w-full max-w-md min-w-0 items-center gap-4 rounded-lg border border-hairline bg-carbon-900/70 p-2.5 pr-4 shadow-card backdrop-blur-sm transition-[border-color,background-color] duration-300 hover:border-foreground/20 hover:bg-carbon-850 focus-visible:border-volt"
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-carbon-800 bg-spotlight">
        {primaryImage(product) ? (
          <ProductImage product={product} sizes="64px" className="p-1.5" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-smoke-500">
            <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 label-mono text-volt">
          <span aria-hidden="true" className="size-1.5 animate-live rounded-full bg-volt" />
          Just landed
        </span>
        <span className="mt-2 line-clamp-2 font-semiwide text-[13px] leading-snug font-bold tracking-[0.02em] uppercase">{product.name}</span>
        <span className="mt-1 block text-[13px] text-smoke-500">
          {brandName(product.brand)} · <span className="tabular">{formatPrice(product.price)}</span>
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-smoke-400 transition-[transform,color] duration-500 ease-out-expo group-hover/latest:translate-x-1 group-hover/latest:text-volt" aria-hidden="true" />
    </Link>
  )
}
