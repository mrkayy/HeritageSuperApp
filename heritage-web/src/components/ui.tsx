import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

/** Minimal accessible primitives — kept deliberately small for the lean MVP. */

export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; loading?: boolean }) {
  const styles = {
    primary: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]',
    ghost: 'bg-transparent text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--muted)]',
    danger: 'bg-transparent text-red-700 border border-red-200 hover:bg-red-50',
  }[variant]
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}

export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--ink)]">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        className="h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 aria-invalid:border-red-500"
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-[var(--ink-soft)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  )
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
          Heritage of Faith
        </p>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--ink)]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-[var(--ink-soft)]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
