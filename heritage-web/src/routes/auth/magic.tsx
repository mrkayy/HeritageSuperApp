import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Alert, AuthCard, Button } from '#/components/ui'
import { api, ApiError } from '#/lib/api'
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
  // Hold the token in memory, then strip it from the address bar/history.
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
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
      await navigate({ to: '/dashboard', replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      setPending(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Link missing">
        <Alert>This sign-in link is incomplete. Request a new one from the sign-in page.</Alert>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium">
          Back to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Confirm sign in" subtitle="Press the button to finish signing in on this device.">
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        {error ? (
          <Link to="/login" className="text-center text-sm font-medium">
            Request a new link
          </Link>
        ) : (
          <Button onClick={signIn} loading={pending}>
            Sign in to Heritage
          </Button>
        )}
      </div>
    </AuthCard>
  )
}
