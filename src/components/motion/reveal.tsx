"use client"

import { motion, type HTMLMotionProps, type Variants } from "framer-motion"

import { EASE_OUT_EXPO } from "@/components/motion/ease"

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number
  /** Vertical travel in px. */
  y?: number
  blur?: boolean
  once?: boolean
  /** Fraction of the element that must be visible to trigger. */
  amount?: number
  duration?: number
}

/**
 * Fade-and-rise on first view. Not for the LCP element (it starts transparent).
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">.
 */
export function Reveal({ delay = 0, y = 28, blur = true, once = true, amount = 0.2, duration = 0.9, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

const groupVariants: Variants = {
  hidden: {},
  shown: (stagger: number = 0.07) => ({ transition: { staggerChildren: stagger, delayChildren: 0.05 } }),
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.85, ease: EASE_OUT_EXPO } },
}

/** Staggers its <RevealItem> children into view. */
export function RevealGroup({ stagger = 0.07, once = true, amount = 0.15, children, ...rest }: HTMLMotionProps<"div"> & { stagger?: number; once?: boolean; amount?: number }) {
  return (
    <motion.div initial="hidden" whileInView="shown" viewport={{ once, amount }} custom={stagger} variants={groupVariants} {...rest}>
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={itemVariants} {...rest}>
      {children}
    </motion.div>
  )
}
