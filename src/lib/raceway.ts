/**
 * SAMPLE raceway data — events, track facts, classes, pricing and FAQ.
 * Replace with Sebring's real schedule and prices before launch.
 */

export interface RaceEvent {
  id: string
  /** ISO date (YYYY-MM-DD) */
  date: string
  start: string
  title: string
  className: string
  description: string
  fee: number
  capacity: number
  spotsLeft: number
}

export const events: RaceEvent[] = [
  { id: "night-endurance-nov", date: "2026-10-30", start: "7:00 pm", title: "Night Endurance 90", className: "Group C & GT1", description: "Ninety minutes, lights down, driver changes every 15. Pairs welcome.", fee: 25, capacity: 16, spotsLeft: 6 },
  { id: "gt3-sprint-nov", date: "2026-11-06", start: "6:30 pm", title: "GT3 Sprint Cup — Round 9", className: "1:32 GT3", description: "Four heats per lane, one final. Box-stock motors, any GT3 body.", fee: 15, capacity: 24, spotsLeft: 11 },
  { id: "beginners-nov", date: "2026-11-08", start: "11:00 am", title: "First Laps — Beginners Morning", className: "Open (rental cars)", description: "New to slot racing? We supply the cars and controllers and teach you to drive.", fee: 10, capacity: 12, spotsLeft: 4 },
  { id: "retro-124-nov", date: "2026-11-13", start: "7:00 pm", title: "Retro 1:24 Raceway Night", className: "1:24 Retro / Eurosport", description: "Big cars on the big track. Brass chassis, period bodies, serious speed.", fee: 20, capacity: 16, spotsLeft: 9 },
  { id: "family-nov", date: "2026-11-22", start: "1:00 pm", title: "Family Grand Prix", className: "1:43 & rental 1:32", description: "Parent-and-kid teams, short races, podium photos.", fee: 12, capacity: 20, spotsLeft: 14 },
]

/** First event in the (date-sorted) schedule. Pure — no clock reads during render. */
export function nextEvent(): RaceEvent {
  return events[0]
}

export const trackFacts = [
  { label: "Lanes", value: "8", note: "Routed, copper braid" },
  { label: "Lap length", value: "155 ft", note: "Long back straight" },
  { label: "Scales raced", value: "1:32 · 1:24", note: "Plus 1:43 family nights" },
  { label: "Timing", value: "Per-lane", note: "Lap times on screen" },
]

export const pricing = [
  { title: "Track time", price: "$8", unit: "per lane / 30 min", items: ["Bring your own car", "Controller & timing included", "Walk-ins welcome during open hours"] },
  { title: "Car rental", price: "$12", unit: "per hour", items: ["Race-prepped 1:32 GT car", "Controller included", "Great for first-timers"], featured: true },
  { title: "Parties & groups", price: "From $199", unit: "2 hours, up to 12 racers", items: ["Private track time", "Mini Grand Prix with podium", "Party room for cake"] },
]

export const classes = [
  { name: "1:32 GT3", rules: "Any GT3 body, box-stock 21.5k motor, rubber or urethane tires, no magnet.", href: "/collections/slot-cars?type=gt-sports&scale=1:32" },
  { name: "Group C & GT1", rules: "1980s–90s prototype and GT1 bodies, anglewinder or inline, 21.5k max.", href: "/collections/slot-cars?type=endurance-prototypes,classics&scale=1:32" },
  { name: "1:24 Retro / Eurosport", rules: "Brass or aluminium chassis, period bodies, long-can motors.", href: "/collections/all?scale=1:24" },
  { name: "Sebring Night Endurance", rules: "Our spec class: the Sebring Garage Group C kit, sealed motor, any livery.", href: "/products/group-c-prototype-builder-kit" },
]

export const faq = [
  { q: "Do I need my own car?", a: "No. Rental cars and controllers are available every open session. If you get hooked, we’ll help you pick a car of your own." },
  { q: "How old do racers need to be?", a: "Kids 6+ race on family nights and beginners mornings; under-12s need an adult with them." },
  { q: "Can I bring a car I bought online elsewhere?", a: "Of course. If it runs on routed track with braid, it can race. We’ll even help you set it up." },
  { q: "How do I book a party?", a: "Send us a date and group size through the contact form and we’ll confirm within one business day." },
  { q: "Is there a fee to watch?", a: "Never. Spectators are always welcome." },
]
