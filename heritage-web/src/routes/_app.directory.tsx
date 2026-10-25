import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  Cake,
  CheckCircle2,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type DirectoryPerson,
  type FoundationClassStatus,
  type MembershipStatus,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Unified Church People & Membership Directory (replaces 6 redundant legacy tables).
 * Includes:
 * - Instant search by name, phone, or email
 * - Stage filters: All | First-Timers | Visitors | Foundation | Members | Workers
 * - Celebrations filter (Birthdays & Anniversaries this month)
 * - Direct inline status & Foundation Class progress updates (no Maker-Checker friction)
 * - Profile verification & Controlled Claim Invitation dispatch (HOF-002-S01)
 */
export const Route = createFileRoute('/_app/directory')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'people.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DirectoryPage,
})

const STATUS_TABS: { key: '' | MembershipStatus | 'CELEBRATIONS'; label: string }[] = [
  { key: '', label: 'All People' },
  { key: 'FIRST_TIMER', label: 'First-Timers' },
  { key: 'VISITOR', label: 'Visitors' },
  { key: 'FOUNDATION', label: 'Foundation Class' },
  { key: 'MEMBER', label: 'Members' },
  { key: 'WORKER', label: 'Workers' },
  { key: 'CELEBRATIONS', label: 'Celebrations (This Month)' },
]

const STATUS_BADGE_VARIANT: Record<
  MembershipStatus,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'purple'
> = {
  FIRST_TIMER: 'default',
  VISITOR: 'warning',
  FOUNDATION: 'purple',
  MEMBER: 'success',
  WORKER: 'default',
  INACTIVE: 'secondary',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function DirectoryPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canWrite = hasCapability(me, 'people.write')

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'' | MembershipStatus | 'CELEBRATIONS'>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentMonth = new Date().getUTCMonth() + 1

  const directory = useQuery({
    queryKey: ['directory', search.trim(), activeTab],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (activeTab === 'CELEBRATIONS') {
        params.set('celebrations_month', String(currentMonth))
      } else if (activeTab) {
        params.set('status', activeTab)
      }
      return api<DirectoryPerson[]>(`/people?${params.toString()}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ personId, body }: { personId: string; body: Record<string, unknown> }) =>
      api(`/people/${personId}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not update record.'),
  })

  const verifyMutation = useMutation({
    mutationFn: (personId: string) => api(`/people/${personId}/verifications`, { method: 'POST' }),
    onSuccess: async () => {
      setError(null)
      setBanner('Profile verified — person is now eligible for an account claim invitation.')
      await queryClient.invalidateQueries({ queryKey: ['directory'] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not verify profile.'),
  })

  const claimInviteMutation = useMutation({
    mutationFn: (personId: string) =>
      api<{ delivery: 'SENT' | 'FAILED'; email: string }>(`/people/${personId}/claim-invitations`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: async (res) => {
      setError(null)
      setBanner(
        res.delivery === 'SENT'
          ? `Account claim invitation sent to ${res.email} (personal baseline access, no ministry appointment inferred).`
          : `Claim invitation created for ${res.email}, but email delivery failed. Check RESEND_API_KEY.`,
      )
      await queryClient.invalidateQueries({ queryKey: ['directory'] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not send claim invitation.'),
  })

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/people', { method: 'POST', body }),
    onSuccess: async () => {
      setShowAddModal(false)
      setBanner('Member added to the church directory.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not add person.'),
  })

  function onCreatePerson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    createMutation.mutate({
      first_name: form.get('first_name'),
      last_name: form.get('last_name'),
      phone: form.get('phone') || null,
      email: form.get('email') || null,
      address: form.get('address') || null,
      membership_status: form.get('membership_status') || 'MEMBER',
      foundation_class_status: form.get('foundation_class_status') || 'NOT_STARTED',
      birth_month: form.get('birth_month') ? Number(form.get('birth_month')) : null,
      birth_day: form.get('birth_day') ? Number(form.get('birth_day')) : null,
      anniversary_month: form.get('anniversary_month') ? Number(form.get('anniversary_month')) : null,
      anniversary_day: form.get('anniversary_day') ? Number(form.get('anniversary_day')) : null,
    })
  }

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Membership & Directory"
        badgeIcon={<Users className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {(directory.data ?? []).length} people listed
          </Badge>
        }
        title="People & Membership Directory"
        subtitle="Single canonical directory across Visitors, First-Timers, Foundation Class, Members, and Stewards."
        actions={
          <>
            {hasCapability(me, 'visitors.capture') && (
              <Link
                to="/intake"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary/30 bg-white/80 px-4 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/10"
              >
                <UserPlus className="h-4 w-4" />
                Visitor Intake
              </Link>
            )}
            {canWrite && (
              <Button onClick={() => setShowAddModal((v) => !v)}>
                {showAddModal ? (
                  <>
                    <X className="h-4 w-4" /> Close Form
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add Member
                  </>
                )}
              </Button>
            )}
          </>
        }
      />

      {banner && <Alert tone="success">{banner}</Alert>}
      {error && <Alert>{error}</Alert>}

      {/* Add Member Drawer/Card */}
      {showAddModal && canWrite && (
        <form
          onSubmit={onCreatePerson}
          className="glass-card grid gap-4 rounded-2xl border border-border/60 p-6 sm:grid-cols-3"
        >
          <div className="sm:col-span-3 flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Add Person to Directory</h2>
              <p className="text-xs text-muted-foreground">
                Create a verified church member or worker record directly in the canonical directory.
              </p>
            </div>
            <Badge variant="default">Direct Entry</Badge>
          </div>

          <Field label="First name" name="first_name" placeholder="e.g. Chidinma" required />
          <Field label="Last name" name="last_name" placeholder="e.g. Okafor" required />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            placeholder="+234 803 000 0000"
            icon={<Phone className="h-4 w-4" />}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="member@example.com"
            icon={<Mail className="h-4 w-4" />}
          />
          <Field
            label="Address"
            name="address"
            placeholder="Residential address"
            icon={<MapPin className="h-4 w-4" />}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-tight text-foreground">Standing</label>
            <select
              name="membership_status"
              defaultValue="MEMBER"
              className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="FIRST_TIMER">First-Timer</option>
              <option value="VISITOR">Visitor</option>
              <option value="FOUNDATION">Foundation Candidate</option>
              <option value="MEMBER">Member</option>
              <option value="WORKER">Worker</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Birth Month (1-12)" name="birth_month" type="number" min={1} max={12} />
            <Field label="Birth Day (1-31)" name="birth_day" type="number" min={1} max={31} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Anniv Month (1-12)" name="anniversary_month" type="number" min={1} max={12} />
            <Field label="Anniv Day (1-31)" name="anniversary_day" type="number" min={1} max={31} />
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={createMutation.isPending} className="w-full">
              Save Member
            </Button>
          </div>
        </form>
      )}

      {/* Search & Filter Tabs */}
      <div className="glass-card flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border/70 bg-white/70 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                {tab.key === 'CELEBRATIONS' && <Cake className="h-3.5 w-3.5" />}
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or email…"
            className="h-10 w-full rounded-xl border border-input bg-white/85 pl-9 pr-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Directory Table */}
      <section className="glass-card overflow-hidden rounded-2xl border border-border/60">
        {directory.isPending ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading directory…</p>
        ) : (directory.data?.length ?? 0) === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium text-foreground">No people match the current filter</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try clearing your search query or switching standing tabs above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Standing</th>
                  <th className="px-5 py-3.5">Foundation Class</th>
                  <th className="px-5 py-3.5">Celebrations</th>
                  <th className="px-5 py-3.5">Verification &amp; Claim</th>
                  <th className="px-5 py-3.5 text-right">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(directory.data ?? []).map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-secondary/35">
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        {p.photo_url ? (
                          <img
                            src={p.photo_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {p.first_name[0]}
                            {p.last_name[0]}
                          </div>
                        )}
                        <div>
                          <div>
                            {p.first_name} {p.last_name}
                          </div>
                          {p.address && (
                            <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {p.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {p.phone && (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Phone className="h-3 w-3 text-primary" />
                          {p.phone}
                        </div>
                      )}
                      {p.email && (
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {p.email}
                        </div>
                      )}
                      {!p.phone && !p.email && p.missing_contact_reason && (
                        <span className="italic text-amber-700">No contact: {p.missing_contact_reason}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {canWrite ? (
                        <select
                          aria-label={`Standing for ${p.first_name} ${p.last_name}`}
                          value={p.membership_status}
                          onChange={(e) =>
                            updateMutation.mutate({
                              personId: p.id,
                              body: { membership_status: e.target.value as MembershipStatus },
                            })
                          }
                          className="rounded-xl border border-input bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs outline-none focus:border-primary"
                        >
                          <option value="FIRST_TIMER">FIRST_TIMER</option>
                          <option value="VISITOR">VISITOR</option>
                          <option value="FOUNDATION">FOUNDATION</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="WORKER">WORKER</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      ) : (
                        <Badge variant={STATUS_BADGE_VARIANT[p.membership_status] ?? 'secondary'}>
                          {p.membership_status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {canWrite ? (
                        <select
                          aria-label={`Foundation Class for ${p.first_name} ${p.last_name}`}
                          value={p.foundation_class_status}
                          onChange={(e) =>
                            updateMutation.mutate({
                              personId: p.id,
                              body: { foundation_class_status: e.target.value as FoundationClassStatus },
                            })
                          }
                          className="rounded-xl border border-input bg-white/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs outline-none focus:border-primary"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed ✓</option>
                        </select>
                      ) : (
                        <Badge
                          variant={
                            p.foundation_class_status === 'COMPLETED'
                              ? 'success'
                              : p.foundation_class_status === 'IN_PROGRESS'
                                ? 'purple'
                                : 'secondary'
                          }
                        >
                          {p.foundation_class_status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {p.birth_month && p.birth_day && (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Cake className="h-3.5 w-3.5 text-primary" />
                          {MONTHS[p.birth_month - 1]} {p.birth_day}
                        </div>
                      )}
                      {p.anniversary_month && p.anniversary_day && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-foreground">
                          <Heart className="h-3.5 w-3.5 text-pink-600" />
                          {MONTHS[p.anniversary_month - 1]} {p.anniversary_day}
                        </div>
                      )}
                      {!p.birth_month && !p.anniversary_month && '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {p.is_verified ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </Badge>
                        ) : canWrite ? (
                          <button
                            type="button"
                            onClick={() => verifyMutation.mutate(p.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify Profile
                          </button>
                        ) : (
                          <span className="text-muted-foreground">Unverified</span>
                        )}

                        {p.account_status === 'ACTIVE' && (
                          <Badge variant="default">Account Active</Badge>
                        )}

                        {canWrite && p.is_verified && p.email && p.account_status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => claimInviteMutation.mutate(p.id)}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <Send className="h-3 w-3" />
                            {p.account_status === 'PENDING' ? 'Resend Claim Link' : 'Send Claim Invite'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        {p.attendance_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
