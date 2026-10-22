"use client"

import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, Expand } from "lucide-react"
import Image from "next/image"
import { ViewTransition, useEffect, useLayoutEffect, useState, type PointerEvent, type ReactNode } from "react"

import { VIEW_LONG, VIEW_SHORT } from "@/components/product/product-facts"
import { ZoomDialog } from "@/components/product/zoom-dialog"
import { HudCorners } from "@/components/site/hud-corners"
import { ProductPlaceholder } from "@/components/site/product-image"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { brandName, type ProductImage as ProductImageData } from "@/lib/catalog"
import type { Product } from "@/lib/catalog/types"
import { formatScales, indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const STAGE_SIZES = "(min-width: 1440px) 800px, (min-width: 1024px) 56vw, 100vw"

interface ProductGalleryProps {
  product: Product
  /** productImages(product) — empty until the 3D renders exist. */
  images: ProductImageData[]
}

/**
 * Studio stage: Embla carousel of the product renders with thumbnails,
 * keyboard arrows and a full-screen zoom viewer. The first image carries the
 * product's shared view-transition name so the card image morphs into it.
 */
export function ProductGallery({ product, images }: ProductGalleryProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [index, setIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const reduce = useReducedMotion()

  const count = images.length
  const multiple = count > 1
  const current = images[index]
  const number = product.art.kind === "car" ? product.art.livery.number : null
  const livery = product.art.kind === "car" ? product.art.livery : null

  useEffect(() => {
    if (!api) return
    const onSelect = () => setIndex(api.selectedScrollSnap())
    api.on("select", onSelect).on("reInit", onSelect)
    return () => {
      api.off("select", onSelect).off("reInit", onSelect)
    }
  }, [api])

  // A page hidden by <Activity> must not come back with the viewer open.
  useLayoutEffect(() => () => setZoomOpen(false), [])

  const go = (i: number) => api?.scrollTo(i, Boolean(reduce))
  const openZoom = () => {
    if (count) setZoomOpen(true)
  }
  const onZoomIndex = (i: number) => {
    setIndex(i)
    api?.scrollTo(i, true)
  }

  // Cursor-following studio light (CSS variables only — no re-render).
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`)
  }

  const media = (img: ProductImageData | undefined, i: number): ReactNode =>
    img ? (
      <Image
        src={img.src}
        alt={img.alt}
        fill
        sizes={STAGE_SIZES}
        quality={80}
        loading={i === 0 ? "eager" : "lazy"}
        fetchPriority={i === 0 ? "high" : "auto"}
        className="object-contain"
        draggable={false}
      />
    ) : (
      <ProductPlaceholder product={product} className="[&>span]:hidden" />
    )

  const slides: (ProductImageData | undefined)[] = count ? images : [undefined]

  return (
    <LayoutGroup id={`gallery-${product.slug}`}>
      <Carousel
        setApi={setApi}
        opts={{ loop: multiple, duration: 26, watchDrag: multiple }}
        aria-label={`${product.name} — images`}
        className="select-none"
      >
        <div
          onPointerMove={onPointerMove}
          className={cn(
            "group/stage @container relative isolate overflow-hidden rounded-lg border border-hairline bg-carbon-850 shadow-card",
            "max-sm:-mx-[clamp(1rem,4vw,3.5rem)] max-sm:rounded-none max-sm:border-x-0"
          )}
        >
          <StageBackdrop number={number} />

          <CarouselContent className="ml-0">
            {slides.map((img, i) => {
              const box = <div className="absolute inset-[6%]">{media(img, i)}</div>
              return (
                <CarouselItem
                  key={img?.src ?? "placeholder"}
                  className="pl-0"
                  aria-label={img ? `${i + 1} of ${count}: ${VIEW_LONG[img.view]}` : product.name}
                >
                  <div className={cn("relative aspect-[4/3]", img && "cursor-zoom-in")} onClick={img ? openZoom : undefined}>
                    {i === 0 ? (
                      <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
                        {box}
                      </ViewTransition>
                    ) : (
                      box
                    )}
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>

          <HudCorners inset={14} size={16} className="opacity-45 transition-opacity duration-500 group-hover/stage:opacity-100" />

          {/* Telemetry overlays */}
          <div className="pointer-events-none absolute top-5 left-5 z-[2] flex flex-col gap-2 label-mono text-[0.625rem] text-foreground/55 sm:top-6 sm:left-6">
            {current ? (
              <>
                <span className="tabular">
                  <span className="text-volt">{indexLabel(index + 1)}</span> / {indexLabel(count)}
                </span>
                <span className="text-foreground/40">{VIEW_LONG[current.view]}</span>
              </>
            ) : (
              <>
                <span>
                  <span className="text-volt">{brandName(product.brand)}</span> · {formatScales(product.scales)}
                </span>
                <span className="text-foreground/40">Studio photography in progress</span>
              </>
            )}
          </div>

          {count > 0 && (
            <button
              type="button"
              onClick={openZoom}
              className={cn(
                "absolute top-3.5 right-3.5 z-[2] inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-carbon-900/55 pr-4 pl-3.5 sm:top-4 sm:right-4",
                "label-mono text-[0.625rem] text-ivory-100 backdrop-blur-md transition-[background-color,border-color] duration-300",
                "hover:border-white/30 hover:bg-carbon-900/85 touch:h-11"
              )}
            >
              <Expand className="size-3.5" aria-hidden="true" />
              Zoom
            </button>
          )}

          <div className="pointer-events-none absolute inset-x-5 bottom-4 z-[2] flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-5">
            <div className="flex items-center gap-3 label-mono text-[0.625rem] text-foreground/45">
              {livery && (
                <span className="flex -space-x-1" aria-hidden="true">
                  {[livery.base, livery.secondary, livery.accent].map((hex, i) => (
                    <span key={`${hex}-${i}`} className="size-3 rounded-full ring-1 ring-white/30" style={{ backgroundColor: hex }} />
                  ))}
                </span>
              )}
              <span className="max-sm:hidden">
                {livery ? `Livery #${livery.number}` : product.sku}
                {current ? ` · ${formatScales(product.scales)}` : ""}
              </span>
            </div>
            {multiple && (
              <div className="pointer-events-auto flex items-center gap-2">
                <StageArrow direction="prev" onClick={() => api?.scrollPrev(Boolean(reduce))} />
                <StageArrow direction="next" onClick={() => api?.scrollNext(Boolean(reduce))} />
              </div>
            )}
          </div>
        </div>

        {multiple && (
          <div className="mt-3 flex items-start gap-4">
            <div className="grid flex-1 grid-cols-5 gap-2 sm:grid-cols-6 sm:gap-3 lg:max-w-[38rem]" role="group" aria-label="Choose an image">
              {images.map((img, i) => {
                const active = i === index
                return (
                  <button
                    key={img.src}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show image ${i + 1}: ${VIEW_LONG[img.view]}`}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "group/thumb relative aspect-[4/3] overflow-hidden rounded-md border bg-carbon-850 transition-[border-color,opacity] duration-300",
                      active ? "border-foreground/35" : "border-hairline opacity-70 hover:border-foreground/25 hover:opacity-100"
                    )}
                  >
                    <span aria-hidden="true" className="absolute inset-0 bg-spotlight" />
                    <span className="absolute inset-[9%] transition-transform duration-500 ease-out-expo group-hover/thumb:scale-105">
                      <Image src={img.src} alt="" fill sizes="128px" quality={70} className="object-contain" draggable={false} />
                    </span>
                    <span
                      className={cn(
                        "absolute bottom-1.5 left-2 hidden font-mono text-[0.5625rem] tracking-[0.14em] uppercase transition-colors sm:block",
                        active ? "text-foreground/80" : "text-foreground/40"
                      )}
                    >
                      {indexLabel(i + 1)} {VIEW_SHORT[img.view]}
                    </span>
                    {active && <motion.span layoutId="thumb-indicator" className="absolute inset-x-0 bottom-0 h-0.5 bg-volt" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  </button>
                )
              })}
            </div>
            <p className="ml-auto hidden max-w-[11rem] pt-1 text-right label-mono text-[0.5625rem] leading-[1.7] tracking-[0.18em] text-foreground/35 xl:block">
              Drag or ← → to browse
              <br />
              Click the image to zoom
            </p>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {current && multiple ? `Image ${index + 1} of ${count}: ${VIEW_LONG[current.view]}` : ""}
        </p>
      </Carousel>

      {count > 0 && (
        <ZoomDialog
          open={zoomOpen}
          onOpenChange={setZoomOpen}
          images={images}
          index={index}
          onIndexChange={onZoomIndex}
          title={`${brandName(product.brand)} ${product.name}`}
        />
      )}
    </LayoutGroup>
  )
}

function StageArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous image" : "Next image"}
      className="grid size-10 place-items-center rounded-full border border-white/12 bg-carbon-900/55 text-ivory-100 backdrop-blur-md transition-[background-color,border-color,transform] duration-300 hover:border-white/30 hover:bg-carbon-900/85 active:scale-95 touch:size-11"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

/** Spotlight, a perspective "studio floor" grid, the race number and a cursor light. */
function StageBackdrop({ number }: { number: number | null }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-spotlight" />
      <div className="absolute inset-x-[-40%] bottom-[-2%] h-[56%] origin-bottom bg-hairline-grid [--grid-line:rgb(243_239_230/0.1)] [--grid-size:52px] [mask-image:linear-gradient(to_top,#000_0%,transparent_92%)] [transform:perspective(380px)_rotateX(62deg)]" />
      {number != null && (
        <span className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-wide text-[length:48cqw] leading-none font-black tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_rgb(243_239_230/0.07)]">
          {number}
        </span>
      )}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover/stage:opacity-100 [background:radial-gradient(560px_circle_at_var(--mx,50%)_var(--my,40%),rgb(255_210_63/0.075),transparent_62%)]" />
    </div>
  )
}
