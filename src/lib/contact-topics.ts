export const TOPICS = ["fit-check", "order", "raceway", "party", "other"] as const
export type Topic = (typeof TOPICS)[number]
