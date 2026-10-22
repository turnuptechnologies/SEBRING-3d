import { Suspense } from "react"

import { RenderClient } from "./render-client"

/**
 * Renders a single product view on a transparent canvas for the media pipeline.
 *   /studio/render?slug=<slug>&view=hero&w=2400&h=1800
 *   /studio/render?spec=<base64url JSON ProductArt>&view=side
 */
export default function RenderPage() {
  return (
    <Suspense fallback={null}>
      <RenderClient />
    </Suspense>
  )
}
