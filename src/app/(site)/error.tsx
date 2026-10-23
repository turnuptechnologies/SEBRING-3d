"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="container-site flex min-h-[60svh] flex-col items-start justify-center gap-6 py-20">
      <span aria-hidden="true" className="h-3 w-16 rounded-sm bg-signal" />
      <p className="label-mono text-signal">Red flag</p>
      <h1 className="font-wide text-headline font-black uppercase">Something went off track</h1>
      <p className="max-w-md text-muted-foreground">A part of this page failed to load. Try again — your cart is safe.</p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild><Link href="/">Back to the shop</Link></Button>
      </div>
    </section>
  )
}
