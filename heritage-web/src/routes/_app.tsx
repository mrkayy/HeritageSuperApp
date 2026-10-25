import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Authenticated workspace shell. Guards all child routes via beforeLoad (SSR + client)
 * and renders the lean MVP navigation bar across all 5 core views + Stewards.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!me) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { me }
  },
  component: AppShell,
})

function AppShell() {
  const { data: me } = useSuspenseQuery(meQuery)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (!me) return null

  async function onLogout() {
    await api('/auth/logout', { method: 'POST' })
    queryClient.setQueryData(meQuery.queryKey, null)
    await navigate({ to: '/login', replace: true })
  }

  const navItems = [
    { to: '/dashboard' as const, label: 'Dashboard', show: true },
    { to: '/intake' as const, label: 'Visitor Intake', show: hasCapability(me, 'visitors.capture') },
    { to: '/directory' as const, label: 'Directory', show: hasCapability(me, 'people.read') },
    { to: '/follow-up' as const, label: 'Follow-Up', show: hasCapability(me, 'followups.read') },
    { to: '/attendance' as const, label: 'Attendance', show: hasCapability(me, 'people.read') },
    { to: '/stewards' as const, label: 'Stewards', show: hasCapability(me, 'stewards.read') },
  ].filter((item) => item.show)

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/dashboard" className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--brand)]">
              Heritage of Faith
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeProps={{ className: 'bg-[var(--muted)] text-[var(--ink)] font-semibold' }}
                  inactiveProps={{ className: 'text-[var(--ink-soft)] hover:text-[var(--ink)]' }}
                  className="rounded-lg px-3 py-1.5 transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="hidden text-right md:block">
              <p className="font-medium text-[var(--ink)]">
                {me.first_name} {me.last_name}
              </p>
              <p className="text-xs text-[var(--ink-soft)]">
                {me.assignments.map((a) => (a.team ? `${a.role_label} · ${a.team.name}` : a.role_label)).join(', ') ||
                  'Steward'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--muted)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
