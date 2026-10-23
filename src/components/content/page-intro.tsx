import type { ReactNode } from "react"

import { Breadcrumbs } from "@/components/site/breadcrumbs"

/** Header band for content pages: breadcrumb, eyebrow, expanded title, lede. */
export function PageIntro({ crumb, eyebrow, title, children }: { crumb: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <div aria-hidden="true" className="absolute inset-0 bg-hairline-grid opacity-50 mask-fade-b" />
      <div className="relative container-site pt-10 pb-14 md:pb-20">
        <Breadcrumbs items={[{ label: crumb }]} />
        <p className="mt-12 label-mono text-volt">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-wide text-display font-black uppercase text-balance">{title}</h1>
        {children && <div className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">{children}</div>}
      </div>
    </section>
  )
}

/** Long-form article with a sticky table of contents. */
export function Prose({ sections }: { sections: { id: string; title: string; body: ReactNode }[] }) {
  return (
    <div className="container-site grid gap-12 py-16 md:py-24 lg:grid-cols-12">
      <nav aria-label="On this page" className="lg:col-span-3">
        <div className="sticky top-28">
          <p className="label-mono text-muted-foreground">On this page</p>
          <ol className="mt-4 grid gap-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex gap-3 text-muted-foreground transition-colors hover:text-foreground">
                  <span className="font-mono text-xs text-volt">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>
      <div className="max-w-3xl lg:col-span-8 lg:col-start-5">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-28 border-b border-hairline py-10 first:pt-0 last:border-0">
            <h2 className="font-semiwide text-2xl font-bold">{s.title}</h2>
            <div className="mt-4 grid gap-4 leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
