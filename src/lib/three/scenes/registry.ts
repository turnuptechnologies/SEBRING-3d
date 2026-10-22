/**
 * Composed scenes rendered by the media pipeline (category tiles, hero poster,
 * social images). Each id is rendered at /studio/scene?id=<id> and written to
 * public/<out>.
 */
export interface SceneDef {
  id: string
  /** Output path under /public, e.g. "media/categories/slot-cars.webp" */
  out: string
  width: number
  height: number
  /** Transparent background (true) or baked background (false). */
  transparent: boolean
}

export const scenes: SceneDef[] = []
