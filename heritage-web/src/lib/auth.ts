import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { queryOptions, useQuery } from '@tanstack/react-query'
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

export interface CapabilityOptions {
  teamKey?: string
}

export function hasCapability(
  me: Me | null | undefined,
  capability: string,
  options?: CapabilityOptions,
): boolean {
  if (!me) return false
  if (!me.capabilities.includes(capability)) return false

  if (options?.teamKey) {
    const isChurchWide = me.assignments.some((a) => a.role === 'ADMIN' || a.role === 'PASTOR')
    if (isChurchWide) return true
    return me.assignments.some((a) => a.team?.key === options.teamKey)
  }

  return true
}

export function useCan(
  capability: string | string[],
  options?: CapabilityOptions,
): boolean {
  const { data: me } = useQuery(meQuery)
  if (!me) return false
  const caps = Array.isArray(capability) ? capability : [capability]
  return caps.every((c) => hasCapability(me, c, options))
}
