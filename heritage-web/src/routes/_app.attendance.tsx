import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
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
      <PageBanner
        badge="Information Center · Attendance"
        badgeIcon={<ClipboardCheck className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {(occurrences.data ?? []).length} recorded services
          </Badge>
        }
        title="Service Attendance & Check-In"
        subtitle="Track Sunday & midweek service occurrences, auditorium headcounts, and individual member check-ins."
        actions={
          canRecord ? (
            <Button onClick={() => setShowNewServiceForm((v) => !v)}>
              {showNewServiceForm ? (
                <>
                  <X className="h-4 w-4" /> Close
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> New Service Occurrence
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {/* Create Service Occurrence Form */}
      {showNewServiceForm && canRecord && (
        <form
          onSubmit={onCreateService}
          className="glass-card grid gap-4 rounded-2xl border border-border/60 p-6 sm:grid-cols-4"
        >
          <div className="sm:col-span-4 flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Create Service Occurrence</h2>
              <p className="text-xs text-muted-foreground">
                Open a new Sunday or Midweek service roster for headcount and individual check-ins.
              </p>
            </div>
            <Badge variant="default">New Service</Badge>
          </div>

          <Field label="Service Title" name="title" placeholder="Sunday 1st Service" required />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-tight text-foreground">Service Kind</label>
            <select
              name="kind"
              defaultValue="SUNDAY_FIRST"
              className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
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
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Service Occurrences
            </h2>
            <Calendar className="h-4 w-4 text-primary/70" />
          </div>
          <div className="space-y-2.5">
            {(occurrences.data ?? []).map((o) => {
              const active = o.id === activeOccurrenceId
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOccurrenceId(o.id)}
                  className={`glass-card flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-primary bg-white shadow-md ring-2 ring-primary/15'
                      : 'border-border/60 hover:border-primary/40'
                  }`}
                >
                  <div>
                    <p className="font-bold text-foreground">{o.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{o.service_date}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
                      <Users className="h-3 w-3" />
                      {Math.max(o.headcount, o.check_in_count)} total
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
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
            <div className="glass-card rounded-2xl border border-border/60 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{roster.data.title}</h2>
                    <Badge variant="secondary">{roster.data.service_date}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checked-in roster: <strong className="text-foreground">{roster.data.attendees.length}</strong>{' '}
                    people · Auditorium headcount:{' '}
                    <strong className="text-foreground">{roster.data.headcount}</strong>
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
                      className="w-36"
                    />
                    <Button type="submit" variant="outline" loading={headcountMutation.isPending}>
                      Update Count
                    </Button>
                  </form>
                )}
              </div>

              {/* Quick Check-In Search */}
              {canRecord && (
                <div className="mt-5 rounded-xl border border-primary/20 bg-secondary/40 p-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary">
                    Quick Check-In from Directory
                  </label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={checkInSearch}
                      onChange={(e) => setCheckInSearch(e.target.value)}
                      placeholder="Type name or phone number to mark present…"
                      className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-4 text-sm text-foreground shadow-2xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {(searchPeople.data?.length ?? 0) > 0 && (
                    <div className="mt-2.5 divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
                      {searchPeople.data?.slice(0, 6).map((p) => {
                        const isPresent = checkedInIds.has(p.id)
                        return (
                          <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <div className="flex items-center gap-2.5">
                              <span className="font-semibold text-foreground">
                                {p.first_name} {p.last_name}
                              </span>
                              <Badge variant="secondary">{p.membership_status}</Badge>
                              {p.phone && <span className="text-xs text-muted-foreground">{p.phone}</span>}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={isPresent ? 'secondary' : 'primary'}
                              onClick={() => checkInMutation.mutate(p.id)}
                            >
                              {isPresent ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Present
                                </>
                              ) : (
                                'Check In'
                              )}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Checked-in Roster Table */}
              <div className="mt-6">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Checked-In Attendees ({roster.data.attendees.length})
                </h3>
                {roster.data.attendees.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No individual check-ins recorded for this service yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/60 bg-white/75">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border/60 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Standing</th>
                          <th className="px-4 py-3">Source</th>
                          {canRecord && <th className="px-4 py-3 text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {roster.data.attendees.map((a) => (
                          <tr key={a.attendance_id} className="transition-colors hover:bg-secondary/35">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>
                                  {a.first_name} {a.last_name}
                                </span>
                                {a.is_first_visit && (
                                  <Badge variant="warning">
                                    <Sparkles className="h-3 w-3" />
                                    First Visit
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{a.membership_status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{a.source}</td>
                            {canRecord && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeCheckInMutation.mutate(a.person_id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
