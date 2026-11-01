import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useEffect, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  HeartHandshake,
  Info,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users2,
  X,
} from 'lucide-react'
import { Alert, Badge, Button, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type ImportJobDetail,
  type ImportJobRowItem,
  type ImportJobSummaryItem,
  type ImportRowAction,
  type ServiceOccurrenceSummary,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Bulk Visitor CSV Import for Information Center & Services:
 * - Direct in-cell spreadsheet editing with instant auto-save
 * - Automatic link to a selected Service Occurrence
 * - Records attendance for all imported visitors
 * - Queues 72-hour WELCOME follow-up task
 * - Confidentially records prayer requests in Prayer Notes
 * - Automatically sanitizes duplicates (DB matches -> UPDATE_EXISTING, intra-CSV -> SKIP)
 * - Corner error flags strictly on critical fields (first_name, last_name, phone, email)
 * - Centered pop-up modal for detail inspection and duplicate diff comparison
 */
export const Route = createFileRoute('/_app/visitor-import')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'visitors.capture') && !hasCapability(me, 'people.import')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: VisitorImportPage,
})

const VISITOR_TEMPLATE =
  'First Name,Surname,Phone Number,Email Address,Home Address,Date of Birth,Prayer Request / Notes,Invited By\n' +
  'Samuel,Ogunleye,+2348021234567,samuel.o@example.com,"Plot 14 Lekki Phase 1 Lagos",12-August,"Please pray for my exams and family peace",Sister Deborah\n' +
  'Grace,Adeleke,08039876543,grace.a@example.com,"24 Allen Avenue Ikeja",15-March,"Thanksgiving for new child",Deacon James\n'

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

function formatMonthDay(month?: number | null, day?: number | null) {
  if (!month || !day) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${months[month - 1] ?? month}`
}

interface EditableVisitorRowData {
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  birth_date: string
  prayer_request: string
  inviter: string
  action: ImportRowAction
}

function rowToVisitorData(r: ImportJobRowItem): EditableVisitorRowData {
  const dobText = formatMonthDay(r.birth_month, r.birth_day)
  const isIntraDuplicate = r.warnings.some((w) => w.toLowerCase().includes('duplicate contact of row'))
  const defaultAction: ImportRowAction = r.action
    ? r.action
    : r.matched_person_id
    ? 'UPDATE_EXISTING'
    : isIntraDuplicate
    ? 'SKIP'
    : 'CREATE'

  return {
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    address: r.address ?? '',
    birth_date: dobText,
    prayer_request: r.prayer_request ?? '',
    inviter: r.inviter ?? '',
    action: defaultAction,
  }
}

function VisitorImportPage() {
  const queryClient = useQueryClient()
  const [job, setJob] = useState<ImportJobDetail | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>('')

  // In-cell editable state: rowId -> EditableVisitorRowData
  const [sheetData, setSheetData] = useState<Record<string, EditableVisitorRowData>>({})
  const [savingRowIds, setSavingRowIds] = useState<Set<string>>(new Set())

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'all' | 'duplicates' | 'errors' | 'ready'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Centered Modal Inspector State (for inspection, prayer request review, and duplicate comparison)
  const [inspectorRowId, setInspectorRowId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newRowForm, setNewRowForm] = useState<EditableVisitorRowData | null>(null)

  // Service occurrences for attendance logging
  const occurrences = useQuery({
    queryKey: ['occurrences'],
    queryFn: () => api<ServiceOccurrenceSummary[]>('/attendance/occurrences'),
  })

  // Set default selected occurrence to the first one available
  useEffect(() => {
    if (!selectedOccurrenceId && occurrences.data && occurrences.data.length > 0) {
      setSelectedOccurrenceId(occurrences.data[0].id)
    }
  }, [occurrences.data, selectedOccurrenceId])

  const history = useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => api<ImportJobSummaryItem[]>('/people/import-jobs'),
  })

  // Populate cell data whenever job loads
  useEffect(() => {
    if (!job) return
    const map: Record<string, EditableVisitorRowData> = {}
    for (const r of job.rows) {
      map[r.id] = rowToVisitorData(r)
    }
    setSheetData(map)
  }, [job])

  // Escape key listener to close modal inspector
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setInspectorRowId(null)
        setIsAddingNew(false)
      }
    }
    if (inspectorRowId || isAddingNew) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [inspectorRowId, isAddingNew])

  const fail = (fallback: string) => (err: unknown) =>
    setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : fallback })

  const previewMutation = useMutation({
    mutationFn: (v: {
      file_name: string
      csv_text: string
      default_membership_status?: string
      service_occurrence_id?: string
    }) => api<ImportJobDetail>('/people/import-jobs', { method: 'POST', body: v }),
    onSuccess: async (res) => {
      setJob(res)
      setInspectorRowId(null)
      setActiveTab('all')
      setSearchQuery('')
      setBanner({
        tone: 'info',
        text: `Preview loaded (${res.summary.total_rows} rows). Visitors defaulted to FIRST_TIMER and linked to service occurrence. You can edit cells directly in the table.`,
      })
      await queryClient.invalidateQueries({ queryKey: ['import-jobs'] })
    },
    onError: fail('Could not parse Visitor CSV file.'),
  })

  const rowMutation = useMutation({
    mutationFn: (v: { rowId: string; body: Record<string, unknown> }) =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/rows/${v.rowId}`, { method: 'PATCH', body: v.body }),
    onSuccess: (res, variables) => {
      setJob(res)
      setSavingRowIds((prev) => {
        const next = new Set(prev)
        next.delete(variables.rowId)
        return next
      })
    },
    onError: (err, variables) => {
      setSavingRowIds((prev) => {
        const next = new Set(prev)
        next.delete(variables.rowId)
        return next
      })
      fail('Could not save visitor change.')(err)
    },
  })

  const addRowMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/rows`, { method: 'POST', body }),
    onSuccess: (res) => {
      setJob(res)
      setIsAddingNew(false)
      setNewRowForm(null)
      setBanner({ tone: 'success', text: 'New visitor row added to preview table.' })
    },
    onError: fail('Could not add visitor row.'),
  })

  const deleteRowMutation = useMutation({
    mutationFn: (rowId: string) =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/rows/${rowId}`, { method: 'DELETE' }),
    onSuccess: (res, rowId) => {
      setJob(res)
      if (inspectorRowId === rowId) setInspectorRowId(null)
      setBanner({ tone: 'info', text: 'Visitor removed from import batch.' })
    },
    onError: fail('Could not delete row.'),
  })

  const commitMutation = useMutation({
    mutationFn: () =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/commit`, {
        method: 'POST',
        body: { idempotency_key: `visitor-import-${job!.id}` },
      }),
    onSuccess: async (res) => {
      setJob(res)
      setInspectorRowId(null)
      setBanner({
        tone: res.summary.failed_count + res.summary.review_required_count > 0 ? 'info' : 'success',
        text: `Committed! Applied: ${res.summary.applied_count} visitors. Attendance recorded, welcome follow-ups queued, and prayer requests stored confidentially.`,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['import-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['follow-up'] }),
        queryClient.invalidateQueries({ queryKey: ['prayer-notes'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
    onError: fail('Commit failed. Retrying is safe.'),
  })

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    previewMutation.mutate({
      file_name: file.name,
      csv_text: await file.text(),
      default_membership_status: 'FIRST_TIMER',
      service_occurrence_id: selectedOccurrenceId || undefined,
    })
  }

  async function onErrorReport() {
    if (!job) return
    const res = await api<{ file_name: string; csv: string }>(`/people/import-jobs/${job.id}/error-report`)
    download(res.file_name, res.csv)
  }

  // Update a single cell in local state
  function updateCell(rowId: string, field: keyof EditableVisitorRowData, value: string) {
    setSheetData((prev) => {
      const current = prev[rowId] ?? {
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        address: '',
        birth_date: '',
        prayer_request: '',
        inviter: '',
        action: 'CREATE',
      }
      return {
        ...prev,
        [rowId]: { ...current, [field]: value },
      }
    })
  }

  // Save changes when user leaves cell
  function saveCellOnBlur(rowId: string) {
    if (!job) return
    const currentData = sheetData[rowId]
    if (!currentData) return

    const body: Record<string, unknown> = {
      first_name: currentData.first_name.trim(),
      last_name: currentData.last_name.trim(),
      phone: currentData.phone.trim() || null,
      email: currentData.email.trim() || null,
      address: currentData.address.trim() || null,
      birth_date: currentData.birth_date.trim() || null,
      prayer_request: currentData.prayer_request.trim() || null,
      inviter: currentData.inviter.trim() || null,
      membership_status: 'FIRST_TIMER',
      action: currentData.action,
      approve_review: true,
    }

    setSavingRowIds((prev) => new Set(prev).add(rowId))
    rowMutation.mutate({ rowId, body })
  }

  // Enter key advances down
  function handleCellKeyDown(
    e: ReactKeyboardEvent<HTMLElement>,
    rowIndex: number,
    field: keyof EditableVisitorRowData,
  ) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nextRow = filteredRows[rowIndex + 1]
      if (nextRow) {
        const nextInput = document.querySelector<HTMLElement>(`[data-cell="${nextRow.id}-${String(field)}"]`)
        nextInput?.focus()
      }
    }
  }

  // Resolve all duplicates in 1 click
  async function resolveAllDuplicates(action: ImportRowAction) {
    if (!job) return
    const dupes = job.rows.filter((r) => r.matched_person_id && r.state !== 'APPLIED')
    for (const d of dupes) {
      await api(`/people/import-jobs/${job.id}/rows/${d.id}`, {
        method: 'PATCH',
        body: { action, approve_review: true },
      })
    }
    const fresh = await api<ImportJobDetail>(`/people/import-jobs/${job.id}`)
    setJob(fresh)
    setBanner({
      tone: 'success',
      text: `Updated ${dupes.length} duplicates to "${action === 'UPDATE_EXISTING' ? 'Update Existing' : action}".`,
    })
  }

  // Filtered rows for the table
  const filteredRows = useMemo(() => {
    if (!job) return []
    return job.rows.filter((r) => {
      if (activeTab === 'duplicates') {
        const isIntra = r.warnings.some((w) => w.toLowerCase().includes('duplicate contact'))
        if (!r.matched_person_id && !isIntra) return false
      } else if (activeTab === 'errors') {
        const hasCritical = r.errors.some((e) => {
          const lower = e.toLowerCase()
          return (
            lower.includes('first name') ||
            lower.includes('last name') ||
            lower.includes('email') ||
            lower.includes('phone')
          )
        })
        if (!hasCritical) return false
      } else if (activeTab === 'ready') {
        if (r.state !== 'READY') return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const data = sheetData[r.id] || rowToVisitorData(r)
        const text =
          `${data.first_name} ${data.last_name} ${data.email} ${data.phone} ${data.address} ${data.inviter} ${data.prayer_request}`.toLowerCase()
        return text.includes(q)
      }

      return true
    })
  }, [job, sheetData, activeTab, searchQuery])

  // Critical field error helper
  function getCriticalFieldError(r: ImportJobRowItem, field: keyof EditableVisitorRowData): string | null {
    if (field !== 'first_name' && field !== 'last_name' && field !== 'phone' && field !== 'email') {
      return null
    }
    if (!r.errors || r.errors.length === 0) return null
    for (const err of r.errors) {
      const lower = err.toLowerCase()
      if (field === 'first_name' && lower.includes('first name')) return err
      if (field === 'last_name' && lower.includes('last name')) return err
      if (field === 'email' && lower.includes('email')) return err
      if (field === 'phone' && lower.includes('phone')) return err
    }
    return null
  }

  // Inspector row item
  const inspectorRow = useMemo(() => {
    if (!job || !inspectorRowId) return null
    return job.rows.find((r) => r.id === inspectorRowId) ?? null
  }, [job, inspectorRowId])

  const committed = job?.status === 'COMMITTED'
  const attention = (job?.summary.failed_count ?? 0) + (job?.summary.review_required_count ?? 0)

  const matchedRowsCount = useMemo(() => {
    if (!job) return 0
    return job.rows.filter(
      (r) => Boolean(r.matched_person_id) || r.warnings.some((w) => w.toLowerCase().includes('duplicate contact')),
    ).length
  }, [job])

  const criticalRowsCount = useMemo(() => {
    if (!job) return 0
    return job.rows.filter((r) =>
      r.errors.some((e) => {
        const lower = e.toLowerCase()
        return (
          lower.includes('first name') ||
          lower.includes('last name') ||
          lower.includes('email') ||
          lower.includes('phone')
        )
      }),
    ).length
  }, [job])

  const currentOccurrence = useMemo(() => {
    return occurrences.data?.find((o) => o.id === selectedOccurrenceId) ?? occurrences.data?.[0]
  }, [occurrences.data, selectedOccurrenceId])

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Information Center & Services"
        badgeIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
        title="Visitor CSV Import"
        subtitle="Upload first-timer sheets, edit visitor cells directly, auto-log service attendance, and queue welcome follow-ups."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => download('heritage-visitor-import-template.csv', VISITOR_TEMPLATE)}>
              <Download className="h-4 w-4" /> Download Visitor Template
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              {previewMutation.isPending ? 'Reading CSV…' : 'Upload Visitor CSV'}
              <input type="file" accept=".csv,text/csv,.tsv,.txt" className="sr-only" onChange={onFile} />
            </label>
          </div>
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {/* Service Occurrence Linker Card */}
      <div className="glass-card rounded-2xl border border-border/60 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Target Service Occurrence
            </div>
            <div className="text-sm font-semibold text-foreground">
              {currentOccurrence ? `${currentOccurrence.title} · ${currentOccurrence.service_date}` : 'Select Service'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Attendance and 72-hour WELCOME follow-ups will be linked to this service.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Service Occurrence:</label>
          <select
            className="rounded-xl border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground outline-none cursor-pointer focus:border-primary"
            value={selectedOccurrenceId}
            disabled={committed || previewMutation.isPending}
            onChange={(e) => setSelectedOccurrenceId(e.target.value)}
          >
            {(occurrences.data ?? []).map((occ) => (
              <option key={occ.id} value={occ.id}>
                {occ.title} ({occ.service_date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {job && (
        <section className="glass-card overflow-hidden rounded-2xl border border-border/60">
          {/* Header Controls & Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">{job.file_name || 'visitor-import.csv'}</h2>
                  <Badge variant={job.status === 'COMMITTED' ? 'success' : 'default'} className="text-[10px]">
                    {job.status}
                  </Badge>
                  {job.service_occurrence && (
                    <Badge variant="secondary" className="text-[10px]">
                      {job.service_occurrence.title}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct spreadsheet grid · Click cell to edit · Auto-saves on blur
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewRowForm({
                    first_name: '',
                    last_name: '',
                    phone: '',
                    email: '',
                    address: '',
                    birth_date: '',
                    prayer_request: '',
                    inviter: '',
                    action: 'CREATE',
                  })
                  setIsAddingNew(true)
                }}
                disabled={committed}
              >
                <Plus className="h-4 w-4" /> Add Visitor
              </Button>

              {criticalRowsCount > 0 && (
                <Button variant="outline" size="sm" onClick={onErrorReport}>
                  <Download className="h-4 w-4" /> Download Errors ({criticalRowsCount})
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => commitMutation.mutate()}
                disabled={committed || commitMutation.isPending || job.summary.ready_count === 0}
              >
                <Check className="h-4 w-4" />
                {commitMutation.isPending
                  ? 'Committing Visitors…'
                  : committed
                  ? 'Committed'
                  : `Commit ${job.summary.ready_count} Ready Visitors`}
              </Button>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/20 px-5 py-2.5 border-b border-border/50 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'all'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Visitors ({job.summary.total_rows})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'ready'
                    ? 'bg-card text-emerald-700 shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ready ({job.summary.ready_count})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('duplicates')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'duplicates'
                    ? 'bg-card text-purple-700 shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sanitized Duplicates ({matchedRowsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('errors')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'errors'
                    ? 'bg-card text-red-700 shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Critical Errors ({criticalRowsCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter rows by name, contact, inviter…"
                  className="h-7 w-56 rounded-lg border border-border bg-card pl-8 pr-2 text-xs outline-none focus:border-primary"
                />
              </div>

              {activeTab === 'duplicates' && !committed && matchedRowsCount > 0 && (
                <div className="flex items-center gap-1 pl-2 border-l border-border/60">
                  <span className="text-muted-foreground text-[11px]">Set all:</span>
                  <button
                    type="button"
                    onClick={() => resolveAllDuplicates('UPDATE_EXISTING')}
                    className="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-900 hover:bg-purple-200"
                  >
                    Update Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveAllDuplicates('SKIP')}
                    className="rounded bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary/80"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clean In-Cell Spreadsheet Grid */}
          <div className="relative overflow-x-auto max-h-[640px] border-b border-border/60 bg-white">
            <table className="w-full border-collapse text-left font-sans text-xs select-none">
              <thead className="sticky top-0 z-20 bg-secondary/80 backdrop-blur border-b border-border text-foreground font-semibold">
                <tr>
                  <th className="w-12 px-2 py-2 text-center border-r border-border/70 font-mono text-[11px] text-muted-foreground bg-secondary/90">
                    #
                  </th>
                  <th className="min-w-[140px] px-3 py-2 border-r border-border/70">First Name *</th>
                  <th className="min-w-[140px] px-3 py-2 border-r border-border/70">Surname *</th>
                  <th className="min-w-[140px] px-3 py-2 border-r border-border/70">Phone Number</th>
                  <th className="min-w-[180px] px-3 py-2 border-r border-border/70">Email Address</th>
                  <th className="min-w-[200px] px-3 py-2 border-r border-border/70">Home Address</th>
                  <th className="min-w-[110px] px-3 py-2 border-r border-border/70">Date of Birth</th>
                  <th className="min-w-[220px] px-3 py-2 border-r border-border/70">Prayer Request / Notes</th>
                  <th className="min-w-[140px] px-3 py-2 border-r border-border/70">Invited By</th>
                  <th className="min-w-[180px] px-3 py-2 border-r border-border/70 text-center">Duplicate Action</th>
                  <th className="w-20 px-2 py-2 text-center sticky right-0 bg-secondary/90">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground">
                      No visitor rows match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const rowData = sheetData[r.id] || rowToVisitorData(r)
                    const isSaving = savingRowIds.has(r.id)
                    const isMatched = Boolean(r.matched_person_id)
                    const isIntraDuplicate = r.warnings.some((w) => w.toLowerCase().includes('duplicate contact of row'))

                    const fnErr = getCriticalFieldError(r, 'first_name')
                    const lnErr = getCriticalFieldError(r, 'last_name')
                    const phErr = getCriticalFieldError(r, 'phone')
                    const emErr = getCriticalFieldError(r, 'email')

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-blue-50/30 transition-colors group ${
                          r.state === 'INVALID'
                            ? 'bg-red-50/20'
                            : isMatched
                            ? 'bg-purple-50/20'
                            : isIntraDuplicate
                            ? 'bg-amber-50/15'
                            : ''
                        }`}
                      >
                        {/* Row Index Column */}
                        <td className="w-12 px-1 py-1 text-center font-mono text-[11px] text-muted-foreground border-r border-border/50 bg-secondary/15 flex-shrink-0">
                          <div className="flex items-center justify-center gap-1">
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            ) : (
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  r.state === 'READY'
                                    ? 'bg-emerald-500'
                                    : r.state === 'APPLIED'
                                    ? 'bg-blue-500'
                                    : r.state === 'INVALID'
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }`}
                                title={r.state}
                              />
                            )}
                            <span>{r.row_index}</span>
                          </div>
                        </td>

                        {/* First Name Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {fnErr && (
                            <span
                              className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-l-[8px] border-l-transparent border-t-red-500 cursor-help"
                              title={fnErr}
                            />
                          )}
                          <input
                            type="text"
                            data-cell={`${r.id}-first_name`}
                            value={rowData.first_name}
                            onChange={(e) => updateCell(r.id, 'first_name', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'first_name')}
                            className="w-full h-full px-2.5 text-xs text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 font-medium"
                          />
                        </td>

                        {/* Surname Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {lnErr && (
                            <span
                              className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-l-[8px] border-l-transparent border-t-red-500 cursor-help"
                              title={lnErr}
                            />
                          )}
                          <input
                            type="text"
                            data-cell={`${r.id}-last_name`}
                            value={rowData.last_name}
                            onChange={(e) => updateCell(r.id, 'last_name', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'last_name')}
                            className="w-full h-full px-2.5 text-xs text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 font-medium"
                          />
                        </td>

                        {/* Phone Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {phErr && (
                            <span
                              className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-l-[8px] border-l-transparent border-t-red-500 cursor-help"
                              title={phErr}
                            />
                          )}
                          <input
                            type="text"
                            data-cell={`${r.id}-phone`}
                            value={rowData.phone}
                            placeholder="e.g. +234..."
                            onChange={(e) => updateCell(r.id, 'phone', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'phone')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Email Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {emErr && (
                            <span
                              className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-l-[8px] border-l-transparent border-t-red-500 cursor-help"
                              title={emErr}
                            />
                          )}
                          <input
                            type="email"
                            data-cell={`${r.id}-email`}
                            value={rowData.email}
                            placeholder="visitor@example.com"
                            onChange={(e) => updateCell(r.id, 'email', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'email')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Home Address Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-address`}
                            value={rowData.address}
                            placeholder="Residential address…"
                            onChange={(e) => updateCell(r.id, 'address', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'address')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Date of Birth Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-birth_date`}
                            value={rowData.birth_date}
                            placeholder="e.g. 12-Aug"
                            onChange={(e) => updateCell(r.id, 'birth_date', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'birth_date')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Prayer Request / Notes Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-prayer_request`}
                            value={rowData.prayer_request}
                            placeholder="Confidential prayer need / visitor notes…"
                            onChange={(e) => updateCell(r.id, 'prayer_request', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'prayer_request')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Invited By Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-inviter`}
                            value={rowData.inviter}
                            placeholder="Who invited them…"
                            onChange={(e) => updateCell(r.id, 'inviter', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'inviter')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Duplicate Action Cell */}
                        <td className="relative border-r border-border/50 p-1 h-8 bg-white focus-within:z-10">
                          {isMatched ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={rowData.action}
                                onChange={(e) => {
                                  const act = e.target.value as ImportRowAction
                                  updateCell(r.id, 'action', act)
                                  saveCellOnBlur(r.id)
                                }}
                                className="h-6 w-full rounded px-1.5 text-[11px] font-semibold border border-purple-200 bg-purple-50 text-purple-900 outline-none cursor-pointer"
                                title="Sanitized duplicate: by default updates existing visitor/member"
                              >
                                <option value="UPDATE_EXISTING">Update Existing</option>
                                <option value="CREATE">Create Separate Person</option>
                                <option value="SKIP">Skip Row</option>
                              </select>
                            </div>
                          ) : isIntraDuplicate ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={rowData.action}
                                onChange={(e) => {
                                  const act = e.target.value as ImportRowAction
                                  updateCell(r.id, 'action', act)
                                  saveCellOnBlur(r.id)
                                }}
                                className="h-6 w-full rounded px-1.5 text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-900 outline-none cursor-pointer"
                                title="Duplicate inside this batch: skipped by default"
                              >
                                <option value="SKIP">Skip Intra-Batch</option>
                                <option value="CREATE">Create Separate</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> New Visitor
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Row Actions */}
                        <td className="w-20 px-1 py-0.5 text-center sticky right-0 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border/40">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInspectorRowId(r.id)}
                              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                              title="Inspect visitor details & prayer notes"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRowMutation.mutate(r.id)}
                              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                              title="Discard visitor row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 px-5 py-3 text-xs text-muted-foreground">
            <div>
              Showing {filteredRows.length} of {job.summary.total_rows} visitor records.
              {job.summary.ready_count > 0 && (
                <span className="ml-2 font-medium text-emerald-700">
                  {job.summary.ready_count} ready to commit.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ready
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Matched
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Critical Error
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Centered Modal Inspector Dialog */}
      {(inspectorRowId || isAddingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl bg-card overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4 bg-secondary/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {isAddingNew ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    {isAddingNew
                      ? 'Add New Visitor Row'
                      : `Row #${inspectorRow?.row_index}: ${
                          sheetData[inspectorRow!.id]?.first_name || ''
                        } ${sheetData[inspectorRow!.id]?.last_name || ''}`}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {isAddingNew
                      ? 'Manually enter a visitor to include in this import batch'
                      : 'Review full visitor details, duplicate resolution, and prayer requests'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectorRowId(null)
                  setIsAddingNew(false)
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Errors Callout */}
              {inspectorRow && inspectorRow.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Critical Validation Issues:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {inspectorRow.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duplicate Comparison */}
              {inspectorRow?.matched_person && (
                <div className="rounded-2xl border border-purple-300 bg-purple-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-purple-950">
                      <UserCheck className="h-4 w-4 text-purple-700" />
                      MATCH FOUND IN CHURCH DIRECTORY
                    </div>
                    {inspectorRow.matched_person.is_verified && (
                      <Badge variant="success" className="text-[10px]">
                        Verified Profile
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/90 p-3 rounded-xl border border-purple-200">
                    <div>
                      <div className="font-bold text-muted-foreground mb-1">In Church Database:</div>
                      <div className="font-bold text-foreground">
                        {inspectorRow.matched_person.first_name} {inspectorRow.matched_person.last_name}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        📞 {inspectorRow.matched_person.phone || 'No phone'}
                      </div>
                      <div className="text-muted-foreground">
                        ✉️ {inspectorRow.matched_person.email || 'No email'}
                      </div>
                      <div className="text-muted-foreground">
                        Standing: <strong>{inspectorRow.matched_person.membership_status}</strong>
                      </div>
                      <div className="text-muted-foreground">
                        DOB: {formatMonthDay(inspectorRow.matched_person.birth_month, inspectorRow.matched_person.birth_day) || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-muted-foreground mb-1">In Current Upload:</div>
                      <div className="font-bold text-foreground">
                        {sheetData[inspectorRow.id]?.first_name} {sheetData[inspectorRow.id]?.last_name}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        📞 {sheetData[inspectorRow.id]?.phone || 'No phone'}
                      </div>
                      <div className="text-muted-foreground">
                        ✉️ {sheetData[inspectorRow.id]?.email || 'No email'}
                      </div>
                      <div className="text-muted-foreground">
                        Standing: <strong>FIRST_TIMER</strong>
                      </div>
                      <div className="text-muted-foreground">
                        DOB: {sheetData[inspectorRow.id]?.birth_date || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Duplicate Action Decision */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateCell(inspectorRow.id, 'action', 'UPDATE_EXISTING')
                        saveCellOnBlur(inspectorRow.id)
                      }}
                      className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition ${
                        sheetData[inspectorRow.id]?.action === 'UPDATE_EXISTING'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-foreground border-border hover:border-purple-500'
                      }`}
                    >
                      <UserCheck className="h-4 w-4 mx-auto mb-1" />
                      Update Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateCell(inspectorRow.id, 'action', 'CREATE')
                        saveCellOnBlur(inspectorRow.id)
                      }}
                      className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition ${
                        sheetData[inspectorRow.id]?.action === 'CREATE'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-foreground border-border hover:border-primary'
                      }`}
                    >
                      <UserPlus className="h-4 w-4 mx-auto mb-1" />
                      Create Separate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateCell(inspectorRow.id, 'action', 'SKIP')
                        saveCellOnBlur(inspectorRow.id)
                      }}
                      className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition ${
                        sheetData[inspectorRow.id]?.action === 'SKIP'
                          ? 'bg-secondary-foreground text-background border-secondary-foreground'
                          : 'bg-white text-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      <Ban className="h-4 w-4 mx-auto mb-1" />
                      Skip Row
                    </button>
                  </div>
                </div>
              )}

              {/* Form Fields for Modal Editing */}
              {isAddingNew && newRowForm ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">First Name *</label>
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                        value={newRowForm.first_name}
                        onChange={(e) => setNewRowForm({ ...newRowForm, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Surname *</label>
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                        value={newRowForm.last_name}
                        onChange={(e) => setNewRowForm({ ...newRowForm, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Phone</label>
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                        value={newRowForm.phone}
                        placeholder="+234..."
                        onChange={(e) => setNewRowForm({ ...newRowForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Email</label>
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                        value={newRowForm.email}
                        placeholder="visitor@example.com"
                        onChange={(e) => setNewRowForm({ ...newRowForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Date of Birth</label>
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                        value={newRowForm.birth_date}
                        placeholder="e.g. 12-August"
                        onChange={(e) => setNewRowForm({ ...newRowForm, birth_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Invited By</label>
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                        value={newRowForm.inviter}
                        placeholder="Member who invited them"
                        onChange={(e) => setNewRowForm({ ...newRowForm, inviter: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Home Address</label>
                    <input
                      className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                      value={newRowForm.address}
                      placeholder="Full residential address"
                      onChange={(e) => setNewRowForm({ ...newRowForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Prayer Request / Confidential Notes
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-input bg-white p-2.5 text-xs outline-none focus:border-primary"
                      value={newRowForm.prayer_request}
                      placeholder="Prayer points or personal notes (stored confidentially in Prayer Notes)..."
                      onChange={(e) => setNewRowForm({ ...newRowForm, prayer_request: e.target.value })}
                    />
                  </div>
                </div>
              ) : inspectorRow ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/10">
                    <div className="font-semibold text-foreground">Visitor Overview:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Invited By:</span>{' '}
                        <strong>{sheetData[inspectorRow.id]?.inviter || 'None noted'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Standing:</span> <strong>FIRST_TIMER</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date of Birth:</span>{' '}
                        <strong>{sheetData[inspectorRow.id]?.birth_date || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address:</span>{' '}
                        <strong
                          className="truncate inline-block max-w-[200px]"
                          title={sheetData[inspectorRow.id]?.address}
                        >
                          {sheetData[inspectorRow.id]?.address || '—'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Prayer Request / Confidential Notes
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-input bg-white p-2.5 text-xs outline-none focus:border-primary"
                      value={sheetData[inspectorRow.id]?.prayer_request || ''}
                      placeholder="Confidential prayer points recorded in pastoral Prayer Notes..."
                      onChange={(e) => updateCell(inspectorRow.id, 'prayer_request', e.target.value)}
                      onBlur={() => saveCellOnBlur(inspectorRow.id)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Confidential: prayer requests are stored in the prayer notes registry and kept separate from
                      the public directory profile.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border/70 p-4 bg-secondary/30 flex items-center justify-between">
              <div>
                {inspectorRow && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      deleteRowMutation.mutate(inspectorRow.id)
                      setInspectorRowId(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Discard Visitor
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInspectorRowId(null)
                    setIsAddingNew(false)
                  }}
                >
                  Close
                </Button>
                {isAddingNew && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!newRowForm) return
                      addRowMutation.mutate({
                        first_name: newRowForm.first_name.trim(),
                        last_name: newRowForm.last_name.trim(),
                        phone: newRowForm.phone.trim() || undefined,
                        email: newRowForm.email.trim() || undefined,
                        address: newRowForm.address.trim() || undefined,
                        birth_date: newRowForm.birth_date.trim() || undefined,
                        prayer_request: newRowForm.prayer_request.trim() || undefined,
                        inviter: newRowForm.inviter.trim() || undefined,
                        membership_status: 'FIRST_TIMER',
                        action: 'CREATE',
                      })
                    }}
                    disabled={!newRowForm?.first_name || !newRowForm?.last_name || addRowMutation.isPending}
                  >
                    {addRowMutation.isPending ? 'Adding…' : 'Add Visitor Row'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
