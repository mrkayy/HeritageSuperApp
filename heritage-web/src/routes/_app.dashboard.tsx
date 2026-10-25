import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { api, type DashboardSummary } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api<DashboardSummary>('/attendance/summary'),
  })

  if (!me) return null

  const stats = [
    {
      label: 'Total People in Directory',
      value: summary.data?.total_people ?? '—',
      to: '/directory' as const,
      hint: 'All visitors, members & workers',
    },
    {
      label: 'First-Timers',
      value: summary.data?.first_timers_count ?? '—',
      to: '/directory' as const,
      hint: 'Awaiting assimilation into Foundation Class',
    },
    {
      label: 'Open Follow-Up Calls',
      value: summary.data?.open_followups_count ?? '—',
      to: '/follow-up' as const,
      hint:
        (summary.data?.pastoral_alerts_count ?? 0) > 0
          ? `${summary.data?.pastoral_alerts_count} flagged for pastoral visit`
          : 'Active outreach queue',
    },
    {
      label: 'Latest Service Attendance',
      value: summary.data?.latest_service?.headcount ?? '—',
      to: '/attendance' as const,
      hint: summary.data?.latest_service
        ? `${summary.data.latest_service.title} (${summary.data.latest_service.service_date})`
        : 'No service recorded yet',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Welcome back, {me.first_name}</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Single-church command center — attendance, intake, directory, and follow-up at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {hasCapability(me, 'visitors.capture') && (
            <Link
              to="/intake"
              className="inline-flex h-10 items-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              + Capture First-Timer
            </Link>
          )}
          {hasCapability(me, 'attendance.record') && (
            <Link
              to="/attendance"
              className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--muted)]"
            >
              Record Attendance
            </Link>
          )}
        </div>
      </div>

      {/* Live Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--brand)]/50 hover:shadow-xs"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{s.label}</p>
              <p className="mt-2 text-3xl font-bold text-[var(--ink)]">{s.value}</p>
            </div>
            <p className="mt-3 text-xs text-[var(--ink-soft)]">{s.hint}</p>
          </Link>
        ))}
      </section>

      {/* Active appointments + Celebrations highlight */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-[var(--line)] bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
              Your Active Appointments
            </h2>
            {hasCapability(me, 'stewards.invite') && (
              <Link to="/stewards" className="text-xs font-semibold text-[var(--brand)] hover:underline">
                Manage Stewards ({summary.data?.active_stewards_count ?? 0} active) →
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {me.assignments.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--muted)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                <span>{a.role_label}</span>
                {a.team && <span className="text-[var(--ink-soft)]">· {a.team.name}</span>}
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-white p-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
              Celebrations This Month
            </h2>
            <p className="mt-2 text-2xl font-bold text-[var(--ink)]">
              {summary.data?.celebrations_this_month ?? 0}{' '}
              <span className="text-sm font-normal text-[var(--ink-soft)]">birthdays &amp; anniversaries</span>
            </p>
          </div>
          <Link to="/directory" className="mt-3 text-xs font-semibold text-[var(--brand)] hover:underline">
            View in Directory →
          </Link>
        </section>
      </div>
    </div>
  )
}
