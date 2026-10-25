import type { ReactNode } from 'react'
import { useCan, type CapabilityOptions } from '#/lib/auth'

export interface CanProps extends CapabilityOptions {
  perform: string | string[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Declarative RBAC Shield: hides elements, forms, and buttons when the user
 * does not hold the required capability or team assignment.
 */
export function Can({ perform, teamKey, fallback = null, children }: CanProps) {
  const isAuthorized = useCan(perform, teamKey ? { teamKey } : undefined)
  if (!isAuthorized) return <>{fallback}</>
  return <>{children}</>
}
