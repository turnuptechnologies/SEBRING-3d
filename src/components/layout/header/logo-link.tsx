import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { site } from "@/lib/site"

/** Home link. A light sweep crosses the badge on hover, like headlights over a livery. */
export function LogoLink() {
  return (
    <Link
      href="/"
      aria-label={`${site.name} — home`}
      className="group/logo relative -ml-1 flex shrink-0 items-center rounded-sm p-1 outline-none focus-visible:outline-offset-1"
    >
      <Logo className="max-[379px]:hidden" />
      <Logo variant="compact" className="min-[380px]:hidden" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1 size-9 -translate-y-1/2 overflow-hidden chamfer [--chamfer:7px]">
        <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[18deg] bg-white/50 transition-transform duration-[900ms] ease-out-expo group-hover/logo:translate-x-[480%]" />
      </span>
    </Link>
  )
}
