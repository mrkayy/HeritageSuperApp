import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Cake,
  ChevronRight,
  ClipboardCheck,
  Heart,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge, PageBanner } from '#/components/ui'
import { api, type DashboardSummary, type DirectoryPerson, type MembershipStatus } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

/* ── Membership Pipeline Stage Definitions ─────────────────────────────── */

const PIPELINE_STAGES: {
  key: MembershipStatus
  label: string
  shortLabel: string
  color: string
  iconBg: string
}[] = [
  {
    key: 'FIRST_TIMER',
    label: 'First-Timers',
    shortLabel: 'FT',
    color: 'text-blue-600',
    iconBg: 'bg-blue-500/10 border-blue-500/25',
  },
  {
    key: 'VISITOR',
    label: 'Visitors',
    shortLabel: 'VIS',
    color: 'text-amber-600',
    iconBg: 'bg-amber-500/10 border-amber-500/25',
  },
  {
    key: 'FOUNDATION',
    label: 'Foundation Class',
    shortLabel: 'FC',
    color: 'text-purple-600',
    iconBg: 'bg-purple-500/10 border-purple-500/25',
  },
  {
    key: 'MEMBER',
    label: 'Members',
    shortLabel: 'MBR',
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10 border-emerald-500/25',
  },
  {
    key: 'WORK_FORCE',
    label: 'Workforce',
    shortLabel: 'WF',
    color: 'text-primary',
    iconBg: 'bg-primary/10 border-primary/25',
  },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function DashboardPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api<DashboardSummary>('/attendance/summary'),
  })

  const currentMonth = new Date().getMonth() + 1
  const currentMonthName = MONTH_NAMES[currentMonth - 1]

  // Fetch celebrations this month for the highlights panel
  const celebrations = useQuery({
    queryKey: ['directory', '', 'CELEBRATIONS'],
    queryFn: () => api<DirectoryPerson[]>(`/people?celebrations_month=${currentMonth}`),
  })

  // Fetch stage counts for the pipeline visualization
  const stageCounts = useQuery({
    queryKey: ['pipeline-stage-counts'],
    queryFn: async () => {
      const results = await Promise.all(
        PIPELINE_STAGES.map(async (stage) => {
          const people = await api<DirectoryPerson[]>(`/people?status=${stage.key}`)
          return { key: stage.key, count: people.length }
        }),
      )
      return Object.fromEntries(results.map((r) => [r.key, r.count])) as Record<MembershipStatus, number>
    },
    staleTime: 60_000,
  })

  if (!me) return null

  // Split celebrations into birthdays vs anniversaries
  const celebrationPeople = celebrations.data ?? []
  const birthdaysThisMonth = celebrationPeople.filter((p) => p.birth_month === currentMonth)
  const anniversariesThisMonth = celebrationPeople.filter((p) => p.anniversary_month === currentMonth)

  // Pipeline max for bar scaling
  const counts = stageCounts.data ?? ({} as Record<string, number>)
  const maxCount = Math.max(1, ...Object.values(counts))

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
    // [Refinement Pending] Pastoral Prayer Notes
    // {
    //   title: 'Pastoral Prayer Notes',
    //   subtitle: 'Format confidential prayer requests & email Resident Pastor',
    //   to: '/prayer-notes' as const,
    //   icon: HeartHandshake,
    //   iconBox: 'bg-purple-500/10 text-purple-600 group-hover:bg-purple-500/20',
    //   borderHover: 'hover:border-purple-500/40',
    //   show: hasCapability(me, 'prayer_notes.manage'),
    // },
  ].filter((a) => a.show)

  return (
    <div className="space-y-6">
      {/* ── Header Banner ──────────────────────────────────────────────── */}
      <PageBanner
        badge="Membership & Information Center"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}
        title={`Welcome back, ${me.first_name}`}
        subtitle="Overview of church directory, membership pipeline, and monthly celebrations."
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
              onClick={() => {
                summary.refetch()
                celebrations.refetch()
                stageCounts.refetch()
              }}
              disabled={summary.isFetching}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-white/80 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Refresh dashboard metrics"
            >
              <RefreshCw className={`h-4 w-4 ${summary.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />

      {/* ── Quick Action Cards ─────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.title}
                to={action.to}
                className={`glass-card group flex items-center gap-4 rounded-2xl border border-border/60 p-5 transition-all hover:shadow-md ${action.borderHover}`}
              >
                <div className={`rounded-xl p-3 transition-colors ${action.iconBox}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground">{action.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{action.subtitle}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            )
          })}
        </section>
      )}

      {/* ── Primary KPI Grid (4 cards — color-coded like web/src) ──────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total People */}
        <Link
          to="/directory"
          className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-5 transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Total People</p>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {summary.data?.total_people ?? '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Active profiled members in directory</p>
          </div>
        </Link>

        {/* Birthdays This Month */}
        <Link
          to="/celebrations"
          className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-5 transition-all hover:border-pink-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Birthdays ({currentMonthName})
            </p>
            <div className="rounded-xl bg-pink-500/10 p-2.5 text-pink-500">
              <Cake className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {celebrations.isPending ? '…' : birthdaysThisMonth.length}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Celebrating this month</span>
              <span className="flex items-center text-xs font-semibold text-primary">
                View <ChevronRight className="ml-0.5 h-3 w-3" />
              </span>
            </div>
          </div>
        </Link>

        {/* Anniversaries This Month */}
        <Link
          to="/celebrations"
          className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-5 transition-all hover:border-rose-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Anniversaries ({currentMonthName})
            </p>
            <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-500">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {celebrations.isPending ? '…' : anniversariesThisMonth.length}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Married couples celebrating</span>
              <span className="flex items-center text-xs font-semibold text-primary">
                View <ChevronRight className="ml-0.5 h-3 w-3" />
              </span>
            </div>
          </div>
        </Link>

        {/* Open Follow-Up Calls */}
        <Link
          to="/follow-up"
          className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-5 transition-all hover:border-amber-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Open Follow-Up Calls</p>
            <div
              className={`rounded-xl p-2.5 ${
                (summary.data?.pastoral_alerts_count ?? 0) > 0
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {summary.data?.open_followups_count ?? '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(summary.data?.pastoral_alerts_count ?? 0) > 0
                ? `${summary.data?.pastoral_alerts_count} flagged for pastoral visit`
                : 'Active outreach queue'}
            </p>
          </div>
        </Link>
      </section>

      {/* ── Membership Pipeline + Celebrations Highlights ──────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Membership Pipeline Visualization (2/3 width) */}
        <section className="glass-card flex flex-col rounded-2xl border border-border/60 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  <TrendingUp className="h-3 w-3" /> Pipeline Growth
                </Badge>
              </div>
              <h2 className="mt-2 text-base font-semibold text-foreground">Membership Funnel Distribution</h2>
              <p className="text-xs text-muted-foreground">
                Member count by current standing in church growth process
              </p>
            </div>
            <Link
              to="/directory"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Full Directory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* CSS Bar Chart */}
          <div className="mt-6 flex flex-1 items-end gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const count = counts[stage.key] ?? 0
              const heightPct = maxCount > 0 ? Math.max(4, (count / maxCount) * 100) : 4
              return (
                <div key={stage.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className={`text-sm font-bold ${stage.color}`}>
                    {stageCounts.isPending ? '…' : count}
                  </span>
                  <div className="relative w-full overflow-hidden rounded-t-lg bg-secondary/50" style={{ height: '160px' }}>
                    <div
                      className={`absolute inset-x-0 bottom-0 rounded-t-lg border ${stage.iconBg} transition-all duration-700 ease-out`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {stage.shortLabel}
                  </span>
                  <span className="hidden text-center text-[10px] text-muted-foreground sm:block">
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Stage Pills (mobile-friendly summary) */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border/50 pt-4">
            {PIPELINE_STAGES.map((stage) => (
              <span
                key={stage.key}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${stage.iconBg} ${stage.color}`}
              >
                <span className="font-bold">{stageCounts.isPending ? '…' : counts[stage.key] ?? 0}</span>
                {stage.label}
              </span>
            ))}
          </div>
        </section>

        {/* Monthly Celebrations Highlights (1/3 width) */}
        <section className="glass-card flex flex-col rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between">
            <Badge variant="purple">
              <Sparkles className="h-3 w-3" /> {currentMonthName} Highlights
            </Badge>
            <div className="flex items-center gap-1">
              <Cake className="h-4 w-4 text-pink-500" />
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
          </div>

          {/* Birthdays List */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Cake className="h-3.5 w-3.5 text-pink-500" />
                Birthdays ({birthdaysThisMonth.length})
              </span>
              <Link to="/celebrations" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            </div>
            {celebrations.isPending ? (
              <p className="py-2 text-xs italic text-muted-foreground">Loading…</p>
            ) : birthdaysThisMonth.length === 0 ? (
              <p className="py-2 text-xs italic text-muted-foreground">
                No birthdays logged for {currentMonthName}
              </p>
            ) : (
              <div className="space-y-1.5">
                {birthdaysThisMonth.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-pink-500/5 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-pink-500/25 bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-600">
                      {MONTHS[(p.birth_month ?? 1) - 1]} {p.birth_day}
                    </span>
                  </div>
                ))}
                {birthdaysThisMonth.length > 3 && (
                  <Link
                    to="/celebrations"
                    className="block pt-1 text-center text-xs font-semibold text-primary hover:underline"
                  >
                    +{birthdaysThisMonth.length - 3} more
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Anniversaries List */}
          <div className="mt-4 border-t border-border/50 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                Anniversaries ({anniversariesThisMonth.length})
              </span>
              <Link to="/celebrations" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            </div>
            {celebrations.isPending ? (
              <p className="py-2 text-xs italic text-muted-foreground">Loading…</p>
            ) : anniversariesThisMonth.length === 0 ? (
              <p className="py-2 text-xs italic text-muted-foreground">
                No anniversaries logged for {currentMonthName}
              </p>
            ) : (
              <div className="space-y-1.5">
                {anniversariesThisMonth.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-rose-500/5 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                      {MONTHS[(p.anniversary_month ?? 1) - 1]} {p.anniversary_day}
                    </span>
                  </div>
                ))}
                {anniversariesThisMonth.length > 3 && (
                  <Link
                    to="/celebrations"
                    className="block pt-1 text-center text-xs font-semibold text-primary hover:underline"
                  >
                    +{anniversariesThisMonth.length - 3} more
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* CTA Link */}
          <Link
            to="/celebrations"
            className="mt-auto inline-flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            <span>Open Celebrations &amp; Landmarks</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      {/* ── Active Appointments ─────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl border border-border/60 p-6">
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
      </section>

      {/* ── Quick Navigation Cards (bottom grid like web/src) ──────────── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          to="/directory"
          className="glass-card group rounded-2xl border border-border/60 p-5 transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Full CRM Directory</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Search, filter, and manage member profiles, standing, and verification status.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Open Directory <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>

        <Link
          to="/celebrations"
          className="glass-card group rounded-2xl border border-border/60 p-5 transition-all hover:border-pink-500/50 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-pink-500/10 p-3 text-pink-500">
              <Cake className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Celebration Reminders</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Filter birthdays & wedding anniversaries month-by-month for pastoral care.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Open Celebrations <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>

        <Link
          to="/directory"
          className="glass-card group rounded-2xl border border-border/60 p-5 transition-all hover:border-purple-500/50 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Member Journey Pipeline</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Track member growth from First-Timer through Foundation Class to Workforce.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                View Pipeline <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  )
}
