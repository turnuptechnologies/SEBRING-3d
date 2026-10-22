import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/** Text link with an underline that draws in and an arrow that slides — "View all cars →". */
export function ArrowLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "group/arrow inline-flex items-center gap-2 font-semiwide text-xs font-bold tracking-[0.1em] uppercase",
        "outline-none focus-visible:text-volt",
        className
      )}
    >
      <span className="relative">
        {children}
        <span aria-hidden="true" className="absolute -bottom-1.5 left-0 h-px w-full origin-left bg-current opacity-35" />
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-volt transition-transform duration-500 ease-out-expo group-hover/arrow:scale-x-100 light:bg-carbon-900"
        />
      </span>
      <ArrowRight className="size-3.5 transition-transform duration-500 ease-out-expo group-hover/arrow:translate-x-1" aria-hidden="true" />
    </Link>
  )
}
