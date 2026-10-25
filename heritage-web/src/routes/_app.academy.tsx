import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  History,
  Layers,
  Plus,
  School,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type AcademyCohortItem,
  type AcademyEnrollmentItem,
  type AcademyModuleCode,
  type DirectoryPerson,
  type DiscipleshipPipeline,
  type JourneyTransitionItem,
  type Steward,
  type SundaySchoolStats,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Foundation Class & Membership Academy Workspace (HOF-018, HOF-019, HOF-020).
 * - Note: Foundation Class recommendations remain exclusively with the Information Center (`/attendance`).
 * - Here in the Membership Team / Academy workspace, coordinators and assigned teachers:
 *   - Schedule 6-session cohorts & assign teachers (`HOF-019-S01`)
 *   - Enroll eligible/recommended candidates or record prerequisite overrides (`HOF-019-S02`)
 *   - Track 6-session progress & grade the 6-part assessment rubric (`HOF-020-S01`)
 *   - Evaluate attendance-gated graduation (0–3 retake, 4–5 coordinator makeup decision, 6 eligible) (`HOF-020-S02`)
 *   - Graduate once idempotently and inspect Journey History (`HOF-020-S03`, `HOF-018-S02`)
 */
export const Route = createFileRoute('/_app/academy')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'academy.read') && !hasCapability(me, 'self.journey.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AcademyPage,
})

const RUBRIC_PARTS = [
  { index: 0, label: 'Part 1: Salvation & Doctrine', max: 20 },
  { index: 1, label: 'Part 2: Word & Prayer Life', max: 20 },
  { index: 2, label: 'Part 3: Kingdom Character', max: 20 },
  { index: 3, label: 'Part 4: Church Covenant', max: 20 },
  { index: 4, label: 'Part 5: Class Participation', max: 10 },
  { index: 5, label: 'Part 6: Final Review', max: 10 },
] as const

const ELIGIBILITY_BADGE: Record<
  AcademyEnrollmentItem['graduation_eligibility'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' }
> = {
  eligible: { label: 'Eligible to Graduate', variant: 'success' },
  coordinator_makeup_decision_required: { label: 'Makeup Decision Required (4–5 Sessions)', variant: 'warning' },
  retake_required: { label: 'Retake Required (≤3 Sessions)', variant: 'danger' },
  score_below_passing: { label: 'Score Below 50/100', variant: 'danger' },
  incomplete_assessment: { label: 'Ungraded Rubric', variant: 'secondary' },
}

const MODULE_FILTER_OPTIONS = [
  { key: 'ALL', label: 'All Modules' },
  { key: 'SUNDAY_SCHOOL', label: 'Sunday School (SS1–3)' },
  { key: 'FOUNDATION_101', label: 'Foundation Class (101)' },
  { key: 'SUNDAY_SCHOOL_101', label: 'Sunday School 1' },
  { key: 'SUNDAY_SCHOOL_102', label: 'Sunday School 2' },
  { key: 'SUNDAY_SCHOOL_103', label: 'Sunday School 3' },
  { key: 'MEMBERSHIP_201', label: 'Membership Maturity (201)' },
] as const

function getModuleBadge(code: AcademyModuleCode) {
  switch (code) {
    case 'FOUNDATION_101':
      return <Badge variant="default">Foundation 101</Badge>
    case 'SUNDAY_SCHOOL_101':
      return (
        <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 border border-cyan-500/30">
          Sunday School 1
        </span>
      )
    case 'SUNDAY_SCHOOL_102':
      return (
        <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-500/30">
          Sunday School 2
        </span>
      )
    case 'SUNDAY_SCHOOL_103':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-500/30">
          Sunday School 3
        </span>
      )
    case 'MEMBERSHIP_201':
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-500/30">
          Membership 201
        </span>
      )
    default:
      return <Badge variant="outline">{code}</Badge>
  }
}

function AcademyPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canReadCohortWorkspace = hasCapability(me, 'academy.read')
  const canManageAcademy = hasCapability(me, 'academy.manage')

  const [selectedCohortId, setSelectedCohortId] = useState<string>('')
  const [moduleFilter, setModuleFilter] = useState<string>('ALL')
  const [showNewCohortForm, setShowNewCohortForm] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [editingGradesId, setEditingGradesId] = useState<string | null>(null)
  const [makeupDecisionId, setMakeupDecisionId] = useState<string | null>(null)
  const [journeyPersonId, setJourneyPersonId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const cohorts = useQuery({
    queryKey: ['academy-cohorts'],
    enabled: canReadCohortWorkspace,
    queryFn: () => api<AcademyCohortItem[]>('/academy/cohorts'),
  })

  const pipeline = useQuery({
    queryKey: ['discipleship-pipeline'],
    enabled: canReadCohortWorkspace,
    queryFn: () => api<DiscipleshipPipeline>('/academy/pipeline'),
  })

  const sundaySchoolStats = useQuery({
    queryKey: ['sunday-school-stats'],
    enabled: canReadCohortWorkspace,
    queryFn: () => api<SundaySchoolStats>('/academy/sunday-school/stats'),
  })

  const myClasses = useQuery({
    queryKey: ['academy-my-classes'],
    queryFn: () =>
      api<
        (AcademyEnrollmentItem & {
          cohort_title: string
          cohort_starts_on: string
          sessions: { session_number: number; title: string; scheduled_on: string | null }[]
        })[]
      >('/academy/my-classes'),
  })

  const peopleList = useQuery({
    queryKey: ['directory-for-academy'],
    enabled: canManageAcademy,
    queryFn: () => api<DirectoryPerson[]>('/people'),
  })

  const stewardsList = useQuery({
    queryKey: ['stewards-for-academy'],
    enabled: canManageAcademy,
    queryFn: () => api<Steward[]>('/stewards'),
  })

  const journeyTimeline = useQuery({
    queryKey: ['journey-timeline', journeyPersonId],
    enabled: Boolean(journeyPersonId),
    queryFn: () => api<JourneyTransitionItem[]>(`/academy/journey/${journeyPersonId}`),
  })

  const filteredCohorts = (cohorts.data ?? []).filter((c) => {
    if (moduleFilter === 'ALL') return true
    if (moduleFilter === 'SUNDAY_SCHOOL') {
      return (
        c.module_code === 'SUNDAY_SCHOOL_101' ||
        c.module_code === 'SUNDAY_SCHOOL_102' ||
        c.module_code === 'SUNDAY_SCHOOL_103'
      )
    }
    return c.module_code === moduleFilter
  })

  const activeCohort =
    filteredCohorts.find((c) => c.id === selectedCohortId) ?? filteredCohorts[0] ?? null

  const createCohortMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ id: string }>('/academy/cohorts', { method: 'POST', body }),
    onSuccess: async (created) => {
      setShowNewCohortForm(false)
      setSelectedCohortId(created.id)
      setBanner({ tone: 'success', text: '6-session cohort scheduled.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academy-cohorts'] }),
        queryClient.invalidateQueries({ queryKey: ['discipleship-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['sunday-school-stats'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not create cohort.' }),
  })

  const enrollMutation = useMutation({
    mutationFn: ({ cohortId, body }: { cohortId: string; body: Record<string, unknown> }) =>
      api(`/academy/cohorts/${cohortId}/enrollments`, { method: 'POST', body }),
    onSuccess: async () => {
      setShowEnrollModal(false)
      setBanner({ tone: 'success', text: 'Student enrolled in cohort.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academy-cohorts'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Enrollment refused.' }),
  })

  const sessionMutation = useMutation({
    mutationFn: ({ enrollmentId, credited_sessions }: { enrollmentId: string; credited_sessions: number[] }) =>
      api(`/academy/enrollments/${enrollmentId}/sessions`, {
        method: 'PATCH',
        body: { credited_sessions },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academy-cohorts'] }),
        queryClient.invalidateQueries({ queryKey: ['discipleship-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['sunday-school-stats'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not update sessions.' }),
  })

  const gradeMutation = useMutation({
    mutationFn: ({ enrollmentId, scores }: { enrollmentId: string; scores: number[] }) =>
      api(`/academy/enrollments/${enrollmentId}/grades`, {
        method: 'PATCH',
        body: { scores },
      }),
    onSuccess: async () => {
      setEditingGradesId(null)
      setBanner({ tone: 'success', text: '6-part rubric scores saved.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academy-cohorts'] }),
        queryClient.invalidateQueries({ queryKey: ['discipleship-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['sunday-school-stats'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save rubric scores.' }),
  })

  const makeupMutation = useMutation({
    mutationFn: ({
      enrollmentId,
      approved,
      reason,
    }: {
      enrollmentId: string
      approved: boolean
      reason: string
    }) =>
      api(`/academy/enrollments/${enrollmentId}/makeup`, {
        method: 'POST',
        body: { approved, reason },
      }),
    onSuccess: async () => {
      setMakeupDecisionId(null)
      setBanner({ tone: 'success', text: 'Coordinator makeup decision recorded.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academy-cohorts'] }),
        queryClient.invalidateQueries({ queryKey: ['discipleship-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['sunday-school-stats'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save makeup decision.' }),
  })

  const graduateMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      api(`/academy/enrollments/${enrollmentId}/graduate`, { method: 'POST' }),
    onSuccess: async () => {
      setBanner({
        tone: 'success',
        text: 'Student graduated! Standing updated and journey transition recorded.',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academy-cohorts'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['followups'] }),
      ])
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Graduation requirements unmet.' }),
  })

  function onCreateCohort(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const teacherId = String(form.get('teacher_person_id') || '')
    createCohortMutation.mutate({
      module_code: form.get('module_code') as AcademyModuleCode,
      title: form.get('title'),
      starts_on: form.get('starts_on'),
      notes: form.get('notes') || undefined,
      teacher_person_ids: teacherId ? [teacherId] : [],
    })
  }

  function onEnrollStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeCohort) return
    const form = new FormData(e.currentTarget)
    enrollMutation.mutate({
      cohortId: activeCohort.id,
      body: {
        person_id: form.get('person_id'),
        prerequisite_override: form.get('prerequisite_override') === 'on',
        override_reason: String(form.get('override_reason') || '') || undefined,
      },
    })
  }

  function toggleSession(enrollment: AcademyEnrollmentItem, sessionNumber: number) {
    const current = new Set(enrollment.credited_sessions)
    if (current.has(sessionNumber)) {
      current.delete(sessionNumber)
    } else {
      current.add(sessionNumber)
    }
    sessionMutation.mutate({
      enrollmentId: enrollment.id,
      credited_sessions: [...current].sort((a, b) => a - b),
    })
  }

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Membership Team · Discipleship Academy & Sunday School"
        badgeIcon={<GraduationCap className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {(cohorts.data ?? []).length} cohorts
          </Badge>
        }
        title="Sunday School & Discipleship Academy"
        subtitle="Manage the 8-stage discipleship pipeline from Foundation Class through Sunday School Modules 1, 2, 3 to Membership Maturity. Grade continuous assessment rubrics and certify stage progression."
        actions={
          canManageAcademy ? (
            <Button onClick={() => setShowNewCohortForm((v) => !v)}>
              {showNewCohortForm ? (
                <>
                  <X className="h-4 w-4" /> Close
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Schedule 6-Session Cohort
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {/* 8-Stage Discipleship Growth Pipeline Overview */}
      {canReadCohortWorkspace && pipeline.data && (
        <div className="glass-card rounded-2xl border border-border/60 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Discipleship Growth Pipeline Progression</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official single-church pathway: First Timer → Returning Visitor → Foundation Class → Sunday School 1..3 → Membership Class → Workforce
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Users className="h-3 w-3" />
              {pipeline.data.total} Souls Tracked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">1. First Timer</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-300 mt-1">{pipeline.data.first_timer}</p>
              <p className="text-[10px] text-blue-600/80">Guest Intake</p>
            </div>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
              <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">2. Returning</p>
              <p className="text-xl font-bold text-indigo-800 dark:text-indigo-300 mt-1">{pipeline.data.returning_visitor}</p>
              <p className="text-[10px] text-indigo-600/80">≥2 Visits (Eligible)</p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
              <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-400">3. Foundation</p>
              <p className="text-xl font-bold text-violet-800 dark:text-violet-300 mt-1">{pipeline.data.foundation_class}</p>
              <p className="text-[10px] text-violet-600/80">Module 0 (101)</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">4. Sunday School 1</p>
              <p className="text-xl font-bold text-cyan-800 dark:text-cyan-300 mt-1">{pipeline.data.sunday_school_module_1}</p>
              <p className="text-[10px] text-cyan-600/80">Doctrine & Prayer</p>
            </div>
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3">
              <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">5. Sunday School 2</p>
              <p className="text-xl font-bold text-teal-800 dark:text-teal-300 mt-1">{pipeline.data.sunday_school_module_2}</p>
              <p className="text-[10px] text-teal-600/80">Stewardship & Gifts</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">6. Sunday School 3</p>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{pipeline.data.sunday_school_module_3}</p>
              <p className="text-[10px] text-emerald-600/80">Leadership & Missions</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">7. Membership</p>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">{pipeline.data.membership_class}</p>
              <p className="text-[10px] text-amber-600/80">Covenant Class (201)</p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
              <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">8. Workforce</p>
              <p className="text-xl font-bold text-purple-800 dark:text-purple-300 mt-1">{pipeline.data.steward}</p>
              <p className="text-[10px] text-purple-600/80">Active Stewards</p>
            </div>
          </div>
        </div>
      )}

      {/* Sunday School Quick Metrics */}
      {canReadCohortWorkspace && sundaySchoolStats.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card rounded-2xl border border-border/60 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <School className="h-3.5 w-3.5 text-cyan-600" />
              <span>Active SS Cohorts</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">{sundaySchoolStats.data.active_cohorts}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Across Modules 1, 2 & 3</p>
          </div>
          <div className="glass-card rounded-2xl border border-border/60 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Currently Enrolled</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1.5">{sundaySchoolStats.data.total_enrolled}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              SS1: {sundaySchoolStats.data.module_1_enrolled} · SS2: {sundaySchoolStats.data.module_2_enrolled} · SS3: {sundaySchoolStats.data.module_3_enrolled}
            </p>
          </div>
          <div className="glass-card rounded-2xl border border-border/60 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sunday School Graduates</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1.5">{sundaySchoolStats.data.graduated_count}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed module achievements</p>
          </div>
          <div className="glass-card rounded-2xl border border-border/60 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Makeup Decisions Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1.5">{sundaySchoolStats.data.makeup_pending_count}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">4–5 sessions completed</p>
          </div>
        </div>
      )}

      {/* Schedule Cohort Form */}
      {showNewCohortForm && canManageAcademy && (
        <form
          onSubmit={onCreateCohort}
          className="glass-card grid gap-4 rounded-2xl border border-border/60 p-6 sm:grid-cols-4"
        >
          <div className="sm:col-span-4 flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Schedule New 6-Session Cohort</h2>
              <p className="text-xs text-muted-foreground">
                Creates 6 standard curriculum sessions pinned to rule <code>v1:6_sessions_50_pass</code> and assigns
                grading authority to the selected teacher.
              </p>
            </div>
            <Badge variant="default">HOF-019</Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Program Module</label>
            <select
              name="module_code"
              defaultValue="SUNDAY_SCHOOL_101"
              className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
            >
              <option value="FOUNDATION_101">FOUNDATION_101 — Foundation Class (Module 0)</option>
              <option value="SUNDAY_SCHOOL_101">SUNDAY_SCHOOL_101 — Sunday School Module 1 (Christian Foundations)</option>
              <option value="SUNDAY_SCHOOL_102">SUNDAY_SCHOOL_102 — Sunday School Module 2 (Stewardship & Ministry)</option>
              <option value="SUNDAY_SCHOOL_103">SUNDAY_SCHOOL_103 — Sunday School Module 3 (Missions & Leadership)</option>
              <option value="MEMBERSHIP_201">MEMBERSHIP_201 — Membership Maturity Class</option>
            </select>
          </div>

          <Field
            label="Cohort Title"
            name="title"
            placeholder="October 2026 Foundation Cohort"
            required
          />

          <Field label="Start Date" name="starts_on" type="date" defaultValue={todayIso} required />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Assigned Teacher (Optional)</label>
            <div className="flex items-center gap-2">
              <select
                name="teacher_person_id"
                defaultValue=""
                className="h-11 flex-1 rounded-xl border border-input bg-white/85 px-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
              >
                <option value="">Coordinator only…</option>
                {(stewardsList.data ?? []).map((s) => (
                  <option key={s.person_id} value={s.person_id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
              <Button type="submit" loading={createCohortMutation.isPending}>
                Create
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Cohort Management Workspace */}
      {canReadCohortWorkspace && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Cohorts List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cohorts & Modules
              </h2>
              <BookOpen className="h-4 w-4 text-primary/70" />
            </div>

            {/* Module Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MODULE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setModuleFilter(opt.key)
                    const matches = (cohorts.data ?? []).filter((c) => {
                      if (opt.key === 'ALL') return true
                      if (opt.key === 'SUNDAY_SCHOOL') {
                        return (
                          c.module_code === 'SUNDAY_SCHOOL_101' ||
                          c.module_code === 'SUNDAY_SCHOOL_102' ||
                          c.module_code === 'SUNDAY_SCHOOL_103'
                        )
                      }
                      return c.module_code === opt.key
                    })
                    if (matches.length > 0) setSelectedCohortId(matches[0].id)
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all ${
                    moduleFilter === opt.key
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-white/80 dark:bg-slate-800 text-muted-foreground hover:text-foreground border border-border/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {filteredCohorts.length === 0 ? (
              <div className="glass-card rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No cohorts found matching the selected filter. Click &ldquo;Schedule 6-Session Cohort&rdquo; to open a class.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredCohorts.map((c) => {
                  const isActive = c.id === activeCohort?.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCohortId(c.id)}
                      className={`glass-card flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? 'border-primary bg-white shadow-md ring-2 ring-primary/15'
                          : 'border-border/60 hover:border-primary/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getModuleBadge(c.module_code)}
                          <span className="text-xs text-muted-foreground">{c.starts_on}</span>
                        </div>
                        <p className="font-bold text-foreground">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Teachers:{' '}
                          {c.teachers.length > 0
                            ? c.teachers.map((t) => t.name).join(', ')
                            : 'Coordinator'}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
                          <Users className="h-3 w-3" />
                          {c.enrollments.length}
                        </span>
                        <p className="mt-1 text-[11px] text-muted-foreground">6 sessions</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Right 2 Columns: Active Cohort Roster, 6-Session Tracker & 6-Part Gradebook */}
          <section className="space-y-5 lg:col-span-2">
            {activeCohort && (
              <div className="glass-card rounded-2xl border border-border/60 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{activeCohort.title}</h2>
                      {getModuleBadge(activeCohort.module_code)}
                      <Badge variant="outline">Rule: {activeCohort.rule_version}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Starts <strong className="text-foreground">{activeCohort.starts_on}</strong> ·{' '}
                      {activeCohort.sessions.length} curriculum sessions · Assigned Teachers:{' '}
                      <strong className="text-foreground">
                        {activeCohort.teachers.length > 0
                          ? activeCohort.teachers.map((t) => t.name).join(', ')
                          : 'Coordinator'}
                      </strong>
                    </p>
                  </div>

                  {canManageAcademy && (
                    <Button
                      size="sm"
                      onClick={() => setShowEnrollModal((v) => !v)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {showEnrollModal ? 'Close Enrollment' : 'Enroll Student'}
                    </Button>
                  )}
                </div>

                {/* Enroll Student Form */}
                {showEnrollModal && canManageAcademy && (
                  <form
                    onSubmit={onEnrollStudent}
                    className="mt-4 space-y-3 rounded-xl border border-primary/25 bg-secondary/40 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Select Candidate ({activeCohort.module_code})
                        </label>
                        <select
                          name="person_id"
                          required
                          defaultValue=""
                          className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                        >
                          <option value="" disabled>
                            Choose person from directory…
                          </option>
                          {(peopleList.data ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name} ({p.membership_status} · FC:{' '}
                              {p.foundation_class_status}
                              {p.sunday_school_status && p.sunday_school_status !== 'NOT_STARTED'
                                ? ` · SS: ${p.sunday_school_status}`
                                : ''}
                              {p.foundation_eligible_at ? ' · Eligible' : ''})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end gap-2 pb-1 text-xs">
                        <label className="flex items-center gap-2 font-medium text-foreground">
                          <input
                            type="checkbox"
                            name="prerequisite_override"
                            className="h-4 w-4 rounded border-input text-primary"
                          />
                          Authorize prerequisite exemption override (HOF-019-S02)
                        </label>
                        <input
                          type="text"
                          name="override_reason"
                          placeholder="Override reason (required if prerequisite unmet)…"
                          className="h-9 rounded-lg border border-input bg-white px-3 text-xs text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" size="sm" loading={enrollMutation.isPending}>
                        Confirm Enrollment
                      </Button>
                    </div>
                  </form>
                )}

                {/* Enrolled Students Gradebook & Session Matrix */}
                <div className="mt-5 space-y-4">
                  {activeCohort.enrollments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                      No students enrolled in this cohort yet.
                    </div>
                  ) : (
                    activeCohort.enrollments.map((e) => {
                      const badge = ELIGIBILITY_BADGE[e.graduation_eligibility]
                      const isGrading = editingGradesId === e.id
                      const isDecidingMakeup = makeupDecisionId === e.id

                      return (
                        <div
                          key={e.id}
                          className="rounded-xl border border-border/60 bg-white/85 p-4 transition-all hover:border-primary/30"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-foreground">
                                  {e.person.first_name} {e.person.last_name}
                                </span>
                                <Badge
                                  variant={
                                    e.status === 'GRADUATED'
                                      ? 'success'
                                      : e.status === 'WITHDRAWN' || e.status === 'RETAKE_REQUIRED'
                                        ? 'danger'
                                        : 'default'
                                  }
                                >
                                  {e.status} (Attempt #{e.attempt_number})
                                </Badge>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                                {e.total_score !== null && (
                                  <Badge variant="outline">Score: {e.total_score} / 100</Badge>
                                )}
                              </div>
                              {e.is_prerequisite_override && (
                                <p className="text-[11px] text-amber-800">
                                  Prerequisite Override: &ldquo;{e.override_reason}&rdquo;
                                </p>
                              )}
                              {e.makeup_approved && (
                                <p className="text-[11px] text-emerald-700">
                                  Makeup Approved: &ldquo;{e.makeup_reason}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setJourneyPersonId(
                                    journeyPersonId === e.person_id ? null : e.person_id,
                                  )
                                }
                              >
                                <History className="h-3.5 w-3.5" />
                                Journey History
                              </Button>

                              {activeCohort.can_caller_grade && e.status === 'ENROLLED' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isGrading ? 'ghost' : 'outline'}
                                  onClick={() => setEditingGradesId(isGrading ? null : e.id)}
                                >
                                  {isGrading ? 'Cancel' : 'Grade 6-Part Rubric'}
                                </Button>
                              )}

                              {canManageAcademy &&
                                e.status === 'ENROLLED' &&
                                e.graduation_eligibility ===
                                  'coordinator_makeup_decision_required' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      setMakeupDecisionId(isDecidingMakeup ? null : e.id)
                                    }
                                  >
                                    Approve Makeup
                                  </Button>
                                )}

                              {canManageAcademy &&
                                e.status === 'ENROLLED' &&
                                e.graduation_eligibility === 'eligible' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => graduateMutation.mutate(e.id)}
                                    loading={graduateMutation.isPending}
                                  >
                                    <Award className="h-3.5 w-3.5" />
                                    Graduate
                                  </Button>
                                )}
                            </div>
                          </div>

                          {/* 6-Session Attendance Pills */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Sessions ({e.credited_session_count}/6):
                            </span>
                            {[1, 2, 3, 4, 5, 6].map((num) => {
                              const credited = e.credited_sessions.includes(num)
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  disabled={!activeCohort.can_caller_grade || e.status !== 'ENROLLED'}
                                  onClick={() => toggleSession(e, num)}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                    credited
                                      ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800'
                                      : 'border-border bg-white text-muted-foreground hover:border-primary/40'
                                  }`}
                                >
                                  {credited && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                  S{num}
                                </button>
                              )
                            })}
                          </div>

                          {/* 6-Part Rubric Grading Form (HOF-020-S01) */}
                          {isGrading && (
                            <form
                              onSubmit={(ev) => {
                                ev.preventDefault()
                                const form = new FormData(ev.currentTarget)
                                const scores = RUBRIC_PARTS.map((p) =>
                                  Number(form.get(`part_${p.index}`) ?? 0),
                                )
                                gradeMutation.mutate({ enrollmentId: e.id, scores })
                              }}
                              className="mt-3 space-y-3 rounded-xl border border-primary/25 bg-secondary/40 p-3.5"
                            >
                              <div className="grid gap-3 sm:grid-cols-3">
                                {RUBRIC_PARTS.map((part) => (
                                  <Field
                                    key={part.index}
                                    label={`${part.label} (Max ${part.max})`}
                                    name={`part_${part.index}`}
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    max={part.max}
                                    defaultValue={String(e.scores[part.index] ?? 0)}
                                    required
                                  />
                                ))}
                              </div>
                              <div className="flex justify-end">
                                <Button type="submit" size="sm" loading={gradeMutation.isPending}>
                                  Compute Server Total & Save Rubric
                                </Button>
                              </div>
                            </form>
                          )}

                          {/* Coordinator Makeup Decision Form (HOF-020-S02) */}
                          {isDecidingMakeup && (
                            <form
                              onSubmit={(ev) => {
                                ev.preventDefault()
                                const form = new FormData(ev.currentTarget)
                                makeupMutation.mutate({
                                  enrollmentId: e.id,
                                  approved: true,
                                  reason: String(form.get('reason') || ''),
                                })
                              }}
                              className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-300/80 bg-amber-50/80 p-3.5"
                            >
                              <div className="flex-1">
                                <Field
                                  label="Coordinator Makeup Completion Note (for 4–5 Credited Sessions)"
                                  name="reason"
                                  placeholder="Completed audio makeup for missed Session 5 with teacher review."
                                  required
                                />
                              </div>
                              <Button type="submit" size="sm" loading={makeupMutation.isPending}>
                                Approve Makeup & Unlock Graduation
                              </Button>
                            </form>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Journey Timeline Drawer (HOF-018-S02) */}
            {journeyPersonId && (
              <div className="glass-card rounded-2xl border border-border/60 p-5">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Member Journey & Standing Transition Timeline (HOF-018-S02)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJourneyPersonId(null)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
                {(journeyTimeline.data?.length ?? 0) === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No standing transitions recorded for this person yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2.5 text-xs">
                    {(journeyTimeline.data ?? []).map((t) => (
                      <li
                        key={t.id}
                        className="rounded-xl border border-border/60 bg-white/80 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">
                              {t.from_status ?? 'NONE'} → {t.to_status}
                            </Badge>
                            <Badge variant="outline">
                              Foundation: {t.from_foundation_status ?? 'NONE'} →{' '}
                              {t.to_foundation_status}
                            </Badge>
                            <Badge variant="secondary">Rule: {t.rule_version}</Badge>
                            {t.is_override && (
                              <Badge variant="warning">
                                <ShieldAlert className="h-3 w-3" />
                                Manual Override
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(t.created_at).toLocaleString()} · By {t.actor_name}
                          </span>
                        </div>
                        <p className="mt-1.5 font-medium text-foreground">{t.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Personal My Classes Projection (HOF-019-S04) */}
      {(myClasses.data?.length ?? 0) > 0 && (
        <section className="glass-card rounded-2xl border border-border/60 p-5 sm:p-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">My Classes & Progress (HOF-019-S04)</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(myClasses.data ?? []).map((mc) => (
              <div key={mc.id} className="rounded-xl border border-border/60 bg-white/85 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{mc.cohort_title}</span>
                  <Badge variant="default">{mc.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Module: {mc.module_code} · Credited Sessions: {mc.credited_session_count}/6 · Score:{' '}
                  {mc.total_score ?? 'Pending'}/100
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
