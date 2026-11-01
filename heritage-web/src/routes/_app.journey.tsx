import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowRight,
  Eye,
  GraduationCap,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Alert, Badge, PageBanner } from '#/components/ui'
import { api, ApiError, type DirectoryPerson, type MembershipStatus } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

export const Route = createFileRoute('/_app/journey')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'people.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: JourneyPage,
})

const STAGES: {
  key: MembershipStatus
  label: string
  color: string
  icon: typeof Users
}[] = [
  { key: 'FIRST_TIMER', label: 'First-Timers', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: UserPlus },
  { key: 'VISITOR', label: 'Visitors', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Eye },
  { key: 'FOUNDATION', label: 'Foundation Class', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30', icon: GraduationCap },
  { key: 'MEMBER', label: 'Members', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: Users },
  { key: 'WORK_FORCE', label: 'Workforce', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: ShieldCheck },
]

function JourneyPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canWrite = hasCapability(me, 'people.write')

  const [selectedStage, setSelectedStage] = useState<MembershipStatus | null>(null)
  const [stageSearch, setStageSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const directory = useQuery({
    queryKey: ['journey-people'],
    queryFn: () => api<DirectoryPerson[]>('/people'),
  })

  const people = directory.data ?? []

  const stageCounts: Record<string, number> = {}
  for (const p of people) {
    const s = p.membership_status
    stageCounts[s] = (stageCounts[s] || 0) + 1
  }
  const totalPipeline = people.length

  const selectedMembers = selectedStage
    ? people.filter((p) => {
        if (p.membership_status !== selectedStage) return false
        if (!stageSearch.trim()) return true
        const q = stageSearch.trim().toLowerCase()
        const name = `${p.first_name} ${p.last_name}`.toLowerCase()
        return (
          name.includes(q) ||
          (p.phone?.toLowerCase().includes(q) ?? false) ||
          (p.email?.toLowerCase().includes(q) ?? false)
        )
      })
    : []

  const updateMutation = useMutation({
    mutationFn: ({ personId, status }: { personId: string; status: MembershipStatus }) =>
      api(`/people/${personId}`, { method: 'PATCH', body: { membership_status: status } }),
    onSuccess: async () => {
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['journey-people'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not update stage.'),
  })

  const selectedStageInfo = STAGES.find((s) => s.key === selectedStage)

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Pipeline Growth"
        badgeIcon={<TrendingUp className="h-3.5 w-3.5" />}
        title="Member Journey Pipeline"
        subtitle="Visual stage progression from first visit through to workforce placement."
        secondaryBadge={
          <Badge variant="secondary">
            Total Pipeline: {directory.isPending ? '…' : totalPipeline} Members
          </Badge>
        }
      />

      {error && <Alert>{error}</Alert>}

      {/* Stage Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const Icon = stage.icon
          const count = stageCounts[stage.key] || 0
          const isSelected = selectedStage === stage.key
          return (
            <div
              key={stage.key}
              className={`glass-card flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                isSelected
                  ? 'border-primary/50 shadow-md ring-2 ring-primary/20'
                  : 'border-border/60 hover:border-primary/40 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${stage.color} text-xs`}>
                    {stage.label}
                  </Badge>
                  <div className={`rounded-xl p-2.5 ${stage.color.split(' ').slice(0, 2).join(' ')}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                  {directory.isPending ? '…' : count}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Profiled members at this stage</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedStage(null)
                    setStageSearch('')
                  } else {
                    setSelectedStage(stage.key)
                    setStageSearch('')
                  }
                }}
                className="group mt-4 flex w-full items-center justify-between rounded-xl border border-border/60 bg-white/70 px-3.5 py-2.5 text-xs font-semibold text-foreground transition hover:bg-secondary/60"
              >
                <span>{isSelected ? 'Close' : 'View Members'}</span>
                {isSelected ? (
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            </div>
          )
        })}
      </section>

      {/* Inline Stage Members Panel */}
      {selectedStage && selectedStageInfo && (
        <section className="glass-card rounded-2xl border border-border/60 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={selectedStageInfo.color}>
                  {selectedStageInfo.label}
                </Badge>
                <Badge variant="secondary">{selectedMembers.length} members</Badge>
              </div>
              <h2 className="mt-2 text-lg font-bold text-foreground">
                {selectedStageInfo.label} Directory
              </h2>
              <p className="text-xs text-muted-foreground">
                View and manage members currently at the {selectedStageInfo.label} stage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedStage(null)
                setStageSearch('')
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={stageSearch}
              onChange={(e) => setStageSearch(e.target.value)}
              placeholder="Search member by name, phone, or email…"
              className="h-10 w-full rounded-xl border border-input bg-white/85 pl-10 pr-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 sm:max-w-sm"
            />
          </div>

          {/* Members List */}
          <div className="mt-4 space-y-3">
            {selectedMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 py-12 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium text-foreground">No members found at this stage</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stageSearch.trim()
                    ? 'Try adjusting your search query.'
                    : 'Members will appear here when they reach this stage.'}
                </p>
              </div>
            ) : (
              selectedMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/50 bg-white/60 p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {m.first_name[0]}
                        {m.last_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {m.first_name} {m.last_name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {m.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {m.email}
                          </span>
                        )}
                        {m.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {m.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canWrite && (
                    <select
                      aria-label={`Stage for ${m.first_name} ${m.last_name}`}
                      value={m.membership_status}
                      disabled={updateMutation.isPending}
                      onChange={(e) =>
                        updateMutation.mutate({
                          personId: m.id,
                          status: e.target.value as MembershipStatus,
                        })
                      }
                      className="h-9 shrink-0 rounded-xl border border-input bg-white/90 px-3 text-xs font-semibold text-foreground shadow-2xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-44"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}
