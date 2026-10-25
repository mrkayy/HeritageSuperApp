import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Alert, AuthCard, Button, Field } from '#/components/ui'
import { api, ApiError } from '#/lib/api'
import { meQuery } from '#/lib/auth'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context }) => {
    if (await context.queryClient.ensureQueryData(meQuery)) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

/** Only allow internal redirects to avoid open-redirect abuse. */
function safeRedirect(target?: string) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard'
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
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
      await navigate({ to: safeRedirect(redirectTo) })
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
      setPending(false)
    }
  }

  return (
    <AuthCard title="Steward sign in" subtitle="Use the email your church admin invited.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && error.status !== 400 && <Alert>{error.message}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="email" required error={error?.fieldErrors.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={error?.fieldErrors.password}
        />
        <Button type="submit" loading={pending}>
          Sign in
        </Button>
      </form>
      <div className="mt-5 border-t border-[var(--line)] pt-5 text-center text-sm">
        <button type="button" onClick={onSwitch} className="font-medium text-[var(--brand)] hover:underline">
          Email me a sign-in link instead
        </button>
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          No account yet? Accounts are created by invitation only — speak to your team lead or the Information Center.
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
    <AuthCard title="Sign in with email" subtitle="We'll send a one-time link that expires in 15 minutes.">
      {sent ? (
        <Alert tone="success">{sent}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && error.status !== 400 && <Alert>{error.message}</Alert>}
          <Field label="Email" name="email" type="email" autoComplete="email" required error={error?.fieldErrors.email} />
          <Button type="submit" loading={pending}>
            Send sign-in link
          </Button>
        </form>
      )}
      <div className="mt-5 border-t border-[var(--line)] pt-5 text-center text-sm">
        <button type="button" onClick={onSwitch} className="font-medium text-[var(--brand)] hover:underline">
          Use password instead
        </button>
      </div>
    </AuthCard>
  )
}
