/**
 * Browser-side API client. Calls go to same-origin `/api` (proxied to NestJS),
 * so the HttpOnly session cookie is sent automatically. No tokens in JS/localStorage.
 */

export interface ApiErrorBody {
  code: string
  message: string
  field_errors: Record<string, string>
  request_id?: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message)
  }
  get code() {
    return this.body.code
  }
  get fieldErrors() {
    return this.body.field_errors ?? {}
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data && typeof data === 'object' && 'code' in data
        ? (data as ApiErrorBody)
        : { code: 'NETWORK_ERROR', message: 'Could not reach the server. Check your connection.', field_errors: {} },
    )
  }
  return data as T
}

// ── Contracts ────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'PASTOR' | 'TEAM_LEAD' | 'ASSISTANT_TEAM_LEAD' | 'STEWARD'
export type MembershipStatus = 'VISITOR' | 'FIRST_TIMER' | 'FOUNDATION' | 'MEMBER' | 'WORKER' | 'INACTIVE'
export type FoundationClassStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type ServiceKind = 'SUNDAY_FIRST' | 'SUNDAY_SECOND' | 'SUNDAY_COMBINED' | 'MIDWEEK' | 'SPECIAL'
export type FollowUpTaskKind = 'WELCOME' | 'FOUNDATION_HANDOFF'
export type FollowUpTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
export type CallOutcome =
  | 'REACHED'
  | 'UNREACHABLE'
  | 'VOICEMAIL'
  | 'WRONG_NUMBER'
  | 'REQUESTED_PRAYER'
  | 'NEEDS_PASTORAL_VISIT'

export interface Team {
  id: string
  key: string
  name: string
}

export interface Me {
  person_id: string
  first_name: string
  last_name: string
  photo_url: string | null
  is_verified: boolean
  membership_status: MembershipStatus
  foundation_class_status: FoundationClassStatus
  email: string | null
  has_pin: boolean
  has_password: boolean
  auth_methods: {
    id: string
    provider: string
    provider_email: string | null
    created_at: string
  }[]
  assignments: { id: string; role: Role; role_label: string; team: Team | null }[]
  baseline_capabilities: string[]
  capabilities: string[]
}

export interface ClaimPreview {
  purpose: 'CLAIM' | 'MAGIC_LOGIN'
  first_name: string
  last_name: string
  email: string | null
  masked_phone: string | null
  photo_url: string | null
  is_verified: boolean
  membership_status: MembershipStatus
  appointments: { role: Role; role_label: string; team_name: string | null }[]
  baseline_capabilities: string[]
  expires_at: string
}

export interface Steward {
  person_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  last_login_at: string | null
  assignments: { id: string; role: Role; role_label: string; team: { id: string; name: string } | null }[]
}

export interface DirectoryPerson {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  photo_url: string | null
  is_verified: boolean
  verified_at: string | null
  account_status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | null
  missing_contact_reason: string | null
  membership_status: MembershipStatus
  foundation_class_status: FoundationClassStatus
  sunday_school_status?: SundaySchoolStatus
  foundation_eligible_at?: string | null
  foundation_rule_version?: string | null
  birth_month: number | null
  birth_day: number | null
  anniversary_month: number | null
  anniversary_day: number | null
  first_visited_at: string | null
  attendance_count: number
  followup_count: number
  version: number
}

export interface PersonCandidate {
  id: string
  first_name: string
  last_name: string
  masked_email: string | null
  masked_phone: string | null
  membership_status: MembershipStatus
  attendance_count: number
}

export interface ServiceOccurrenceSummary {
  id: string
  title: string
  kind: ServiceKind
  service_date: string
  headcount: number
  check_in_count: number
  first_timer_count: number
  notes: string | null
}

export interface ServiceOccurrenceRoster {
  id: string
  title: string
  kind: ServiceKind
  service_date: string
  headcount: number
  notes: string | null
  attendees: {
    attendance_id: string
    person_id: string
    first_name: string
    last_name: string
    phone: string | null
    membership_status: MembershipStatus
    foundation_class_status: FoundationClassStatus
    is_first_visit: boolean
    source: string
    checked_in_at: string
  }[]
}

export interface FollowUpTaskItem {
  id: string
  kind?: FollowUpTaskKind
  recommendation_note?: string | null
  status: FollowUpTaskStatus
  last_outcome: CallOutcome | null
  needs_pastoral_visit: boolean
  due_at: string | null
  next_action_at: string | null
  completed_at: string | null
  assignee_person_id: string | null
  assignee_name: string | null
  assigned_by_id: string | null
  assigned_by_name: string | null
  assigned_at: string | null
  person: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
    address: string | null
    missing_contact_reason: string | null
    membership_status: MembershipStatus
    foundation_class_status: FoundationClassStatus
  }
  service_occurrence: {
    id: string
    title: string
    service_date: string
  } | null
  call_logs: {
    id: string
    outcome: CallOutcome
    note: string | null
    needs_pastoral_visit: boolean
    next_action_at: string | null
    created_at: string
  }[]
}

export interface PrayerNoteItem {
  id: string
  content: string
  created_at: string
  updated_at: string
  created_by_name: string
  sent_to_pastor_at: string | null
  sent_to_pastor_by_name: string | null
  person: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
    membership_status: MembershipStatus
  }
  service_occurrence: {
    id: string
    title: string
    service_date: string
  } | null
}

export interface DashboardSummary {
  total_people: number
  first_timers_count: number
  open_followups_count: number
  pastoral_alerts_count: number
  active_stewards_count: number
  celebrations_this_month: number
  latest_service: {
    id: string
    title: string
    service_date: string
    headcount: number
    check_in_count: number
  } | null
}

export type ImportRowState = 'READY' | 'INVALID' | 'REVIEW_REQUIRED' | 'APPLIED' | 'SKIPPED'

export interface ImportJobRowItem {
  id: string
  row_index: number
  first_name: string
  last_name: string
  phone: string | null
  normalized_phone: string | null
  email: string | null
  normalized_email: string | null
  address: string | null
  membership_status: MembershipStatus
  birth_month: number | null
  birth_day: number | null
  anniversary_month: number | null
  anniversary_day: number | null
  state: ImportRowState
  errors: string[]
  warnings: string[]
  matched_person_id: string | null
  applied_person_id: string | null
  applied_at: string | null
  formula_safe_first_name: string
  formula_safe_last_name: string
}

export interface ImportJobDetail {
  id: string
  file_name: string | null
  status: 'PREVIEW' | 'COMMITTED'
  committed_at: string | null
  created_at: string
  summary: {
    total_rows: number
    ready_count: number
    applied_count: number
    failed_count: number
    review_required_count: number
  }
  rows: ImportJobRowItem[]
  buckets: {
    applied: ImportJobRowItem[]
    failed: ImportJobRowItem[]
    review_required: ImportJobRowItem[]
    ready: ImportJobRowItem[]
  }
}

export interface FoundationEligibilityItem {
  person_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  membership_status: MembershipStatus
  foundation_class_status: FoundationClassStatus
  qualifying_visits_count: number
  required_visits_threshold: number
  is_eligible: boolean
  foundation_eligible_at: string | null
  foundation_rule_version: string | null
  handoff_status: 'NOT_RECOMMENDED' | 'HANDED_OFF_TO_MEMBERSHIP'
  recommendation: {
    id: string
    rule_version: string
    qualifying_visits_count: number
    is_exemption: boolean
    exemption_reason: string | null
    note: string
    recommended_by_id: string
    recommended_by_name: string
    followup_task_id: string
    followup_task_status: FollowUpTaskStatus
    created_at: string
  } | null
}

// ── Celebrations, Proactive 3-Day Alerts & Life Landmarks (HOF-022) ──────

export type CelebrationKind = 'BIRTHDAY' | 'ANNIVERSARY'
export type LeapDayPolicy = 'FEB_28' | 'MAR_01'
export type CelebrationContactChannel = 'CALL' | 'EMAIL_GREETING' | 'WHATSAPP_SMS' | 'IN_PERSON'
export type LandmarkCategory =
  | 'GRADUATION'
  | 'WEDDING'
  | 'BABY_DEDICATION'
  | 'CAREER_MILESTONE'
  | 'OTHER'
export type LandmarkPublicationPreference = 'PRIVATE' | 'ALLOW_BULLETIN'
export type LandmarkApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CelebrationContactItem {
  id: string
  channel: CelebrationContactChannel
  outcome: string
  note: string | null
  delivery_status: string | null
  created_at: string
}

export interface CelebrationReminderItem {
  id: string
  person_id: string
  kind: CelebrationKind
  celebration_year: number
  source_month: number
  source_day: number
  observed_month: number
  observed_day: number
  observed_date: string
  days_until: number
  timezone: string
  leap_day_policy: LeapDayPolicy
  evaluation_count: number
  birth_year: null
  person: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    photo_url: string | null
    membership_status: MembershipStatus
  }
  contacts: CelebrationContactItem[]
}

export interface MonthlyCelebrationItem {
  person_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  photo_url: string | null
  membership_status: MembershipStatus
  kind: CelebrationKind
  month: number
  day: number
  celebration_year: number
  contacts_count: number
  last_contact_at: string | null
}

export interface CelebrationsOverview {
  local_date: string
  timezone: string
  leap_day_policy: LeapDayPolicy
  window_days: number
  selected_month: number
  reminders: CelebrationReminderItem[]
  monthly_celebrations: MonthlyCelebrationItem[]
}

export interface LifeLandmarkItem {
  id: string
  person_id: string
  category: LandmarkCategory
  title: string
  description: string | null
  occurred_on: string | null
  publication_preference: LandmarkPublicationPreference
  approval_status: LandmarkApprovalStatus
  in_public_bulletin: boolean
  recorded_by_id: string
  reviewed_by_id: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  person: {
    id: string
    first_name: string
    last_name: string
    membership_status: MembershipStatus
  }
}

export interface ImportJobSummaryItem {
  id: string
  file_name: string | null
  status: 'PREVIEW' | 'COMMITTED'
  created_at: string
  committed_at: string | null
  summary: ImportJobDetail['summary']
}

// ── Academy Cohorts, 6-Part Rubric & Journey History (HOF-018..020) ──────

export type SundaySchoolStatus =
  | 'NOT_STARTED'
  | 'MODULE_1_IN_PROGRESS'
  | 'MODULE_1_COMPLETED'
  | 'MODULE_2_IN_PROGRESS'
  | 'MODULE_2_COMPLETED'
  | 'MODULE_3_IN_PROGRESS'
  | 'COMPLETED'

export type AcademyModuleCode =
  | 'FOUNDATION_101'
  | 'SUNDAY_SCHOOL_101'
  | 'SUNDAY_SCHOOL_102'
  | 'SUNDAY_SCHOOL_103'
  | 'MEMBERSHIP_201'

export interface DiscipleshipPipeline {
  first_timer: number
  returning_visitor: number
  foundation_class: number
  sunday_school_module_1: number
  sunday_school_module_2: number
  sunday_school_module_3: number
  membership_class: number
  steward: number
  total: number
}

export interface SundaySchoolStats {
  active_cohorts: number
  total_enrolled: number
  module_1_enrolled: number
  module_2_enrolled: number
  module_3_enrolled: number
  graduated_count: number
  makeup_pending_count: number
}

export type AcademyCohortStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
export type AcademyEnrollmentStatus = 'ENROLLED' | 'WITHDRAWN' | 'GRADUATED' | 'RETAKE_REQUIRED'
export type GraduationEligibilityState =
  | 'eligible'
  | 'coordinator_makeup_decision_required'
  | 'retake_required'
  | 'score_below_passing'
  | 'incomplete_assessment'

export interface AcademyEnrollmentItem {
  id: string
  cohort_id: string
  person_id: string
  module_code: AcademyModuleCode
  rule_version: string
  attempt_number: number
  status: AcademyEnrollmentStatus
  credited_sessions: number[]
  credited_session_count: number
  scores: (number | null)[]
  total_score: number | null
  makeup_approved: boolean
  makeup_reason: string | null
  graduation_eligibility: GraduationEligibilityState
  is_prerequisite_override: boolean
  override_reason: string | null
  graduated_at: string | null
  withdrawn_at: string | null
  withdrawal_reason: string | null
  created_at: string
  person: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    membership_status: MembershipStatus
    foundation_class_status: FoundationClassStatus
    sunday_school_status?: SundaySchoolStatus
    foundation_eligible_at: string | null
  }
}

export interface AcademyCohortItem {
  id: string
  module_code: AcademyModuleCode
  title: string
  rule_version: string
  starts_on: string
  status: AcademyCohortStatus
  notes: string | null
  can_caller_grade: boolean
  sessions: {
    id: string
    session_number: number
    title: string
    scheduled_on: string | null
  }[]
  teachers: {
    id: string
    person_id: string
    name: string
  }[]
  enrollments: AcademyEnrollmentItem[]
}

export interface JourneyTransitionItem {
  id: string
  person_id: string
  from_status: MembershipStatus | null
  to_status: MembershipStatus
  from_foundation_status: FoundationClassStatus | null
  to_foundation_status: FoundationClassStatus | null
  from_sunday_school_status?: SundaySchoolStatus | null
  to_sunday_school_status?: SundaySchoolStatus | null
  rule_version: string
  is_override: boolean
  reason: string
  actor_person_id: string | null
  actor_name: string
  evidence: Record<string, unknown> | null
  created_at: string
}

// ── Profile Change Proposals & Maker-Checker Dual Control (HOF-017) ──────

export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProfileProposalItem {
  id: string
  person_id: string
  person: {
    id: string
    first_name: string
    last_name: string
    version: number
    membership_status: MembershipStatus
    current_address: string | null
    current_phone: string | null
    current_email: string | null
  }
  base_version: number
  is_stale: boolean
  maker: {
    id: string
    name: string
  }
  checker: {
    id: string
    name: string
  } | null
  changes: Record<string, { old: unknown; proposed: unknown }>
  reason: string | null
  status: ProposalStatus
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  can_actor_approve: boolean
}

export interface IncompleteProfileItem {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  address: string | null
  photo_url: string | null
  membership_status: MembershipStatus
  is_verified: boolean
  version: number
  missing_fields: string[]
  created_at: string
}
