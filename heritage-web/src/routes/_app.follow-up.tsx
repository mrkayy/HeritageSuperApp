import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Alert, Button } from '#/components/ui'
import { api, ApiError, type CallOutcome, type FollowUpTaskItem } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Follow-Up Queue & Call Logging (HOF-016).
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Follow-Up &amp; Outreach Queue</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Assign first-time visitors to stewards, log call outcomes honestly, and flag pastoral care needs.
          </p>
        </div>

        {/* Scope & Status toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {canAssign && (
            <div className="flex rounded-lg border border-[var(--line)] bg-white p-0.5 text-xs font-semibold">
              {(
                [
                  ['all', 'All Queue'],
                  ['unassigned', 'Unassigned'],
                  ['mine', 'My Calls'],
                  ['pastoral', '🚨 Pastoral Alerts'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={`rounded-md px-2.5 py-1.5 transition ${
                    scope === key ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'OPEN_AND_IN_PROGRESS' | 'COMPLETED')}
            className="h-9 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--ink)]"
          >
            <option value="OPEN_AND_IN_PROGRESS">Active Queue (Open / In Progress)</option>
            <option value="COMPLETED">Completed Calls</option>
          </select>
        </div>
      </div>

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {tasks.isPending ? (
        <p className="text-sm text-[var(--ink-soft)]">Loading follow-up queue…</p>
      ) : (tasks.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--ink-soft)]">
          No follow-up tasks in this view.
        </div>
      ) : (
        <div className="space-y-4">
          {(tasks.data ?? []).map((t) => {
            const isLogging = activeTaskId === t.id
            return (
              <div key={t.id} className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--ink)]">
                        {t.person.first_name} {t.person.last_name}
                      </h2>
                      <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ink)]">
                        {t.status}
                      </span>
                      {t.needs_pastoral_visit && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          Needs Pastoral Visit
                        </span>
                      )}
                      {t.last_outcome && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900">
                          Last: {t.last_outcome}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-[var(--ink-soft)]">
                      {t.person.phone && (
                        <a href={`tel:${t.person.phone}`} className="font-semibold text-[var(--brand)] hover:underline">
                          📞 {t.person.phone}
                        </a>
                      )}
                      {t.person.email && <span>✉️ {t.person.email}</span>}
                      {t.person.missing_contact_reason && (
                        <span className="italic text-amber-800">No phone/email: {t.person.missing_contact_reason}</span>
                      )}
                      {t.service_occurrence && (
                        <span>
                          Visited: {t.service_occurrence.title} ({t.service_occurrence.service_date.slice(0, 10)})
                        </span>
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
                        className="h-9 rounded-lg border border-[var(--line)] bg-[var(--muted)]/60 px-2.5 text-xs font-medium text-[var(--ink)]"
                      >
                        <option value="">Unassigned — Pick steward…</option>
                        {(callers.data ?? []).map((c) => (
                          <option key={c.person_id} value={c.person_id}>
                            Assigned: {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[var(--ink-soft)]">
                        Assigned to: <strong>{t.assignee_name ?? 'Unassigned'}</strong>
                      </span>
                    )}

                    {canRecord && t.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => setActiveTaskId(isLogging ? null : t.id)}
                        className="rounded-lg bg-[var(--brand)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                      >
                        {isLogging ? 'Cancel' : 'Log Call Outcome'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Recent Call History */}
                {t.call_logs.length > 0 && (
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                      Call History ({t.call_logs.length})
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-[var(--ink-soft)]">
                      {t.call_logs.map((log) => (
                        <li key={log.id} className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--ink)]">{log.outcome}</span>
                          <span>· {new Date(log.created_at).toLocaleString()}</span>
                          {log.note && <span className="text-[var(--ink)]">— &ldquo;{log.note}&rdquo;</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Inline Call Logger Form */}
                {isLogging && (
                  <form
                    onSubmit={(e) => onLogOutcome(t.id, e)}
                    className="mt-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--muted)]/50 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--ink)]">Call Outcome</label>
                        <select
                          name="outcome"
                          required
                          defaultValue="REACHED"
                          className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
                        >
                          {(Object.entries(OUTCOME_LABELS) as [CallOutcome, string][]).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end gap-2 pb-1 text-xs">
                        <label className="flex items-center gap-2 font-medium text-[var(--ink)]">
                          <input type="checkbox" name="needs_pastoral_visit" className="h-4 w-4 rounded" />
                          Flag for pastoral visit / attention
                        </label>
                        <label className="flex items-center gap-2 font-medium text-[var(--ink)]">
                          <input
                            type="checkbox"
                            name="mark_completed"
                            defaultChecked
                            className="h-4 w-4 rounded"
                          />
                          Mark follow-up complete (only applies if reached)
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--ink)]">Call Note (optional)</label>
                      <textarea
                        name="note"
                        rows={2}
                        placeholder="Summary of conversation or best time to call back…"
                        className="rounded-lg border border-[var(--line)] bg-white p-2.5 text-sm text-[var(--ink)]"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" loading={outcomeMutation.isPending}>
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
