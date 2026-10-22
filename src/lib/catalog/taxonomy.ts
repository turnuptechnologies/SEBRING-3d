import type {
  Brand,
  BrandSlug,
  Category,
  CategorySlug,
  Collection,
  Scale,
  Subcategory,
  SubcategorySlug,
} from "@/lib/catalog/types"

export const scales: { value: Scale; label: string; description: string }[] = [
  { value: "1:32", label: "1:32", description: "The club-racing standard — Scalextric, Carrera Evolution, Slot.it, NSR." },
  { value: "1:24", label: "1:24", description: "Big, fast and detailed — commercial raceway and retro classes." },
  { value: "1:43", label: "1:43", description: "Compact sets for small rooms and younger racers." },
]

export const categories: Category[] = [
  {
    slug: "slot-cars",
    label: "Slot Cars",
    shortLabel: "Cars",
    description: "Ready-to-run racers, collector liveries and builder kits from the brands that win club nights.",
    subcategories: ["gt-sports", "endurance-prototypes", "classics", "muscle-trans-am", "open-wheel", "rally-touring", "kits"],
  },
  {
    slug: "chassis-motors",
    label: "Chassis & Motors",
    shortLabel: "Chassis",
    description: "Motors, gears, pinions, chassis, bodies and the tools to fit them — everything that makes a car go faster.",
    subcategories: ["motors", "gears-pinions", "chassis-pods", "bodies", "tools-care"],
  },
  {
    slug: "tires-magnets-axles",
    label: "Tires, Magnets & Axles",
    shortLabel: "Tires",
    description: "Grip, stability and a smooth roll — tires, wheels, magnets, axles, bushings, guides and braid.",
    subcategories: ["tires", "wheels", "magnets", "axles-bushings", "guides-braid"],
  },
  {
    slug: "controllers-power",
    label: "Controllers & Power",
    shortLabel: "Controllers",
    description: "Electronic, resistor and digital controllers, power supplies and the wiring in between.",
    subcategories: ["controllers", "power-supplies", "wiring-digital"],
  },
  {
    slug: "track-sets",
    label: "Track & Sets",
    shortLabel: "Track",
    description: "Analog and digital race sets, track expansion, lap timing and the trackside details that finish a layout.",
    subcategories: ["race-sets", "track-pieces", "timing", "trackside"],
  },
]

export const subcategories: Subcategory[] = [
  { slug: "gt-sports", label: "GT & Sports Cars", category: "slot-cars", description: "Modern GT3, GTE and sports-car racers." },
  { slug: "endurance-prototypes", label: "Endurance Prototypes", category: "slot-cars", description: "Group C, LMP and Hypercar prototypes built for the long run." },
  { slug: "classics", label: "Classics & Vintage", category: "slot-cars", description: "1960s and 70s sports racers, Can-Am and Group 5 history." },
  { slug: "muscle-trans-am", label: "Muscle & Trans-Am", category: "slot-cars", description: "Pony cars, Trans-Am and American V8 heroes." },
  { slug: "open-wheel", label: "F1 & Open-Wheel", category: "slot-cars", description: "Formula 1, IndyCar and single-seater legends." },
  { slug: "rally-touring", label: "Rally & Touring", category: "slot-cars", description: "Group B rally weapons and tin-top touring cars." },
  { slug: "kits", label: "Kits & White Kits", category: "slot-cars", description: "Build-it-yourself cars and unpainted white kits." },
  { slug: "motors", label: "Motors", category: "chassis-motors", description: "Short-can, long-can and boxer motors from mild to wild." },
  { slug: "gears-pinions", label: "Gears & Pinions", category: "chassis-motors", description: "Crown, spur and anglewinder gears plus brass pinions in every tooth count." },
  { slug: "chassis-pods", label: "Chassis & Motor Pods", category: "chassis-motors", description: "Injected and brass chassis, motor pods and mounts." },
  { slug: "bodies", label: "Bodies & Interiors", category: "chassis-motors", description: "Lexan and hard bodies, interiors and driver figures." },
  { slug: "tools-care", label: "Tools, Lubes & Care", category: "chassis-motors", description: "Tire truers, drivers, oil, braid juice and set-up tools." },
  { slug: "tires", label: "Tires", category: "tires-magnets-axles", description: "Silicone, urethane and rubber tires — trued and untrued." },
  { slug: "wheels", label: "Wheels & Inserts", category: "tires-magnets-axles", description: "Aluminium and plastic wheels, inserts and hubs." },
  { slug: "magnets", label: "Traction Magnets", category: "tires-magnets-axles", description: "Bar and disc magnets to tune downforce." },
  { slug: "axles-bushings", label: "Axles, Bushings & Spacers", category: "tires-magnets-axles", description: "Hardened axles, bushings, bearings and spacers." },
  { slug: "guides-braid", label: "Guides, Braid & Lead Wire", category: "tires-magnets-axles", description: "Guide flags, braid and silicone lead wire." },
  { slug: "controllers", label: "Hand Controllers", category: "controllers-power", description: "Electronic, resistor and digital controllers for every scale." },
  { slug: "power-supplies", label: "Power Supplies", category: "controllers-power", description: "Variable bench supplies and track power." },
  { slug: "wiring-digital", label: "Wiring & Digital Chips", category: "controllers-power", description: "Driver stations, track wiring, plugs and digital chips." },
  { slug: "race-sets", label: "Race Sets", category: "track-sets", description: "Analog and digital sets — track, cars, controllers and power in one box." },
  { slug: "track-pieces", label: "Track Pieces", category: "track-sets", description: "Straights, curves, crossovers and expansion packs." },
  { slug: "timing", label: "Lap Counters & Timing", category: "track-sets", description: "Lap counters, timing bridges and race management." },
  { slug: "trackside", label: "Barriers & Scenery", category: "track-sets", description: "Guardrails, borders, tire walls and trackside detail." },
]

export const brands: Brand[] = [
  { slug: "carrera", name: "Carrera", group: "cars", country: "Germany", blurb: "Evolution, Digital 132 and 124 — the world's biggest slot range.", scales: ["1:32", "1:24", "1:43"] },
  { slug: "scalextric", name: "Scalextric", group: "cars", country: "United Kingdom", blurb: "The original. Sport track, ARC digital and decades of icons.", scales: ["1:32"] },
  { slug: "slot-it", name: "Slot.it", group: "cars", country: "Italy", blurb: "Race-bred 1:32 prototypes and the hop-up parts club racers trust.", scales: ["1:32"] },
  { slug: "nsr", name: "NSR", group: "cars", country: "Italy", blurb: "Featherweight chassis, punchy motors and podium-ready GT racers.", scales: ["1:32"] },
  { slug: "policar", name: "Policar", group: "cars", country: "Italy", blurb: "Classic Formula 1 recreated with modern engineering underneath.", scales: ["1:32"] },
  { slug: "thunderslot", name: "Thunderslot", group: "cars", country: "Spain", blurb: "Can-Am and Group 5 brutes with a big-car feel.", scales: ["1:32"] },
  { slug: "scaleauto", name: "Scaleauto", group: "cars", country: "Spain", blurb: "Modern GT racers in 1:32 and 1:24 with pro-level chassis.", scales: ["1:32", "1:24"] },
  { slug: "sideways", name: "Sideways", group: "cars", country: "Italy", blurb: "Group 5 and IMSA icons with a period-correct swagger.", scales: ["1:32"] },
  { slug: "brm", name: "BRM", group: "cars", country: "Italy", blurb: "Hand-built 1:24 racers with serious presence.", scales: ["1:24"] },
  { slug: "parma", name: "Parma", group: "electronics", country: "United States", blurb: "Raceway-standard controllers, chassis and 1:24 hardware.", scales: ["1:24", "1:32"] },
  { slug: "ds-electronics", name: "DS Electronics", group: "electronics", country: "United States", blurb: "Programmable electronic controllers built for racers.", scales: ["1:32", "1:24"] },
  { slug: "jk-products", name: "JK Products", group: "parts", country: "United States", blurb: "Retro and Eurosport 1:24 bodies, chassis and motors.", scales: ["1:24"] },
  { slug: "koford", name: "Koford", group: "parts", country: "United States", blurb: "Precision motors, wheels and gears for serious builders.", scales: ["1:24", "1:32"] },
  { slug: "ortmann", name: "Ortmann", group: "parts", country: "Germany", blurb: "Natural-rubber tires for plastic and wood track.", scales: ["1:32", "1:24"] },
  { slug: "paul-gage", name: "Paul Gage", group: "parts", country: "United States", blurb: "Urethane tires that grip and last on plastic track.", scales: ["1:32", "1:24"] },
  { slug: "sloting-plus", name: "Sloting Plus", group: "parts", country: "Spain", blurb: "Lightweight wheels, pinions and chassis tuning parts.", scales: ["1:32"] },
  { slug: "sebring-garage", name: "Sebring Garage", group: "parts", country: "United States", blurb: "Our own race-tested upgrades, tools and limited liveries.", scales: ["1:32", "1:24"] },
]

const ALL_FACETS: Collection["facets"] = ["subcategory", "brand", "scale", "price", "availability"]

export const collections: Collection[] = [
  {
    slug: "all",
    title: "Shop Everything",
    eyebrow: "The full catalog",
    description: "Every car, part, controller and set we stock — filter by type, brand, scale and price to find yours fast.",
    base: {},
    facets: [...ALL_FACETS, "operation"],
  },
  {
    slug: "slot-cars",
    title: "Slot Cars",
    eyebrow: "Ready to race",
    description: "GT racers, endurance prototypes, Trans-Am muscle and Formula legends in 1:32 and 1:24.",
    base: { categories: ["slot-cars"] },
    facets: [...ALL_FACETS, "operation", "build"],
  },
  {
    slug: "parts",
    title: "Parts & Upgrades",
    eyebrow: "Make it faster",
    description: "Motors, gears, pinions, tires, wheels, magnets, axles, guides and braid — one tree for every scale.",
    base: { categories: ["chassis-motors", "tires-magnets-axles"] },
    facets: [...ALL_FACETS, "fits"],
  },
  {
    slug: "chassis-motors",
    title: "Chassis & Motors",
    eyebrow: "Power & platform",
    description: "Motors, crown gears, pinions, chassis, pods, bodies and the tools to set them up.",
    base: { categories: ["chassis-motors"] },
    facets: [...ALL_FACETS, "fits"],
  },
  {
    slug: "tires-magnets-axles",
    title: "Tires, Magnets & Axles",
    eyebrow: "Grip & roll",
    description: "Tires, wheels, traction magnets, axles, bushings, guides, braid and lead wire.",
    base: { categories: ["tires-magnets-axles"] },
    facets: [...ALL_FACETS, "fits"],
  },
  {
    slug: "controllers-power",
    title: "Controllers & Power",
    eyebrow: "Command the throttle",
    description: "Electronic, resistor and digital controllers, power supplies and track wiring.",
    base: { categories: ["controllers-power"] },
    facets: [...ALL_FACETS, "operation"],
  },
  {
    slug: "track-sets",
    title: "Track & Sets",
    eyebrow: "Build the circuit",
    description: "Analog and digital race sets, track pieces, lap timing and trackside detail.",
    base: { categories: ["track-sets"] },
    facets: [...ALL_FACETS, "operation"],
  },
  {
    slug: "digital",
    title: "Digital Racing",
    eyebrow: "Lane-change ready",
    description: "Digital cars, sets, controllers and chips — race more cars on fewer lanes.",
    base: { operation: ["Digital", "Digital-ready"] },
    facets: ALL_FACETS,
  },
  {
    slug: "new-arrivals",
    title: "New Arrivals",
    eyebrow: "Fresh off the truck",
    description: "The latest cars and parts to land at Sebring.",
    base: { isNew: true },
    facets: ALL_FACETS,
  },
  {
    slug: "pre-orders",
    title: "Pre-Orders",
    eyebrow: "Reserve yours",
    description: "Announced releases you can reserve now — we ship the day stock lands.",
    base: { preorder: true },
    facets: ALL_FACETS,
  },
  {
    slug: "sale",
    title: "Sale",
    eyebrow: "Pit-stop pricing",
    description: "Marked-down cars, parts and sets — while stock lasts.",
    base: { onSale: true },
    facets: ALL_FACETS,
  },
]

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))
const subcategoryBySlug = new Map(subcategories.map((s) => [s.slug, s]))
const brandBySlug = new Map(brands.map((b) => [b.slug, b]))
const collectionBySlug = new Map(collections.map((c) => [c.slug, c]))

export const getCategory = (slug: CategorySlug | string) => categoryBySlug.get(slug as CategorySlug)
export const getSubcategory = (slug: SubcategorySlug | string) => subcategoryBySlug.get(slug as SubcategorySlug)
export const getBrand = (slug: BrandSlug | string) => brandBySlug.get(slug as BrandSlug)
export const getCollection = (slug: string) => collectionBySlug.get(slug)

export const brandName = (slug: BrandSlug) => brandBySlug.get(slug)?.name ?? slug
export const categoryLabel = (slug: CategorySlug) => categoryBySlug.get(slug)?.label ?? slug
export const subcategoryLabel = (slug: SubcategorySlug) => subcategoryBySlug.get(slug)?.label ?? slug

/** Category → collection route. */
export const categoryHref = (slug: CategorySlug) => `/collections/${slug}`
export const subcategoryHref = (slug: SubcategorySlug) => {
  const sub = subcategoryBySlug.get(slug)
  return sub ? `/collections/${sub.category}?type=${slug}` : "/collections/all"
}
export const brandHref = (slug: BrandSlug) => `/brands/${slug}`
export const scaleHref = (scale: Scale, collection = "all") => `/collections/${collection}?scale=${encodeURIComponent(scale)}`
