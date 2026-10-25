import { createFileRoute, redirect } from '@tanstack/react-router'
import { meQuery } from '#/lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    throw redirect({ to: me ? '/dashboard' : '/login' })
  },
})
