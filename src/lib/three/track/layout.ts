/**
 * Layout of the night raceway used by the realtime hero: one long straight of
 * routed 1:32 slot-car track running along −Z toward a camera near the origin.
 * Units match the product renders (1 unit ≈ one 1:32 car length ≈ 152 mm), so
 * 1 mm ≈ 0.0066 units. Cars travel toward +Z, nose first.
 */
export const RACEWAY = {
  lanes: 4,
  /** Slot-to-slot distance (≈ 94 mm). */
  laneSpacing: 0.62,
  slotWidth: 0.024,
  /** Gap between the slot edge and the copper braid. */
  braidInset: 0.003,
  braidWidth: 0.028,
  /** Outer slot → track edge (the apron cars slide onto). */
  borderWidth: 0.5,
  edgeLineInset: 0.07,
  edgeLineWidth: 0.022,
  curbWidth: 0.2,
  curbBlock: 0.24,
  vergeWidth: 0.6,
  /** Track runs from zNear (behind the camera) to zFar (lost in fog). */
  zNear: 8,
  zFar: -112,
  barrierHeight: 0.19,
  barrierPostSpacing: 0.46,
  /** Floodlights: one row each side, staggered by half a spacing. */
  lampSpacing: 6,
  lampZ0: -4.4,
  lampCount: 16,
  lampX: 3.05,
  lampHeight: 1.18,
  lampOverhang: 0.34,
  /** Yellow LED markers on the armco posts. */
  markerSpacing: 0.92,
} as const

/** Centre line of lane `i` (0 = leftmost when looking down the straight). */
export function laneX(i: number): number {
  return (i - (RACEWAY.lanes - 1) / 2) * RACEWAY.laneSpacing
}

export const SLOT_XS: readonly number[] = Array.from({ length: RACEWAY.lanes }, (_, i) => laneX(i))

/** Half width of the racing surface, excluding curbs. */
export const TRACK_HALF_WIDTH = laneX(RACEWAY.lanes - 1) + RACEWAY.borderWidth
export const CURB_OUTER = TRACK_HALF_WIDTH + RACEWAY.curbWidth
export const BARRIER_X = CURB_OUTER + RACEWAY.vergeWidth
export const TRACK_LENGTH = RACEWAY.zNear - RACEWAY.zFar

/** z of lamp `k` on `side` (the right row is offset by half a spacing). */
export function lampZ(k: number, side: -1 | 1): number {
  return RACEWAY.lampZ0 - k * RACEWAY.lampSpacing - (side > 0 ? RACEWAY.lampSpacing / 2 : 0)
}

/** Light-emitting point of a track lamp (the lens under the lamp head). */
export function lampHeadPosition(k: number, side: -1 | 1): [number, number, number] {
  return [side * (RACEWAY.lampX - RACEWAY.lampOverhang), RACEWAY.lampHeight - 0.03, lampZ(k, side)]
}
