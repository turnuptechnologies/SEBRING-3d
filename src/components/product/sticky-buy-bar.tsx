"use client"

import { AnimatePresence, motion } from "framer-motion"
import { BellRing, Check, ShoppingBag } from "lucide-react"
import Image from "next/image"
import { useEffect, useLayoutEffect, useState } from "react"

import { usePurchase } from "@/components/product/purchase-context"
import { StockStatus } from "@/components/product/stock-status"
import { Price } from "@/components/site/price"
import { ProductPlaceholder } from "@/components/site/product-image"
import { Button } from "@/components/ui/button"
import { brandName, primaryImage } from "@/lib/catalog"

/** Appears once the main CTA has scrolled above the viewport. Never duplicates it on screen. */
export function StickyBuyBar() {
  const { product, stock, ctaEl, addToCart, justAdded, focusCta } = usePurchase()
  const [visible, setVisible] = useState(false)
  const soldOut = stock.kind === "sold-out"
  const image = primaryImage(product)

  useEffect(() => {
    if (!ctaEl) return
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(ctaEl)
    return () => io.disconnect()
  }, [ctaEl])

  useLayoutEffect(() => () => setVisible(false), [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-buy"
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.7 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:bottom-5"
        >
          <section
            aria-label={`Quick buy: ${product.name}`}
            className="pointer-events-auto flex w-full items-center gap-3 border-t border-hairline bg-carbon-900/88 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift backdrop-blur-xl sm:px-6 lg:w-[min(46rem,calc(100%-3rem))] lg:gap-4 lg:rounded-xl lg:border lg:border-white/10 lg:py-2.5 lg:pr-2.5 lg:pl-2.5"
          >
            <div className="relative hidden aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-md bg-carbon-850 bg-spotlight sm:block">
              {image ? (
                <span className="absolute inset-[8%]">
                  <Image src={image.src} alt="" fill sizes="64px" quality={70} className="object-contain" />
                </span>
              ) : (
                <ProductPlaceholder product={product} className="[&>span]:hidden" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semiwide text-[0.8125rem] font-bold tracking-[-0.01em]">
                <span className="text-muted-foreground max-sm:hidden">{brandName(product.brand)} </span>
                {product.name}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <Price price={product.price} compareAt={product.compareAtPrice} size="sm" />
                <StockStatus state={stock} compact className="text-xs max-sm:hidden [&>span:last-child]:text-xs" />
              </div>
            </div>
            {soldOut ? (
              <Button variant="outline" size="lg" className="h-11 shrink-0 px-5" onClick={focusCta}>
                <BellRing />
                Notify me
              </Button>
            ) : (
              <Button size="lg" className="h-11 shrink-0 px-5" onClick={() => addToCart()}>
                {justAdded ? <Check /> : <ShoppingBag />}
                {justAdded ? "Added" : stock.kind === "preorder" ? "Pre-order" : "Add to cart"}
              </Button>
            )}
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
