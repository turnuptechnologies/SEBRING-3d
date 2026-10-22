"use client"

import { MotionConfig } from "framer-motion"
import { ReactLenis, useLenis } from "lenis/react"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { hydrateStores, useCart } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"

/** Scroll areas that must scroll natively (dialogs, sheets, menus, carousels). */
const preventSmooth = (node: HTMLElement) =>
  Boolean(node.closest("[data-lenis-prevent], [role='dialog'], [role='menu'], [role='listbox'], [data-radix-scroll-area-viewport], [data-vaul-drawer]"))

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduce(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduce
}

/** Pauses smooth scrolling while Radix locks the page, and resets inertia on navigation. */
function LenisCoordinator() {
  const lenis = useLenis()
  const pathname = usePathname()

  useEffect(() => {
    if (!lenis) return
    const body = document.body
    const sync = () => (body.hasAttribute("data-scroll-locked") ? lenis.stop() : lenis.start())
    const mo = new MutationObserver(sync)
    mo.observe(body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] })
    sync()
    return () => mo.disconnect()
  }, [lenis])

  useEffect(() => {
    if (!lenis) return
    lenis.stop()
    lenis.start()
    lenis.resize()
  }, [lenis, pathname])

  return null
}

function StoreHydration() {
  useEffect(() => {
    hydrateStores([() => useCart.persist.rehydrate(), () => useGarage.persist.rehydrate()])
    // Keep carts in sync across tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sebring-cart-v1") void useCart.persist.rehydrate()
      if (e.key === "sebring-garage-v1") void useGarage.persist.rehydrate()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion()
  const content = (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <TooltipProvider delayDuration={250}>
        <StoreHydration />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          offset={20}
          mobileOffset={12}
          toastOptions={{
            classNames: {
              toast: "!rounded-md !border !border-hairline !bg-carbon-800/95 !text-ivory-100 !shadow-lift backdrop-blur-xl !font-sans",
              description: "!text-smoke-400",
              actionButton: "!bg-volt !text-carbon-900 !font-semibold",
            },
          }}
        />
      </TooltipProvider>
    </MotionConfig>
  )
  if (reduceMotion) return content
  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true, anchors: { offset: -96 }, prevent: preventSmooth, autoRaf: true, stopInertiaOnNavigate: true }}>
      <LenisCoordinator />
      {content}
    </ReactLenis>
  )
}
