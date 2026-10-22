import { Suspense } from "react"

import { TracksideLab } from "./lab-client"

/**
 * Lab for the procedural trackside generators (controllers, power, track, accessories).
 *   /studio/parts-trackside?model=controller&variant=pistol&view=hero&w=1200&h=900
 *   /studio/parts-trackside?key=track-straight-sport-border&view=detail&bg=ivory
 *   /studio/parts-trackside?spec=<base64url JSON PartArt>&bg=none&ui=0
 * Overrides: color= secondary= accent= (hex), p.<param>=<number>.
 */
export default function PartsTracksideLabPage() {
  return (
    <Suspense fallback={null}>
      <TracksideLab />
    </Suspense>
  )
}
