"use client"

import { motion } from "framer-motion"
import type { ElementType } from "react"

import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { cn } from "@/lib/utils"

interface RevealTextProps {
  text: string
  as?: ElementType
  className?: string
  /** Delay before the first word, seconds. */
  delay?: number
  stagger?: number
  once?: boolean
  /** Animate immediately on mount instead of when scrolled into view. */
  immediate?: boolean
}

/**
 * Masked word-by-word rise for display headings. Screen readers get the
 * plain string; the animated pieces are hidden from them.
 */
export function RevealText({ text, as: Tag = "h2", className, delay = 0, stagger = 0.055, once = true, immediate = false }: RevealTextProps) {
  const words = text.split(" ")
  const trigger = immediate ? { animate: "shown" } : { whileInView: "shown", viewport: { once, amount: 0.4 } }
  return (
    <Tag className={cn("relative", className)} aria-label={text}>
      <motion.span aria-hidden="true" className="contents" initial="hidden" {...trigger}>
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom -mb-[0.08em]">
            <motion.span
              className="inline-block will-change-transform"
              variants={{
                hidden: { y: "108%", rotate: 2 },
                shown: { y: "0%", rotate: 0, transition: { duration: 0.95, ease: EASE_OUT_EXPO, delay: delay + i * stagger } },
              }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </motion.span>
    </Tag>
  )
}
