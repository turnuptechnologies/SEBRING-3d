"use client"

import { motion } from "framer-motion"
import { BellRing, Check } from "lucide-react"
import { useId, useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react"
import { useForm } from "react-hook-form"

import { requestRestockAlert } from "@/app/(site)/products/actions"
import { notifySchema, type NotifyInput, type NotifyValues } from "@/components/product/notify-schema"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Product } from "@/lib/catalog/types"
import { zodResolver } from "@/lib/forms"
import { cn } from "@/lib/utils"

/** Back-in-stock alert — replaces the buy buttons when a product is sold out. */
export function NotifyForm({ product, className }: { product: Product; className?: string }) {
  const id = useId()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<{ email: string; message: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const submitted = useRef(false)

  const form = useForm<NotifyInput, unknown, NotifyValues>({
    resolver: zodResolver(notifySchema),
    defaultValues: { email: "", slug: product.slug, website: "" },
  })
  const emailError = form.formState.errors.email?.message

  // Hidden by <Activity>: don't come back to a stale confirmation.
  useLayoutEffect(
    () => () => {
      if (!submitted.current) return
      submitted.current = false
      setDone(null)
      setFormError(null)
      form.reset({ email: "", slug: product.slug, website: "" })
    },
    [form, product.slug]
  )

  const submit = (values: NotifyValues) => {
    setFormError(null)
    startTransition(async () => {
      const result = await requestRestockAlert(values)
      if (result.ok) {
        submitted.current = true
        setDone({ email: result.data?.email ?? values.email, message: result.message })
        return
      }
      if (result.fieldErrors?.email) form.setError("email", { type: "server", message: result.fieldErrors.email })
      else setFormError(result.message)
    })
  }
  const onSubmit = (e: FormEvent<HTMLFormElement>) => void form.handleSubmit(submit)(e)

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-hairline bg-card p-5 sm:p-6", className)}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/50 to-transparent" />
      {done ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-go/12 text-go" aria-hidden="true">
            <Check className="size-5" />
          </span>
          <div>
            <p className="font-semiwide text-base font-bold tracking-[-0.01em]">You’re on the list</p>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{done.message}</p>
            <p className="mt-3 label-mono text-[0.625rem] text-subtle">One email. No spam. Unsubscribe any time.</p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-volt/12 text-volt" aria-hidden="true">
              <BellRing className="size-[1.1rem]" />
            </span>
            <div>
              <h2 className="font-semiwide text-base font-bold tracking-[-0.01em]">Get it when it’s back</h2>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">Leave your email and we’ll send one message the moment it’s restocked.</p>
            </div>
          </div>
          <form onSubmit={onSubmit} noValidate className="mt-5">
            <label htmlFor={`${id}-email`} className="mb-2 block label-mono text-[0.625rem] text-muted-foreground">
              Email address
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? `${id}-error` : undefined}
                className={cn(
                  "h-12 w-full min-w-0 flex-1 rounded-sm border border-input bg-background/60 px-4 text-[0.95rem] transition-[border-color,box-shadow] outline-none placeholder:text-subtle",
                  "focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_25%,transparent)]",
                  "aria-invalid:border-signal aria-invalid:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-signal)_20%,transparent)]"
                )}
                {...form.register("email")}
              />
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...form.register("website")} />
              <Button type="submit" size="lg" className="h-12 shrink-0" disabled={pending}>
                {pending ? <Spinner /> : <BellRing />}
                {pending ? "Saving…" : "Notify me"}
              </Button>
            </div>
            {emailError && (
              <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-signal">
                {emailError}
              </p>
            )}
            {formError && (
              <p role="alert" className="mt-2 text-sm text-caution">
                {formError}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  )
}
