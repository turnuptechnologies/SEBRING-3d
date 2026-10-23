"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

const NewsletterForm = dynamic(() => import("@/components/layout/footer/newsletter-form").then((m) => m.NewsletterForm), {
  ssr: false,
  loading: () => <NewsletterShell />,
})

/** Visual stand-in with the form's footprint, shown until the real form loads. */
function NewsletterShell() {
  return (
    <div aria-hidden="true" className="min-h-[13.5rem]">
      <div className="h-12 w-full max-w-xl rounded-sm border border-input bg-carbon-850" />
    </div>
  )
}

/**
 * The footer newsletter form ships zod + react-hook-form, so its code loads
 * only when the footer approaches the viewport — not on every page load.
 */
export function LazyNewsletter() {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: "800px 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref}>{show ? <NewsletterForm /> : <NewsletterShell />}</div>
}
