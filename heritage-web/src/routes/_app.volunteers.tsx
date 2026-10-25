import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  Award,
  HeartHandshake,
  Lock,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type VolunteerApplicationItem,
  type VolunteerStatusResponse,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Volunteer Placement & Workforce Probation (HOF-021).
 * - Member Dashboard / Self service: Module 2 completion unlocks department selection (`HOF-021-S01`)
 * - Membership Team Management: Reviewers place candidates on probation in Choir/Media/Ushering (`HOF-021-S02`)
 * - Probation Completion: Elevates service standing to WORK_FORCE (`HOF-021-S03`)
 */
export const Route = createFileRoute('/_app/volunteers')({
  component: VolunteersPage,
})

const STANDARD_DEPARTMENTS = [
  'Choir & Worship Ministry',
  'Media, Sound & Technical',
  'Ushering & Protocol',
  'Children Ministry & Sunday School',
  'Hospitality & Welfare',
  'Prayer & Intercession',
  'Evangelism & Community Outreach',
]

function VolunteersPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canManage = hasCapability(me, 'volunteers.manage')

  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'self' | 'management'>(canManage ? 'management' : 'self')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  const statusQuery = useQuery({
    queryKey: ['volunteer-status', me?.person_id],
    queryFn: () => api<VolunteerStatusResponse>('/volunteers/status'),
  })

  const applicationsQuery = useQuery({
    queryKey: ['volunteer-applications'],
    enabled: canManage,
    queryFn: () => api<VolunteerApplicationItem[]>('/volunteers/applications'),
  })

  const submitPreferencesMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/volunteers/preferences', { method: 'POST', body }),
    onSuccess: async () => {
      setBanner({
        tone: 'success',
        text: 'Department preferences submitted! The Membership Team will review your application.',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volunteer-status'] }),
        queryClient.invalidateQueries({ queryKey: ['volunteer-applications'] }),
      ])
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not submit volunteer preferences.',
      }),
  })

  const placeMutation = useMutation({
    mutationFn: ({
      appId,
      placed_department,
      review_notes,
    }: {
      appId: string
      placed_department: string
      review_notes?: string
    }) =>
      api(`/volunteers/applications/${appId}/place-probationary`, {
        method: 'POST',
        body: { placed_department, review_notes },
      }),
    onSuccess: async () => {
      setSelectedAppId(null)
      setBanner({
        tone: 'success',
        text: 'Candidate placed on probation in department.',
      })
      await queryClient.invalidateQueries({ queryKey: ['volunteer-applications'] })
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not place candidate on probation.',
      }),
  })

  const completeMutation = useMutation({
    mutationFn: ({ appId, completion_notes }: { appId: string; completion_notes?: string }) =>
      api(`/volunteers/applications/${appId}/complete-probation`, {
        method: 'POST',
        body: { completion_notes },
      }),
    onSuccess: async () => {
      setSelectedAppId(null)
      setBanner({
        tone: 'success',
        text: 'Probation completed! Member elevated to full Workforce (WORK_FORCE) standing.',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volunteer-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
      ])
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not complete probation.',
      }),
  })

  function onSubmitPreferences(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    submitPreferencesMutation.mutate({
      primary_department: form.get('primary_department'),
      secondary_department: form.get('secondary_department'),
      skills: form.get('skills') || undefined,
      availability: form.get('availability') || undefined,
    })
  }

  const volStatus = statusQuery.data

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Membership · Ministry Placement"
        badgeIcon={<HeartHandshake className="h-3.5 w-3.5" />}
        title="Volunteer Placement & Workforce Probation"
        subtitle="Rank department preferences after Discipleship Class, track probationary service, and elevate verified volunteers to full workforce standing."
        actions={
          canManage ? (
            <div className="flex rounded-xl border border-border/70 bg-white/80 p-1 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('management')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'management'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Applications Queue
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('self')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'self'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Department Preferences
              </button>
            </div>
          ) : undefined
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {/* View 1: Self Service / Member Application */}
      {(!canManage || activeTab === 'self') && (
        <div className="glass-card rounded-2xl border border-border/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Volunteer Ministry Selection (HOF-021-S01)</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Members who have graduated Foundation Class can rank 2 ministry departments to begin serving.
              </p>
            </div>
            {volStatus?.is_unlocked ? (
              <Badge variant="success">
                <Sparkles className="h-3.5 w-3.5" />
                Unlocked for Placement
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Lock className="h-3.5 w-3.5" />
                Complete Foundation Class to Unlock
              </Badge>
            )}
          </div>

          {!volStatus?.is_unlocked ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground">Ministry placement unlocks after Foundation Class</p>
              <p className="mt-1 text-xs">
                Attend your 6 discipleship sessions to graduate and unlock department preference selection.
              </p>
            </div>
          ) : volStatus.active_application ? (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">Active Ministry Application</h3>
                <Badge
                  variant={
                    volStatus.active_application.status === 'PLACED'
                      ? 'success'
                      : volStatus.active_application.status === 'PROBATIONARY'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {volStatus.active_application.status}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <p>
                  <strong className="text-foreground">1st Preference:</strong>{' '}
                  {volStatus.active_application.primary_department}
                </p>
                <p>
                  <strong className="text-foreground">2nd Preference:</strong>{' '}
                  {volStatus.active_application.secondary_department}
                </p>
                {volStatus.active_application.placed_department && (
                  <p className="sm:col-span-2 text-emerald-800 font-semibold">
                    Placed Department: {volStatus.active_application.placed_department}
                  </p>
                )}
                {volStatus.active_application.skills && (
                  <p className="sm:col-span-2 text-muted-foreground">
                    Skills: {volStatus.active_application.skills}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmitPreferences} className="mt-6 space-y-4 max-w-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">1st Department Choice</label>
                  <select
                    name="primary_department"
                    required
                    defaultValue=""
                    className="h-11 rounded-xl border border-input bg-white px-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                  >
                    <option value="" disabled>
                      Select primary department…
                    </option>
                    {STANDARD_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">2nd Department Choice</label>
                  <select
                    name="secondary_department"
                    required
                    defaultValue=""
                    className="h-11 rounded-xl border border-input bg-white px-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                  >
                    <option value="" disabled>
                      Select secondary department…
                    </option>
                    {STANDARD_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Field
                label="Relevant Skills & Experience"
                name="skills"
                placeholder="E.g. Singing, guitar, graphic design, sound mixing, teaching kids…"
              />

              <Field
                label="Service Availability"
                name="availability"
                placeholder="E.g. Sunday 1st Service, Midweek Wednesday, Saturday rehearsals…"
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={submitPreferencesMutation.isPending}>
                  <Send className="h-4 w-4" />
                  Submit Department Preferences
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* View 2: Membership Team Placement Queue */}
      {canManage && activeTab === 'management' && (
        <div className="glass-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Volunteer Applications & Probation Management
              </h2>
              <p className="text-xs text-muted-foreground">
                Review submitted ministry preferences, assign probationary placement, and graduate members to the full
                workforce.
              </p>
            </div>
            <Badge variant="outline">{(applicationsQuery.data ?? []).length} applicants</Badge>
          </div>

          <div className="mt-4 space-y-4">
            {(applicationsQuery.data?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No volunteer applications submitted yet.
              </div>
            ) : (
              (applicationsQuery.data ?? []).map((app) => {
                const isSelected = selectedAppId === app.id
                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-border/60 bg-white/80 p-4 transition-all hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">
                            {app.person.first_name} {app.person.last_name}
                          </span>
                          <Badge variant="outline">{app.person.membership_status}</Badge>
                          <Badge
                            variant={
                              app.status === 'PLACED'
                                ? 'success'
                                : app.status === 'PROBATIONARY'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {app.status}
                          </Badge>
                        </div>

                        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 text-muted-foreground">
                          <p>
                            <strong className="text-foreground">Primary:</strong> {app.primary_department}
                          </p>
                          <p>
                            <strong className="text-foreground">Secondary:</strong> {app.secondary_department}
                          </p>
                          {app.placed_department && (
                            <p className="sm:col-span-2 text-emerald-800 font-semibold">
                              Assigned to: {app.placed_department}
                            </p>
                          )}
                          {app.skills && (
                            <p className="sm:col-span-2 italic">&ldquo;{app.skills}&rdquo;</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {app.status === 'SUBMITTED' && (
                          <Button
                            size="sm"
                            variant={isSelected ? 'ghost' : 'primary'}
                            onClick={() => setSelectedAppId(isSelected ? null : app.id)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {isSelected ? 'Cancel' : 'Place on Probation'}
                          </Button>
                        )}

                        {app.status === 'PROBATIONARY' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => completeMutation.mutate({ appId: app.id })}
                            loading={completeMutation.isPending}
                          >
                            <Award className="h-3.5 w-3.5" />
                            Complete Probation → Elevate to Workforce
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Place on Probation Form Drawer */}
                    {isSelected && app.status === 'SUBMITTED' && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const form = new FormData(e.currentTarget)
                          placeMutation.mutate({
                            appId: app.id,
                            placed_department: String(form.get('placed_department') || ''),
                            review_notes: String(form.get('review_notes') || '') || undefined,
                          })
                        }}
                        className="mt-4 space-y-3 rounded-xl border border-primary/25 bg-secondary/40 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground">
                              Confirm Probationary Department
                            </label>
                            <select
                              name="placed_department"
                              required
                              defaultValue={app.primary_department}
                              className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                            >
                              <option value={app.primary_department}>
                                1st Choice: {app.primary_department}
                              </option>
                              <option value={app.secondary_department}>
                                2nd Choice: {app.secondary_department}
                              </option>
                              {STANDARD_DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </div>

                          <Field
                            label="Reviewer Notes / Term"
                            name="review_notes"
                            placeholder="E.g. Placed on 4-week probation with Choir Director."
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" size="sm" loading={placeMutation.isPending}>
                            Confirm Probationary Placement
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
