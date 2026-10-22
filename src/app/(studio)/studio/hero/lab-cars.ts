import { products } from "@/lib/catalog/products"
import type { CarArt } from "@/lib/catalog/types"

/** Three contrasting cars for the hero lab: the two catalog cars plus a GT in classic blue/orange. */
const catalogCars = products.flatMap((p) => (p.art.kind === "car" ? [{ name: p.name, art: p.art }] : []))

const extraCars: Array<{ name: string; art: CarArt }> = [
  {
    name: "GT3 ‘Dawn Patrol’ #9",
    art: {
      kind: "car",
      body: "gt",
      livery: {
        base: "#8fc7e8",
        secondary: "#ff7a1a",
        accent: "#0b0b0f",
        pattern: "sash",
        number: 9,
        numberPlate: "roundel",
        glass: "dark",
        rims: "black",
        headlights: "white",
      },
    },
  },
  {
    name: "Group C ‘Verde’ #27",
    art: {
      kind: "car",
      body: "prototype",
      livery: {
        base: "#0f4d32",
        secondary: "#f3efe6",
        accent: "#ffd23f",
        pattern: "side-stripe",
        number: 27,
        numberPlate: "square",
        glass: "smoke",
        rims: "gold",
        headlights: "yellow",
      },
    },
  },
]

export const LAB_CARS: Array<{ name: string; art: CarArt }> = [...catalogCars, ...extraCars].slice(0, 3)
