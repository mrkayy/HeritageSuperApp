import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Cake,
  ClipboardCheck,
  Eye,
  Heart,
  HeartHandshake,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge, PageBanner } from '#/components/ui'
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

  const quickActions = [
    {
      title: 'Register New Visitor',
      subtitle: 'Capture first-timer details & log attendance',
      to: '/intake' as const,
      icon: UserPlus,
      iconBox: 'bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20',
      borderHover: 'hover:border-blue-500/40',
      show: hasCapability(me, 'visitors.capture'),
    },
    {
      title: 'Mark Service Attendance',
      subtitle: 'Record auditorium headcount & individual check-ins',
      to: '/attendance' as const,
      icon: ClipboardCheck,
      iconBox: 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20',
      borderHover: 'hover:border-amber-500/40',
      show: hasCapability(me, 'attendance.record') || hasCapability(me, 'people.read'),
    },
    {
      title: 'Follow-Up Queue',
      subtitle: 'Log call outcomes & assign first-timer outreach',
      to: '/follow-up' as const,
      icon: PhoneCall,
      iconBox: 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20',
      borderHover: 'hover:border-emerald-500/40',
      show: hasCapability(me, 'followups.read'),
    },
    {
      title: 'Pastoral Prayer Notes',
      subtitle: 'Format confidential prayer requests & email Resident Pastor',
      to: '/prayer-notes' as const,
      icon: HeartHandshake,
      iconBox: 'bg-purple-500/10 text-purple-600 group-hover:bg-purple-500/20',
      borderHover: 'hover:border-purple-500/40',
      show: hasCapability(me, 'prayer_notes.manage'),
    },
  ].filter((a) => a.show)

  const stats = [
    {
      label: 'Total People in Directory',
      value: summary.data?.total_people ?? '—',
      to: '/directory' as const,
      hint: 'All visitors, members & workforce',
      icon: Users,
      iconTone: 'bg-primary/10 text-primary',
    },
    {
      label: 'First-Timers',
      value: summary.data?.first_timers_count ?? '—',
      to: '/directory' as const,
      hint: 'Awaiting assimilation into Foundation Class',
      icon: Eye,
      iconTone: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Open Follow-Up Calls',
      value: summary.data?.open_followups_count ?? '—',
      to: '/follow-up' as const,
      hint:
        (summary.data?.pastoral_alerts_count ?? 0) > 0
          ? `${summary.data?.pastoral_alerts_count} flagged for pastoral visit`
          : 'Active outreach queue',
      icon: PhoneCall,
      iconTone:
        (summary.data?.pastoral_alerts_count ?? 0) > 0
          ? 'bg-red-500/10 text-red-600'
          : 'bg-amber-500/10 text-amber-600',
    },
    {
      label: 'Latest Service Attendance',
      value: summary.data?.latest_service?.headcount ?? '—',
      to: '/attendance' as const,
      hint: summary.data?.latest_service
        ? `${summary.data.latest_service.title} (${summary.data.latest_service.service_date})`
        : 'No service recorded yet',
      icon: ClipboardCheck,
      iconTone: 'bg-emerald-500/10 text-emerald-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header Banner (matched with web/src/pages/teams/MembershipDashboard.tsx & InfoCenterDashboard.tsx) */}
      <PageBanner
        badge="Membership & Information Center"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}
        title={`Welcome back, ${me.first_name}`}
        subtitle="Overview of church directory, visitor intake, service attendance, and monthly celebrations."
        actions={
          <>
            {hasCapability(me, 'visitors.capture') && (
              <Link
                to="/intake"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary/90 sm:text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Capture First-Timer
              </Link>
            )}
            <button
              type="button"
              onClick={() => summary.refetch()}
              disabled={summary.isFetching}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-white/80 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Refresh dashboard metrics"
            >
              <RefreshCw className={`h-4 w-4 ${summary.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />

      {/* Quick Action Cards (matched with web/src/pages/teams/InfoCenterDashboard.tsx) */}
      {quickActions.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.title}
                to={action.to}
                className={`glass-card group flex items-center gap-4 rounded-2xl border border-border/60 p-5 transition-all hover:shadow-md ${action.borderHover}`}
              >
                <div className={`rounded-xl p-3 transition-colors ${action.iconBox}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground">{action.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{action.subtitle}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            )
          })}
        </section>
      )}

      {/* Primary KPI Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              to={s.to}
              className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <div className={`rounded-xl p-2.5 ${s.iconTone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Active Appointments + Celebrations Highlight */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-6 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">Your Active Appointments</h2>
                <p className="text-xs text-muted-foreground">
                  Operational roles and ministry team assignments granted to your account
                </p>
              </div>
              {hasCapability(me, 'stewards.invite') && (
                <Link
                  to="/stewards"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Manage Stewards ({summary.data?.active_stewards_count ?? 0} active)
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {me.assignments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-secondary-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>{a.role_label}</span>
                  {a.team && <span className="text-muted-foreground">· {a.team.name}</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4 text-xs text-muted-foreground">
            <span>Follow-Up is operated as a function of the Membership Team.</span>
            <Link to="/directory" className="font-semibold text-primary hover:underline">
              Open Full CRM Directory →
            </Link>
          </div>
        </section>

        <section className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-6">
          <div>
            <div className="flex items-center justify-between">
              <Badge variant="purple">
                <Sparkles className="h-3 w-3" /> Monthly Highlights
              </Badge>
              <div className="flex items-center gap-1 text-pink-500">
                <Cake className="h-4 w-4" />
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
            </div>
            <h2 className="mt-3 text-base font-semibold text-foreground">Celebrations This Month</h2>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {summary.data?.celebrations_this_month ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Members celebrating birthdays and wedding anniversaries this month.
            </p>
          </div>

          <Link
            to="/celebrations"
            className="mt-5 inline-flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            <span>Open Celebrations &amp; Landmarks</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </div>
  )
}
