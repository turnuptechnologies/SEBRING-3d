import { ArrowUpRight, MessageCircleQuestionMark, PackageCheck, ShieldCheck, Truck, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { formatPrice } from "@/lib/format"
import { commerce } from "@/lib/site"
import { cn } from "@/lib/utils"

interface Proof {
  icon: LucideIcon
  title: string
  body: ReactNode
  href?: string
  cta?: string
}

const carriers = [commerce.shippingRates.standard.carrier, commerce.shippingRates.express.carrier]

const proofs: Proof[] = [
  {
    icon: Truck,
    title: "Tracked shipping",
    body: (
      <>
        {commerce.processing} <span className="text-foreground/70">{carriers.join(" · ")}.</span>
      </>
    ),
    href: "/shipping-returns",
    cta: "Shipping & returns",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    body: <PaymentMarks />,
  },
  {
    icon: PackageCheck,
    title: `Free shipping over ${formatPrice(commerce.freeShippingThreshold, { round: true })}`,
    body: (
      <>
        Standard is {formatPrice(commerce.shippingRates.standard.price)} below that — or collect from the raceway counter for free.
      </>
    ),
    href: "/shipping-returns",
    cta: "Rates & times",
  },
  {
    icon: MessageCircleQuestionMark,
    title: "Not sure it fits?",
    body: "Tell the crew your car and we'll confirm the part before you buy.",
    href: "/contact?topic=fit-check",
    cta: "Ask the crew",
  },
]

/** Four crisp reasons to buy here, straight under the hero. */
export function TrustStrip() {
  return (
    <section aria-label="Why shop with Sebring" className="relative border-b border-hairline bg-carbon-950">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ivory-100/12 to-transparent" />
      <ul className="container-site grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {proofs.map((p, i) => (
          <li
            key={p.title}
            className={cn(
              "relative border-hairline max-sm:border-t max-sm:first:border-t-0",
              "sm:max-xl:[&:nth-child(n+3)]:border-t sm:max-xl:odd:border-r",
              "xl:border-l xl:last:border-r"
            )}
          >
            <ProofItem proof={p} index={i} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProofItem({ proof, index }: { proof: Proof; index: number }) {
  const Icon = proof.icon
  const content = (
    <>
      <span
        aria-hidden="true"
        className="relative grid size-11 shrink-0 place-items-center chamfer bg-ivory-100/[0.06] text-ivory-200 transition-colors duration-500 ease-out-expo [--chamfer:9px] group-hover/proof:bg-volt group-hover/proof:text-carbon-900"
      >
        <Icon className="size-[1.15rem]" strokeWidth={1.6} />
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-2 font-semiwide text-[0.8125rem] font-bold tracking-[0.06em] text-foreground uppercase">
          {proof.title}
          {proof.href && (
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 -translate-x-1 text-volt opacity-0 transition-all duration-500 ease-out-expo group-hover/proof:translate-x-0 group-hover/proof:opacity-100 group-focus-visible/proof:translate-x-0 group-focus-visible/proof:opacity-100"
            />
          )}
        </span>
        <span className="text-[0.875rem] leading-relaxed text-pretty text-muted-foreground">{proof.body}</span>
        {proof.cta && <span className="sr-only">— {proof.cta}</span>}
      </span>
      <span aria-hidden="true" className="absolute top-5 right-5 font-mono text-[0.625rem] tracking-[0.2em] text-foreground/25 tabular max-xl:hidden">
        0{index + 1}
      </span>
    </>
  )
  const base = "group/proof relative flex h-full items-start gap-4 px-1 py-6 sm:px-6 sm:py-8 xl:px-7"
  if (!proof.href) return <div className={base}>{content}</div>
  return (
    <Link
      href={proof.href}
      className={cn(
        base,
        "outline-none transition-colors duration-500 ease-out-expo hover:bg-ivory-100/[0.025] focus-visible:bg-ivory-100/[0.04] focus-visible:shadow-[inset_0_0_0_1px_var(--color-volt)]"
      )}
    >
      {content}
    </Link>
  )
}

function PaymentMarks() {
  return (
    <span className="flex flex-col gap-2.5">
      <span>Pay by card or wallet over an encrypted connection.</span>
      <span className="flex flex-wrap gap-1.5" aria-label={`Accepted: ${commerce.paymentMethods.join(", ")}`} role="list">
        {commerce.paymentMethods.map((m) => (
          <span
            key={m}
            role="listitem"
            className="rounded-[3px] border border-ivory-100/12 px-1.5 py-1 font-mono text-[0.625rem] leading-none tracking-[0.08em] text-ivory-200/80 uppercase"
          >
            {m}
          </span>
        ))}
      </span>
    </span>
  )
}
