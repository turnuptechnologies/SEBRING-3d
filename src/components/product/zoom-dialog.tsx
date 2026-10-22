"use client"

import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from "react"

import { VIEW_LONG, VIEW_SHORT } from "@/components/product/product-facts"
import { HudCorners } from "@/components/site/hud-corners"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ProductImage as ProductImageData } from "@/lib/catalog"
import { indexLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const MIN_SCALE = 1
const MAX_SCALE = 4
const STEP = 1.6
const TAP_SCALE = 2.5
const RENDER_RATIO = 4 / 3

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface ZoomHandle {
  zoomBy: (factor: number) => void
  reset: () => void
  pan: (dx: number, dy: number) => void
}

interface ZoomStageProps {
  image: ProductImageData
  onScaleChange: (scale: number) => void
  onSwipe: (direction: 1 | -1) => void
  ref?: Ref<ZoomHandle>
}

/** One image with wheel / pinch / double-tap zoom and drag-to-pan, clamped to the image's edges. */
function ZoomStage({ image, onScaleChange, onSwipe, ref }: ZoomStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const view = useRef({ s: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
    moved: boolean
    pinch?: { dist: number; s: number; cx: number; cy: number; x: number; y: number }
  } | null>(null)
  const lastTap = useRef(0)
  const [zoomed, setZoomed] = useState(false)

  const bounds = (s: number) => {
    const vp = viewportRef.current
    if (!vp) return { mx: 0, my: 0 }
    const W = vp.clientWidth
    const H = vp.clientHeight
    const w = Math.min(W, H * RENDER_RATIO)
    const h = w / RENDER_RATIO
    return { mx: Math.max(0, (w * s - W) / 2), my: Math.max(0, (h * s - H) / 2) }
  }

  const commit = (s: number, x: number, y: number, animate: boolean) => {
    const scale = clamp(s, MIN_SCALE, MAX_SCALE)
    const { mx, my } = bounds(scale)
    const next = { s: scale, x: clamp(x, -mx, mx), y: clamp(y, -my, my) }
    view.current = next
    const layer = layerRef.current
    if (layer) {
      layer.dataset.animate = animate ? "true" : "false"
      layer.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.s})`
    }
    setZoomed(scale > 1.01)
    onScaleChange(scale)
  }

  /** Zoom around a point given relative to the viewport centre. */
  const zoomAt = (target: number, px: number, py: number, animate: boolean) => {
    const { s, x, y } = view.current
    const k = clamp(target, MIN_SCALE, MAX_SCALE) / s
    commit(target, px - (px - x) * k, py - (py - y) * k, animate)
  }

  const fromCenter = (clientX: number, clientY: number) => {
    const r = viewportRef.current!.getBoundingClientRect()
    return { px: clientX - (r.left + r.width / 2), py: clientY - (r.top + r.height / 2) }
  }

  useImperativeHandle(ref, () => ({
    zoomBy: (factor) => zoomAt(view.current.s * factor, 0, 0, true),
    reset: () => commit(1, 0, 0, true),
    pan: (dx, dy) => commit(view.current.s, view.current.x + dx, view.current.y + dy, true),
  }))

  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault()
    const { px, py } = fromCenter(e.clientX, e.clientY)
    // ctrlKey = trackpad pinch on macOS, which reports much smaller deltas.
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0024))
    zoomAt(view.current.s * factor, px, py, false)
  })
  const onResize = useEffectEvent(() => commit(view.current.s, view.current.x, view.current.y, false))

  // Wheel needs a non-passive listener so the page behind the dialog doesn't scroll.
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const wheel = (e: WheelEvent) => onWheel(e)
    const resize = () => onResize()
    vp.addEventListener("wheel", wheel, { passive: false })
    window.addEventListener("resize", resize)
    return () => {
      vp.removeEventListener("wheel", wheel)
      window.removeEventListener("resize", resize)
    }
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      gesture.current = { startX: e.clientX, startY: e.clientY, baseX: view.current.x, baseY: view.current.y, moved: false }
    } else if (pts.length === 2 && gesture.current) {
      const [a, b] = pts
      const { px, py } = fromCenter((a.x + b.x) / 2, (a.y + b.y) / 2)
      gesture.current.moved = true
      gesture.current.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: view.current.s, cx: px, cy: py, x: view.current.x, y: view.current.y }
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    const pts = [...pointers.current.values()]
    if (pts.length >= 2 && g.pinch) {
      const [a, b] = pts
      const { px, py } = fromCenter((a.x + b.x) / 2, (a.y + b.y) / 2)
      const target = clamp((g.pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.pinch.dist, MIN_SCALE, MAX_SCALE)
      const k = target / g.pinch.s
      // Keep the pinch centre under the fingers while it moves.
      commit(target, px - (g.pinch.cx - g.pinch.x) * k, py - (g.pinch.cy - g.pinch.y) * k, false)
      return
    }
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.moved && Math.hypot(dx, dy) > 6) g.moved = true
    if (!g.moved) return
    if (view.current.s > 1.01) commit(view.current.s, g.baseX + dx, g.baseY + dy, false)
    else if (layerRef.current) {
      // Not zoomed: rubber-band horizontally as swipe feedback.
      layerRef.current.dataset.animate = "false"
      layerRef.current.style.transform = `translate3d(${dx * 0.35}px, 0, 0) scale(1)`
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (pointers.current.size === 1) {
      // Pinch ended with one finger still down: continue as a pan from here.
      const [rest] = [...pointers.current.values()]
      gesture.current = { startX: rest.x, startY: rest.y, baseX: view.current.x, baseY: view.current.y, moved: true }
      return
    }
    if (pointers.current.size > 0) return
    gesture.current = null
    const dx = e.clientX - g.startX

    if (!g.moved) {
      const now = performance.now()
      const isDoubleTap = now - lastTap.current < 320
      lastTap.current = now
      if (e.pointerType === "mouse" || isDoubleTap) {
        const { px, py } = fromCenter(e.clientX, e.clientY)
        if (view.current.s > 1.01) commit(1, 0, 0, true)
        else zoomAt(TAP_SCALE, px, py, true)
      }
      return
    }
    if (view.current.s <= 1.01 && !g.pinch) {
      commit(1, 0, 0, true)
      if (Math.abs(dx) > 64) onSwipe(dx < 0 ? 1 : -1)
    }
  }

  return (
    <div
      ref={viewportRef}
      className={cn("relative h-full w-full touch-none overflow-hidden outline-none", zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={layerRef}
        className="absolute inset-0 transition-transform duration-500 ease-out-expo will-change-transform data-[animate=false]:transition-none"
      >
        <Image src={image.src} alt={image.alt} fill sizes="100vw" quality={90} loading="eager" className="pointer-events-none object-contain select-none" draggable={false} />
      </div>
    </div>
  )
}

interface ZoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: ProductImageData[]
  index: number
  onIndexChange: (index: number) => void
  title: string
}

/** Full-screen image viewer: zoom (buttons, wheel, pinch, double-tap), pan, swipe and keyboard. */
export function ZoomDialog({ open, onOpenChange, images, index, onIndexChange, title }: ZoomDialogProps) {
  const stage = useRef<ZoomHandle>(null)
  const [scale, setScale] = useState(1)
  const count = images.length
  const image = images[Math.min(index, count - 1)]
  const multiple = count > 1

  const go = (delta: number) => {
    if (!multiple) return
    setScale(1)
    onIndexChange((index + delta + count) % count)
  }
  const select = (i: number) => {
    setScale(1)
    onIndexChange(i)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const zoomed = scale > 1.01
    switch (e.key) {
      case "+":
      case "=":
        e.preventDefault()
        stage.current?.zoomBy(STEP)
        break
      case "-":
      case "_":
        e.preventDefault()
        stage.current?.zoomBy(1 / STEP)
        break
      case "0":
        e.preventDefault()
        stage.current?.reset()
        break
      case "ArrowLeft":
      case "ArrowRight": {
        const dir = e.key === "ArrowLeft" ? -1 : 1
        e.preventDefault()
        if (zoomed) stage.current?.pan(-dir * 120, 0)
        else go(dir)
        break
      }
      case "ArrowUp":
      case "ArrowDown":
        if (zoomed) {
          e.preventDefault()
          stage.current?.pan(0, e.key === "ArrowUp" ? 120 : -120)
        }
        break
    }
  }

  if (!image) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={onKeyDown}
        data-lenis-prevent
        className="top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-carbon-950 p-0 text-ivory-100 ring-0 sm:max-w-none"
      >
        <header className="relative z-10 flex items-center justify-between gap-4 border-b border-hairline px-4 py-3 md:px-6">
          <div className="min-w-0">
            <DialogTitle className="truncate font-semiwide text-sm font-bold tracking-[-0.01em] md:text-base">{title}</DialogTitle>
            <p className="mt-1.5 label-mono text-smoke-400">
              <span className="text-volt">{indexLabel(index + 1)}</span> / {indexLabel(count)} · {VIEW_LONG[image.view]}
            </p>
            <DialogDescription className="sr-only">
              Zoom with the plus and minus keys, the mouse wheel or a pinch. Drag to pan. Use the arrow keys to browse images and Escape to close.
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
            <Button variant="ghost" size="icon-sm" onClick={() => stage.current?.zoomBy(1 / STEP)} disabled={scale <= 1.01} aria-label="Zoom out">
              <Minus />
            </Button>
            <output className="w-12 text-center font-mono text-xs text-smoke-300 tabular" aria-live="polite" aria-label="Zoom level">
              {Math.round(scale * 100)}%
            </output>
            <Button variant="ghost" size="icon-sm" onClick={() => stage.current?.zoomBy(STEP)} disabled={scale >= MAX_SCALE - 0.01} aria-label="Zoom in">
              <Plus />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => stage.current?.reset()} disabled={scale <= 1.01} className="hidden sm:inline-flex">
              <RotateCcw />
              Reset
            </Button>
            <span className="mx-1 h-6 w-px bg-hairline md:mx-2" aria-hidden="true" />
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                <X />
                Close
              </Button>
            </DialogClose>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-spotlight">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hairline-grid opacity-60 [--grid-size:64px] mask-fade-b" />
          <HudCorners inset={18} size={18} className="opacity-50" />
          <ZoomStage key={image.src} ref={stage} image={image} onScaleChange={setScale} onSwipe={go} />
          {multiple && (
            <>
              <Button
                variant="glass"
                size="icon-lg"
                onClick={() => go(-1)}
                className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full max-md:hidden md:left-6"
                aria-label="Previous image"
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="glass"
                size="icon-lg"
                onClick={() => go(1)}
                className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full max-md:hidden md:right-6"
                aria-label="Next image"
              >
                <ArrowRight />
              </Button>
            </>
          )}
        </div>

        <footer className="relative z-10 flex flex-col gap-3 border-t border-hairline px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          {multiple ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-none" role="group" aria-label="Choose an image">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => select(i)}
                  aria-label={`Show image ${i + 1}: ${VIEW_LONG[img.view]}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-sm border bg-carbon-850 transition-colors duration-300 md:w-24",
                    i === index ? "border-volt/70" : "border-hairline hover:border-white/30"
                  )}
                >
                  <span className="absolute inset-[8%]">
                    <Image src={img.src} alt="" fill sizes="96px" quality={70} className="object-contain" draggable={false} />
                  </span>
                  <span className="sr-only">{VIEW_SHORT[img.view]}</span>
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <p className="label-mono text-[0.625rem] text-smoke-500 max-md:hidden">Scroll or pinch to zoom · Drag to pan{multiple ? " · ← → to browse" : ""} · Esc to close</p>
          <p className="label-mono text-[0.625rem] text-smoke-500 md:hidden">Pinch or double-tap to zoom{multiple ? " · Swipe to browse" : ""}</p>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
