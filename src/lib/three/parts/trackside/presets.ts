import type { PartArt } from "@/lib/catalog/types"

/**
 * Reference art specs for every trackside model and variant. The studio lab
 * renders these, and catalog entries can copy them as a starting point.
 */
export interface TracksidePreset {
  key: string
  label: string
  art: PartArt
}

const part = (art: Omit<PartArt, "kind">): PartArt => ({ kind: "part", ...art })

export const TRACKSIDE_PRESETS: TracksidePreset[] = [
  {
    key: "controller-pistol",
    label: "Controller · pistol",
    art: part({ model: "controller", variant: "pistol", color: "#ffd23f", secondary: "#141418", accent: "#ff4b3a", params: { ohms: 45 } }),
  },
  {
    key: "controller-plunger",
    label: "Controller · plunger",
    art: part({ model: "controller", variant: "plunger", color: "#c8102e", secondary: "#18181d", accent: "#c9cdd3" }),
  },
  {
    key: "controller-digital",
    label: "Controller · digital",
    art: part({ model: "controller", variant: "digital", color: "#18181d", secondary: "#2a2a34", accent: "#ffd23f" }),
  },
  {
    key: "power-supply",
    label: "Power supply",
    art: part({ model: "power-supply", color: "#c9cdd3", secondary: "#141418", accent: "#ffd23f", params: { volts: 12, amps: 2.5 } }),
  },
  {
    key: "electronics-lead-wire",
    label: "Electronics · lead wire",
    art: part({ model: "electronics", variant: "lead-wire", color: "#ff4b3a", secondary: "#18181d", accent: "#c9cdd3", params: { awg: 22 } }),
  },
  {
    key: "electronics-clips",
    label: "Electronics · clips",
    art: part({ model: "electronics", variant: "clips", color: "#ff4b3a", secondary: "#18181d", accent: "#f4f4f2" }),
  },
  {
    key: "electronics-timer",
    label: "Electronics · timer",
    art: part({ model: "electronics", variant: "timer", color: "#18181d", secondary: "#2b2c31", accent: "#ffd23f" }),
  },
  {
    key: "track-straight-sport",
    label: "Track straight · sport",
    art: part({ model: "track-straight", variant: "sport", color: "#2b2c31", secondary: "#f3efe6", accent: "#ff4b3a", params: { length: 350 } }),
  },
  {
    key: "track-straight-sport-border",
    label: "Track straight · sport + border",
    art: part({ model: "track-straight", variant: "sport", color: "#2b2c31", secondary: "#f3efe6", accent: "#ff4b3a", params: { length: 350, border: 1 } }),
  },
  {
    key: "track-straight-routed",
    label: "Track straight · routed",
    art: part({ model: "track-straight", variant: "routed", color: "#1d1d22", secondary: "#f3efe6", accent: "#d08a5c", params: { length: 400 } }),
  },
  {
    key: "track-curve-sport",
    label: "Track curve · sport",
    art: part({ model: "track-curve", variant: "sport", color: "#2b2c31", secondary: "#f3efe6", accent: "#ff4b3a", params: { radius: 370, angle: 45 } }),
  },
  {
    key: "track-curve-routed",
    label: "Track curve · routed",
    art: part({ model: "track-curve", variant: "routed", color: "#1d1d22", secondary: "#f3efe6", accent: "#d08a5c", params: { radius: 420, angle: 45 } }),
  },
  {
    key: "race-set",
    label: "Race set",
    art: part({ model: "race-set", color: "#0b0b0f", secondary: "#ffd23f", accent: "#ff4b3a" }),
  },
  {
    key: "lap-counter",
    label: "Lap counter",
    art: part({ model: "lap-counter", color: "#18181d", secondary: "#c9cdd3", accent: "#ffd23f", params: { lap: 12, time: 4231 } }),
  },
  {
    key: "barrier-guardrail",
    label: "Barrier · guardrail",
    art: part({ model: "barrier", variant: "guardrail", color: "#c7ccd3", secondary: "#2a2a34", accent: "#ff4b3a" }),
  },
  {
    key: "barrier-tire-wall",
    label: "Barrier · tire wall",
    art: part({ model: "barrier", variant: "tire-wall", color: "#151518", secondary: "#f4f4f2", accent: "#ff4b3a" }),
  },
  {
    key: "barrier-fence",
    label: "Barrier · catch fence",
    art: part({ model: "barrier", variant: "fence", color: "#c9cdd3", secondary: "#2a2a34", accent: "#ffd23f" }),
  },
  {
    key: "tool-tire-truer",
    label: "Tool · tire truer",
    art: part({ model: "tool", variant: "tire-truer", color: "#1e1e26", secondary: "#c9cdd3", accent: "#ffd23f" }),
  },
  {
    key: "tool-driver-set",
    label: "Tool · driver set",
    art: part({ model: "tool", variant: "driver-set", color: "#c9cdd3", secondary: "#1e1e26", accent: "#ffd23f" }),
  },
  {
    key: "tool-oil",
    label: "Tool · precision oil",
    art: part({ model: "tool", variant: "oil", color: "#f3efe6", secondary: "#18181d", accent: "#ffd23f" }),
  },
]

export function findTracksidePreset(model: string | null, variant: string | null): TracksidePreset | undefined {
  if (!model) return undefined
  return (
    TRACKSIDE_PRESETS.find((p) => p.art.model === model && (variant ? p.art.variant === variant : true)) ??
    TRACKSIDE_PRESETS.find((p) => p.key === model)
  )
}
