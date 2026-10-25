import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { Building2, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'

/**
 * Heritage MMC UI Primitives — aligned with the `web` design system:
 * - Royal Blue primary (`hsl(211 83% 27%)`)
 * - Frosted `.glass-card` and `.page-background` surfaces
 * - Official Heritage of Faith logo lockup (`/logo-design.png`)
 */

export function Button({
  variant = 'primary',
  size = 'default',
  loading,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'default' | 'sm' | 'lg'
  loading?: boolean
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.99]',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.99]',
    outline:
      'border border-primary/30 bg-white/80 text-primary hover:bg-primary/10 hover:border-primary/50 active:scale-[0.99]',
    ghost: 'bg-transparent text-foreground border border-border/70 hover:bg-secondary/60 active:scale-[0.99]',
    danger: 'bg-red-50/80 text-red-700 border border-red-200 hover:bg-red-100 active:scale-[0.99]',
  }[variant]

  const sizes = {
    sm: 'h-9 px-3 text-xs rounded-lg',
    default: 'h-11 px-4 text-sm rounded-xl',
    lg: 'h-12 px-6 text-sm rounded-xl',
  }[size]

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${sizes} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      {loading ? 'Please wait…' : children}
    </button>
  )
}

export function Field({
  label,
  error,
  hint,
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
}) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-tight text-foreground">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          id={id}
          {...props}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 aria-invalid:border-destructive ${
            icon ? 'pl-10' : ''
          } ${className}`}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const config = {
    error: {
      style: 'border-red-200/80 bg-red-50/90 text-red-900',
      Icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    success: {
      style: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900',
      Icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    info: {
      style: 'border-primary/25 bg-secondary/70 text-secondary-foreground',
      Icon: Info,
      iconColor: 'text-primary',
    },
  }[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm backdrop-blur-xs ${config.style}`}
    >
      <config.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`} />
      <div className="flex-1 text-xs sm:text-sm leading-relaxed">{children}</div>
    </div>
  )
}

export function Badge({
  variant = 'default',
  className = '',
  children,
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'purple'
}) {
  const styles = {
    default: 'bg-primary/10 text-primary border-primary/25',
    secondary: 'bg-secondary text-secondary-foreground border-border/60',
    outline: 'bg-white/70 text-foreground border-border',
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
    danger: 'bg-red-500/10 text-red-700 border-red-200',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-200',
  }[variant]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${styles} ${className}`}
    >
      {children}
    </span>
  )
}

export function PageBanner({
  badge,
  badgeIcon,
  secondaryBadge,
  title,
  subtitle,
  actions,
}: {
  badge: string
  badgeIcon?: ReactNode
  secondaryBadge?: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="default">
            {badgeIcon}
            {badge}
          </Badge>
          {secondaryBadge}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}

export function AuthCard({
  title,
  subtitle,
  badge = 'Member Management Console',
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  children: ReactNode
}) {
  return (
    <main className="page-background flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Heritage of Faith Branding Lockup (matched with web/src/pages/auth/Login.tsx) */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-white/90 p-2 shadow-sm">
            <img src="/logo-design.png" alt="Heritage of Faith Logo" className="h-12 w-12 object-contain" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Heritage of Faith International Church
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>

        {/* Frosted Glass Card */}
        <div className="glass-card rounded-2xl border border-border/60 p-6 sm:p-7">
          {badge && (
            <div className="mb-5 flex items-center justify-between border-b border-border/50 pb-3.5">
              <span className="text-xs font-semibold text-primary">{badge}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            </div>
          )}
          {children}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Heritage MMC · Single-Church Operations &amp; Pastoral Care
        </p>
      </div>
    </main>
  )
}
