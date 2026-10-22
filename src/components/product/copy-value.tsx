"use client"

import { Check, Copy, Share } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** "SKU SB-SC-1001" — click to copy (racers order by part number). */
export function CopyValue({ label, value, className }: { label: string; value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onCopy = async () => {
    if (await writeClipboard(value)) {
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
      toast(`${label} copied`, { description: value })
    } else {
      toast.error(`Couldn’t copy — the ${label} is ${value}.`)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label} ${value}`}
      className={cn(
        "group/copy inline-flex h-8 items-center gap-2 rounded-sm px-1.5 -mx-1.5 label-mono text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground touch:h-10",
        className
      )}
    >
      <span className="text-foreground/40">{label}</span>
      <span className="tracking-[0.12em] text-foreground/80 normal-case tabular">{value}</span>
      {copied ? (
        <Check className="size-3 text-go" aria-hidden="true" />
      ) : (
        <Copy className="size-3 opacity-40 transition-opacity group-hover/copy:opacity-100" aria-hidden="true" />
      )}
    </button>
  )
}

/** Native share sheet on touch devices, copy-link everywhere else. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const onShare = async () => {
    const url = window.location.href.split("#")[0]
    const coarse = window.matchMedia("(pointer: coarse)").matches
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
      }
    }
    if (await writeClipboard(url)) toast("Link copied", { description: title })
    else toast.error("Couldn’t copy the link — copy it from the address bar instead.")
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-hairline px-3.5 label-mono text-[0.625rem] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground touch:h-11",
        className
      )}
    >
      <Share className="size-3.5" aria-hidden="true" />
      Share
    </button>
  )
}
