import type { PartArt, PartModel } from "@/lib/catalog/types"

/** Reference art specs for every drivetrain model and variant (lab + QA). */
export interface DrivetrainSample {
  model: PartModel
  label: string
  variants: string[]
  art: (variant?: string) => PartArt
}

const part = (model: PartModel, rest: Omit<PartArt, "kind" | "model">): PartArt => ({ kind: "part", model, ...rest })

export const DRIVETRAIN_SAMPLES: DrivetrainSample[] = [
  {
    model: "motor",
    label: "Can motor",
    variants: ["boxer", "round", "long"],
    art: (variant = "boxer") =>
      part("motor", {
        color: "#c9cdd3",
        secondary: variant === "round" ? "#14213d" : variant === "long" ? "#ffd23f" : "#ff4b3a",
        accent: "#caa14a",
        variant,
        params: variant === "round" ? { diameter: 24, length: 30, rpm: 18000 } : variant === "long" ? { diameter: 20, length: 38, rpm: 25000 } : { length: 30, diameter: 20 },
      }),
  },
  {
    model: "pinion",
    label: "Brass pinion",
    variants: ["brass"],
    art: (variant = "brass") => part("pinion", { color: "#caa14a", variant, params: { teeth: 11 } }),
  },
  {
    model: "crown-gear",
    label: "Crown / spur gear",
    variants: ["inline", "anglewinder", "sidewinder"],
    art: (variant = "inline") =>
      part("crown-gear", {
        color: variant === "anglewinder" ? "#ff7a1a" : variant === "sidewinder" ? "#c9cdd3" : "#ffd23f",
        variant,
        params: { teeth: variant === "sidewinder" ? 32 : variant === "anglewinder" ? 27 : 30 },
      }),
  },
  {
    model: "tire",
    label: "Tires (pair)",
    variants: ["rubber"],
    art: (variant = "rubber") => part("tire", { color: "#151518", variant, params: { diameter: 20, width: 10 } }),
  },
  {
    model: "wheel",
    label: "Aluminium hubs (pair)",
    variants: ["spoked", "dish", "wire", "turbofan"],
    art: (variant = "spoked") =>
      part("wheel", {
        color: variant === "dish" ? "#ff4b3a" : variant === "turbofan" ? "#c9cdd3" : variant === "wire" ? "#c9cdd3" : "#c9cdd3",
        accent: variant === "wire" ? "#caa14a" : undefined,
        variant,
        params: { diameter: 17.3, width: 10 },
      }),
  },
  {
    model: "axle-set",
    label: "Axle kit",
    variants: ["standard"],
    art: (variant = "standard") => part("axle-set", { color: "#ff4b3a", variant, params: { length: 60, diameter: 2.38 } }),
  },
  {
    model: "magnet",
    label: "Traction magnets (pair)",
    variants: ["bar", "disc"],
    art: (variant = "bar") => part("magnet", { color: "#c7ccd3", accent: "#ff4b3a", variant }),
  },
  {
    model: "guide",
    label: "Guide & braid",
    variants: ["standard"],
    art: (variant = "standard") => part("guide", { color: "#ff4b3a", variant }),
  },
  {
    model: "chassis",
    label: "Chassis",
    variants: ["injected", "brass"],
    art: (variant = "injected") => part("chassis", { color: variant === "brass" ? "#caa14a" : "#ffd23f", variant }),
  },
  {
    model: "body-shell",
    label: "Body shell",
    variants: ["lexan", "white"],
    art: (variant = "lexan") => part("body-shell", { color: variant === "white" ? "#ecebe6" : "#f4f7fb", variant }),
  },
]

export const findSample = (model: string | null) => DRIVETRAIN_SAMPLES.find((s) => s.model === model) ?? null
