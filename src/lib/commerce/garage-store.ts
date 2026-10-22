"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

/**
 * "My Garage" — the shopper's saved items (wishlist) plus recently viewed
 * products. Both persist to localStorage and hydrate after mount.
 */

interface GarageState {
  saved: string[]
  recent: string[]
  toggleSaved: (slug: string) => boolean
  isSaved: (slug: string) => boolean
  removeSaved: (slug: string) => void
  clearSaved: () => void
  trackView: (slug: string) => void
}

const RECENT_LIMIT = 12

export const useGarage = create<GarageState>()(
  persist(
    (set, get) => ({
      saved: [],
      recent: [],
      toggleSaved: (slug) => {
        const has = get().saved.includes(slug)
        set((s) => ({ saved: has ? s.saved.filter((x) => x !== slug) : [slug, ...s.saved] }))
        return !has
      },
      isSaved: (slug) => get().saved.includes(slug),
      removeSaved: (slug) => set((s) => ({ saved: s.saved.filter((x) => x !== slug) })),
      clearSaved: () => set({ saved: [] }),
      trackView: (slug) => set((s) => ({ recent: [slug, ...s.recent.filter((x) => x !== slug)].slice(0, RECENT_LIMIT) })),
    }),
    {
      name: "sebring-garage-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
)
