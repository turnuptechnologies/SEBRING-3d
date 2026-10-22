import { ArrowUpRight, Globe } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

/*
 * Generic social glyphs, drawn in lucide's 24px / 1.75 stroke language so they
 * sit naturally beside the rest of the icon set. They are simple pictograms
 * (camera, letter, play button…), not the networks' trademarked logos.
 */

type GlyphProps = SVGProps<SVGSVGElement>

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const

/** Rounded camera body with lens — photo networks (Instagram). */
export function CameraGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.1" cy="6.9" r="0.4" fill="currentColor" />
    </svg>
  )
}

/** Lower-case "f" — Facebook. */
export function LetterFGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M15.75 3.5h-2.1a3.9 3.9 0 0 0-3.9 3.9v13.1" />
      <path d="M6.75 10.25h7.75" />
    </svg>
  )
}

/** Play button in a rounded screen — video (YouTube). */
export function PlayGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="2.5" y="5.25" width="19" height="13.5" rx="4.25" />
      <path d="M10.25 9.4v5.2l4.4-2.6z" fill="currentColor" />
    </svg>
  )
}

/** Music note — short video (TikTok). */
export function NoteGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M13.5 3.5v11.25a3.25 3.25 0 1 1-3.25-3.25" />
      <path d="M13.5 3.5c.4 2.6 2.3 4.3 5 4.5" />
    </svg>
  )
}

/** Crossed strokes — X. */
export function CrossGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4.5 4.5l15 15" />
      <path d="M19.5 4.5l-15 15" />
    </svg>
  )
}

/** Speech bubble — community chat (Discord, forums). */
export function ChatGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M20.5 11.6c0 4-3.8 7.15-8.5 7.15-1.05 0-2.05-.15-2.98-.44L4.5 20l1.2-3.6c-1.4-1.3-2.2-2.97-2.2-4.8 0-4 3.8-7.1 8.5-7.1s8.5 3.1 8.5 7.1Z" />
      <path d="M8.75 11.75h.01M12 11.75h.01M15.25 11.75h.01" strokeWidth={2.25} />
    </svg>
  )
}

const GLYPHS: Record<string, ComponentType<GlyphProps>> = {
  instagram: CameraGlyph,
  facebook: LetterFGlyph,
  youtube: PlayGlyph,
  tiktok: NoteGlyph,
  x: CrossGlyph,
  twitter: CrossGlyph,
  discord: ChatGlyph,
}

/** Glyph for a network label from `site.social` ("Instagram" → camera). Unknown networks get a globe. */
export function SocialIcon({ network, className, ...props }: GlyphProps & { network: string }) {
  const Glyph = GLYPHS[network.toLowerCase().replace(/[^a-z]/g, "")] ?? Globe
  return <Glyph className={cn("size-4 shrink-0", className)} aria-hidden="true" {...props} />
}

interface SocialLinksProps {
  className?: string
  /** Prefix for each link's accessible name, e.g. "Sebring on". */
  namePrefix?: string
}

/**
 * Labelled social profile links from `site.social` (empty hrefs are hidden).
 * Icon + visible text — never an image-only control.
 */
export function SocialLinks({ className, namePrefix = `${site.shortName} on` }: SocialLinksProps) {
  const links = site.social.filter((s) => s.href)
  if (!links.length) return null
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {links.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={`${namePrefix} ${s.label} (opens in a new tab)`}
            className={cn(
              "group/social inline-flex h-10 items-center gap-1.5 rounded-sm border border-hairline bg-foreground/[0.02] pr-2.5 pl-2.5 text-[13px] font-medium text-smoke-300 sm:pr-2",
              "transition-[color,border-color,background-color] duration-300 ease-out-quint",
              "hover:border-foreground/25 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:border-volt focus-visible:text-foreground",
              "active:translate-y-px touch:h-11"
            )}
          >
            <SocialIcon network={s.label} className="transition-colors duration-300 group-hover/social:text-volt group-focus-visible/social:text-volt" />
            <span>{s.label}</span>
            <ArrowUpRight
              className="size-3 opacity-40 transition-[opacity,transform] duration-300 ease-out-expo group-hover/social:translate-x-px group-hover/social:-translate-y-px group-hover/social:opacity-90 max-sm:hidden"
              aria-hidden="true"
            />
          </a>
        </li>
      ))}
    </ul>
  )
}
