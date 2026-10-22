import type { Metadata } from "next"
import { Suspense } from "react"

import { ListingSkeleton } from "@/components/collection/listing-skeleton"
import { SearchView } from "@/components/collection/search-view"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Search",
  description: "Search every slot car, part, controller and set by name, brand, SKU or maker code.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
}

/** The query is read on the client (useSearchParams), so the shell stays static. */
export default function SearchPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-hairline-grid [--grid-size:72px] [mask-image:radial-gradient(80%_140%_at_70%_0%,#000_5%,transparent_70%)]"
        />
        <div className="container-site pt-5 md:pt-6">
          <Breadcrumbs items={[{ label: "Search" }]} baseUrl={site.url} />
          <h1 className="mt-9 flex items-center gap-3 label-mono text-muted-foreground md:mt-12">
            <span aria-hidden="true" className="h-px w-8 bg-current opacity-40" />
            Search the catalog
          </h1>
        </div>
      </section>
      <Suspense fallback={<ListingSkeleton kind="search" />}>
        <SearchView />
      </Suspense>
    </>
  )
}
