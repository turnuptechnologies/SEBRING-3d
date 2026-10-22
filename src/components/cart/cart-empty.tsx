"use client"

import { ArrowRight, Heart } from "lucide-react"
import Link from "next/link"
import { useId } from "react"

import { useStoresReady } from "@/components/cart/use-stores-ready"
import { Button } from "@/components/ui/button"
import { useGarage } from "@/lib/commerce/garage-store"
import { pluralize } from "@/lib/format"
import { primaryNav } from "@/lib/site"
import { cn } from "@/lib/utils"

interface CartEmptyStateProps {
  variant?: "drawer" | "page"
  title?: string
  description?: string
  onNavigate?: () => void
  className?: string
  /** Heading level — the cart page already owns the h1. */
  as?: "h2" | "h3"
}

export function CartEmptyState({
  variant = "drawer",
  title = "Your cart is empty",
  description = "Line up a new car for the grid — or the parts that make yours faster.",
  onNavigate,
  className,
  as: Heading = "h2",
}: CartEmptyStateProps) {
  const hydrated = useStoresReady()
  const savedCount = useGarage((s) => s.saved.length)
  const page = variant === "page"

  return (
    <div className={cn("flex flex-col items-center text-center", page ? "py-10 md:py-16" : "px-6 py-10", className)}>
      <EmptyGridArt className={page ? "w-[min(100%,26rem)]" : "w-[min(100%,17rem)]"} />
      <p className="mt-6 label-mono text-[0.625rem] text-muted-foreground">Grid slot 01 · 00 items</p>
      <Heading className={cn("mt-3 font-wide font-black uppercase text-balance", page ? "text-[clamp(2rem,4.2vw,3.5rem)] leading-[0.92] tracking-[-0.03em]" : "text-[1.625rem] leading-[0.95] tracking-[-0.03em]")}>{title}</Heading>
      <p className={cn("mt-4 max-w-sm text-pretty text-muted-foreground", page ? "text-base" : "text-sm")}>{description}</p>

      <div className={cn("mt-8 flex w-full flex-col gap-2.5", page ? "max-w-md sm:flex-row sm:justify-center" : "max-w-xs")}>
        <Button asChild size={page ? "lg" : "default"} className="sm:flex-1">
          <Link href="/collections/slot-cars" onNavigate={onNavigate}>
            Shop slot cars
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline" size={page ? "lg" : "default"} className="sm:flex-1">
          <Link href="/collections/parts" onNavigate={onNavigate}>
            Shop parts
          </Link>
        </Button>
      </div>

      <nav aria-label="Shop by category" className="mt-8 w-full">
        <ul className="flex flex-wrap justify-center gap-2">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onNavigate={onNavigate}
                className="inline-flex min-h-9 items-center rounded-full border border-hairline px-3.5 text-xs font-medium text-ivory-200 transition-colors hover:border-foreground/30 hover:bg-foreground/[0.04] hover:text-foreground touch:min-h-11"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {hydrated && savedCount > 0 && (
        <Link
          href="/garage"
          onNavigate={onNavigate}
          className="group/garage mt-8 inline-flex items-center gap-2.5 rounded-sm border border-dashed border-foreground/15 px-4 py-3 text-sm text-ivory-200 transition-colors hover:border-volt/50 hover:text-foreground"
        >
          <Heart className="size-4 text-signal" aria-hidden="true" />
          {pluralize(savedCount, "item")} saved in My Garage
          <ArrowRight className="size-3.5 transition-transform duration-500 ease-out-expo group-hover/garage:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

/** An empty, chamfered starting-grid box on a stretch of slot track. */
function EmptyGridArt({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const fade = `empty-fade-${uid}`
  const mask = `empty-mask-${uid}`
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <svg viewBox="0 0 280 120" className="w-full" fill="none">
        <defs>
          <linearGradient id={fade} x1="0" x2="1">
            <stop offset="0" stopColor="#f3efe6" stopOpacity="0" />
            <stop offset="0.2" stopColor="#f3efe6" stopOpacity="1" />
            <stop offset="0.8" stopColor="#f3efe6" stopOpacity="1" />
            <stop offset="1" stopColor="#f3efe6" stopOpacity="0" />
          </linearGradient>
          <mask id={mask}>
            <rect width="280" height="120" fill={`url(#${fade})`} />
          </mask>
        </defs>
        <g mask={`url(#${mask})`}>
          <rect x="0" y="18" width="280" height="84" fill="#131319" />
          <path d="M0 18H280M0 102H280" stroke="#f3efe6" strokeOpacity=".12" />
          <path d="M0 42H280M0 78H280" stroke="#060609" strokeWidth="3" />
          <path d="M0 39.5H280M0 44.5H280M0 75.5H280M0 80.5H280" stroke="#d08a5c" strokeOpacity=".45" strokeWidth=".8" />
          <path d="M0 60H280" stroke="#f3efe6" strokeOpacity=".16" strokeDasharray="10 12" />
        </g>
        <path d="M112 24H176V70L168 78H104V32Z" stroke="#ffd23f" strokeWidth="1.3" strokeDasharray="5 4" />
        <text x="140" y="56" textAnchor="middle" fill="#ffd23f" fontFamily="var(--font-geist-mono), monospace" fontSize="13" letterSpacing="2">
          P1
        </text>
        <path d="M96 92H184" stroke="#f3efe6" strokeOpacity=".22" strokeWidth="6" strokeDasharray="6 6" />
      </svg>
      <div className="pointer-events-none absolute inset-0 overflow-hidden mask-fade-x">
        <div className="absolute inset-y-[15%] left-0 w-1/4 animate-sweep bg-gradient-to-r from-transparent via-volt/10 to-transparent" />
      </div>
    </div>
  )
}
