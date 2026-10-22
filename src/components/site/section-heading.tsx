import type { ReactNode } from "react"

import { ArrowLink } from "@/components/site/arrow-link"
import { RevealText } from "@/components/motion/reveal-text"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  /** Small mono label above the title, e.g. "Shop by category". */
  eyebrow: string
  /** Section number shown before the eyebrow ("01"). */
  index?: number
  title: string
  description?: ReactNode
  action?: { label: string; href: string }
  align?: "left" | "center"
  /** h1 on landing sections of inner pages, h2 elsewhere. */
  as?: "h1" | "h2"
  className?: string
  size?: "display" | "headline"
}

/** The house section header: index · eyebrow, expanded uppercase title, optional link. */
export function SectionHeading({ eyebrow, index, title, description, action, align = "left", as = "h2", className, size = "headline" }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
        <Eyebrow index={index} className={cn(align === "center" && "justify-center")}>
          {eyebrow}
        </Eyebrow>
        <RevealText
          as={as}
          text={title}
          className={cn("mt-4 font-wide font-black uppercase text-balance", size === "display" ? "text-display" : "text-headline")}
        />
        {description && <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {action && <ArrowLink href={action.href} className="shrink-0">{action.label}</ArrowLink>}
    </div>
  )
}

export function Eyebrow({ children, index, className }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 label-mono text-muted-foreground", className)}>
      {index != null && <span className="text-volt light:text-carbon-900">{indexLabel(index)}</span>}
      <span aria-hidden="true" className="h-px w-8 bg-current opacity-40" />
      <span>{children}</span>
    </p>
  )
}
