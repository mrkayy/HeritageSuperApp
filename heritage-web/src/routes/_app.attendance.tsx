import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '#/components/ui'
import {
  api,
  ApiError,
  type DirectoryPerson,
  type ServiceKind,
  type ServiceOccurrenceRoster,
  type ServiceOccurrenceSummary,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Service Occurrences & Attendance Recording (HOF-014).
 * - Create Sunday 1st/2nd or Midweek service occurrences
 * - Record aggregate auditorium headcount
 * - Search & idempotently check in individual people (concurrent/repeat clicks never double-count)
 * - Audited removal if checked in by mistake (HOF-014-S03)
 */
export const Route = createFileRoute('/_app/attendance')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'people.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AttendancePage,
})

function AttendancePage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canRecord = hasCapability(me, 'attendance.record')

  const occurrences = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => api<ServiceOccurrenceSummary[]>('/attendance/occurrences'),
  })

  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>('')
  const [showNewServiceForm, setShowNewServiceForm] = useState(false)
  const [checkInSearch, setCheckInSearch] = useState('')
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const activeOccurrenceId = selectedOccurrenceId || occurrences.data?.[0]?.id || ''

  const roster = useQuery({
    queryKey: ['occurrence-roster', activeOccurrenceId],
    enabled: Boolean(activeOccurrenceId),
    queryFn: () => api<ServiceOccurrenceRoster>(`/attendance/occurrences/${activeOccurrenceId}`),
  })

  const searchPeople = useQuery({
    queryKey: ['attendance-people-search', checkInSearch.trim()],
    enabled: canRecord && checkInSearch.trim().length >= 2,
    queryFn: () =>
      api<DirectoryPerson[]>(`/people?search=${encodeURIComponent(checkInSearch.trim())}`),
  })

  const createOccurrenceMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ id: string }>('/attendance/occurrences', { method: 'POST', body }),
    onSuccess: async (created) => {
      setShowNewServiceForm(false)
      setSelectedOccurrenceId(created.id)
      setBanner({ tone: 'success', text: 'Service occurrence created.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not create service.' }),
  })

  const headcountMutation = useMutation({
    mutationFn: ({ occurrenceId, headcount }: { occurrenceId: string; headcount: number }) =>
      api(`/attendance/occurrences/${occurrenceId}`, {
        method: 'PATCH',
        body: { headcount },
      }),
    onSuccess: async () => {
      setBanner({ tone: 'success', text: 'Service headcount updated.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['occurrence-roster', activeOccurrenceId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
  })

  const checkInMutation = useMutation({
    mutationFn: (personId: string) =>
      api<{ attendance_id: string; already_present: boolean }>(
        `/attendance/occurrences/${activeOccurrenceId}/check-ins`,
        {
          method: 'POST',
          body: { person_id: personId },
        },
      ),
    onSuccess: async (res) => {
      setBanner(
        res.already_present
          ? { tone: 'info', text: 'Person is already marked present for this service (no duplicate created).' }
          : { tone: 'success', text: 'Checked in for service.' },
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['occurrence-roster', activeOccurrenceId] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
  })

  const removeCheckInMutation = useMutation({
    mutationFn: (personId: string) =>
      api(`/attendance/occurrences/${activeOccurrenceId}/check-ins/${personId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['occurrence-roster', activeOccurrenceId] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
      ])
    },
  })

  function onCreateService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    createOccurrenceMutation.mutate({
      title: form.get('title'),
      kind: form.get('kind') as ServiceKind,
      service_date: form.get('service_date'),
      headcount: Number(form.get('headcount') || 0),
    })
  }

  function onUpdateHeadcount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    headcountMutation.mutate({
      occurrenceId: activeOccurrenceId,
      headcount: Number(form.get('headcount') || 0),
    })
  }

  const checkedInIds = new Set(roster.data?.attendees.map((a) => a.person_id) ?? [])
  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Service Attendance</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Track Sunday &amp; midweek service occurrences, auditorium headcounts, and individual check-ins.
          </p>
        </div>
        {canRecord && (
          <Button onClick={() => setShowNewServiceForm((v) => !v)}>
            {showNewServiceForm ? 'Close' : '+ New Service Occurrence'}
          </Button>
        )}
      </div>

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {/* Create Service Occurrence Form */}
      {showNewServiceForm && canRecord && (
        <form
          onSubmit={onCreateService}
          className="grid gap-4 rounded-xl border border-[var(--line)] bg-white p-6 sm:grid-cols-4"
        >
          <Field label="Service Title" name="title" placeholder="Sunday 1st Service" required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--ink)]">Service Kind</label>
            <select
              name="kind"
              defaultValue="SUNDAY_FIRST"
              className="h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
            >
              <option value="SUNDAY_FIRST">Sunday 1st Service</option>
              <option value="SUNDAY_SECOND">Sunday 2nd Service</option>
              <option value="SUNDAY_COMBINED">Sunday Combined</option>
              <option value="MIDWEEK">Midweek Service</option>
              <option value="SPECIAL">Special Service</option>
            </select>
          </div>
          <Field label="Date" name="service_date" type="date" defaultValue={todayIso} required />
          <div className="flex items-end gap-2">
            <Field label="Initial Headcount" name="headcount" type="number" min={0} defaultValue="0" />
            <Button type="submit" loading={createOccurrenceMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      )}

      {/* Service Selector & Headcount Bar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Occurrences list */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Service Occurrences</h2>
          <div className="space-y-2">
            {(occurrences.data ?? []).map((o) => {
              const active = o.id === activeOccurrenceId
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOccurrenceId(o.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                    active
                      ? 'border-[var(--brand)] bg-white shadow-2xs'
                      : 'border-[var(--line)] bg-white/70 hover:bg-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{o.title}</p>
                    <p className="text-xs text-[var(--ink-soft)]">{o.service_date}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-[var(--ink)]">
                      {Math.max(o.headcount, o.check_in_count)} total
                    </p>
                    <p className="text-[var(--ink-soft)]">
                      {o.check_in_count} checked in · {o.first_timer_count} first-timers
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Right 2 columns: Active Service Roster & Quick Check-In */}
        <section className="space-y-5 lg:col-span-2">
          {roster.data && (
            <div className="rounded-xl border border-[var(--line)] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">{roster.data.title}</h2>
                  <p className="text-xs text-[var(--ink-soft)]">
                    Date: {roster.data.service_date} · Checked-in roster: {roster.data.attendees.length}
                  </p>
                </div>

                {canRecord && (
                  <form key={roster.data.id} onSubmit={onUpdateHeadcount} className="flex items-end gap-2">
                    <Field
                      label="Auditorium Headcount"
                      name="headcount"
                      type="number"
                      min={0}
                      defaultValue={String(roster.data.headcount)}
                    />
                    <Button type="submit" variant="ghost" loading={headcountMutation.isPending}>
                      Update Count
                    </Button>
                  </form>
                )}
              </div>

              {/* Quick Check-In Search */}
              {canRecord && (
                <div className="mt-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Quick Check-In from Directory
                  </label>
                  <input
                    type="search"
                    value={checkInSearch}
                    onChange={(e) => setCheckInSearch(e.target.value)}
                    placeholder="Type name or phone number to mark present…"
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--muted)]/40 px-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white"
                  />
                  {(searchPeople.data?.length ?? 0) > 0 && (
                    <div className="mt-2 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-white">
                      {searchPeople.data?.slice(0, 6).map((p) => {
                        const isPresent = checkedInIds.has(p.id)
                        return (
                          <div key={p.id} className="flex items-center justify-between px-3.5 py-2 text-sm">
                            <div>
                              <span className="font-medium text-[var(--ink)]">
                                {p.first_name} {p.last_name}
                              </span>{' '}
                              <span className="text-xs text-[var(--ink-soft)]">
                                ({p.membership_status}){p.phone ? ` · ${p.phone}` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => checkInMutation.mutate(p.id)}
                              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                                isPresent
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]'
                              }`}
                            >
                              {isPresent ? '✓ Present' : 'Check In'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Checked-in Roster Table */}
              <div className="mt-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Checked-In Attendees ({roster.data.attendees.length})
                </h3>
                {roster.data.attendees.length === 0 ? (
                  <p className="text-sm text-[var(--ink-soft)]">
                    No individual check-ins recorded for this service yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-[var(--line)] bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
                        <tr>
                          <th className="px-4 py-2.5">Name</th>
                          <th className="px-4 py-2.5">Standing</th>
                          <th className="px-4 py-2.5">Source</th>
                          {canRecord && <th className="px-4 py-2.5 text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)]">
                        {roster.data.attendees.map((a) => (
                          <tr key={a.attendance_id}>
                            <td className="px-4 py-2.5 font-medium text-[var(--ink)]">
                              {a.first_name} {a.last_name}
                              {a.is_first_visit && (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                  First Visit
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[var(--ink-soft)]">{a.membership_status}</td>
                            <td className="px-4 py-2.5 text-xs text-[var(--ink-soft)]">{a.source}</td>
                            {canRecord && (
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeCheckInMutation.mutate(a.person_id)}
                                  className="text-xs font-medium text-red-700 hover:underline"
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
