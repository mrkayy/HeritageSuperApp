import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, useMemo, type FormEvent } from 'react'
import {
  CheckCircle2,
  HelpCircle,
  Info,
  Mail,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import { api, ApiError, type DirectoryPerson, type Role, type Steward, type Team } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

export const Route = createFileRoute('/_app/stewards')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'stewards.read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StewardsPage,
})

const TEAM_ROLES: Set<Role> = new Set(['TEAM_LEAD', 'ASSISTANT_TEAM_LEAD', 'STEWARD'])

function StewardsPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()

  const stewards = useQuery({
    queryKey: ['stewards'],
    queryFn: () => api<Steward[]>('/stewards'),
  })

  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: () => api<Team[]>('/teams'),
  })

  const people = useQuery({
    queryKey: ['directory-candidates'],
    queryFn: () => api<DirectoryPerson[]>('/people'),
  })

  const canInvite = hasCapability(me, 'stewards.invite')
  const canManage = hasCapability(me, 'stewards.manage')
  const isAdmin = me?.assignments.some((a) => a.role === 'ADMIN') ?? false

  const [tab, setTab] = useState<'invited_by_me' | 'all'>('invited_by_me')
  const [inviteMode, setInviteMode] = useState<'existing' | 'new'>('existing')
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('STEWARD')
  const [formError, setFormError] = useState<ApiError | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)
  const [showHelperBubble, setShowHelperBubble] = useState(false)

  // Eligible directory people for invite: those without active accounts
  const eligibleDirectoryPeople = useMemo(() => {
    return (people.data ?? []).filter((p) => p.account_status !== 'ACTIVE')
  }, [people.data])

  function handleSelectExistingPerson(personId: string) {
    setSelectedPersonId(personId)
    const person = eligibleDirectoryPeople.find((p) => p.id === personId)
    if (person) {
      setFirstName(person.first_name)
      setLastName(person.last_name)
      setEmail(person.email || '')
      setPhone(person.phone || '')
    } else {
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
    }
  }

  const inviteMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<{ person_id: string; invitation: { delivery: 'SENT' | 'FAILED' } }>('/stewards/invitations', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (res) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stewards'] }),
        queryClient.invalidateQueries({ queryKey: ['directory-candidates'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
      ])
      setFormError(null)
      setSelectedPersonId('')
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setBanner(
        res.invitation.delivery === 'SENT'
          ? { tone: 'success', text: 'Invitation sent via Resend. The steward can now activate their account and log in.' }
          : {
              tone: 'info',
              text: 'Steward appointed, but email delivery failed. Check RESEND_API_KEY and use Resend Invite.',
            },
      )
    },
    onError: (err) => setFormError(err instanceof ApiError ? err : null),
  })

  const actionMutation = useMutation({
    mutationFn: ({ path }: { path: string }) => api(path, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stewards'] })
    },
    onError: (err) =>
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Action could not be completed.' }),
  })

  function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    setBanner(null)

    inviteMutation.mutate({
      person_id: inviteMode === 'existing' && selectedPersonId ? selectedPersonId : null,
      first_name: firstName.trim() || String(form.get('first_name') ?? '').trim(),
      last_name: lastName.trim() || String(form.get('last_name') ?? '').trim(),
      email: email.trim() || String(form.get('email') ?? '').trim(),
      phone: phone.trim() || String(form.get('phone') ?? '').trim() || undefined,
      role,
      team_id: TEAM_ROLES.has(role) ? form.get('team_id') : null,
    })
  }

  // Filtered lists based on view
  const allStewardsList = stewards.data ?? []
  const invitedByMeList = allStewardsList.filter((s) => s.invited_by_me && !s.is_self && s.status !== 'SUSPENDED')
  const displayedStewards = tab === 'invited_by_me' ? invitedByMeList : allStewardsList

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Administration"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {invitedByMeList.length} invited by you · {allStewardsList.length} total stewards
          </Badge>
        }
        title="Stewards & Invitations"
        subtitle="Manage login access and operational team appointments for stewards. Appointed stewards receive a single-use claim link to activate their console account."
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {canInvite && (
        <section className="glass-card rounded-2xl border border-border/60 p-6">
          <div className="flex flex-col gap-2 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Invite a Steward</h2>
              <p className="text-xs text-muted-foreground">
                Grant login access and appoint a person into an operational ministry team.
              </p>
            </div>

            {/* Toggle: Existing from Directory vs New Person */}
            <div className="inline-flex rounded-xl border border-border/60 bg-secondary/50 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setInviteMode('existing')
                  setSelectedPersonId('')
                }}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  inviteMode === 'existing'
                    ? 'bg-white text-primary shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Existing from Directory
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviteMode('new')
                  setSelectedPersonId('')
                  setFirstName('')
                  setLastName('')
                  setEmail('')
                  setPhone('')
                }}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  inviteMode === 'new'
                    ? 'bg-white text-primary shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                New Person
              </button>
            </div>
          </div>

          <form onSubmit={onInvite} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
            {formError && formError.status !== 400 && (
              <div className="sm:col-span-2">
                <Alert>{formError.message}</Alert>
              </div>
            )}

            {/* Existing Person Selector */}
            {inviteMode === 'existing' && (
              <div className="sm:col-span-2 flex flex-col gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <label htmlFor="directory-person-select" className="text-xs font-semibold text-foreground">
                  Select Existing Person from Person Table / Directory
                </label>
                <select
                  id="directory-person-select"
                  value={selectedPersonId}
                  onChange={(e) => handleSelectExistingPerson(e.target.value)}
                  className="h-11 rounded-xl border border-input bg-white px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                >
                  <option value="">-- Choose an existing person ({eligibleDirectoryPeople.length} eligible) --</option>
                  {eligibleDirectoryPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.membership_status} {p.email ? `· ${p.email}` : '· No email'})
                    </option>
                  ))}
                </select>
                {selectedPersonId && (
                  <p className="text-[11px] text-primary">
                    <CheckCircle2 className="inline h-3 w-3 mr-1" />
                    Person linked. Appointing them will grant login access and send a claim link.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="first-name-input" className="text-xs font-semibold text-foreground">First name</label>
              <input
                id="first-name-input"
                name="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Samuel"
                required
                className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
              />
              {formError?.fieldErrors.first_name && (
                <p className="text-xs font-medium text-destructive">{formError.fieldErrors.first_name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="last-name-input" className="text-xs font-semibold text-foreground">Last name</label>
              <input
                id="last-name-input"
                name="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Adeyemi"
                required
                className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
              />
              {formError?.fieldErrors.last_name && (
                <p className="text-xs font-medium text-destructive">{formError.fieldErrors.last_name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email-input" className="text-xs font-semibold text-foreground">Login Email</label>
              <div className="relative">
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="steward@heritagemmc.site"
                  required
                  className="h-11 w-full rounded-xl border border-input bg-white/85 pl-10 pr-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                />
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              {formError?.fieldErrors.email && (
                <p className="text-xs font-medium text-destructive">{formError.fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone-input" className="text-xs font-semibold text-foreground">Phone (optional)</label>
              <div className="relative">
                <input
                  id="phone-input"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="h-11 w-full rounded-xl border border-input bg-white/85 pl-10 pr-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                />
                <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              {formError?.fieldErrors.phone && (
                <p className="text-xs font-medium text-destructive">{formError.fieldErrors.phone}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role-select" className="text-xs font-semibold tracking-tight text-foreground">
                Role
              </label>
              <select
                id="role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
              >
                <option value="STEWARD">Steward (Team worker)</option>
                <option value="ASSISTANT_TEAM_LEAD">Assistant Team Lead</option>
                {isAdmin && <option value="TEAM_LEAD">Team Lead</option>}
                {isAdmin && <option value="PASTOR">Pastor</option>}
                {isAdmin && <option value="ADMIN">Church Admin</option>}
              </select>
            </div>

            {TEAM_ROLES.has(role) && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="team-select" className="text-xs font-semibold tracking-tight text-foreground">
                  Operational Team
                </label>
                <select
                  id="team-select"
                  name="team_id"
                  required
                  className="h-11 rounded-xl border border-input bg-white/85 px-3.5 text-sm text-foreground shadow-2xs outline-none focus:border-primary"
                >
                  {(teams.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {formError?.fieldErrors.team_id && (
                  <p className="text-xs font-medium text-destructive">{formError.fieldErrors.team_id}</p>
                )}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end pt-1">
              <Button type="submit" loading={inviteMutation.isPending}>
                <Send className="h-4 w-4" />
                Send Invitation Email
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Steward roster with filter tabs */}
      <section className="glass-card overflow-hidden rounded-2xl border border-border/60">
        <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Stewards Roster</h2>
          </div>

          {/* View Filter Tabs: People I Invited vs All Stewards */}
          <div className="inline-flex rounded-xl border border-border/60 bg-secondary/50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab('invited_by_me')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                tab === 'invited_by_me'
                  ? 'bg-white text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              People I Invited
              <Badge variant={tab === 'invited_by_me' ? 'default' : 'secondary'} className="ml-1 text-[10px] px-1.5 py-0">
                {invitedByMeList.length}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                tab === 'all'
                  ? 'bg-white text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              All Stewards
              <Badge variant={tab === 'all' ? 'default' : 'secondary'} className="ml-1 text-[10px] px-1.5 py-0">
                {allStewardsList.length}
              </Badge>
            </button>
          </div>
        </div>

        {stewards.isPending ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading stewards…</p>
        ) : displayedStewards.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <UserPlus className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">
              {tab === 'invited_by_me' ? 'No stewards invited by you yet' : 'No stewards appointed yet'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {tab === 'invited_by_me'
                ? 'Use the "Invite a Steward" form above to invite someone from the directory or create a new steward.'
                : 'Appointed stewards with login accounts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Appointments</th>
                  <th className="px-6 py-3.5">Provenance</th>
                  <th className="px-6 py-3.5">Login Access</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {displayedStewards.map((s) => (
                  <tr key={s.person_id} className="transition-colors hover:bg-secondary/35">
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {s.first_name[0]}
                          {s.last_name[0]}
                        </div>
                        <div>
                          <span>
                            {s.first_name} {s.last_name}
                          </span>
                          {s.is_self && (
                            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{s.email}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {s.assignments.map((a) => (
                          <Badge key={a.id} variant="secondary">
                            {a.team ? `${a.role_label} · ${a.team.name}` : a.role_label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      {s.invited_by_me ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50/50">
                          Invited by You
                        </Badge>
                      ) : s.is_self ? (
                        <span className="text-muted-foreground">System Account</span>
                      ) : (
                        <span className="text-muted-foreground">Church Leader</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        {canInvite && s.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => actionMutation.mutate({ path: `/stewards/${s.person_id}/invitations/resend` })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resend invite
                          </button>
                        )}
                        {canManage && s.person_id !== me?.person_id && (
                          <button
                            type="button"
                            onClick={() =>
                              actionMutation.mutate({
                                path: `/stewards/${s.person_id}/${s.status === 'SUSPENDED' ? 'reactivate' : 'suspend'}`,
                              })
                            }
                            className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
                              s.status === 'SUSPENDED' ? 'text-emerald-700' : 'text-destructive'
                            }`}
                          >
                            {s.status === 'SUSPENDED' ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" /> Reactivate
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5" /> Suspend
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Floating Helper Bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showHelperBubble && (
          <div
            role="dialog"
            aria-label="How to grant login access guide"
            className="w-[calc(100vw-3rem)] max-w-md rounded-2xl border border-primary/25 bg-white/95 p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Info className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  How to grant login access to people
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelperBubble(false)}
                aria-label="Close helper guide"
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs text-foreground">
              <p className="leading-relaxed text-muted-foreground">
                You have two official ways to grant login access to existing members, visitors, or workers from the database:
              </p>
              <div className="space-y-2.5 pt-1">
                <div className="rounded-xl border border-border/60 bg-secondary/35 p-3">
                  <span className="font-semibold text-primary">1. Appoint as Steward / Worker (Here)</span>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    In the form on this page, select <strong>&ldquo;Existing from Directory&rdquo;</strong>. Choose the person, assign their operational team &amp; role, and send an invite. They receive a claim link for full console access.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/35 p-3">
                  <span className="font-semibold text-primary">2. General Member Claim Access</span>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    Go to{' '}
                    <Link
                      to="/directory"
                      onClick={() => setShowHelperBubble(false)}
                      className="font-medium underline hover:text-primary"
                    >
                      People Directory
                    </Link>
                    , locate the person, click <strong>Verify</strong> (if unverified), then click{' '}
                    <strong>Claim Invite</strong>. This grants personal member portal access without an operational staff role.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowHelperBubble((prev) => !prev)}
          aria-expanded={showHelperBubble}
          aria-label="Toggle access guide helper"
          className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95"
        >
          {showHelperBubble ? (
            <>
              <X className="h-4 w-4" />
              <span>Close Guide</span>
            </>
          ) : (
            <>
              <HelpCircle className="h-4 w-4" />
              <span>How to Grant Access</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Steward['status'] }) {
  const label = {
    ACTIVE: 'Active Access',
    PENDING: 'Pending Claim',
    SUSPENDED: 'Suspended',
  }[status]

  const variant = {
    ACTIVE: 'success' as const,
    PENDING: 'warning' as const,
    SUSPENDED: 'danger' as const,
  }[status]
  return <Badge variant={variant}>{label}</Badge>
}
