import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { queryOptions } from '@tanstack/react-query'
import type { Me } from './api'

/**
 * Resolves the signed-in user. Runs on the server (SSR and client navigations)
 * and forwards the browser's cookie to the API, so route guards work before
 * any HTML is sent. Returns null when unauthenticated.
 */
export const getMe = createServerFn({ method: 'GET' }).handler(async (): Promise<Me | null> => {
  const cookie = getRequestHeader('cookie')
  if (!cookie) return null
  const res = await fetch(`${process.env.API_URL ?? 'http://localhost:3001'}/api/auth/me`, {
    headers: { cookie, 'x-heritage-client': 'web-ssr' },
  })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`Failed to load session (${res.status})`)
  return (await res.json()) as Me
})

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => getMe(),
  staleTime: 60_000,
})

export function hasCapability(me: Me | null | undefined, capability: string) {
  return !!me?.capabilities.includes(capability)
}
