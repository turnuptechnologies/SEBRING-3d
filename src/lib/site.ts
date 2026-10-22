/**
 * Store-wide configuration.
 *
 * Everything marked SAMPLE is placeholder business information. Replace it with
 * Sebring's real details before launch — every page reads from this file.
 */

export const site = {
  name: "Sebring Slot Cars & Raceways",
  shortName: "Sebring",
  legalName: "Sebring Slot Cars and Raceways",
  description:
    "Shop slot cars, parts and upgrades from Carrera, Scalextric, Slot.it, NSR and more — tracked shipping on every order, and a raceway when you want to race.",
  /** SAMPLE — production domain. */
  url: "https://www.sebringslotcars.com",
  /** SAMPLE */
  email: "crew@sebringslotcars.com",
  /** SAMPLE — 555 numbers are reserved for fiction. */
  phone: "(555) 012-1212",
  phoneHref: "tel:+15550121212",
  /** SAMPLE */
  address: {
    street: "1200 Pit Lane Drive",
    city: "Sebring",
    region: "FL",
    postalCode: "33870",
    country: "US",
  },
  /** SAMPLE — opening hours, shown on the raceway page and footer. */
  hours: [
    { days: "Mon – Tue", hours: "Closed" },
    { days: "Wed – Thu", hours: "3:00 pm – 9:00 pm" },
    { days: "Friday", hours: "3:00 pm – 11:00 pm", note: "Race night" },
    { days: "Saturday", hours: "10:00 am – 10:00 pm" },
    { days: "Sunday", hours: "12:00 pm – 6:00 pm" },
  ],
  /** SAMPLE — social profiles. Leave href empty to hide a network. */
  social: [
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "Facebook", href: "https://facebook.com/" },
    { label: "YouTube", href: "https://youtube.com/" },
  ],
} as const

export const commerce = {
  currency: "USD",
  /** SAMPLE — free standard shipping at or above this subtotal (after discounts). */
  freeShippingThreshold: 99,
  shippingRates: {
    standard: { label: "Standard", price: 7.95, eta: "3–5 business days", carrier: "USPS Ground Advantage" },
    express: { label: "Express", price: 18.95, eta: "1–2 business days", carrier: "UPS 2nd Day Air" },
    pickup: { label: "Raceway pickup", price: 0, eta: "Ready in 2 hours during open hours", carrier: "Pick up at the counter" },
  },
  /** SAMPLE — orders placed before 2pm ET ship the same business day. */
  processing: "Orders placed by 2 pm ET ship the same business day.",
  /** SAMPLE — estimated sales tax rate applied at checkout. */
  taxRate: 0.07,
  maxQtyPerLine: 10,
  returnWindowDays: 30,
  /** SAMPLE promo codes — the checkout validates against this list. */
  promoCodes: {
    SEBRING10: { type: "percent", value: 10, label: "10% off your order" },
    PITLANE: { type: "free-shipping", value: 0, label: "Free standard shipping" },
    GRID25: { type: "fixed", value: 25, label: "$25 off orders over $150", minSubtotal: 150 },
  },
  /** Accepted payment marks shown in the footer & checkout. */
  paymentMethods: ["Visa", "Mastercard", "Amex", "Discover", "PayPal", "Apple Pay"],
} as const

export type ShippingMethod = keyof typeof commerce.shippingRates
export type PromoCode = keyof typeof commerce.promoCodes

/** Primary navigation — header, mobile menu and footer read from here. */
export const primaryNav = [
  { label: "Slot Cars", href: "/collections/slot-cars", menu: "slot-cars" },
  { label: "Parts", href: "/collections/parts", menu: "parts" },
  { label: "Track & Sets", href: "/collections/track-sets", menu: "track-sets" },
  { label: "Controllers", href: "/collections/controllers-power", menu: "controllers-power" },
  { label: "Sale", href: "/collections/sale", menu: "sale" },
] as const

export const secondaryNav = [
  { label: "Raceway & Events", href: "/raceway" },
  { label: "Brands", href: "/brands" },
  { label: "Contact", href: "/contact" },
] as const

export const footerNav = {
  shop: [
    { label: "Slot cars", href: "/collections/slot-cars" },
    { label: "Parts & upgrades", href: "/collections/parts" },
    { label: "Track & sets", href: "/collections/track-sets" },
    { label: "Controllers & power", href: "/collections/controllers-power" },
    { label: "New arrivals", href: "/collections/new-arrivals" },
    { label: "Sale", href: "/collections/sale" },
    { label: "All brands", href: "/brands" },
  ],
  help: [
    { label: "Shipping & returns", href: "/shipping-returns" },
    { label: "Contact us", href: "/contact" },
    { label: "Fit check", href: "/contact?topic=fit-check" },
    { label: "Raceway & events", href: "/raceway" },
    { label: "My garage", href: "/garage" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const

/** Rotating messages in the announcement bar. */
export const announcements = [
  { text: `Free tracked shipping on orders over $99`, href: "/shipping-returns" },
  { text: "Order by 2 pm ET — ships the same day", href: "/shipping-returns" },
  { text: "Not sure it fits? Ask the Sebring crew", href: "/contact?topic=fit-check" },
] as const

export function formatAddress(oneLine = true) {
  const a = site.address
  return oneLine
    ? `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`
    : `${a.street}\n${a.city}, ${a.region} ${a.postalCode}`
}

export function directionsHref() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress())}`
}
