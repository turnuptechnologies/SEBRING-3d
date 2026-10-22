import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export interface Crumb {
  label: string
  href?: string
}

/** Category-path breadcrumbs (+ JSON-LD BreadcrumbList for search engines). */
export function Breadcrumbs({ items, className, baseUrl }: { items: Crumb[]; className?: string; baseUrl?: string }) {
  const all: Crumb[] = [{ label: "Home", href: "/" }, ...items]
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${baseUrl ?? ""}${c.href}` } : {}),
    })),
  }
  return (
    <nav aria-label="Breadcrumb" className={cn("label-mono text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((c, i) => {
          const last = i === all.length - 1
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-2">
              {c.href && !last ? (
                <Link href={c.href} className="transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "text-foreground")}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3 opacity-50" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  )
}
