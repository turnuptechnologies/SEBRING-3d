import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/*
 * Sebring buttons. Solid variants use the signature chamfer (clip-path), so
 * their focus ring is drawn inset — an outer ring would be clipped away.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semiwide font-bold uppercase tracking-[0.08em] transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-300 ease-out-expo outline-none select-none disabled:pointer-events-none disabled:opacity-45 aria-invalid:shadow-[inset_0_0_0_2px_var(--color-signal)] active:not-aria-[haspopup]:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "chamfer bg-primary text-primary-foreground hover:bg-volt-300 focus-visible:shadow-[inset_0_0_0_2px_var(--color-carbon-900),inset_0_0_0_4px_var(--color-volt)] light:hover:bg-carbon-700",
        volt: "chamfer bg-volt text-carbon-900 hover:bg-volt-300 focus-visible:shadow-[inset_0_0_0_2px_var(--color-carbon-900),inset_0_0_0_4px_var(--color-volt)]",
        ivory:
          "chamfer bg-ivory-100 text-carbon-900 hover:bg-white focus-visible:shadow-[inset_0_0_0_2px_var(--color-carbon-900),inset_0_0_0_4px_var(--color-ivory-100)]",
        carbon:
          "chamfer bg-carbon-900 text-ivory-100 hover:bg-carbon-700 focus-visible:shadow-[inset_0_0_0_2px_var(--color-volt)]",
        outline:
          "rounded-sm border border-foreground/22 bg-transparent text-foreground hover:border-foreground/60 hover:bg-foreground/[0.04] focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_35%,transparent)] aria-expanded:bg-foreground/[0.06]",
        glass:
          "rounded-sm border border-white/14 bg-white/[0.06] text-ivory-100 backdrop-blur-md hover:border-white/30 hover:bg-white/[0.12] focus-visible:border-volt",
        secondary:
          "rounded-sm bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_8%)] aria-expanded:bg-secondary",
        ghost:
          "rounded-sm text-foreground hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06] aria-expanded:bg-foreground/[0.06]",
        destructive:
          "rounded-sm bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_30%,transparent)]",
        link: "h-auto px-0 normal-case tracking-normal font-sans font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-volt",
      },
      size: {
        default: "h-11 px-6 text-xs [--chamfer:9px]",
        xs: "h-7 gap-1 px-2.5 text-[10px] tracking-[0.1em] [--chamfer:5px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-[11px] [--chamfer:7px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-13 px-8 text-[13px] [--chamfer:11px]",
        xl: "h-15 gap-3 px-10 text-sm [--chamfer:13px] [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11 [--chamfer:8px]",
        "icon-xs": "size-7 [--chamfer:5px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 [--chamfer:6px]",
        "icon-lg": "size-13 [--chamfer:10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
