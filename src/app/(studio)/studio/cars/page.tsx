import { Suspense } from "react"

import { CarsLab } from "./cars-client"

/**
 * Car generator lab.
 *   /studio/cars?body=gt&pattern=chevron&view=hero&w=1600&h=1200
 *   optional: q=rt (realtime build), bg=131319, debug=1 (UV grid), az/el/fill (camera overrides),
 *             number, plate, base/secondary/accent (hex without #), glass, rims, headlights
 */
export default function CarsLabPage() {
  return (
    <Suspense fallback={null}>
      <CarsLab />
    </Suspense>
  )
}
