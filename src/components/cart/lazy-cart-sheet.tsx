"use client"

import dynamic from "next/dynamic"

import { useCart } from "@/lib/commerce/cart-store"
import { useIdle } from "@/lib/perf/use-idle"

const CartSheet = dynamic(() => import("@/components/cart/cart-sheet").then((m) => m.CartSheet), { ssr: false })

/** The cart drawer's code loads after first paint, or immediately when the cart is opened. */
export function LazyCartSheet() {
  const idle = useIdle()
  const open = useCart((s) => s.isOpen)
  return idle || open ? <CartSheet /> : null
}
