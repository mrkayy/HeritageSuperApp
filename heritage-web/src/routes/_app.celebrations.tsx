import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  Award,
  BellRing,
  Cake,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  GraduationCap,
  Heart,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type CelebrationContactChannel,
  type CelebrationKind,
  type CelebrationsOverview,
  type DirectoryPerson,
  type LandmarkApprovalStatus,
  type LandmarkCategory,
  type LandmarkPublicationPreference,
  type LeapDayPolicy,
  type LifeLandmarkItem,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * HOF-022: Birthdays, Anniversaries & Life Landmarks
 * - @HOF-022-S01: Proactive 3-day celebration reminder engine (crosses Dec -> Jan year boundary idempotently; no birth year required or invented)
 * - @HOF-022-S02: Explicit Leap-Day (`FEB_28` vs `MAR_01`) and Church Timezone (`Africa/Lagos`) policy
 * - @HOF-022-S03: Life Landmarks & Academic Graduation Tracker with separate recording vs Public Bulletin publication approval
 * - @HOF-022-S04: Celebration contact logging & 1-click Greeting Email dispatch with idempotency protection
 */
export const Route = createFileRoute('/_app/celebrations')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'celebrations.read') && !hasCapability(me, 'people.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: CelebrationsPage,
})

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const LANDMARK_CATEGORY_LABELS: Record<LandmarkCategory, string> = {
  GRADUATION: 'Academic Graduation',
  WEDDING: 'Wedding / Marriage',
  BABY_DEDICATION: 'Child / Baby Dedication',
  CAREER_MILESTONE: 'Career / Professional Milestone',
  OTHER: 'Family Milestone',
}

function CelebrationsPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()

  const canContact = hasCapability(me, 'celebrations.contact')
  const canWriteLandmark = hasCapability(me, 'landmarks.write')
  const canApproveLandmark = hasCapability(me, 'landmarks.approve')

  const [activeTab, setActiveTab] = useState<'alerts' | 'monthly' | 'landmarks' | 'bulletin'>('alerts')
  const [leapDayPolicy, setLeapDayPolicy] = useState<LeapDayPolicy>('FEB_28')
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1)
  const [localDateOverride, setLocalDateOverride] = useState<string>('')

  const [activeContactTarget, setActiveContactTarget] = useState<{
    personId: string
    name: string
    email: string | null
    phone: string | null
    kind: CelebrationKind
    celebrationYear: number
  } | null>(null)

  const [showLandmarkForm, setShowLandmarkForm] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const overview = useQuery({
    queryKey: ['celebrations-overview', leapDayPolicy, selectedMonth, localDateOverride],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('leap_day_policy', leapDayPolicy)
      params.set('month', String(selectedMonth))
      if (localDateOverride.trim()) {
        params.set('local_date', localDateOverride.trim())
      }
      return api<CelebrationsOverview>(`/celebrations?${params.toString()}`)
    },
  })

  const landmarks = useQuery({
    queryKey: ['celebrations-landmarks'],
    queryFn: () => api<LifeLandmarkItem[]>('/celebrations/landmarks'),
  })

  const bulletin = useQuery({
    queryKey: ['celebrations-bulletin'],
    queryFn: () => api<LifeLandmarkItem[]>('/celebrations/landmarks/bulletin'),
  })

  const peopleDirectory = useQuery({
    queryKey: ['directory', '', ''],
    enabled: showLandmarkForm,
    queryFn: () => api<DirectoryPerson[]>('/people'),
  })

  const evaluateMutation = useMutation({
    mutationFn: () =>
      api('/celebrations/evaluate', {
        method: 'POST',
        body: {
          local_date: localDateOverride.trim() || undefined,
          leap_day_policy: leapDayPolicy,
          timezone: 'Africa/Lagos',
          window_days: 3,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['celebrations-overview'] })
      setBanner({
        tone: 'success',
        text: 'Proactive 3-day celebration scheduler evaluated idempotently (no duplicate reminders created).',
      })
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not evaluate celebration reminders.',
      }),
  })

  const contactMutation = useMutation({
    mutationFn: (payload: {
      person_id: string
      kind: CelebrationKind
      celebration_year: number
      channel: CelebrationContactChannel
      outcome?: string
      note?: string
      idempotency_key: string
    }) =>
      api<{
        id: string
        duplicate: boolean
        delivery_status: string | null
        channel: CelebrationContactChannel
      }>('/celebrations/contacts', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (res) => {
      setActiveContactTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['celebrations-overview'] })
      if (res.duplicate) {
        setBanner({
          tone: 'info',
          text: 'This celebration greeting/contact was already recorded for this occurrence (duplicate click prevented).',
        })
      } else if (res.channel === 'EMAIL_GREETING') {
        setBanner({
          tone: res.delivery_status === 'SENT' ? 'success' : 'info',
          text:
            res.delivery_status === 'SENT'
              ? 'Celebration greeting email delivered via Resend and linked to this celebration.'
              : 'Celebration greeting logged (email delivery skipped/failed; check RESEND_API_KEY).',
        })
      } else {
        setBanner({
          tone: 'success',
          text: 'Celebration contact logged and linked to the celebration.',
        })
      }
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not record celebration contact.',
      }),
  })

  const createLandmarkMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<LifeLandmarkItem>('/celebrations/landmarks', {
        method: 'POST',
        body,
      }),
    onSuccess: async (created) => {
      setShowLandmarkForm(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['celebrations-landmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['celebrations-bulletin'] }),
      ])
      setBanner({
        tone: 'success',
        text:
          created.publication_preference === 'ALLOW_BULLETIN'
            ? 'Life landmark recorded on profile. It awaits leadership approval before entering the public bulletin.'
            : 'Private life landmark recorded on member profile.',
      })
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not record life landmark.',
      }),
  })

  const reviewLandmarkMutation = useMutation({
    mutationFn: ({
      landmarkId,
      body,
    }: {
      landmarkId: string
      body: {
        publication_preference?: LandmarkPublicationPreference
        approval_status?: LandmarkApprovalStatus
        review_note?: string | null
      }
    }) =>
      api<LifeLandmarkItem>(`/celebrations/landmarks/${landmarkId}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['celebrations-landmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['celebrations-bulletin'] }),
      ])
      setBanner({
        tone: 'success',
        text: updated.in_public_bulletin
          ? `Landmark "${updated.title}" approved and published to the church bulletin.`
          : `Landmark "${updated.title}" updated (${updated.approval_status} · ${updated.publication_preference}).`,
      })
    },
    onError: (err) =>
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Could not update landmark status.',
      }),
  })

  function onLogContactSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeContactTarget) return
    const form = new FormData(e.currentTarget)
    const channel = form.get('channel') as CelebrationContactChannel
    const note = String(form.get('note') ?? '').trim()
    const outcome = String(form.get('outcome') ?? '').trim()

    contactMutation.mutate({
      person_id: activeContactTarget.personId,
      kind: activeContactTarget.kind,
      celebration_year: activeContactTarget.celebrationYear,
      channel,
      outcome: outcome || undefined,
      note: note || undefined,
      idempotency_key: `celebration:${activeContactTarget.personId}:${activeContactTarget.kind}:${activeContactTarget.celebrationYear}:${channel}`,
    })
  }

  function onCreateLandmarkSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    createLandmarkMutation.mutate({
      person_id: form.get('person_id'),
      category: form.get('category') as LandmarkCategory,
      title: form.get('title'),
      description: form.get('description') || null,
      occurred_on: form.get('occurred_on') || null,
      publication_preference: form.get('publication_preference') as LandmarkPublicationPreference,
    })
  }

  const remindersCount = overview.data?.reminders.length ?? 0
  const monthlyCount = overview.data?.monthly_celebrations.length ?? 0
  const landmarksCount = landmarks.data?.length ?? 0
  const bulletinCount = bulletin.data?.length ?? 0

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Membership & Care · HOF-022"
        badgeIcon={<Sparkles className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            Timezone: {overview.data?.timezone ?? 'Africa/Lagos'} · Leap Policy:{' '}
            {leapDayPolicy === 'FEB_28' ? 'Feb 28' : 'Mar 1'}
          </Badge>
        }
        title="Birthdays, Anniversaries & Life Landmarks"
        subtitle="Proactive 3-day celebration alert engine, idempotent greeting/call logging, and member life landmarks with separate bulletin approval."
        actions={
          <>
            {canWriteLandmark && (
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('landmarks')
                  setShowLandmarkForm((v) => !v)
                }}
              >
                {showLandmarkForm ? (
                  <>
                    <X className="h-4 w-4" /> Close Landmark Form
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Record Life Landmark
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => evaluateMutation.mutate()}
              loading={evaluateMutation.isPending}
              title="Run daily 3-day celebration scheduler evaluation"
            >
              <RefreshCw className="h-4 w-4" />
              Run 3-Day Alert Check
            </Button>
          </>
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {/* Policy & Navigation Bar */}
      <div className="glass-card flex flex-col gap-3 rounded-2xl border border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'alerts'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-border/70 bg-white/70 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            <BellRing className="h-3.5 w-3.5" />
            Proactive 3-Day Alerts ({remindersCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'monthly'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-border/70 bg-white/70 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            <Cake className="h-3.5 w-3.5" />
            Monthly Calendar ({monthlyCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('landmarks')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'landmarks'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-border/70 bg-white/70 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Life Landmarks ({landmarksCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulletin')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'bulletin'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-border/70 bg-white/70 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Approved Bulletin ({bulletinCount})
          </button>
        </div>

        {/* Leap-day & Evaluation Date Controls (HOF-022-S01 / S02) */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Feb 29 Policy:</span>
            <select
              aria-label="Leap-day observation policy"
              value={leapDayPolicy}
              onChange={(e) => setLeapDayPolicy(e.target.value as LeapDayPolicy)}
              className="h-9 rounded-xl border border-input bg-white/90 px-2.5 text-xs font-semibold text-foreground shadow-2xs outline-none focus:border-primary"
            >
              <option value="FEB_28">Observe Feb 28 (Non-Leap Year)</option>
              <option value="MAR_01">Observe Mar 1 (Non-Leap Year)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Eval Date:</span>
            <input
              type="date"
              aria-label="Local evaluation date"
              value={localDateOverride || overview.data?.local_date || ''}
              onChange={(e) => setLocalDateOverride(e.target.value)}
              className="h-9 rounded-xl border border-input bg-white/90 px-2.5 text-xs font-medium text-foreground shadow-2xs outline-none focus:border-primary"
            />
            {localDateOverride && (
              <button
                type="button"
                onClick={() => setLocalDateOverride('')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Reset to Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Celebration Contact / Greeting Modal Card (HOF-022-S04) */}
      {activeContactTarget && canContact && (
        <form
          onSubmit={onLogContactSubmit}
          className="glass-card space-y-4 rounded-2xl border border-primary/35 p-6 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {activeContactTarget.kind === 'BIRTHDAY' ? 'Birthday Celebration' : 'Wedding Anniversary'} ·{' '}
                  {activeContactTarget.celebrationYear}
                </Badge>
                <span className="text-xs text-muted-foreground">Idempotent Delivery Protection</span>
              </div>
              <h2 className="mt-1 text-base font-bold text-foreground">
                Celebrate {activeContactTarget.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveContactTarget(null)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Contact / Greeting Channel</label>
              <select
                name="channel"
                defaultValue={activeContactTarget.email ? 'EMAIL_GREETING' : 'CALL'}
                className="h-11 rounded-xl border border-input bg-white px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
              >
                <option value="EMAIL_GREETING" disabled={!activeContactTarget.email}>
                  Send Official Celebration Email ({activeContactTarget.email ?? 'No email on file'})
                </option>
                <option value="CALL">Phone Call ({activeContactTarget.phone ?? 'Log call'})</option>
                <option value="WHATSAPP_SMS">WhatsApp / SMS Greeting</option>
                <option value="IN_PERSON">In-Person Blessing / Card</option>
              </select>
            </div>

            <Field
              label="Outcome Summary"
              name="outcome"
              placeholder="e.g. Spoke & prayed with celebrant / Sent greeting"
              defaultValue="REACHED"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Personal Blessing / Call Note (included in email if sending greeting)
            </label>
            <textarea
              name="note"
              rows={2}
              placeholder="Write a warm pastoral blessing or summary of the call…"
              className="rounded-xl border border-input bg-white p-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setActiveContactTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={contactMutation.isPending}>
              <Send className="h-4 w-4" />
              Record &amp; Send Celebration Greeting
            </Button>
          </div>
        </form>
      )}

      {/* Create Life Landmark Form (HOF-022-S03) */}
      {showLandmarkForm && canWriteLandmark && (
        <form
          onSubmit={onCreateLandmarkSubmit}
          className="glass-card grid gap-4 rounded-2xl border border-border/60 p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Record Member Life Landmark or Graduation
              </h2>
              <p className="text-xs text-muted-foreground">
                Landmarks are immediately visible to authorized internal stewards, and enter the public bulletin only when both member preference and leadership approval are granted.
              </p>
            </div>
            <Badge variant="purple">HOF-022-S03</Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Member / Person</label>
            <select
              name="person_id"
              required
              className="h-11 rounded-xl border border-input bg-white/90 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
            >
              <option value="">Select person from directory…</option>
              {(peopleDirectory.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.membership_status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Landmark Category</label>
            <select
              name="category"
              defaultValue="GRADUATION"
              className="h-11 rounded-xl border border-input bg-white/90 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
            >
              {(Object.entries(LANDMARK_CATEGORY_LABELS) as [LandmarkCategory, string][]).map(
                ([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          <Field
            label="Landmark Title / Degree / Milestone"
            name="title"
            placeholder="e.g. B.Sc. Computer Science (First Class Honours)"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Milestone Date (optional)" name="occurred_on" type="date" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Publication Preference</label>
              <select
                name="publication_preference"
                defaultValue="ALLOW_BULLETIN"
                className="h-11 rounded-xl border border-input bg-white/90 px-3 text-xs font-semibold text-foreground shadow-2xs outline-none focus:border-primary"
              >
                <option value="ALLOW_BULLETIN">Allow Church Bulletin (Requires Approval)</option>
                <option value="PRIVATE">Private (Internal Pastoral / Care View Only)</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Notes / Details (optional)</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Institution, family note, or thanksgiving testimony…"
              className="rounded-xl border border-input bg-white/90 p-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowLandmarkForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createLandmarkMutation.isPending}>
              <Award className="h-4 w-4" />
              Save Life Landmark
            </Button>
          </div>
        </form>
      )}

      {/* TAB 1: Proactive 3-Day Celebration Reminders (HOF-022-S01 & S02) */}
      {activeTab === 'alerts' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Upcoming Celebrations (Next 3 Days from {overview.data?.local_date ?? 'Today'})
              </h2>
              <p className="text-xs text-muted-foreground">
                Evaluates birthdays and wedding anniversaries across year boundaries without requiring or inventing birth years.
              </p>
            </div>
          </div>

          {overview.isPending ? (
            <div className="glass-card rounded-2xl border border-border/60 p-10 text-center text-sm text-muted-foreground">
              Evaluating 3-day celebration window…
            </div>
          ) : remindersCount === 0 ? (
            <div className="glass-card rounded-2xl border border-border/60 p-12 text-center">
              <Sparkles className="mx-auto h-9 w-9 text-primary/60" />
              <p className="mt-2.5 text-sm font-semibold text-foreground">
                No birthdays or anniversaries in the 3-day window from {overview.data?.local_date}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch to the Monthly Calendar tab to view all celebrations across the year, or test another evaluation date above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {overview.data?.reminders.map((r) => {
                const isBirthday = r.kind === 'BIRTHDAY'
                const isLeapAdjusted =
                  r.source_month === 2 &&
                  r.source_day === 29 &&
                  (r.observed_month !== 2 || r.observed_day !== 29)

                return (
                  <div
                    key={r.id}
                    className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 p-5 transition-all hover:border-primary/35"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${
                              isBirthday
                                ? 'bg-primary/10 text-primary'
                                : 'bg-pink-500/10 text-pink-600'
                            }`}
                          >
                            {isBirthday ? <Cake className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-foreground">
                                {r.person.first_name} {r.person.last_name}
                              </h3>
                              <Badge variant={isBirthday ? 'default' : 'purple'}>
                                {isBirthday ? 'Birthday' : 'Anniversary'}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Celebration Date:{' '}
                              <strong className="text-foreground">
                                {SHORT_MONTHS[r.source_month - 1]} {r.source_day}
                              </strong>{' '}
                              (Observed {r.observed_date})
                              {isLeapAdjusted && (
                                <span className="ml-1.5 text-amber-700 font-semibold">
                                  · Leap Policy ({r.leap_day_policy})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <Badge variant={r.days_until === 0 ? 'success' : 'warning'}>
                          {r.days_until === 0
                            ? '🎉 Today!'
                            : r.days_until === 1
                              ? 'Tomorrow'
                              : `In ${r.days_until} days`}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {r.person.phone && (
                          <a
                            href={`tel:${r.person.phone}`}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {r.person.phone}
                          </a>
                        )}
                        {r.person.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {r.person.email}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          Scheduler checks: {r.evaluation_count}
                        </span>
                      </div>

                      {r.contacts.length > 0 && (
                        <div className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Celebration Contact Logged ({r.contacts.length})
                          </div>
                          {r.contacts.map((c) => (
                            <p key={c.id} className="mt-0.5 text-[11px] text-emerald-800">
                              {c.channel} · {c.outcome}
                              {c.note ? ` — "${c.note}"` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {canContact && (
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                        <Button
                          size="sm"
                          variant={r.contacts.length > 0 ? 'outline' : 'primary'}
                          onClick={() =>
                            setActiveContactTarget({
                              personId: r.person_id,
                              name: `${r.person.first_name} ${r.person.last_name}`,
                              email: r.person.email,
                              phone: r.person.phone,
                              kind: r.kind,
                              celebrationYear: r.celebration_year,
                            })
                          }
                        >
                          <Send className="h-3.5 w-3.5" />
                          {r.contacts.length > 0 ? 'Log Another / Resend' : 'Send Greeting / Log Call'}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Monthly Celebrations Calendar */}
      {activeTab === 'monthly' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map((mName, idx) => {
                const mNum = idx + 1
                const active = selectedMonth === mNum
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => setSelectedMonth(mNum)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'border border-border/70 bg-white/75 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {SHORT_MONTHS[idx]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="glass-card overflow-hidden rounded-2xl border border-border/60">
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  {MONTHS[selectedMonth - 1]} Celebrations ({monthlyCount})
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Partial dates (month &amp; day) without fabricated birth year
              </span>
            </div>

            {monthlyCount === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No birthdays or anniversaries recorded for {MONTHS[selectedMonth - 1]}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/60 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Celebrant</th>
                      <th className="px-5 py-3.5">Celebration</th>
                      <th className="px-5 py-3.5">Contact</th>
                      <th className="px-5 py-3.5">Greeting Status</th>
                      {canContact && <th className="px-5 py-3.5 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {overview.data?.monthly_celebrations.map((item) => (
                      <tr
                        key={`${item.person_id}-${item.kind}`}
                        className="transition-colors hover:bg-secondary/35"
                      >
                        <td className="px-5 py-3.5 font-bold text-primary">
                          {SHORT_MONTHS[item.month - 1]} {item.day}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-foreground">
                          {item.first_name} {item.last_name}{' '}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({item.membership_status})
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={item.kind === 'BIRTHDAY' ? 'default' : 'purple'}>
                            {item.kind === 'BIRTHDAY' ? (
                              <>
                                <Cake className="h-3 w-3" /> Birthday
                              </>
                            ) : (
                              <>
                                <Heart className="h-3 w-3" /> Anniversary
                              </>
                            )}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {item.phone && <div className="font-medium text-foreground">{item.phone}</div>}
                          {item.email && <div>{item.email}</div>}
                        </td>
                        <td className="px-5 py-3.5">
                          {item.contacts_count > 0 ? (
                            <Badge variant="success">
                              <CheckCircle2 className="h-3 w-3" /> Contacted ({item.contacts_count})
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending Greeting</Badge>
                          )}
                        </td>
                        {canContact && (
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant={item.contacts_count > 0 ? 'outline' : 'primary'}
                              onClick={() =>
                                setActiveContactTarget({
                                  personId: item.person_id,
                                  name: `${item.first_name} ${item.last_name}`,
                                  email: item.email,
                                  phone: item.phone,
                                  kind: item.kind,
                                  celebrationYear: item.celebration_year,
                                })
                              }
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              {item.contacts_count > 0 ? 'Contacted' : 'Celebrate'}
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: Life Landmarks & Bulletin Approval Queue (HOF-022-S03) */}
      {activeTab === 'landmarks' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Life Landmarks &amp; Academic Graduation Tracker
              </h2>
              <p className="text-xs text-muted-foreground">
                Internal directory of graduations and family milestones. Bulletin publication requires both{' '}
                <code>ALLOW_BULLETIN</code> preference and leadership approval.
              </p>
            </div>
          </div>

          {landmarksCount === 0 ? (
            <div className="glass-card rounded-2xl border border-border/60 p-12 text-center">
              <GraduationCap className="mx-auto h-9 w-9 text-primary/60" />
              <p className="mt-2.5 text-sm font-semibold text-foreground">
                No life landmarks recorded yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use &ldquo;Record Life Landmark&rdquo; above to log a member&rsquo;s academic graduation, baby dedication, or family milestone.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {landmarks.data?.map((l) => (
                <div
                  key={l.id}
                  className="glass-card flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 p-5"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{LANDMARK_CATEGORY_LABELS[l.category]}</Badge>
                      <h3 className="text-base font-bold text-foreground">{l.title}</h3>
                      <span className="text-xs font-medium text-muted-foreground">
                        · {l.person.first_name} {l.person.last_name}
                      </span>
                    </div>

                    {l.description && <p className="text-xs text-foreground/90">{l.description}</p>}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {l.occurred_on && (
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3" /> {l.occurred_on}
                        </Badge>
                      )}
                      <Badge
                        variant={l.publication_preference === 'ALLOW_BULLETIN' ? 'secondary' : 'outline'}
                      >
                        {l.publication_preference === 'ALLOW_BULLETIN' ? (
                          <>
                            <Globe className="h-3 w-3" /> Prefers Bulletin
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Private Only
                          </>
                        )}
                      </Badge>
                      <Badge
                        variant={
                          l.approval_status === 'APPROVED'
                            ? 'success'
                            : l.approval_status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        Approval: {l.approval_status}
                      </Badge>
                      {l.in_public_bulletin && (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3" /> Live in Public Bulletin
                        </Badge>
                      )}
                    </div>
                  </div>

                  {canApproveLandmark && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Publication preference for ${l.title}`}
                        value={l.publication_preference}
                        onChange={(e) =>
                          reviewLandmarkMutation.mutate({
                            landmarkId: l.id,
                            body: {
                              publication_preference: e.target.value as LandmarkPublicationPreference,
                            },
                          })
                        }
                        className="h-9 rounded-xl border border-input bg-white px-2.5 text-xs font-semibold text-foreground"
                      >
                        <option value="ALLOW_BULLETIN">Pref: Allow Bulletin</option>
                        <option value="PRIVATE">Pref: Private</option>
                      </select>

                      {l.publication_preference === 'ALLOW_BULLETIN' && l.approval_status !== 'APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            reviewLandmarkMutation.mutate({
                              landmarkId: l.id,
                              body: { approval_status: 'APPROVED' },
                            })
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve for Bulletin
                        </Button>
                      )}

                      {l.approval_status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            reviewLandmarkMutation.mutate({
                              landmarkId: l.id,
                              body: { approval_status: 'PENDING' },
                            })
                          }
                        >
                          Unpublish
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Public Church Bulletin Feed (HOF-022-S03) */}
      {activeTab === 'bulletin' && (
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-base font-bold text-foreground">
              Approved Church Bulletin Landmarks ({bulletinCount})
            </h2>
            <p className="text-xs text-muted-foreground">
              Only milestones where the member opted into bulletin publication AND leadership approved are published here.
            </p>
          </div>

          {bulletinCount === 0 ? (
            <div className="glass-card rounded-2xl border border-border/60 p-12 text-center text-sm text-muted-foreground">
              No landmarks are currently published in the public bulletin.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {bulletin.data?.map((b) => (
                <div
                  key={b.id}
                  className="glass-card rounded-2xl border border-emerald-500/30 p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="success">
                      <Award className="h-3 w-3" /> {LANDMARK_CATEGORY_LABELS[b.category]}
                    </Badge>
                    {b.occurred_on && (
                      <span className="text-xs text-muted-foreground">{b.occurred_on}</span>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-base font-bold text-foreground">
                    {b.person.first_name} {b.person.last_name} — {b.title}
                  </h3>
                  {b.description && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
