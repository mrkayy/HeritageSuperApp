import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { KeyRound, Lock, Mail, Send, Sparkles } from 'lucide-react'
import { z } from 'zod'
import { Alert, AuthCard, Button, Field } from '#/components/ui'
import { api, ApiError, type Me } from '#/lib/api'
import { meQuery } from '#/lib/auth'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context }) => {
    let me = context.queryClient.getQueryData<Me | null>(meQuery.queryKey)
    if (me === undefined) {
      me = await context.queryClient.fetchQuery(meQuery).catch(() => null)
    }
    if (me) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

/** Only allow internal non-login redirects to avoid open-redirect and bounce loops. */
function safeRedirect(target?: string) {
  if (!target) return '/dashboard'
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard'
  if (target === '/login' || target.startsWith('/login?') || target.startsWith('/login/')) return '/dashboard'
  return target
}

function LoginPage() {
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  return mode === 'password' ? (
    <PasswordLogin onSwitch={() => setMode('magic')} />
  ) : (
    <MagicLinkRequest onSwitch={() => setMode('password')} />
  )
}

function PasswordLogin({ onSwitch }: { onSwitch: () => void }) {
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    try {
      await api('/auth/login', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      })
      const me = await api<Me>('/auth/me')
      queryClient.setQueryData(meQuery.queryKey, me)
      const destination = safeRedirect(redirectTo)
      await navigate({ to: destination as any, replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Steward Portal"
      subtitle="Sign in with your church-authorized email to access ministry operations."
      badge="Returning Steward Sign In"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && error.status !== 400 && <Alert>{error.message}</Alert>}
        <Field
          label="Church Email Address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="yourname@heritagemmc.site"
          icon={<Mail className="h-4 w-4" />}
          required
          error={error?.fieldErrors.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          icon={<Lock className="h-4 w-4" />}
          required
          error={error?.fieldErrors.password}
        />
        <Button type="submit" loading={pending} className="mt-1 w-full">
          <KeyRound className="h-4 w-4" />
          Sign in to Console
        </Button>
      </form>

      <div className="mt-5 border-t border-border/60 pt-5 text-center text-sm">
        <button
          type="button"
          onClick={onSwitch}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Email me a one-time sign-in link instead
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Accounts are provisioned by invitation only. Speak with your Team Lead or the Information Center if you need
          steward access.
        </p>
      </div>
    </AuthCard>
  )
}

function MagicLinkRequest({ onSwitch }: { onSwitch: () => void }) {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const res = await api<{ message: string }>('/auth/magic-link', {
        method: 'POST',
        body: { email: new FormData(e.currentTarget).get('email') },
      })
      setSent(res.message)
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Passwordless Sign In"
      subtitle="We'll send a single-use link to your registered email (expires in 15 minutes)."
      badge="One-Time Email Link"
    >
      {sent ? (
        <Alert tone="success">{sent}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && error.status !== 400 && <Alert>{error.message}</Alert>}
          <Field
            label="Registered Church Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="yourname@heritagemmc.site"
            icon={<Mail className="h-4 w-4" />}
            required
            error={error?.fieldErrors.email}
          />
          <Button type="submit" loading={pending} className="mt-1 w-full">
            <Send className="h-4 w-4" />
            Send Sign-In Link
          </Button>
        </form>
      )}
      <div className="mt-5 border-t border-border/60 pt-5 text-center text-sm">
        <button
          type="button"
          onClick={onSwitch}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Sign in with password instead
        </button>
      </div>
    </AuthCard>
  )
}
