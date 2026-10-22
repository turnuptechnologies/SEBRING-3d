import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Studio", robots: { index: false, follow: false } }

/** Dev-only render studio. Disabled in production unless ENABLE_STUDIO=1. */
export default function StudioLayout({ children }: LayoutProps<"/">) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STUDIO !== "1") notFound()
  return <div className="min-h-svh bg-carbon-950">{children}</div>
}
