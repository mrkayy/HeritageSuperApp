import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  UserCheck,
} from 'lucide-react'
import { Alert, Badge, Button, PageBanner } from '#/components/ui'
import { api, ApiError, type CallOutcome, type FollowUpTaskItem } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Follow-Up Queue & Call Logging (HOF-016) — A function of the Membership Team.
 * - Callers see their assigned tasks ("My Calls")
 * - Team Leads / Pastors / Admins can filter All, Unassigned, My Calls, and Pastoral Visit flags
 * - Honest outcome logging: UNREACHABLE / VOICEMAIL / WRONG_NUMBER keep the task open
 *   in the queue rather than falsely marking the visitor as reached (HOF-016-S02)
 */
export const Route = createFileRoute('/_app/follow-up')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'followups.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: FollowUpPage,
})

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  REACHED: 'Reached — Spoke with visitor',
  UNREACHABLE: 'Unreachable — No answer / line off',
  VOICEMAIL: 'Left Voicemail / WhatsApp message',
  WRONG_NUMBER: 'Wrong or invalid number',
  REQUESTED_PRAYER: 'Reached — Shared prayer request',
  NEEDS_PASTORAL_VISIT: 'Reached — Needs pastoral visit',
}

function FollowUpPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canAssign = hasCapability(me, 'followups.assign')
  const canRecord = hasCapability(me, 'followups.record')

  const [scope, setScope] = useState<'mine' | 'unassigned' | 'all' | 'pastoral'>(canAssign ? 'all' : 'mine')
  const [statusFilter, setStatusFilter] = useState<'OPEN_AND_IN_PROGRESS' | 'COMPLETED'>('OPEN_AND_IN_PROGRESS')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const tasks = useQuery({
    queryKey: ['followups', scope, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('scope', scope)
      if (statusFilter === 'COMPLETED') params.set('status', 'COMPLETED')
      return api<FollowUpTaskItem[]>(`/follow-ups?${params.toString()}`)
    },
  })

  const callers = useQuery({
    queryKey: ['followup-callers'],
    enabled: canAssign,
    queryFn: () => api<{ person_id: string; name: string; roles: string[] }[]>('/follow-ups/callers'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ taskId, assigneePersonId }: { taskId: string; assigneePersonId: string }) =>
      api(`/follow-ups/${taskId}/assign`, {
        method: 'POST',
        body: { assignee_person_id: assigneePersonId },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['followups'] })
      setBanner({ tone: 'success', text: 'Follow-up task assigned.' })
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not assign task.' }),
  })

  const outcomeMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: Record<string, unknown> }) =>
      api(`/follow-ups/${taskId}/outcomes`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      setActiveTaskId(null)
      setBanner({ tone: 'success', text: 'Call outcome logged.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followups'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not record call outcome.' }),
  })

  function onLogOutcome(taskId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const outcome = form.get('outcome') as CallOutcome
    outcomeMutation.mutate({
      taskId,
      payload: {
        outcome,
        note: form.get('note') || undefined,
        needs_pastoral_visit: form.get('needs_pastoral_visit') === 'on',
        mark_completed: form.get('mark_completed') === 'on',
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Membership Team · Follow-Up"
        badgeIcon={<PhoneCall className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {(tasks.data ?? []).length} tasks in view
          </Badge>
        }
        title="Follow-Up & Outreach Queue"
        subtitle="Assign first-time visitors to Membership stewards, log call outcomes honestly, and flag pastoral care needs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canAssign && (
              <div className="flex rounded-xl border border-border/70 bg-white/80 p-1 text-xs font-semibold shadow-2xs">
                {(
                  [
                    ['all', 'All Queue'],
                    ['unassigned', 'Unassigned'],
                    ['mine', 'My Calls'],
                    ['pastoral', 'Pastoral Alerts'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setScope(key)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                      scope === key
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {key === 'pastoral' && <AlertTriangle className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                ))}
              </div>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'OPEN_AND_IN_PROGRESS' | 'COMPLETED')}
              className="h-10 rounded-xl border border-input bg-white/85 px-3 text-xs font-semibold text-foreground shadow-2xs outline-none focus:border-primary"
            >
              <option value="OPEN_AND_IN_PROGRESS">Active Queue (Open / In Progress)</option>
              <option value="COMPLETED">Completed Calls</option>
            </select>
          </div>
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {tasks.isPending ? (
        <div className="glass-card rounded-2xl border border-border/60 p-10 text-center text-sm text-muted-foreground">
          Loading follow-up queue…
        </div>
      ) : (tasks.data?.length ?? 0) === 0 ? (
        <div className="glass-card rounded-2xl border border-border/60 p-12 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600/70" />
          <p className="mt-2.5 text-sm font-semibold text-foreground">No follow-up tasks in this view</p>
          <p className="mt-1 text-xs text-muted-foreground">
            All assigned visitors in this filter have been attended to.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(tasks.data ?? []).map((t) => {
            const isLogging = activeTaskId === t.id
            return (
              <div
                key={t.id}
                className="glass-card rounded-2xl border border-border/60 p-5 transition-all hover:border-primary/30 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {t.person.first_name[0]}
                      {t.person.last_name[0]}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-foreground">
                          {t.person.first_name} {t.person.last_name}
                        </h2>
                        {t.kind === 'FOUNDATION_HANDOFF' && (
                          <Badge variant="default">
                            <GraduationCap className="h-3 w-3" />
                            Foundation Class Handoff
                          </Badge>
                        )}
                        <Badge
                          variant={
                            t.status === 'COMPLETED'
                              ? 'success'
                              : t.status === 'IN_PROGRESS'
                                ? 'default'
                                : 'warning'
                          }
                        >
                          {t.status}
                        </Badge>
                        {t.needs_pastoral_visit && (
                          <Badge variant="danger">
                            <AlertTriangle className="h-3 w-3" />
                            Needs Pastoral Visit
                          </Badge>
                        )}
                        {t.last_outcome && (
                          <Badge variant="secondary">Last: {t.last_outcome}</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {t.person.phone && (
                          <a
                            href={`tel:${t.person.phone}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {t.person.phone}
                          </a>
                        )}
                        {t.person.email && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {t.person.email}
                          </span>
                        )}
                        {t.person.missing_contact_reason && (
                          <span className="italic text-amber-800">
                            No phone/email: {t.person.missing_contact_reason}
                          </span>
                        )}
                        {t.service_occurrence && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary/70" />
                            Visited: {t.service_occurrence.title} ({t.service_occurrence.service_date.slice(0, 10)})
                          </span>
                        )}
                      </div>
                      {t.recommendation_note && (
                        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-foreground">
                          <strong className="font-semibold text-primary">IC Handoff Note:</strong>{' '}
                          &ldquo;{t.recommendation_note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Assignment & Log Call Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {canAssign ? (
                      <select
                        aria-label={`Assign ${t.person.first_name} ${t.person.last_name}`}
                        value={t.assignee_person_id ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            assignMutation.mutate({ taskId: t.id, assigneePersonId: e.target.value })
                          }
                        }}
                        className="h-9 rounded-xl border border-input bg-white/90 px-3 text-xs font-semibold text-foreground shadow-2xs outline-none focus:border-primary"
                      >
                        <option value="">Unassigned — Pick steward…</option>
                        {(callers.data ?? []).map((c) => (
                          <option key={c.person_id} value={c.person_id}>
                            Assigned: {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        Assigned to: <strong className="text-foreground">{t.assignee_name ?? 'Unassigned'}</strong>
                      </span>
                    )}

                    {t.assigned_by_name && (
                      <span className="text-[11px] text-muted-foreground/80 italic">
                        By: {t.assigned_by_name}
                        {t.assigned_at ? ` (${t.assigned_at.slice(0, 10)})` : ''}
                      </span>
                    )}

                    {canRecord && t.status !== 'COMPLETED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isLogging ? 'ghost' : 'primary'}
                        onClick={() => setActiveTaskId(isLogging ? null : t.id)}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        {isLogging ? 'Cancel' : 'Log Call Outcome'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recent Call History */}
                {t.call_logs.length > 0 && (
                  <div className="mt-4 border-t border-border/50 pt-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary" />
                      Call History ({t.call_logs.length})
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      {t.call_logs.map((log) => (
                        <li
                          key={log.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 px-3 py-1.5"
                        >
                          <Badge variant="outline" className="text-[11px]">
                            {log.outcome}
                          </Badge>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                          {log.note && (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <MessageSquare className="h-3 w-3 text-primary" />
                              &ldquo;{log.note}&rdquo;
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Inline Call Logger Form */}
                {isLogging && (
                  <form
                    onSubmit={(e) => onLogOutcome(t.id, e)}
                    className="mt-4 space-y-4 rounded-xl border border-primary/25 bg-secondary/45 p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-foreground">Call Outcome</label>
                        <select
                          name="outcome"
                          required
                          defaultValue="REACHED"
                          className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                        >
                          {(Object.entries(OUTCOME_LABELS) as [CallOutcome, string][]).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end gap-2 pb-1 text-xs">
                        <label className="flex items-center gap-2 font-medium text-foreground">
                          <input
                            type="checkbox"
                            name="needs_pastoral_visit"
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                          Flag for pastoral visit / attention
                        </label>
                        <label className="flex items-center gap-2 font-medium text-foreground">
                          <input
                            type="checkbox"
                            name="mark_completed"
                            defaultChecked
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                          Mark follow-up complete (only applies if reached)
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">Call Note (optional)</label>
                      <textarea
                        name="note"
                        rows={2}
                        placeholder="Summary of conversation or best time to call back…"
                        className="rounded-xl border border-input bg-white p-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" size="sm" loading={outcomeMutation.isPending}>
                        Save Call Outcome
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
