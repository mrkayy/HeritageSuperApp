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

export type Role = 'ADMIN' | 'PASTOR' | 'TEAM_LEAD' | 'STEWARD'
export type MembershipStatus = 'VISITOR' | 'FIRST_TIMER' | 'FOUNDATION' | 'MEMBER' | 'WORKER' | 'INACTIVE'
export type FoundationClassStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type ServiceKind = 'SUNDAY_FIRST' | 'SUNDAY_SECOND' | 'SUNDAY_COMBINED' | 'MIDWEEK' | 'SPECIAL'
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
  email: string | null
  assignments: { id: string; role: Role; role_label: string; team: Team | null }[]
  capabilities: string[]
}

export interface ClaimPreview {
  purpose: 'CLAIM' | 'MAGIC_LOGIN'
  first_name: string
  last_name: string
  email: string | null
  appointments: { role: Role; role_label: string; team_name: string | null }[]
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
  missing_contact_reason: string | null
  membership_status: MembershipStatus
  foundation_class_status: FoundationClassStatus
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
  status: FollowUpTaskStatus
  last_outcome: CallOutcome | null
  needs_pastoral_visit: boolean
  due_at: string | null
  next_action_at: string | null
  completed_at: string | null
  assignee_person_id: string | null
  assignee_name: string | null
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
