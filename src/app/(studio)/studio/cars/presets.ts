import type { CarBody, Livery } from "@/lib/catalog/types"

/** Lab default liveries — one per body, using the brand's racing palette. */
export const LAB_LIVERIES: Record<CarBody, Livery> = {
  prototype: { base: "#ffd23f", secondary: "#0b0b0f", accent: "#f4f4f2", pattern: "center-stripes", number: 12, numberPlate: "roundel", glass: "dark", rims: "silver", headlights: "yellow" },
  gt: { base: "#14141a", secondary: "#ffd23f", accent: "#ff4b3a", pattern: "chevron", number: 7, numberPlate: "square", glass: "dark", rims: "gold", headlights: "white" },
  classic: { base: "#8fc7e8", secondary: "#ff7a1a", accent: "#0b0b0f", pattern: "center-stripes", number: 9, numberPlate: "roundel", glass: "smoke", rims: "silver", headlights: "white" },
  muscle: { base: "#c8102e", secondary: "#f4f4f2", accent: "#0b0b0f", pattern: "side-stripe", number: 15, numberPlate: "roundel", glass: "dark", rims: "silver", headlights: "white" },
  openwheel: { base: "#c8102e", secondary: "#f4f4f2", accent: "#0b0b0f", pattern: "split", number: 1, numberPlate: "none", glass: "smoke", rims: "silver", headlights: "white" },
  rally: { base: "#f4f4f2", secondary: "#14213d", accent: "#ff4b3a", pattern: "sash", number: 4, numberPlate: "square", glass: "dark", rims: "white", headlights: "yellow" },
  touring: { base: "#c7ccd3", secondary: "#14213d", accent: "#ff4b3a", pattern: "hoop", number: 21, numberPlate: "square", glass: "dark", rims: "gold", headlights: "white" },
}
