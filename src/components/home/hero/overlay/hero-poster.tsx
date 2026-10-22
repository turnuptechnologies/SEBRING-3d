import { getImageProps } from "next/image"

import { HeroBackdrop } from "@/components/home/hero/overlay/hero-backdrop"

export interface HeroPosterSources {
  desktop: string
  mobile: string
}

/**
 * Still frame of the hero scene, art-directed per breakpoint. It sits under
 * the WebGL canvas for the whole session, so the hero is never an empty box:
 * before the scene's chunk loads, for reduced motion, and without WebGL.
 * Falls back to the designed CSS raceway until the poster renders exist.
 */
export function HeroPoster({ sources }: { sources: HeroPosterSources | null }) {
  if (!sources) return <HeroBackdrop />

  const common = { alt: "", fill: true, sizes: "100vw", quality: 80 } as const
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: sources.desktop })
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: sources.mobile })

  return (
    <div aria-hidden="true" className="absolute inset-0 bg-carbon-950">
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop} sizes="100vw" />
        <source media="(max-width: 767.98px)" srcSet={mobile} sizes="100vw" />
        <img {...rest} alt="" loading="eager" fetchPriority="high" decoding="async" className="object-cover object-[50%_46%]" />
      </picture>
    </div>
  )
}
