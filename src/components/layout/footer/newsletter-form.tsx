"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { useId, useRef, useState, useSyncExternalStore } from "react"
import { useForm, useWatch } from "react-hook-form"

import { newsletterSignup } from "@/app/actions/newsletter"
import {
  NEWSLETTER_INTERESTS,
  newsletterSchema,
  type NewsletterInput,
  type NewsletterInterest,
  type NewsletterValues,
} from "@/components/layout/footer/newsletter-schema"
import { EASE_OUT_EXPO } from "@/components/motion/ease"
import { ArrowLink } from "@/components/site/arrow-link"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { zodResolver } from "@/lib/forms"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
 * Remembered signup (per browser) — avoids asking twice.
 * ------------------------------------------------------------------------- */

const STORAGE_KEY = "sebring-newsletter-v1"

interface Remembered {
  email: string
  interests: NewsletterInterest[]
  /** ISO timestamp of the signup. */
  at: string
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parseRemembered(raw: string | null): Remembered | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<Remembered>
    if (typeof value.email !== "string" || !value.email) return null
    return { email: value.email, interests: Array.isArray(value.interests) ? value.interests : [], at: String(value.at ?? "") }
  } catch {
    return null
  }
}

function remember(value: Remembered) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Storage blocked (private mode) — the signup itself still went through.
  }
}

const subscribeStorage = (onChange: () => void) => {
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && onChange()
  window.addEventListener("storage", onStorage)
  return () => window.removeEventListener("storage", onStorage)
}

/* ---------------------------------------------------------------------------
 * "Did you mean …?" for common email-domain typos (gmial.con → gmail.com).
 * ------------------------------------------------------------------------- */

const COMMON_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "live.com", "msn.com", "me.com", "mac.com",
  "comcast.net", "att.net", "verizon.net", "sbcglobal.net", "bellsouth.net", "cox.net", "charter.net", "ymail.com", "proton.me", "protonmail.com",
]

/** Optimal-string-alignment distance: insertions, deletions, substitutions and adjacent swaps. */
function editDistance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

function suggestEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  const at = email.lastIndexOf("@")
  if (at < 1) return null
  const domain = email.slice(at + 1)
  if (!domain.includes(".") || COMMON_DOMAINS.includes(domain)) return null
  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of COMMON_DOMAINS) {
    const dist = editDistance(domain, candidate)
    if (dist < bestDistance) {
      bestDistance = dist
      best = candidate
    }
  }
  const limit = domain.length >= 7 ? 2 : 1
  return best && bestDistance <= limit ? `${email.slice(0, at)}@${best}` : null
}

/* ---------------------------------------------------------------------------
 * Form
 * ------------------------------------------------------------------------- */

type Outcome = { email: string; kind: "subscribed" | "existing" | "remembered"; interests: NewsletterInterest[] }

const TOPIC_PHRASE: Record<NewsletterInterest, string> = {
  cars: "new slot cars",
  parts: "new parts & upgrades",
  track: "new track & sets",
  preorders: "pre-order windows",
}

/** "new slot cars and pre-order windows" — or the full mix when nothing was picked. */
function topicsSentence(interests: readonly NewsletterInterest[]) {
  if (!interests.length) return "new arrivals, restocks and pre-order windows"
  const phrases = interests.map((i) => TOPIC_PHRASE[i])
  return phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`
}

export function NewsletterForm({ className }: { className?: string }) {
  const uid = useId()
  const ids = { email: `${uid}-email`, feedback: `${uid}-feedback`, note: `${uid}-note`, done: `${uid}-done` }

  const savedRaw = useSyncExternalStore(subscribeStorage, readRaw, () => null)
  const saved = parseRemembered(savedRaw)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [editing, setEditing] = useState(false)
  const [touched, setTouched] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const focusOnShow = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    setFocus,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput, unknown, NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "", interests: [], botcheck: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  })

  const email = useWatch({ control, name: "email" }) ?? ""
  const suggestion = touched && !errors.email ? suggestEmail(email) : null
  const serverError = errors.root?.server?.message

  const shown: Outcome | null = outcome ?? (saved && !editing ? { email: saved.email, kind: "remembered", interests: saved.interests } : null)

  const onSubmit = async (values: NewsletterValues) => {
    if (saved?.email === values.email) {
      setOutcome({ email: values.email, kind: "existing", interests: saved.interests })
      setAnnouncement(`${values.email} is already subscribed.`)
      return
    }
    try {
      const result = await newsletterSignup({ email: values.email, interests: values.interests, botcheck: values.botcheck })
      if (!result.ok) {
        setError("email", { type: "server", message: result.fieldErrors?.email ?? result.message }, { shouldFocus: true })
        return
      }
      const data = result.data
      const confirmed = data?.email || values.email
      if (data?.email) remember({ email: data.email, interests: data.interests, at: new Date().toISOString() })
      setOutcome({ email: confirmed, kind: data?.status === "existing" ? "existing" : "subscribed", interests: values.interests })
      setEditing(false)
      setAnnouncement(data?.status === "existing" ? `${confirmed} is already subscribed.` : `Subscribed. New-arrival emails will go to ${confirmed}.`)
    } catch {
      setError("root.server", { type: "network", message: "We couldn’t reach the server. Check your connection and try again." })
    }
  }

  const changeEmail = () => {
    reset({ email: "", interests: shown?.interests ?? [], botcheck: "" })
    setTouched(false)
    setOutcome(null)
    setEditing(true)
    setAnnouncement("")
    focusOnShow.current = true
  }

  const applySuggestion = () => {
    if (!suggestion) return
    setValue("email", suggestion, { shouldValidate: true, shouldDirty: true })
    setFocus("email")
  }

  const describedBy = [errors.email || serverError || suggestion ? ids.feedback : null, ids.note].filter(Boolean).join(" ")

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          if (!focusOnShow.current) return
          focusOnShow.current = false
          setFocus("email")
        }}
      >
        {shown ? (
          <SuccessPanel key="done" outcome={shown} titleId={ids.done} onChangeEmail={changeEmail} />
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
            aria-busy={isSubmitting}
          >
            <label htmlFor={ids.email} className="label-mono text-smoke-400">
              Email address
            </label>

            <div className="group/field relative mt-3 flex items-center gap-3 border-b border-foreground/18 pb-3">
              <input
                id={ids.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                placeholder="you@example.com"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={describedBy || undefined}
                className="h-12 min-w-0 flex-1 bg-transparent font-sans text-lg text-foreground outline-none placeholder:text-smoke-600 focus-visible:outline-none sm:text-xl"
                {...register("email", { onBlur: () => setTouched(true) })}
              />
              <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[8.5rem] px-5 sm:min-w-[10.5rem] sm:px-7">
                {isSubmitting ? (
                  <>
                    <Spinner className="size-4" aria-hidden="true" />
                    <span>Joining</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <ArrowRight className="transition-transform duration-500 ease-out-expo group-hover/button:translate-x-1" aria-hidden="true" />
                  </>
                )}
              </Button>
              {/* Focus / error underline that draws in over the hairline */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left transition-transform duration-500 ease-out-expo",
                  errors.email ? "scale-x-100 bg-signal" : "scale-x-0 bg-volt group-has-[input:focus-visible]/field:scale-x-100"
                )}
              />
            </div>

            <div id={ids.feedback} className="mt-3 min-h-5 text-sm leading-5">
              {errors.email ? (
                <p role="alert" className="flex items-center gap-2 text-signal">
                  <span aria-hidden="true" className="size-1.5 shrink-0 rotate-45 bg-signal" />
                  {errors.email.message}
                </p>
              ) : serverError ? (
                <p role="alert" className="text-signal">
                  {serverError}
                </p>
              ) : suggestion ? (
                <p className="text-smoke-300">
                  Did you mean{" "}
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="rounded-xs font-medium text-foreground underline decoration-volt/60 underline-offset-4 transition-colors hover:decoration-volt"
                  >
                    {suggestion}
                  </button>
                  ?
                </p>
              ) : null}
            </div>

            <fieldset className="mt-5">
              <legend className="label-mono text-smoke-500">
                Most interested in <span className="text-smoke-600 normal-case tracking-normal">— optional</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {NEWSLETTER_INTERESTS.map((item) => (
                  <label key={item.value} className="group/chip relative">
                    <input type="checkbox" value={item.value} className="peer sr-only" {...register("interests")} />
                    <span
                      className={cn(
                        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-foreground/[0.015] px-3 text-[13px] text-smoke-300 select-none touch:h-11",
                        "transition-[color,border-color,background-color] duration-300 ease-out-quint hover:border-foreground/25 hover:text-foreground",
                        "peer-checked:border-volt/50 peer-checked:bg-volt/[0.06] peer-checked:text-foreground",
                        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-3.5 place-items-center rounded-[2px] border border-foreground/30 transition-colors duration-300 group-has-checked/chip:border-volt group-has-checked/chip:bg-volt"
                      >
                        <Check strokeWidth={3.5} className="size-2.5 text-carbon-900 opacity-0 transition-opacity duration-200 group-has-checked/chip:opacity-100" />
                      </span>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p id={ids.note} className="mt-6 max-w-md text-[13px] leading-relaxed text-smoke-500 text-pretty">
              New arrivals, restocks and pre-order windows — never a shared address. Unsubscribe in one click. See our{" "}
              <Link href="/privacy" className="text-smoke-300 underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-foreground hover:decoration-volt">
                privacy policy
              </Link>
              .
            </p>

            {/* Honeypot — off-screen and out of the tab order; people never fill it. */}
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto size-px overflow-hidden">
              <label>
                Leave this field empty
                <input type="text" tabIndex={-1} autoComplete="off" {...register("botcheck")} />
              </label>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Success
 * ------------------------------------------------------------------------- */

function SuccessPanel({ outcome, titleId, onChangeEmail }: { outcome: Outcome; titleId: string; onChangeEmail: () => void }) {
  const fresh = outcome.kind === "subscribed"
  return (
    <motion.div
      role="group"
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      <div className="flex items-start gap-5">
        <SuccessBadge animate={fresh} />
        <div className="min-w-0 flex-1">
          <p className="label-mono text-volt">{fresh ? "Signed up" : "Subscribed"}</p>
          <p id={titleId} className="mt-3 font-wide text-[1.625rem] leading-none font-black tracking-[-0.03em] uppercase sm:text-3xl">
            {outcome.kind === "existing" ? "Already on the grid." : "You’re on the grid."}
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-smoke-400 text-pretty">
            {outcome.kind === "existing" ? (
              <>
                <strong className="font-medium break-all text-foreground">{outcome.email}</strong> is already subscribed — nothing more to do.
              </>
            ) : (
              <>
                We’ll email <strong className="font-medium break-all text-foreground">{outcome.email}</strong> about {topicsSentence(outcome.interests)}.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ArrowLink href="/collections/new-arrivals">Shop new arrivals</ArrowLink>
            <button
              type="button"
              onClick={onChangeEmail}
              className="-my-2 py-2 text-[13px] text-smoke-400 underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-foreground hover:decoration-volt"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
      {/* Chequered flag strip wipes across */}
      <motion.div
        aria-hidden="true"
        className="mt-8 h-2 origin-left bg-checker opacity-70 mask-fade-x [--checker-a:var(--color-ivory-100)] [--checker-b:transparent] [--checker-size:8px]"
        initial={{ scaleX: fresh ? 0 : 1 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.2 }}
      />
    </motion.div>
  )
}

function SuccessBadge({ animate }: { animate: boolean }) {
  return (
    <span className="relative mt-0.5 grid size-12 shrink-0 place-items-center">
      {animate && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-[3px] border border-volt"
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 1.9 }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.35 }}
        />
      )}
      <motion.span
        className="grid size-12 place-items-center bg-volt text-carbon-900 chamfer [--chamfer:9px]"
        initial={animate ? { scale: 0.55, rotate: -10, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <motion.path
            d="M5 12.6l4.3 4.3L19 7.2"
            initial={animate ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, ease: EASE_OUT_EXPO, delay: 0.25 }}
          />
        </svg>
      </motion.span>
    </span>
  )
}
