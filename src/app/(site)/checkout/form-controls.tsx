"use client"

import { AlertCircle, ChevronDown } from "lucide-react"
import { useId, type ComponentProps, type ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export const controlClass = cn(
  "h-12 w-full min-w-0 rounded-sm border border-input bg-carbon-850 px-4 text-[0.9375rem] text-foreground outline-none",
  "transition-[border-color,box-shadow,background-color] duration-300 placeholder:text-smoke-600",
  "hover:border-foreground/25 focus-visible:border-volt/70 focus-visible:bg-carbon-800 focus-visible:shadow-[0_0_0_3px_rgb(255_210_63/0.14)] focus-visible:outline-none",
  "aria-invalid:border-signal/70 aria-invalid:shadow-[0_0_0_3px_rgb(255_75_58/0.12)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
)

interface FieldShellProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  children: ReactNode
}

function FieldShell({ id, label, error, hint, optional, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.8125rem] font-medium text-ivory-200">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-xs leading-snug text-signal">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)

interface TextFieldProps extends Omit<ComponentProps<"input">, "size"> {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  /** Rendered inside the right edge of the input (e.g. the detected card brand). */
  trailing?: ReactNode
  fieldClassName?: string
}

export function TextField({ label, error, hint, optional, trailing, fieldClassName, id, className, ...props }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} optional={optional} className={fieldClassName}>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={cn(controlClass, trailing && "pr-28", className)}
          {...props}
        />
        {trailing && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">{trailing}</span>}
      </div>
    </FieldShell>
  )
}

interface SelectFieldProps extends ComponentProps<"select"> {
  label: string
  error?: string
  hint?: ReactNode
  fieldClassName?: string
}

/** Native select: browser autofill and the platform picker on phones. */
export function SelectField({ label, error, hint, fieldClassName, id, className, children, ...props }: SelectFieldProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <FieldShell id={selectId} label={label} error={error} hint={hint} className={fieldClassName}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, error, hint)}
          className={cn(controlClass, "cursor-pointer appearance-none pr-10 invalid:text-smoke-600 [&>option]:bg-carbon-800 [&>option]:text-foreground", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    </FieldShell>
  )
}

interface CheckFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  className?: string
  id?: string
}

export function CheckField({ checked, onCheckedChange, label, description, className, id }: CheckFieldProps) {
  const autoId = useId()
  const boxId = id ?? autoId
  return (
    <div className={cn("flex items-start gap-3.5", className)}>
      <Checkbox
        id={boxId}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-describedby={description ? `${boxId}-desc` : undefined}
        className="mt-0.5 size-5 rounded-[4px] border-foreground/30 [&_svg]:size-3.5"
      />
      <div className="min-w-0 text-sm leading-snug">
        <label htmlFor={boxId} className="cursor-pointer font-medium text-ivory-100">
          {label}
        </label>
        {description && (
          <p id={`${boxId}-desc`} className="mt-1 text-[0.8125rem] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
