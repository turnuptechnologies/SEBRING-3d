import type { Metadata } from "next"

import { CartView } from "@/app/(site)/cart/cart-view"

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your slot cars and parts, track your free-shipping progress and check out.",
  robots: { index: false, follow: true },
}

export default function CartPage() {
  return <CartView />
}
