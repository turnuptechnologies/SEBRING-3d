/** Shared motion tokens — mirror the CSS --ease-* tokens in globals.css. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT_EXPO = [0.87, 0, 0.13, 1] as const

export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 34, mass: 0.6 } as const
export const SPRING_SOFT = { type: "spring", stiffness: 180, damping: 24, mass: 0.8 } as const
