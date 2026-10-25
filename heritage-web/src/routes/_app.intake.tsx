import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '#/components/ui'
import { api, ApiError, type PersonCandidate, type ServiceOccurrenceSummary } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Fast 30-second Sunday / Midweek Visitor Intake (HOF-013).
 * - Checks for existing person candidates by phone/email/name (HOF-013-S02)
 * - Supports recording a returning person OR a new person
 * - Supports visitors without phone/email via a missing-contact reason (HOF-013-S03)
 * - Stores prayer requests in a separate confidential table (HOF-013-S04)
 * - Automatically opens a Follow-Up task and sends a Welcome Email via Resend
 */
export const Route = createFileRoute('/_app/intake')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'visitors.capture')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: VisitorIntakePage,
})

interface CaptureResponse {
  person_id: string
  first_name: string
  last_name: string
  membership_status: string
  attendance_id: string
  followup_task_id: string
  is_new_person: boolean
  welcome_email_delivery: 'SENT' | 'SKIPPED' | 'FAILED'
}

function VisitorIntakePage() {
  const queryClient = useQueryClient()

  const occurrences = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => api<ServiceOccurrenceSummary[]>('/attendance/occurrences'),
  })

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [noContactAvailable, setNoContactAvailable] = useState(false)
  const [missingReason, setMissingReason] = useState('')
  const [prayerRequest, setPrayerRequest] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<PersonCandidate | null>(null)
  const [formError, setFormError] = useState<ApiError | null>(null)
  const [lastSaved, setLastSaved] = useState<CaptureResponse | null>(null)

  const effectiveOccurrenceId = selectedOccurrenceId || occurrences.data?.[0]?.id || ''

  // Live duplicate candidate lookup when phone, email, or name is typed (HOF-013-S02)
  const candidateQuery = useQuery({
    queryKey: ['intake-candidates', phone.trim(), email.trim(), `${firstName.trim()} ${lastName.trim()}`.trim()],
    enabled:
      phone.trim().length >= 5 ||
      email.trim().length >= 4 ||
      (firstName.trim().length >= 2 && lastName.trim().length >= 2),
    queryFn: () => {
      const params = new URLSearchParams()
      if (phone.trim().length >= 5) params.set('phone', phone.trim())
      if (email.trim().length >= 4) params.set('email', email.trim())
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      if (fullName.length >= 4) params.set('name', fullName)
      return api<PersonCandidate[]>(`/people/candidates?${params.toString()}`)
    },
  })

  const captureMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<CaptureResponse>('/people/visitor-intakes', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (res) => {
      setLastSaved(res)
      setFormError(null)
      // Reset fields for the next visitor in line (HOF-013-S01)
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNoContactAvailable(false)
      setMissingReason('')
      setPrayerRequest('')
      setBirthMonth('')
      setBirthDay('')
      setSelectedCandidate(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['followups'] }),
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: (err) => {
      // HOF-013-S05: Failed submission retains all entered fields
      setFormError(err instanceof ApiError ? err : null)
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLastSaved(null)
    captureMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      missing_contact_reason: noContactAvailable ? missingReason : undefined,
      service_occurrence_id: effectiveOccurrenceId,
      existing_person_id: selectedCandidate?.id,
      prayer_request: prayerRequest || undefined,
      birth_month: birthMonth ? Number(birthMonth) : null,
      birth_day: birthDay ? Number(birthDay) : null,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Visitor Intake</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Fast first-timer capture. Automatically logs attendance, opens a follow-up task, and sends a welcome email.
          </p>
        </div>
        <Link to="/directory" className="text-sm font-semibold text-[var(--brand)] hover:underline">
          Open Directory →
        </Link>
      </div>

      {lastSaved && (
        <Alert tone="success">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Recorded visit for <strong>{lastSaved.first_name} {lastSaved.last_name}</strong>{' '}
              ({lastSaved.is_new_person ? 'New First-Timer' : 'Returning Visitor'}) · Follow-up queued
              {lastSaved.welcome_email_delivery === 'SENT' ? ' · Welcome email sent' : ''}.
            </span>
            <Link to="/follow-up" className="font-semibold underline">
              View Follow-Up Queue
            </Link>
          </div>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xs" noValidate>
        {formError && <Alert>{formError.message}</Alert>}

        {/* Service Occurrence Picker */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="occurrence-select" className="text-sm font-medium text-[var(--ink)]">
              Service Occurrence
            </label>
            <Link to="/attendance" className="text-xs font-medium text-[var(--brand)] hover:underline">
              + New service occurrence
            </Link>
          </div>
          <select
            id="occurrence-select"
            value={effectiveOccurrenceId}
            onChange={(e) => setSelectedOccurrenceId(e.target.value)}
            required
            className="h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
          >
            {(occurrences.data ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} — {o.service_date}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            error={formError?.fieldErrors.first_name}
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            error={formError?.fieldErrors.last_name}
          />
        </div>

        {/* Contact details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +234 803 000 0000"
            error={formError?.fieldErrors.phone}
          />
          <Field
            label="Email address (sends welcome note)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="visitor@example.com"
            error={formError?.fieldErrors.email}
          />
        </div>

        {/* Duplicate candidate detection (HOF-013-S02) */}
        {(candidateQuery.data?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                Possible Existing Record Found
              </p>
              {selectedCandidate && (
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="text-xs font-semibold text-amber-900 underline"
                >
                  Create separate new person instead
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-amber-800">
              Select a person below if they are returning so we don&apos;t create a duplicate record:
            </p>
            <div className="mt-2.5 space-y-1.5">
              {candidateQuery.data?.map((c) => {
                const isPicked = selectedCandidate?.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(isPicked ? null : c)
                      if (!isPicked) {
                        setFirstName(c.first_name)
                        setLastName(c.last_name)
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                      isPicked
                        ? 'border-[var(--brand)] bg-white font-semibold text-[var(--ink)]'
                        : 'border-amber-200 bg-white/70 text-amber-950 hover:bg-white'
                    }`}
                  >
                    <span>
                      {c.first_name} {c.last_name} ({c.membership_status})
                      {c.masked_phone ? ` · ${c.masked_phone}` : ''}
                      {c.masked_email ? ` · ${c.masked_email}` : ''}
                    </span>
                    <span className="text-[11px] font-medium">
                      {isPicked ? '✓ Linked' : `${c.attendance_count} visits · Use this record`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Missing contact toggle (HOF-013-S03) */}
        {!phone.trim() && !email.trim() && (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--muted)]/50 p-3.5">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                checked={noContactAvailable}
                onChange={(e) => setNoContactAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--line)]"
              />
              Visitor does not have a personal phone or email
            </label>
            {noContactAvailable && (
              <div className="mt-3">
                <Field
                  label="Missing-contact reason (e.g. came with family member, no phone)"
                  value={missingReason}
                  onChange={(e) => setMissingReason(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Address & Birthday (month/day) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field
              label="Home address / area (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Birth Month"
              type="number"
              min={1}
              max={12}
              placeholder="MM"
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
            />
            <Field
              label="Birth Day"
              type="number"
              min={1}
              max={31}
              placeholder="DD"
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
            />
          </div>
        </div>

        {/* Prayer Note — stored separately (HOF-013-S04) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prayer-note" className="text-sm font-medium text-[var(--ink)]">
            Prayer Request (Confidential — stored separately from directory)
          </label>
          <textarea
            id="prayer-note"
            rows={2}
            value={prayerRequest}
            onChange={(e) => setPrayerRequest(e.target.value)}
            placeholder="Optional prayer point shared on the visitor card…"
            className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" loading={captureMutation.isPending} className="w-full sm:w-auto">
            {selectedCandidate ? 'Record Visit for Existing Person' : 'Save Visitor & Queue Follow-Up'}
          </Button>
        </div>
      </form>
    </div>
  )
}
