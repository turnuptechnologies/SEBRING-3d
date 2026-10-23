"use client"

import { Check, ShoppingBag } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/commerce/cart-store"
import { cn } from "@/lib/utils"

interface BuyButtonProps {
  slug: string
  name: string
  preorder?: boolean
  size?: "sm" | "default" | "lg"
  className?: string
}

/** One-click add-to-cart that opens the cart drawer, with an inline "Added" confirmation. */
export function BuyButton({ slug, name, preorder = false, size = "default", className }: BuyButtonProps) {
  const add = useCart((s) => s.add)
  const [added, setAdded] = useState(false)

  const onClick = () => {
    const result = add(slug, 1, { open: true })
    if (result.ok) {
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1800)
    } else if (result.reason === "max") {
      toast.info("You already have the maximum we can ship of this item.")
    } else {
      toast.error("Sorry — that one just sold out.")
    }
  }

  return (
    <Button size={size} onClick={onClick} aria-label={`${preorder ? "Pre-order" : "Buy now"}: ${name}`} className={cn("relative z-10", className)}>
      {added ? <Check /> : <ShoppingBag />}
      {added ? "Added" : preorder ? "Pre-order" : "Buy now"}
    </Button>
  )
}
