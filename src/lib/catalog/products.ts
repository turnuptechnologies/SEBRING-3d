import { extendedProducts } from "@/lib/catalog/products-extended"
import type { Product } from "@/lib/catalog/types"

/**
 * SAMPLE CATALOG — realistic demo inventory so every page, filter and the
 * checkout can be exercised end to end. Replace with the live product feed
 * (or a CMS / Shopify sync) before launch. Prices and stock are illustrative,
 * liveries and sponsors are fictional, maker part numbers (mpn) are invented.
 *
 * Order matters in one place: the first three `isFeatured` cars are the
 * homepage hero cars. Validate edits at /studio/catalog-check.
 */


const core: Product[] = [
  /* -------------------------------------------------------------------------
   * Slot cars — hero cars first
   * ----------------------------------------------------------------------- */
  {
    slug: "porsche-962c-night-shift-12",
    sku: "SB-SC-1001",
    mpn: "CA00n",
    name: "Porsche 962C LH ‘Night Shift’ No. 12 – Sebring 12H 1987",
    brand: "slot-it",
    category: "slot-cars",
    subcategory: "endurance-prototypes",
    scales: ["1:32"],
    price: 94.99,
    stock: 7,
    releasedAt: "2026-09-18",
    isNew: true,
    isFeatured: true,
    attributes: { build: "RTR", operation: "Digital-ready", motorLayout: "Anglewinder", canType: "Boxer", axle: "3/32 in" },
    tags: ["porsche", "962", "962c", "962 lh", "langheck", "long tail", "group c", "imsa gtp", "sebring", "12 hours", "endurance", "prototype", "slot.it", "slotit", "slot it", "ca00n", "anglewinder", "aw", "rtr", "1/32", "132", "night shift", "yellow"],
    summary: "Long-tail Group C legend in our yellow Night Shift livery, on Slot.it’s anglewinder chassis — race-ready out of the box.",
    description: [
      "The 962C defined an era of endurance racing, and the long-tail ‘LH’ body was drawn for exactly the kind of flat-out straights Sebring is famous for. Night Shift is our house livery: headlight yellow over carbon, twin stripes nose to tail, ivory roundels.",
      "Underneath is Slot.it’s proven anglewinder platform with a 21,500 rpm boxer motor, adjustable motor pod and aluminium hubs, so it is quick on plastic and wood track alike.",
      "A removable magnet lets you tune it for home sport track or run magnet-free on a routed club circuit, and the chip socket makes the switch to digital a ten-minute job.",
    ],
    highlights: ["Anglewinder drivetrain, 21.5k rpm boxer", "Aluminium hubs & silicone-ready tires", "Adjustable motor pod", "Removable magnet for plastic or wood", "Digital-ready chip socket"],
    specs: [
      { label: "Scale", value: "1:32" },
      { label: "Motor", value: "V12/4 21,500 rpm" },
      { label: "Drivetrain", value: "Anglewinder, 10:27" },
      { label: "Magnet", value: "Included (removable)" },
      { label: "Length", value: "152 mm" },
      { label: "Weight", value: "79 g" },
    ],
    vehicle: { make: "Porsche", model: "962C LH", year: 1987, series: "Endurance", era: "1980s", readyToRun: true, digital: false },
    art: {
      kind: "car",
      body: "prototype",
      livery: { base: "#ffd23f", secondary: "#0b0b0f", accent: "#ffffff", pattern: "center-stripes", number: 12, numberPlate: "roundel", glass: "dark", rims: "silver", headlights: "yellow" },
    },
    views: ["hero", "side", "rear", "top"],
  },
  {
    slug: "chevrolet-corvette-z06-gt3r-searchlight-17",
    sku: "SB-SC-1003",
    mpn: "0412AW",
    name: "Chevrolet Corvette Z06 GT3.R ‘Searchlight’ No. 17 – Sebring 12H 2025",
    brand: "nsr",
    category: "slot-cars",
    subcategory: "gt-sports",
    scales: ["1:32"],
    price: 124.99,
    stock: 9,
    releasedAt: "2026-10-02",
    isNew: true,
    isFeatured: true,
    attributes: { build: "RTR", operation: "Analog", motorLayout: "Anglewinder", canType: "Long can", axle: "3/32 in" },
    tags: ["chevrolet", "chevy", "corvette", "vette", "z06", "gt3", "gt3.r", "gtd", "imsa", "sebring", "turn 17", "nsr", "0412aw", "anglewinder", "aw", "king", "long can", "rtr", "1/32", "132", "searchlight", "ivory", "white", "red"],
    summary: "Ivory-and-signal-red Z06 GT3.R on NSR’s featherweight anglewinder chassis — a club-night weapon straight from the box.",
    description: [
      "Named for Sebring’s infamous Turn 17, the Searchlight livery throws a signal-red sash across an ivory body that glows under trackside lights. The GT3.R’s wide hips, vented arches and big rear wing are captured in a crisp, thin-wall shell.",
      "NSR builds it like a race car: a triple-flex injected chassis, King 21,400 rpm long-can motor in anglewinder, Ergal crown and aluminium hubs. Weight sits low and central, so it carves sweepers flat and pivots cleanly through hairpins.",
      "It is quick on wood without a magnet, and the optional magnet slot keeps it planted on plastic sport track.",
    ],
    highlights: ["King 21,400 rpm long can, anglewinder", "Triple-flex injected chassis", "Ergal crown & aluminium hubs", "Thin-wall body with full interior", "Optional magnet slot"],
    specs: [
      { label: "Scale", value: "1:32" },
      { label: "Motor", value: "King 21,400 rpm long can" },
      { label: "Drivetrain", value: "Anglewinder, 12:32" },
      { label: "Chassis", value: "Triple-flex, medium" },
      { label: "Rear tires", value: "20 × 10 mm rubber" },
      { label: "Weight", value: "82 g" },
    ],
    vehicle: { make: "Chevrolet", model: "Corvette Z06 GT3.R", year: 2025, series: "GT3", era: "Modern", readyToRun: true, digital: false },
    art: {
      kind: "car",
      body: "gt",
      livery: { base: "#f3efe6", secondary: "#ff4b3a", accent: "#0b0b0f", pattern: "sash", number: 17, numberPlate: "square", glass: "dark", rims: "black", headlights: "white" },
    },
    views: ["hero", "side", "rear", "top"],
  },
]

export const products: Product[] = [...core, ...extendedProducts]
