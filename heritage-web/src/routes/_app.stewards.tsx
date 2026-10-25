import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Mail, Phone, RefreshCw, Send, ShieldAlert, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { Alert, Badge, Button, Field, PageBanner } from '#/components/ui'
import { api, ApiError, type Role, type Steward, type Team } from '#/lib/api'
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

  const canInvite = hasCapability(me, 'stewards.invite')
  const canManage = hasCapability(me, 'stewards.manage')
  const isAdmin = me?.assignments.some((a) => a.role === 'ADMIN') ?? false

  const [role, setRole] = useState<Role>('STEWARD')
  const [formError, setFormError] = useState<ApiError | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<{ person_id: string; invitation: { delivery: 'SENT' | 'FAILED' } }>('/stewards/invitations', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['stewards'] })
      setFormError(null)
      setBanner(
        res.invitation.delivery === 'SENT'
          ? { tone: 'success', text: 'Invitation sent via Resend. The steward can now activate their account.' }
          : {
              tone: 'info',
              text: 'Steward created, but email delivery failed. Check RESEND_API_KEY and use Resend Invite.',
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
    inviteMutation.mutate(
      {
        first_name: form.get('first_name'),
        last_name: form.get('last_name'),
        email: form.get('email'),
        phone: form.get('phone') || undefined,
        role,
        team_id: TEAM_ROLES.has(role) ? form.get('team_id') : null,
      },
      { onSuccess: () => formEl.reset() },
    )
  }

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Administration"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {(stewards.data ?? []).length} appointed stewards
          </Badge>
        }
        title="Stewards & Invitations"
        subtitle="Invite stewards by email into the Information Center or Membership team. They receive a single-use claim link to activate their console account."
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {canInvite && (
        <section className="glass-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Invite a Steward</h2>
              <p className="text-xs text-muted-foreground">
                Send an official Heritage MMC onboarding email with a single-use activation link.
              </p>
            </div>
            <Badge variant="default">
              <Send className="h-3 w-3" /> Email Onboarding
            </Badge>
          </div>

          <form onSubmit={onInvite} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
            {formError && formError.status !== 400 && (
              <div className="sm:col-span-2">
                <Alert>{formError.message}</Alert>
              </div>
            )}
            <Field
              label="First name"
              name="first_name"
              placeholder="e.g. Samuel"
              required
              error={formError?.fieldErrors.first_name}
            />
            <Field
              label="Last name"
              name="last_name"
              placeholder="e.g. Adeyemi"
              required
              error={formError?.fieldErrors.last_name}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="steward@heritagemmc.site"
              required
              icon={<Mail className="h-4 w-4" />}
              error={formError?.fieldErrors.email}
            />
            <Field
              label="Phone (optional)"
              name="phone"
              type="tel"
              placeholder="+234 803 000 0000"
              icon={<Phone className="h-4 w-4" />}
              error={formError?.fieldErrors.phone}
            />

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

      {/* Steward roster */}
      <section className="glass-card overflow-hidden rounded-2xl border border-border/60">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Current Stewards</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Information Center &amp; Membership Team Roster
          </span>
        </div>

        {stewards.isPending ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading stewards…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Appointments</th>
                  <th className="px-6 py-3.5">Account</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(stewards.data ?? []).map((s) => (
                  <tr key={s.person_id} className="transition-colors hover:bg-secondary/35">
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {s.first_name[0]}
                          {s.last_name[0]}
                        </div>
                        <span>
                          {s.first_name} {s.last_name}
                        </span>
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
    </div>
  )
}

function StatusBadge({ status }: { status: Steward['status'] }) {
  const variant = {
    ACTIVE: 'success' as const,
    PENDING: 'warning' as const,
    SUSPENDED: 'danger' as const,
  }[status]
  return <Badge variant={variant}>{status}</Badge>
}
