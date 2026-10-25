import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Alert, Badge, Button, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type ImportJobDetail,
  type ImportJobRowItem,
  type ImportJobSummaryItem,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Bulk CSV directory import for the Information Center and Membership teams (HOF-012-S02..S04).
 * Upload -> preview (nothing created) -> edit rows -> row-idempotent commit -> error report.
 */
export const Route = createFileRoute('/_app/import')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'people.import')) throw redirect({ to: '/dashboard' })
  },
  component: ImportPage,
})

const TEMPLATE =
  'first_name,last_name,phone,email,address,membership_status,birth_month,birth_day,anniversary_month,anniversary_day\n' +
  'Chidinma,Okafor,+2348031234567,chidinma@example.com,12 Allen Ave Ikeja,MEMBER,3,14,,\n'

const STATE_VARIANT = {
  READY: 'default',
  APPLIED: 'success',
  INVALID: 'danger',
  REVIEW_REQUIRED: 'warning',
  SKIPPED: 'secondary',
} as const

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function ImportPage() {
  const queryClient = useQueryClient()
  const [job, setJob] = useState<ImportJobDetail | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const history = useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => api<ImportJobSummaryItem[]>('/people/import-jobs'),
  })

  const fail = (fallback: string) => (err: unknown) =>
    setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : fallback })

  const previewMutation = useMutation({
    mutationFn: (v: { file_name: string; csv_text: string }) =>
      api<ImportJobDetail>('/people/import-jobs', { method: 'POST', body: v }),
    onSuccess: async (res) => {
      setJob(res)
      setBanner({ tone: 'info', text: 'Preview ready. No people have been created yet.' })
      await queryClient.invalidateQueries({ queryKey: ['import-jobs'] })
    },
    onError: fail('Could not read that CSV.'),
  })

  const rowMutation = useMutation({
    mutationFn: (v: { rowId: string; body: Record<string, unknown> }) =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/rows/${v.rowId}`, { method: 'PATCH', body: v.body }),
    onSuccess: setJob,
    onError: fail('Could not update row.'),
  })

  const commitMutation = useMutation({
    mutationFn: () =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/commit`, {
        method: 'POST',
        body: { idempotency_key: `import-${job!.id}` },
      }),
    onSuccess: async (res) => {
      setJob(res)
      setBanner({
        tone: res.summary.failed_count + res.summary.review_required_count > 0 ? 'info' : 'success',
        text: `Applied ${res.summary.applied_count} · Failed ${res.summary.failed_count} · Needs review ${res.summary.review_required_count}.`,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['import-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: fail('Commit failed. Retrying is safe — rows are applied once.'),
  })

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    previewMutation.mutate({ file_name: file.name, csv_text: await file.text() })
  }

  async function onErrorReport() {
    if (!job) return
    const res = await api<{ file_name: string; csv: string }>(`/people/import-jobs/${job.id}/error-report`)
    download(res.file_name, res.csv)
  }

  const committed = job?.status === 'COMMITTED'
  const attention = (job?.summary.failed_count ?? 0) + (job?.summary.review_required_count ?? 0)

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Information Center & Membership"
        badgeIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
        title="Bulk CSV Import"
        subtitle="Upload, preview and fix rows before anything is saved. Duplicates and verified profiles are held for review, never overwritten."
        actions={
          <>
            <Button variant="outline" onClick={() => download('heritage-import-template.csv', TEMPLATE)}>
              <Download className="h-4 w-4" /> Template
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              {previewMutation.isPending ? 'Reading…' : 'Upload CSV'}
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
            </label>
          </>
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {job && (
        <section className="glass-card overflow-hidden rounded-2xl border border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{job.file_name}</h2>
              <Badge variant={committed ? 'success' : 'warning'}>{committed ? 'Committed' : 'Preview only'}</Badge>
              <Badge variant="outline">{job.summary.total_rows} rows</Badge>
              <Badge variant="success">{job.summary.applied_count} applied</Badge>
              <Badge variant="danger">{job.summary.failed_count} failed</Badge>
              <Badge variant="warning">{job.summary.review_required_count} review</Badge>
            </div>
            <div className="flex gap-2">
              {attention > 0 && (
                <Button variant="outline" size="sm" onClick={onErrorReport}>
                  <Download className="h-3.5 w-3.5" /> Error report
                </Button>
              )}
              {!committed && (
                <Button size="sm" loading={commitMutation.isPending} onClick={() => commitMutation.mutate()}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Commit {job.summary.ready_count} ready rows
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Standing</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {job.rows.map((r: ImportJobRowItem) => (
                  <tr key={r.id} className="align-top hover:bg-secondary/35">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.row_index}</td>
                    <td className="px-4 py-3 font-semibold">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{r.phone}</div>
                      <div>{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.membership_status}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATE_VARIANT[r.state]}>{r.state}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {[...r.errors, ...r.warnings].map((m) => (
                        <p key={m} className="flex items-start gap-1 text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {m}
                        </p>
                      ))}
                      {!committed && r.state === 'REVIEW_REQUIRED' && !r.matched_person_id && (
                        <button
                          type="button"
                          className="mt-1 font-semibold text-primary hover:underline"
                          onClick={() => rowMutation.mutate({ rowId: r.id, body: { approve_review: true } })}
                        >
                          Approve as new person
                        </button>
                      )}
                      {r.matched_person_id && r.state === 'REVIEW_REQUIRED' && (
                        <p className="mt-1 font-medium text-muted-foreground">Held — will not overwrite existing record.</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="glass-card rounded-2xl border border-border/60 p-5">
        <h2 className="mb-3 text-sm font-bold text-foreground">Recent imports</h2>
        {(history.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No imports yet.</p>
        ) : (
          <ul className="divide-y divide-border/50 text-xs">
            {history.data?.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold">{j.file_name}</span>
                <span className="text-muted-foreground">
                  {j.summary.applied_count} applied · {j.summary.failed_count} failed · {j.summary.review_required_count} review ·{' '}
                  {new Date(j.created_at).toLocaleString()}
                </span>
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={async () => setJob(await api<ImportJobDetail>(`/people/import-jobs/${j.id}`))}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
