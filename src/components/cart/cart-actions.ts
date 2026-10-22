"use client"

import { toast } from "sonner"

import { getProduct } from "@/lib/catalog"
import { useCart, type CartLine } from "@/lib/commerce/cart-store"
import { useGarage } from "@/lib/commerce/garage-store"
import { maxQtyFor } from "@/lib/commerce/pricing"

/** Puts a removed line back where it was, merging if the shopper re-added it meanwhile. */
export function restoreLine(line: CartLine, index: number) {
  const product = getProduct(line.slug)
  if (!product) return
  const max = maxQtyFor(product)
  if (max <= 0) return
  useCart.setState((s) => {
    const existing = s.lines.find((l) => l.slug === line.slug)
    if (existing) {
      return { lines: s.lines.map((l) => (l.slug === line.slug ? { ...l, qty: Math.min(max, l.qty + line.qty) } : l)) }
    }
    const at = Math.min(Math.max(0, index), s.lines.length)
    return { lines: [...s.lines.slice(0, at), { slug: line.slug, qty: Math.min(line.qty, max) }, ...s.lines.slice(at)] }
  })
}

function takeLine(slug: string) {
  const { lines, remove } = useCart.getState()
  const index = lines.findIndex((l) => l.slug === slug)
  if (index < 0) return null
  const line = lines[index]
  remove(slug)
  return { line, index }
}

/** Removes a line and offers an Undo toast that restores it in place. */
export function removeWithUndo(slug: string) {
  const taken = takeLine(slug)
  if (!taken) return
  const product = getProduct(slug)
  toast("Removed from your cart", {
    description: product?.name,
    duration: 6000,
    action: { label: "Undo", onClick: () => restoreLine(taken.line, taken.index) },
  })
}

/** Moves a line into My Garage (saved items), with Undo. */
export function saveForLater(slug: string) {
  const garage = useGarage.getState()
  const wasSaved = garage.saved.includes(slug)
  const taken = takeLine(slug)
  if (!taken) return
  if (!wasSaved) garage.toggleSaved(slug)
  const product = getProduct(slug)
  toast("Saved to your garage", {
    description: product?.name,
    duration: 6000,
    action: {
      label: "Undo",
      onClick: () => {
        restoreLine(taken.line, taken.index)
        if (!wasSaved) useGarage.getState().removeSaved(slug)
      },
    },
  })
}
