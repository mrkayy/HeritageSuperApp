import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '#/components/ui'
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
  { key: 'CELEBRATIONS', label: '🎂 Celebrations (This Month)' },
]

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">People &amp; Membership Directory</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Single canonical directory across Visitors, First-Timers, Foundation Class, Members, and Stewards.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasCapability(me, 'visitors.capture') && (
            <Link
              to="/intake"
              className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--muted)]"
            >
              Visitor Intake
            </Link>
          )}
          {canWrite && (
            <Button onClick={() => setShowAddModal((v) => !v)}>
              {showAddModal ? 'Close Form' : '+ Add Member'}
            </Button>
          )}
        </div>
      </div>

      {banner && <Alert tone="success">{banner}</Alert>}
      {error && <Alert>{error}</Alert>}

      {/* Add Member Drawer/Card */}
      {showAddModal && canWrite && (
        <form
          onSubmit={onCreatePerson}
          className="grid gap-4 rounded-xl border border-[var(--line)] bg-white p-6 sm:grid-cols-3"
        >
          <h2 className="text-base font-semibold text-[var(--ink)] sm:col-span-3">Add Person to Directory</h2>
          <Field label="First name" name="first_name" required />
          <Field label="Last name" name="last_name" required />
          <Field label="Phone" name="phone" type="tel" />
          <Field label="Email" name="email" type="email" />
          <Field label="Address" name="address" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--ink)]">Standing</label>
            <select
              name="membership_status"
              defaultValue="MEMBER"
              className="h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-[var(--brand)] text-white'
                  : 'border border-[var(--line)] bg-white text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, or email…"
          className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)] sm:w-72"
        />
      </div>

      {/* Directory Table */}
      <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        {directory.isPending ? (
          <p className="p-6 text-sm text-[var(--ink-soft)]">Loading directory…</p>
        ) : (directory.data?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--ink-soft)]">
            No people match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Standing</th>
                  <th className="px-5 py-3">Foundation Class</th>
                  <th className="px-5 py-3">Celebrations</th>
                  <th className="px-5 py-3 text-right">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {(directory.data ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--muted)]/40">
                    <td className="px-5 py-3.5 font-medium text-[var(--ink)]">
                      <div>
                        {p.first_name} {p.last_name}
                      </div>
                      {p.address && <div className="text-xs font-normal text-[var(--ink-soft)]">{p.address}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--ink-soft)]">
                      {p.phone && <div className="font-medium text-[var(--ink)]">{p.phone}</div>}
                      {p.email && <div>{p.email}</div>}
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
                          className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--ink)]"
                        >
                          <option value="FIRST_TIMER">FIRST_TIMER</option>
                          <option value="VISITOR">VISITOR</option>
                          <option value="FOUNDATION">FOUNDATION</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="WORKER">WORKER</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-semibold">
                          {p.membership_status}
                        </span>
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
                          className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--ink)]"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed ✓</option>
                        </select>
                      ) : (
                        <span className="text-xs">{p.foundation_class_status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--ink-soft)]">
                      {p.birth_month && p.birth_day && (
                        <div>🎂 {MONTHS[p.birth_month - 1]} {p.birth_day}</div>
                      )}
                      {p.anniversary_month && p.anniversary_day && (
                        <div>💍 {MONTHS[p.anniversary_month - 1]} {p.anniversary_day}</div>
                      )}
                      {!p.birth_month && !p.anniversary_month && '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[var(--ink)]">
                      {p.attendance_count}
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
