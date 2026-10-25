import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { z } from 'zod'
import { Alert, AuthCard, Button } from '#/components/ui'
import { api, ApiError, type Me } from '#/lib/api'
import { meQuery } from '#/lib/auth'

/**
 * Magic-link landing. Opening the link (GET) does nothing on its own — the user
 * must press the button, which POSTs the token. Mail scanners can't sign anyone in.
 */
export const Route = createFileRoute('/auth/magic')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: MagicLinkPage,
})

function MagicLinkPage() {
  const { token: tokenFromUrl } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [token] = useState(tokenFromUrl)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tokenFromUrl) window.history.replaceState(null, '', '/auth/magic')
  }, [tokenFromUrl])

  async function signIn() {
    setPending(true)
    setError(null)
    try {
      await api('/auth/magic-link/exchange', { method: 'POST', body: { token } })
      const me = await api<Me>('/auth/me')
      queryClient.setQueryData(meQuery.queryKey, me)
      await navigate({ to: '/dashboard', replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      setPending(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Sign-In Link Missing" badge="One-Time Email Verification">
        <Alert>This sign-in link is incomplete. Request a new one from the sign-in page.</Alert>
        <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Steward Sign In
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Confirm Sign In"
      subtitle="Press the button below to complete your sign-in session on this device."
      badge="One-Time Email Verification"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        {error ? (
          <Link to="/login" className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Request a new sign-in link
          </Link>
        ) : (
          <Button onClick={signIn} loading={pending} className="w-full">
            <KeyRound className="h-4 w-4" />
            Sign in to Heritage MMC
          </Button>
        )}
      </div>
    </AuthCard>
  )
}
