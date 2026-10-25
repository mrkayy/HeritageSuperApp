import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '#/components/ui'
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

const TEAM_ROLES: Set<Role> = new Set(['TEAM_LEAD', 'STEWARD'])

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Stewards &amp; Invitations</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Invite stewards by email. They receive a single-use claim link to verify their identity and set a password.
        </p>
      </div>

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {canInvite && (
        <section className="rounded-xl border border-[var(--line)] bg-white p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">Invite a steward</h2>
          <form onSubmit={onInvite} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
            {formError && formError.status !== 400 && (
              <div className="sm:col-span-2">
                <Alert>{formError.message}</Alert>
              </div>
            )}
            <Field label="First name" name="first_name" required error={formError?.fieldErrors.first_name} />
            <Field label="Last name" name="last_name" required error={formError?.fieldErrors.last_name} />
            <Field label="Email" name="email" type="email" required error={formError?.fieldErrors.email} />
            <Field label="Phone (optional)" name="phone" type="tel" error={formError?.fieldErrors.phone} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role-select" className="text-sm font-medium text-[var(--ink)]">
                Role
              </label>
              <select
                id="role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
              >
                <option value="STEWARD">Steward (Team worker)</option>
                {isAdmin && <option value="TEAM_LEAD">Team Lead</option>}
                {isAdmin && <option value="PASTOR">Pastor</option>}
                {isAdmin && <option value="ADMIN">Church Admin</option>}
              </select>
            </div>

            {TEAM_ROLES.has(role) && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="team-select" className="text-sm font-medium text-[var(--ink)]">
                  Team
                </label>
                <select
                  id="team-select"
                  name="team_id"
                  required
                  className="h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
                >
                  {(teams.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {formError?.fieldErrors.team_id && (
                  <p className="text-xs font-medium text-red-700">{formError.fieldErrors.team_id}</p>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" loading={inviteMutation.isPending}>
                Send invitation email
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Steward roster */}
      <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">Current Stewards</h2>
        </div>

        {stewards.isPending ? (
          <p className="p-6 text-sm text-[var(--ink-soft)]">Loading stewards…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Appointments</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {(stewards.data ?? []).map((s) => (
                  <tr key={s.person_id}>
                    <td className="px-6 py-3.5 font-medium text-[var(--ink)]">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="px-6 py-3.5 text-[var(--ink-soft)]">{s.email}</td>
                    <td className="px-6 py-3.5">
                      {s.assignments.map((a) => (a.team ? `${a.role_label} (${a.team.name})` : a.role_label)).join(', ')}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {canInvite && s.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => actionMutation.mutate({ path: `/stewards/${s.person_id}/invitations/resend` })}
                            className="text-xs font-semibold text-[var(--brand)] hover:underline"
                          >
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
                            className="text-xs font-semibold text-red-700 hover:underline"
                          >
                            {s.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
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
  const styles = {
    ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    SUSPENDED: 'bg-red-50 text-red-800 border-red-200',
  }[status]
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}>{status}</span>
}
