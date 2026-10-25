import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Alert, AuthCard, Button, Field } from '#/components/ui'
import { api, ApiError, type ClaimPreview } from '#/lib/api'
import { meQuery } from '#/lib/auth'

/**
 * Steward invitation claim (HOF-002). The preview is a read-only GET; the token
 * is only consumed when the steward submits their new password.
 */
export const Route = createFileRoute('/auth/claim')({
  validateSearch: z.object({ token: z.string().optional() }),
  ssr: false, // token handling is client-only; nothing token-related is server-rendered or logged
  component: ClaimPage,
})

function ClaimPage() {
  const { token: tokenFromUrl } = Route.useSearch()
  const [token] = useState(tokenFromUrl)

  useEffect(() => {
    if (tokenFromUrl) window.history.replaceState(null, '', '/auth/claim')
  }, [tokenFromUrl])

  const preview = useQuery({
    queryKey: ['claim-preview', token],
    enabled: !!token,
    retry: false,
    queryFn: () => api<ClaimPreview>(`/auth/claims/inspect?token=${encodeURIComponent(token!)}`),
  })

  if (!token || preview.isError) {
    const message =
      preview.error instanceof ApiError
        ? preview.error.message
        : 'This invitation link is incomplete. Ask your team lead or the church admin to resend it.'
    return (
      <AuthCard title="Invitation unavailable">
        <Alert>{message}</Alert>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium">
          Go to sign in
        </Link>
      </AuthCard>
    )
  }

  if (preview.isPending) {
    return (
      <AuthCard title="Checking your invitation…">
        <p className="text-sm text-[var(--ink-soft)]" role="status">
          One moment.
        </p>
      </AuthCard>
    )
  }

  if (preview.data.purpose !== 'CLAIM') {
    return (
      <AuthCard title="Wrong link type">
        <Alert>This is a sign-in link, not an invitation. Open it from the email again.</Alert>
      </AuthCard>
    )
  }

  return <ClaimForm token={token} preview={preview.data} />
}

function ClaimForm({ token, preview }: { token: string; preview: ClaimPreview }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [mismatch, setMismatch] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password !== form.get('confirm')) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    setPending(true)
    setError(null)
    try {
      await api('/auth/claims/complete', { method: 'POST', body: { token, password } })
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
      await navigate({ to: '/dashboard', replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
      setPending(false)
    }
  }

  return (
    <AuthCard title={`Welcome, ${preview.first_name}`} subtitle="Confirm your details and choose a password.">
      <dl className="mb-5 space-y-2 rounded-lg bg-[var(--muted)] p-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-soft)]">Name</dt>
          <dd className="font-medium">
            {preview.first_name} {preview.last_name}
          </dd>
        </div>
        {preview.email && (
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--ink-soft)]">Email</dt>
            <dd className="font-medium">{preview.email}</dd>
          </div>
        )}
        {preview.appointments.map((a) => (
          <div key={`${a.role}-${a.team_name}`} className="flex justify-between gap-3">
            <dt className="text-[var(--ink-soft)]">Appointment</dt>
            <dd className="font-medium">
              {a.role_label}
              {a.team_name ? ` · ${a.team_name}` : ''}
            </dd>
          </div>
        ))}
      </dl>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && error.status !== 400 && <Alert>{error.message}</Alert>}
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          hint="At least 10 characters, with a letter and a number."
          error={error?.fieldErrors.password}
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          error={mismatch ? 'Passwords do not match' : undefined}
        />
        <Button type="submit" loading={pending}>
          Activate my account
        </Button>
        <p className="text-xs text-[var(--ink-soft)]">
          Not you? Don't continue — let the Information Center know so they can correct the record.
        </p>
      </form>
    </AuthCard>
  )
}
