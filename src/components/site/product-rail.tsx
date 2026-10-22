"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useCallback, useEffect, useState, type ReactNode } from "react"

import { ProductCard } from "@/components/site/product-card"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import type { Product } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

interface ProductRailProps {
  products: Product[]
  /** Optional heading block rendered left of the controls. */
  header?: ReactNode
  /** Accessible name for the carousel region. */
  label: string
  className?: string
  /** Tailwind basis classes per item. */
  itemClassName?: string
  eagerCount?: number
}

/**
 * Draggable product carousel (shadcn Carousel / Embla) with arrow controls,
 * keyboard support and a scrub-style progress bar.
 */
export function ProductRail({ products, header, label, className, itemClassName, eagerCount = 0 }: ProductRailProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [progress, setProgress] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const sync = useCallback((a: NonNullable<CarouselApi>) => {
    setProgress(Math.max(0, Math.min(1, a.scrollProgress())))
    setCanPrev(a.canScrollPrev())
    setCanNext(a.canScrollNext())
  }, [])

  useEffect(() => {
    if (!api) return
    sync(api)
    api.on("scroll", sync).on("reInit", sync).on("select", sync)
    return () => {
      api.off("scroll", sync).off("reInit", sync).off("select", sync)
    }
  }, [api, sync])

  return (
    <section aria-label={label} className={cn("relative", className)}>
      <div className="mb-8 flex items-end justify-between gap-6">
        <div className="min-w-0 flex-1">{header}</div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => api?.scrollPrev()} disabled={!canPrev} aria-label="Previous products">
            <ArrowLeft />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => api?.scrollNext()} disabled={!canNext} aria-label="Next products">
            <ArrowRight />
          </Button>
        </div>
      </div>
      <Carousel setApi={setApi} opts={{ align: "start", dragFree: false, containScroll: "trimSnaps", skipSnaps: true }} className="[&_[data-slot=carousel-content]]:overflow-visible">
        <CarouselContent className="-ml-4 md:-ml-5">
          {products.map((p, i) => (
            <CarouselItem key={p.slug} className={cn("basis-[82%] pl-4 sm:basis-1/2 md:pl-5 lg:basis-1/3 xl:basis-1/4", itemClassName)}>
              <ProductCard product={p} eager={i < eagerCount} sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 48vw, 82vw" className="h-full" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="mt-8 h-px w-full bg-hairline" aria-hidden="true">
        <div className="h-px origin-left bg-volt transition-transform duration-300 light:bg-carbon-900" style={{ transform: `scaleX(${Math.max(progress, 0.08)})` }} />
      </div>
    </section>
  )
}
