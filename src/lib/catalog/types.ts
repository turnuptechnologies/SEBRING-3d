/**
 * Catalog contract. Every product, page and render pipeline in the store reads
 * these types — change them deliberately.
 */

export type CategorySlug =
  | "slot-cars"
  | "chassis-motors"
  | "tires-magnets-axles"
  | "controllers-power"
  | "track-sets"

export type Scale = "1:32" | "1:24" | "1:43" | "HO"

export type BrandSlug =
  | "carrera"
  | "scalextric"
  | "slot-it"
  | "nsr"
  | "policar"
  | "thunderslot"
  | "brm"
  | "parma"
  | "jk-products"
  | "koford"
  | "ortmann"
  | "paul-gage"
  | "sloting-plus"
  | "scaleauto"
  | "sideways"
  | "ds-electronics"
  | "sebring-garage"

export type SubcategorySlug =
  // slot-cars
  | "gt-sports"
  | "endurance-prototypes"
  | "classics"
  | "muscle-trans-am"
  | "open-wheel"
  | "rally-touring"
  | "kits"
  // chassis-motors
  | "motors"
  | "gears-pinions"
  | "chassis-pods"
  | "bodies"
  | "tools-care"
  // tires-magnets-axles
  | "tires"
  | "wheels"
  | "magnets"
  | "axles-bushings"
  | "guides-braid"
  // controllers-power
  | "controllers"
  | "power-supplies"
  | "wiring-digital"
  // track-sets
  | "race-sets"
  | "track-pieces"
  | "trackside"
  | "timing"

export type ProductView = "hero" | "side" | "rear" | "top" | "detail" | "alt"

/* ---------------------------------------------------------------------------
 * Art specs — drive the procedural 3D renders (product photography, hero).
 * ------------------------------------------------------------------------- */

export type CarBody =
  | "prototype" // Group C / LMP endurance prototype: low, long tail, bubble canopy, rear wing
  | "gt" // modern GT3: wide arches, big wing, fastback
  | "classic" // 1960s sports racer: curvy, long hood, small greenhouse, wire wheels
  | "muscle" // Trans-Am pony car: boxy, long hood, short deck, ducktail
  | "openwheel" // F1 / Indy: exposed wheels, nose + wings, halo
  | "rally" // Group B hatch: short, tall, roof scoop, mud flaps, light pod
  | "touring" // DTM / BTCC sedan: three-box, splitter, flared arches

export type LiveryPattern =
  | "solid"
  | "center-stripes" // twin racing stripes nose → tail
  | "side-stripe" // single bold stripe along the flank
  | "split" // front half / back half in two colours
  | "sash" // diagonal band across the flank
  | "chevron" // forward-pointing arrow on the nose & flanks
  | "hoop" // vertical band wrapping the car behind the cockpit
  | "fade" // base fading into secondary toward the tail

export interface Livery {
  /** Body paint, hex. */
  base: string
  /** Second livery colour, hex. */
  secondary: string
  /** Pin-stripes, number panels, wing endplates, hex. */
  accent: string
  pattern: LiveryPattern
  /** Race number painted on the flanks and nose. */
  number: number
  numberPlate?: "roundel" | "square" | "none"
  glass?: "dark" | "smoke"
  rims?: "silver" | "gold" | "black" | "white" | "bronze"
  headlights?: "yellow" | "white"
}

export interface CarArt {
  kind: "car"
  body: CarBody
  livery: Livery
}

export type PartModel =
  | "motor" // can motor with endbell, shaft, tabs
  | "pinion" // small brass pinion gear
  | "crown-gear" // spur / crown gear (plastic or alloy)
  | "tire" // rubber / urethane tire, pair
  | "wheel" // aluminium hub, pair
  | "axle-set" // steel axle with bushings and spacers
  | "magnet" // neodymium bar / disc traction magnet
  | "guide" // guide flag with copper braid
  | "chassis" // injected or brass chassis plate
  | "body-shell" // clear / painted lexan body
  | "controller" // pistol-grip hand controller
  | "power-supply" // variable bench supply
  | "electronics" // lead wire, clips, lap timer modules
  | "track-straight"
  | "track-curve"
  | "race-set" // boxed set with artwork
  | "lap-counter"
  | "barrier" // guard rails / fences
  | "tool" // tire truer, screwdrivers, oil

export interface PartArt {
  kind: "part"
  model: PartModel
  /** Primary colour of the part, hex. */
  color: string
  secondary?: string
  accent?: string
  /** Model-specific flavour, e.g. "inline" | "sidewinder" | "anglewinder" for motors. */
  variant?: string
  /** Numeric knobs the generator understands, e.g. { teeth: 11 } or { diameter: 20, width: 10 }. */
  params?: Record<string, number>
}

export type ProductArt = CarArt | PartArt

/* ---------------------------------------------------------------------------
 * Products
 * ------------------------------------------------------------------------- */

export interface Spec {
  label: string
  value: string
}

export interface Fitment {
  brands: BrandSlug[]
  scales: Scale[]
  /** Free text such as "Slot.it Group C & GT chassis" */
  note?: string
}

export interface VehicleInfo {
  make: string
  model: string
  year: number
  /** e.g. "Endurance", "Trans-Am", "Formula 1", "Rally", "GT3", "Touring" */
  series: string
  era: "1960s" | "1970s" | "1980s" | "1990s" | "2000s" | "Modern"
  /** True when the car ships ready to race (vs. a kit). */
  readyToRun: boolean
  digital?: boolean
}

/**
 * Structured attributes that drive facets — never parse these out of titles.
 * Only set the ones that apply to the product.
 */
export interface ProductAttributes {
  build?: "RTR" | "Kit" | "White kit"
  operation?: "Analog" | "Digital" | "Digital-ready"
  motorLayout?: "Inline" | "Sidewinder" | "Anglewinder"
  canType?: "Short can" | "Long can" | "Slim can" | "Boxer" | "Flat can"
  axle?: "3/32 in" | "3 mm" | "1/8 in"
  gearType?: "Pinion" | "Crown" | "Spur" | "Anglewinder"
  trackSystem?: "Carrera Evolution" | "Carrera Digital 132" | "Scalextric Sport" | "Scalextric ARC" | "Routed wood" | "Universal"
  /** Controllers & power: how it connects. */
  plug?: "Carrera" | "Scalextric" | "Alligator clips" | "Banana plugs" | "Wireless"
}

export interface Product {
  /** URL id — kebab-case, unique. */
  slug: string
  /** Store SKU, e.g. "SB-SC-1001". */
  sku: string
  /** Manufacturer part number, e.g. "CA00a". Optional. */
  mpn?: string
  /** Display name without the brand, e.g. "Porsche 962C LH ‘Night Shift’ #12". */
  name: string
  brand: BrandSlug
  category: CategorySlug
  subcategory: SubcategorySlug
  /** Scales the item is made for (cars: exactly one; parts may fit several). */
  scales: Scale[]
  /** USD */
  price: number
  /** USD — when present and higher than price, the item is on sale. */
  compareAtPrice?: number
  /** Units on hand. 0 = sold out. */
  stock: number
  /** ISO date (YYYY-MM-DD) used for "Newest" sorting. */
  releasedAt: string
  isNew?: boolean
  isFeatured?: boolean
  /** Taking orders before stock lands — shows a "Pre-order" badge; buyable. */
  preorder?: { ships: string }
  attributes?: ProductAttributes
  /** Search keywords and aliases. */
  tags: string[]
  /** One sentence for cards and meta descriptions (≤ 140 chars). */
  summary: string
  /** Product page copy — 2 to 3 short paragraphs. */
  description: string[]
  /** 3–5 short bullets. */
  highlights: string[]
  specs: Spec[]
  /** Parts & accessories: what it fits. */
  fits?: Fitment
  /** Cars only. */
  vehicle?: VehicleInfo
  art: ProductArt
  /** Rendered image views, primary first. Files live at /products/<slug>/<view>.webp */
  views: ProductView[]
}

export interface Brand {
  slug: BrandSlug
  name: string
  /** Brands index grouping. */
  group: "cars" | "parts" | "electronics"
  country: string
  /** One-line positioning used on brand tiles. */
  blurb: string
  scales: Scale[]
}

export interface Subcategory {
  slug: SubcategorySlug
  label: string
  category: CategorySlug
  description: string
}

export interface Category {
  slug: CategorySlug
  label: string
  /** Short label for tight spots (nav pills). */
  shortLabel: string
  description: string
  subcategories: SubcategorySlug[]
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name-asc"

export interface ProductFilters {
  q?: string
  categories?: CategorySlug[]
  subcategories?: SubcategorySlug[]
  brands?: BrandSlug[]
  scales?: Scale[]
  priceMin?: number
  priceMax?: number
  inStock?: boolean
  onSale?: boolean
  isNew?: boolean
  preorder?: boolean
  operation?: NonNullable<ProductAttributes["operation"]>[]
  build?: NonNullable<ProductAttributes["build"]>[]
  /** "Fits my garage": parts whose fitment covers any of these car slugs. */
  fitsCars?: string[]
}

/** A browseable collection (route: /collections/[slug]). */
export interface Collection {
  slug: string
  title: string
  eyebrow: string
  description: string
  /** Base filter that defines membership; user filters narrow it further. */
  base: ProductFilters
  /** Which facet groups the listing should offer. */
  facets: Array<"subcategory" | "brand" | "scale" | "price" | "availability" | "operation" | "build" | "fits">
}
