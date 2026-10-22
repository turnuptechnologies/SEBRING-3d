import { Suspense } from "react"

import { LabClient } from "./lab-client"

/**
 * Drivetrain parts lab — renders one generated part through the shared studio rig.
 *   /studio/parts-drivetrain                                  index of every model × variant × view
 *   /studio/parts-drivetrain?model=motor&variant=boxer&view=hero&w=1600&h=1200
 *   …&bg=131319 (solid card)  &color=ffd23f  &p.teeth=12
 */
export default function PartsDrivetrainLabPage() {
  return (
    <Suspense fallback={null}>
      <LabClient />
    </Suspense>
  )
}
