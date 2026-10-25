import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  History,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Alert, Badge, Button } from '#/components/ui'
import { api, ApiError, type IncompleteProfileItem, type ProfileProposalItem } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

export const Route = createFileRoute('/_app/proposals')({
  component: MakerCheckerProposalsPage,
})

function MakerCheckerProposalsPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'pending' | 'incomplete' | 'history'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const canReview = hasCapability(me, 'proposals.review')

  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery<ProfileProposalItem[]>({
    queryKey: ['profile-proposals'],
    queryFn: () => api('/people/proposals'),
  })

  const { data: incompleteProfiles = [], isLoading: isLoadingIncomplete } = useQuery<IncompleteProfileItem[]>({
    queryKey: ['incomplete-profiles'],
    queryFn: () => api('/people/incomplete-profiles'),
    enabled: tab === 'incomplete',
  })

  const reviewMutation = useMutation({
    mutationFn: ({
      proposalId,
      action,
      rejectionReason,
    }: {
      proposalId: string
      action: 'APPROVE' | 'REJECT'
      rejectionReason?: string
    }) =>
      api(`/people/proposals/${proposalId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, rejection_reason: rejectionReason }),
      }),
    onSuccess: (_, vars) => {
      setError(null)
      setBanner(
        vars.action === 'APPROVE'
          ? 'Change proposal approved and committed to live profile.'
          : 'Proposal rejected with reviewer feedback.',
      )
      setRejectingId(null)
      queryClient.invalidateQueries({ queryKey: ['profile-proposals'] })
      queryClient.invalidateQueries({ queryKey: ['directory'] })
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'CANNOT_APPROVE_OWN_PROPOSAL') {
          setError('Anti-Self-Approval (HOF-017-S04): Dual-control requires a different authorized checker to review your proposal.')
        } else if (err.code === 'BASE_PROFILE_STALE') {
          setError('Version Lock (HOF-017-S04): The base profile was modified after this proposal was created. Please refresh and review fresh changes.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to review proposal.')
      }
    },
  })

  const pendingProposals = proposals.filter((p) => p.status === 'PENDING')
  const historyProposals = proposals.filter((p) => p.status !== 'PENDING')
  const staleCount = pendingProposals.filter((p) => p.is_stale).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Maker-Checker Dual Control & Verification (HOF-017)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Profile Change Approvals
          </h1>
          <p className="text-sm text-slate-500">
            Enforces dual-control separation between change makers and checkers before mutating canonical member records.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="glass-card rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Approvals</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{pendingProposals.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Stale Base Versions</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{staleCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Approved History</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {proposals.filter((p) => p.status === 'APPROVED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Incomplete Profiles</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{incompleteProfiles.length || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert tone="error">{error}</Alert>}
      {banner && <Alert tone="success">{banner}</Alert>}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            tab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Pending Approvals ({pendingProposals.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('incomplete')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            tab === 'incomplete'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Incomplete Profiles Queue
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            tab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          Review History ({historyProposals.length})
        </button>
      </div>

      {/* TAB CONTENT: PENDING */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {isLoadingProposals ? (
            <div className="glass-card rounded-2xl border border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800">
              Loading pending proposals...
            </div>
          ) : pendingProposals.length === 0 ? (
            <div className="glass-card rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No Pending Proposals</p>
              <p className="text-xs text-slate-400">
                All profile change requests have been reviewed and committed. No pending maker-checker tasks.
              </p>
            </div>
          ) : (
            pendingProposals.map((proposal) => {
              const isMaker = proposal.maker.id === me?.person_id
              const cannotApproveReason =
                isMaker
                  ? 'Self-approval forbidden: Maker cannot approve own proposal (HOF-017-S04)'
                  : proposal.is_stale
                  ? 'Base record stale: Profile version changed since proposal was created (HOF-017-S04)'
                  : !canReview
                  ? 'Review permission required (proposals.review capability)'
                  : null

              return (
                <div
                  key={proposal.id}
                  className="glass-card overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {proposal.person.first_name} {proposal.person.last_name}
                        </h3>
                        <Badge variant="default">{proposal.person.membership_status}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          v{proposal.base_version}
                        </Badge>
                        {proposal.is_stale && (
                          <Badge variant="danger">
                            Stale Base Record (Live v{proposal.person.version})
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Proposed by{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {proposal.maker.name}
                        </span>{' '}
                        on {new Date(proposal.created_at).toLocaleString()}
                      </p>
                      {proposal.reason && (
                        <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-400">
                          "{proposal.reason}"
                        </p>
                      )}
                    </div>

                    <Badge variant="warning">Pending Dual-Control Review</Badge>
                  </div>

                  {/* Diffs comparison grid */}
                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Field Modification Diff
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {Object.entries(proposal.changes).map(([field, delta]) => (
                        <div
                          key={field}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                        >
                          <span className="font-semibold uppercase tracking-wider text-slate-400">
                            {field.replace('_', ' ')}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="line-through text-slate-400">
                              {delta.old != null ? String(delta.old) : '<empty>'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {delta.proposed != null ? String(delta.proposed) : '<cleared>'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anti-self-approval restriction alert */}
                  {cannotApproveReason && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{cannotApproveReason}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {rejectingId === proposal.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          placeholder="Provide rejection reason for maker..."
                          value={rejectionReasons[proposal.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({ ...prev, [proposal.id]: e.target.value }))
                          }
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <Button
                          variant="danger"
                          onClick={() =>
                            reviewMutation.mutate({
                              proposalId: proposal.id,
                              action: 'REJECT',
                              rejectionReason: rejectionReasons[proposal.id],
                            })
                          }
                          disabled={reviewMutation.isPending}
                        >
                          Confirm Reject
                        </Button>
                        <Button variant="secondary" onClick={() => setRejectingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => setRejectingId(proposal.id)}
                          disabled={!canReview || reviewMutation.isPending}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5 text-rose-500" />
                          Reject Proposal
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() =>
                            reviewMutation.mutate({
                              proposalId: proposal.id,
                              action: 'APPROVE',
                            })
                          }
                          disabled={
                            !canReview || !proposal.can_actor_approve || proposal.is_stale || reviewMutation.isPending
                          }
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Approve & Commit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: INCOMPLETE PROFILES */}
      {tab === 'incomplete' && (
        <div className="space-y-4">
          {isLoadingIncomplete ? (
            <div className="glass-card rounded-2xl border border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800">
              Loading incomplete profiles...
            </div>
          ) : incompleteProfiles.length === 0 ? (
            <div className="glass-card rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">All Profiles Complete</p>
              <p className="text-xs text-slate-400">
                No member or visitor profiles are missing required profiling fields (HOF-017-S01).
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900/50">
                  <tr>
                    <th className="p-3">Person</th>
                    <th className="p-3">Standing</th>
                    <th className="p-3">Missing Fields</th>
                    <th className="p-3">Current Data</th>
                    <th className="p-3 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {incompleteProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-xs text-slate-400">Created {new Date(p.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="default">{p.membership_status}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {p.missing_fields.map((f) => (
                            <Badge key={f} variant="danger">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {p.phone || p.email || p.address ? (
                          <span>{[p.phone, p.email, p.address].filter(Boolean).join(' • ')}</span>
                        ) : (
                          <span className="italic text-slate-400">No contact provided</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {p.is_verified ? (
                          <Badge variant="success">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unverified</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {tab === 'history' && (
        <div className="space-y-4">
          {historyProposals.length === 0 ? (
            <div className="glass-card rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
              <History className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No Review History</p>
              <p className="text-xs text-slate-400">Approved or rejected proposals will be archived here.</p>
            </div>
          ) : (
            historyProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="glass-card rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {proposal.person.first_name} {proposal.person.last_name}
                      </h4>
                      <Badge variant={proposal.status === 'APPROVED' ? 'success' : 'danger'}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Maker: {proposal.maker.name} • Checker: {proposal.checker?.name || '—'} • Reviewed:{' '}
                      {proposal.reviewed_at ? new Date(proposal.reviewed_at).toLocaleString() : '—'}
                    </p>
                    {proposal.rejection_reason && (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        Rejection reason: {proposal.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
