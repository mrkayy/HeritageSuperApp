import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import { api, ApiError, type PersonCandidate, type ServiceOccurrenceSummary } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Fast 30-second Sunday / Midweek Visitor Intake (HOF-013) — styled after
 * `web/src/pages/teams/VisitorIntake.tsx` with frosted `.glass-card`, Information
 * Center badge, live date badge, and interactive duplicate resolution banner.
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

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageBanner
        badge="Information Center"
        badgeIcon={<UserPlus className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="secondary">
            <Calendar className="h-3 w-3" /> {todayFormatted}
          </Badge>
        }
        title={selectedCandidate ? 'Returning Visitor Check-In' : 'First-Timer Visitor Intake'}
        subtitle="Capture first-time guest details, automatically log service presence, and queue Membership follow-up."
        actions={
          <Link
            to="/directory"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-white/80 px-3.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            Open Directory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {lastSaved && (
        <Alert tone="success">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Recorded visit for{' '}
              <strong>
                {lastSaved.first_name} {lastSaved.last_name}
              </strong>{' '}
              ({lastSaved.is_new_person ? 'New First-Timer' : 'Returning Visitor'}) · Follow-up queued
              {lastSaved.welcome_email_delivery === 'SENT' ? ' · Welcome email sent' : ''}.
            </span>
            <Link to="/follow-up" className="font-semibold text-emerald-900 underline">
              View Follow-Up Queue →
            </Link>
          </div>
        </Alert>
      )}

      <div className="glass-card rounded-2xl border border-border/60 p-6 sm:p-7">
        <div className="mb-5 border-b border-border/50 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Visitor Information</h2>
          <p className="text-xs text-muted-foreground">
            Enter phone or email first to automatically check for existing records in the church directory.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {formError && <Alert>{formError.message}</Alert>}

          {/* Service Occurrence Picker */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="occurrence-select" className="text-xs font-semibold text-foreground">
                Service Occurrence *
              </label>
              <Link to="/attendance" className="text-xs font-semibold text-primary hover:underline">
                + New service occurrence
              </Link>
            </div>
            <select
              id="occurrence-select"
              value={effectiveOccurrenceId}
              onChange={(e) => setSelectedOccurrenceId(e.target.value)}
              required
              className="h-11 rounded-xl border border-input bg-white/90 px-3.5 text-sm font-medium text-foreground shadow-2xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {(occurrences.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} — {o.service_date}
                </option>
              ))}
            </select>
          </div>

          {/* Contact details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0803 000 0000"
              icon={<Phone className="h-4 w-4" />}
              error={formError?.fieldErrors.phone}
            />
            <Field
              label="Email Address (Sends Welcome Note)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="samuel@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={formError?.fieldErrors.email}
            />
          </div>

          {/* No duplicate indicator */}
          {phone.trim().length >= 7 && !candidateQuery.isFetching && (candidateQuery.data?.length ?? 0) === 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> New Visitor (No duplicate record found)
            </div>
          )}

          {/* Duplicate candidate detection (HOF-013-S02) */}
          {(candidateQuery.data?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-amber-300/80 bg-amber-50/85 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Existing Visitor / Member Record Found
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
                Select a person below if they are returning so we mark their subsequent visit without creating a
                duplicate:
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
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition ${
                        isPicked
                          ? 'border-primary bg-white font-semibold text-foreground shadow-2xs'
                          : 'border-amber-200 bg-white/80 text-amber-950 hover:bg-white'
                      }`}
                    >
                      <span>
                        {c.first_name} {c.last_name} ({c.membership_status})
                        {c.masked_phone ? ` · ${c.masked_phone}` : ''}
                        {c.masked_email ? ` · ${c.masked_email}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <UserCheck className="h-3.5 w-3.5" />
                        {isPicked ? 'Linked Record' : `${c.attendance_count} visits · Use this record`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* First & Last Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First Name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Samuel"
              required
              error={formError?.fieldErrors.first_name}
            />
            <Field
              label="Last Name (Surname) *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Adebayo"
              required
              error={formError?.fieldErrors.last_name}
            />
          </div>

          {/* Missing contact toggle (HOF-013-S03) */}
          {!phone.trim() && !email.trim() && (
            <div className="rounded-xl border border-border/70 bg-secondary/45 p-4">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground sm:text-sm">
                <input
                  type="checkbox"
                  checked={noContactAvailable}
                  onChange={(e) => setNoContactAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Visitor does not have a personal phone or email
              </label>
              {noContactAvailable && (
                <div className="mt-3">
                  <Field
                    label="Missing-contact reason (e.g. came with family member, no phone) *"
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
                label="Residential Address / Area (Optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 15 Adeola Odeku St, Victoria Island, Lagos"
                icon={<MapPin className="h-4 w-4" />}
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
            <label
              htmlFor="prayer-note"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <HeartHandshake className="h-4 w-4 text-primary" />
              Prayer Request / Special Needs (Confidential — stored separately from directory)
            </label>
            <textarea
              id="prayer-note"
              rows={3}
              value={prayerRequest}
              onChange={(e) => setPrayerRequest(e.target.value)}
              placeholder="Share any prayer item or areas where the church can agree with the visitor…"
              className="rounded-xl border border-input bg-white/90 p-3.5 text-sm text-foreground shadow-2xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
            <Button type="submit" loading={captureMutation.isPending} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              {selectedCandidate ? 'Record Visit for Existing Person' : 'Register First-Timer & Queue Follow-Up'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
