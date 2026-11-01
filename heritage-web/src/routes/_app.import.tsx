import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useEffect, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  UserCheck,
  UserPlus,
  Ban,
  Trash2,
  Pencil,
  Check,
  X,
  Info,
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { Alert, Badge, Button, PageBanner } from '#/components/ui'
import {
  api,
  ApiError,
  type ImportJobDetail,
  type ImportJobRowItem,
  type ImportJobSummaryItem,
  type ImportRowAction,
  type MembershipStatus,
} from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Bulk CSV directory import with direct in-cell editing:
 * - Click and edit any cell directly in the table
 * - Instant blur-based auto-save and re-validation
 * - Field-level error indicator flags with hover tooltips
 * - Centered pop-up modal dialog for deep inspection and duplicate diff comparison
 */
export const Route = createFileRoute('/_app/import')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'people.import')) throw redirect({ to: '/dashboard' })
  },
  component: ImportPage,
})

const TEMPLATE =
  'First Name,Surname,Email Address,Home Address (Full address please),Gender,Date of Birth (Day and Month),Marital Status,If Married, wedding anniversary date (Day and Month),Job/Occupation,Phone Number,Primary Team\n' +
  'Naomi,Earnest-Suru,naomidickson19954real@gmail.com,"Plot 7, Taunu Adjere Street, Compact Mini Estate, Egbeda Lagos.",Female,7-November,Married,6-November,Software Quality Assurance Engineer,+2348031234567,Information Center\n' +
  'Olumide,Bankole,bankoleolumide05@gmail.com,"2Ejoyin-Atobatele street, Idimu Lagos",Male,17-January,Married,7-May,Farmer/Gaffer,+2348029876543,Protocol\n'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

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

interface EditableRowData {
  first_name: string
  last_name: string
  phone: string
  email: string
  gender: string
  marital_status: string
  birth_date: string
  anniversary_date: string
  primary_team: string
  occupation: string
  address: string
  membership_status: string
  action: ImportRowAction
}

function rowToData(r: ImportJobRowItem): EditableRowData {
  const dobText = formatMonthDay(r.birth_month, r.birth_day)
  const annivText = formatMonthDay(r.anniversary_month, r.anniversary_day)
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
    gender: r.gender ?? '',
    marital_status: r.marital_status ?? '',
    birth_date: dobText,
    anniversary_date: annivText,
    primary_team: r.primary_team_id ?? '',
    occupation: r.occupation ?? '',
    address: r.address ?? '',
    membership_status: r.membership_status ?? 'WORK_FORCE',
    action: defaultAction,
  }
}

function ImportPage() {
  const queryClient = useQueryClient()
  const [job, setJob] = useState<ImportJobDetail | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)
  const [targetMembershipStatus, setTargetMembershipStatus] = useState<MembershipStatus>('WORK_FORCE')

  // In-cell editable state: rowId -> EditableRowData
  const [sheetData, setSheetData] = useState<Record<string, EditableRowData>>({})
  const [savingRowIds, setSavingRowIds] = useState<Set<string>>(new Set())

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'all' | 'duplicates' | 'errors' | 'ready'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Centered Modal Inspector State (for deep inspection and duplicate review)
  const [inspectorRowId, setInspectorRowId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newRowForm, setNewRowForm] = useState<EditableRowData | null>(null)

  const history = useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => api<ImportJobSummaryItem[]>('/people/import-jobs'),
  })

  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: () => api<Array<{ id: string; key: string; name: string }>>('/teams').catch(() => []),
  })

  function getTeamName(idOrKey?: string | null) {
    if (!idOrKey) return ''
    const match = teams.data?.find(
      (t) => t.id === idOrKey || t.key === idOrKey || t.name.toLowerCase() === idOrKey.toLowerCase(),
    )
    return match ? match.name : idOrKey
  }

  // Populate cell data whenever job loads
  useEffect(() => {
    if (!job) return
    const map: Record<string, EditableRowData> = {}
    for (const r of job.rows) {
      map[r.id] = rowToData(r)
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
    mutationFn: (v: { file_name: string; csv_text: string; default_membership_status?: string }) =>
      api<ImportJobDetail>('/people/import-jobs', { method: 'POST', body: v }),
    onSuccess: async (res) => {
      setJob(res)
      setInspectorRowId(null)
      setActiveTab('all')
      setSearchQuery('')
      setBanner({
        tone: 'info',
        text: `Preview loaded (${res.summary.total_rows} rows). Membership status defaulted to WORK_FORCE. You can edit cells directly in the table.`,
      })
      await queryClient.invalidateQueries({ queryKey: ['import-jobs'] })
    },
    onError: fail('Could not read CSV file.'),
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
      fail('Could not save row change.')(err)
    },
  })

  const addRowMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/rows`, { method: 'POST', body }),
    onSuccess: (res) => {
      setJob(res)
      setIsAddingNew(false)
      setNewRowForm(null)
      setBanner({ tone: 'success', text: 'New row added to preview table.' })
    },
    onError: fail('Could not add new row.'),
  })

  const deleteRowMutation = useMutation({
    mutationFn: (rowId: string) =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/rows/${rowId}`, { method: 'DELETE' }),
    onSuccess: (res, rowId) => {
      setJob(res)
      if (inspectorRowId === rowId) setInspectorRowId(null)
      setBanner({ tone: 'info', text: 'Row removed from import batch.' })
    },
    onError: fail('Could not delete row.'),
  })

  const commitMutation = useMutation({
    mutationFn: () =>
      api<ImportJobDetail>(`/people/import-jobs/${job!.id}/commit`, {
        method: 'POST',
        body: { idempotency_key: `import-${job!.id}` },
      }),
    onSuccess: async (res) => {
      setJob(res)
      setInspectorRowId(null)
      setBanner({
        tone: res.summary.failed_count + res.summary.review_required_count > 0 ? 'info' : 'success',
        text: `Committed! Applied: ${res.summary.applied_count} · Failed: ${res.summary.failed_count} · Review: ${res.summary.review_required_count}.`,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['import-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
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
      default_membership_status: targetMembershipStatus,
    })
  }

  async function onErrorReport() {
    if (!job) return
    const res = await api<{ file_name: string; csv: string }>(`/people/import-jobs/${job.id}/error-report`)
    download(res.file_name, res.csv)
  }

  // Update a single cell in local state
  function updateCell(rowId: string, field: keyof EditableRowData, value: string) {
    setSheetData((prev) => {
      const current = prev[rowId] ?? {
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        gender: '',
        marital_status: '',
        birth_date: '',
        anniversary_date: '',
        primary_team: '',
        occupation: '',
        address: '',
        membership_status: targetMembershipStatus,
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
      gender: currentData.gender || null,
      marital_status: currentData.marital_status || null,
      birth_date: currentData.birth_date.trim() || null,
      anniversary_date: currentData.anniversary_date.trim() || null,
      primary_team: currentData.primary_team.trim() || null,
      occupation: currentData.occupation.trim() || null,
      address: currentData.address.trim() || null,
      membership_status: currentData.membership_status || undefined,
      action: currentData.action,
      approve_review: true,
    }

    setSavingRowIds((prev) => new Set(prev).add(rowId))
    rowMutation.mutate({ rowId, body })
  }

  // Enter key advances down
  function handleCellKeyDown(e: ReactKeyboardEvent<HTMLElement>, rowIndex: number, field: keyof EditableRowData) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nextRow = filteredRows[rowIndex + 1]
      if (nextRow) {
        const nextInput = document.querySelector<HTMLElement>(
          `[data-cell="${nextRow.id}-${String(field)}"]`,
        )
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
          return lower.includes('first name') || lower.includes('last name') || lower.includes('email') || lower.includes('phone')
        })
        if (!hasCritical) return false
      } else if (activeTab === 'ready') {
        if (r.state !== 'READY') return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const data = sheetData[r.id] || rowToData(r)
        const text = `${data.first_name} ${data.last_name} ${data.email} ${data.phone} ${data.occupation} ${getTeamName(data.primary_team)}`.toLowerCase()
        return text.includes(q)
      }

      return true
    })
  }, [job, sheetData, activeTab, searchQuery, teams.data])

  // Get field-specific critical error message for corner flag
  // Only fields with possible critical errors (first_name, last_name, phone, email) receive error flags
  function getCriticalFieldError(r: ImportJobRowItem, field: keyof EditableRowData): string | null {
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
        return lower.includes('first name') || lower.includes('last name') || lower.includes('email') || lower.includes('phone')
      }),
    ).length
  }, [job])

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Information Center & Membership"
        badgeIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
        title="Bulk Directory Import"
        subtitle="Upload member lists, click directly into any cell to edit, resolve duplicates, and commit verified records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => download('heritage-member-import-template.csv', TEMPLATE)}>
              <Download className="h-4 w-4" /> Template
            </Button>
            <div className="flex items-center gap-1.5 rounded-xl border border-input bg-card px-2.5 py-1 text-xs">
              <span className="text-muted-foreground font-medium">Default:</span>
              <select
                className="bg-transparent font-semibold text-foreground outline-none cursor-pointer"
                value={targetMembershipStatus}
                onChange={(e) => setTargetMembershipStatus(e.target.value as MembershipStatus)}
              >
                <option value="WORK_FORCE">WORK_FORCE (Workforce)</option>
                <option value="MEMBER">MEMBER (Regular Member)</option>
              </select>
            </div>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              {previewMutation.isPending ? 'Reading…' : 'Upload CSV / TSV'}
              <input type="file" accept=".csv,text/csv,.tsv" className="sr-only" onChange={onFile} />
            </label>
          </div>
        }
      />

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {job && (
        <section className="glass-card overflow-hidden rounded-2xl border border-border/60">
          {/* Header Controls & Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{job.file_name}</h2>
              <Badge variant={committed ? 'success' : 'warning'}>{committed ? 'Committed' : 'Preview'}</Badge>
              <Badge variant="outline">{job.summary.total_rows} rows</Badge>
              {matchedRowsCount > 0 && (
                <Badge variant="purple" className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> {matchedRowsCount} duplicates sanitized
                </Badge>
              )}
              {criticalRowsCount > 0 && (
                <Badge variant="danger" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {criticalRowsCount} critical {criticalRowsCount === 1 ? 'error' : 'errors'}
                </Badge>
              )}
              <Badge variant="success">{job.summary.applied_count} applied</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {attention > 0 && (
                <Button variant="outline" size="sm" onClick={onErrorReport}>
                  <Download className="h-3.5 w-3.5" /> Error report
                </Button>
              )}
              {!committed && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNew(true)
                      setNewRowForm({
                        first_name: '',
                        last_name: '',
                        phone: '',
                        email: '',
                        gender: '',
                        marital_status: '',
                        birth_date: '',
                        anniversary_date: '',
                        primary_team: '',
                        occupation: '',
                        address: '',
                        membership_status: targetMembershipStatus,
                        action: 'CREATE',
                      })
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </Button>
                  <Button size="sm" loading={commitMutation.isPending} onClick={() => commitMutation.mutate()}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Commit {job.summary.ready_count} ready rows
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Filters, Search & Bulk Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-secondary/30 px-5 py-2.5 text-xs">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                All Rows ({job.rows.length})
              </button>
              {matchedRowsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('duplicates')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'duplicates'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-800 hover:bg-purple-100/70'
                  }`}
                >
                  <UserCheck className="h-3 w-3" /> Duplicates Sanitized ({matchedRowsCount})
                </button>
              )}
              {criticalRowsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('errors')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'errors'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'text-red-700 hover:bg-red-100/70'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" /> Critical Errors ({criticalRowsCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  activeTab === 'ready'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-800 hover:bg-emerald-100/70'
                }`}
              >
                <Check className="h-3 w-3" /> Ready ({job.summary.ready_count})
              </button>
            </div>

            {/* Search Input & Bulk Resolution */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter name, phone, team…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-44 rounded-lg border border-input bg-white pl-8 pr-3 text-xs outline-none focus:border-primary focus:w-56 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {!committed && matchedRowsCount > 1 && (
                <button
                  type="button"
                  onClick={() => resolveAllDuplicates('UPDATE_EXISTING')}
                  className="flex items-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 text-xs text-purple-900 font-semibold border border-purple-200 transition"
                >
                  <UserCheck className="h-3 w-3 text-purple-700" /> Update All Duplicates
                </button>
              )}
            </div>
          </div>

          {/* Direct In-Cell Editable Table */}
          <div className="overflow-x-auto max-h-[64vh] relative">
            <table className="w-full border-collapse text-left text-xs min-w-[1850px]">
              <thead className="sticky top-0 z-20 border-b border-border/80 bg-secondary/80 backdrop-blur-xs font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                <tr>
                  <th className="sticky left-0 z-30 w-12 border-r border-border/60 bg-secondary/95 px-2 py-2.5 text-center font-mono">
                    #
                  </th>
                  <th className="w-40 border-r border-border/60 px-2.5 py-2.5">First Name *</th>
                  <th className="w-40 border-r border-border/60 px-2.5 py-2.5">Surname *</th>
                  <th className="w-36 border-r border-border/60 px-2.5 py-2.5">Phone Number</th>
                  <th className="w-48 border-r border-border/60 px-2.5 py-2.5">Email Address</th>
                  <th className="w-24 border-r border-border/60 px-2.5 py-2.5">Gender</th>
                  <th className="w-32 border-r border-border/60 px-2.5 py-2.5">Marital Status</th>
                  <th className="w-28 border-r border-border/60 px-2.5 py-2.5">Date of Birth</th>
                  <th className="w-28 border-r border-border/60 px-2.5 py-2.5">Anniversary</th>
                  <th className="w-40 border-r border-border/60 px-2.5 py-2.5">Primary Team</th>
                  <th className="w-44 border-r border-border/60 px-2.5 py-2.5">Job / Occupation</th>
                  <th className="w-60 border-r border-border/60 px-2.5 py-2.5">Home Address</th>
                  <th className="w-36 border-r border-border/60 px-2.5 py-2.5">Standing</th>
                  <th className="w-44 border-r border-border/60 px-2.5 py-2.5">Duplicate Action</th>
                  <th className="sticky right-0 z-30 w-24 border-l border-border/60 bg-secondary/95 px-2 py-2.5 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-16 text-center text-muted-foreground italic">
                      No rows match the active filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r: ImportJobRowItem, idx: number) => {
                    const rowData = sheetData[r.id] || rowToData(r)
                    const isMatched = Boolean(r.matched_person_id)
                    const isIntraDuplicate = r.warnings.some((w) => w.toLowerCase().includes('duplicate contact of row'))
                    const hasCriticalError = Boolean(
                      getCriticalFieldError(r, 'first_name') ||
                      getCriticalFieldError(r, 'last_name') ||
                      getCriticalFieldError(r, 'email') ||
                      getCriticalFieldError(r, 'phone'),
                    )
                    const isSaving = savingRowIds.has(r.id)

                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors ${
                          hasCriticalError
                            ? 'bg-red-50/25 hover:bg-red-50/40'
                            : isMatched || isIntraDuplicate
                            ? 'bg-purple-50/15 hover:bg-purple-50/25'
                            : 'hover:bg-secondary/35'
                        }`}
                      >
                        {/* Row Index */}
                        <td className="sticky left-0 z-10 border-r border-border/50 bg-card/95 px-2 py-1 text-center font-mono text-[11px] text-muted-foreground">
                          <div className="flex h-8 items-center justify-center gap-1">
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            ) : hasCriticalError ? (
                              <span className="h-2 w-2 rounded-full bg-red-500" title="Missing critical required field" />
                            ) : isMatched ? (
                              <span className="h-2 w-2 rounded-full bg-purple-500" title="Matches existing member (sanitized to update existing record by default)" />
                            ) : isIntraDuplicate ? (
                              <span className="h-2 w-2 rounded-full bg-zinc-400" title="Duplicate contact in CSV (skipped by default to avoid duplicates)" />
                            ) : null}
                            <span>{r.row_index}</span>
                          </div>
                        </td>

                        {/* First Name Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {getCriticalFieldError(r, 'first_name') && (
                            <div
                              className="absolute top-0 right-0 w-0 h-0 border-t-[7px] border-r-[7px] border-t-transparent border-r-red-600 z-10 cursor-help"
                              title={getCriticalFieldError(r, 'first_name')!}
                            />
                          )}
                          <input
                            type="text"
                            data-cell={`${r.id}-first_name`}
                            value={rowData.first_name}
                            onChange={(e) => updateCell(r.id, 'first_name', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'first_name')}
                            className="w-full h-full px-2.5 text-xs font-semibold text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Surname Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {getCriticalFieldError(r, 'last_name') && (
                            <div
                              className="absolute top-0 right-0 w-0 h-0 border-t-[7px] border-r-[7px] border-t-transparent border-r-red-600 z-10 cursor-help"
                              title={getCriticalFieldError(r, 'last_name')!}
                            />
                          )}
                          <input
                            type="text"
                            data-cell={`${r.id}-last_name`}
                            value={rowData.last_name}
                            onChange={(e) => updateCell(r.id, 'last_name', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'last_name')}
                            className="w-full h-full px-2.5 text-xs font-semibold text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Phone Number Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {getCriticalFieldError(r, 'phone') && (
                            <div
                              className="absolute top-0 right-0 w-0 h-0 border-t-[7px] border-r-[7px] border-t-transparent border-r-red-600 z-10 cursor-help"
                              title={getCriticalFieldError(r, 'phone')!}
                            />
                          )}
                          <input
                            type="text"
                            data-cell={`${r.id}-phone`}
                            value={rowData.phone}
                            placeholder="+234..."
                            onChange={(e) => updateCell(r.id, 'phone', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'phone')}
                            className="w-full h-full px-2.5 text-xs font-mono text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Email Address Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          {getCriticalFieldError(r, 'email') && (
                            <div
                              className="absolute top-0 right-0 w-0 h-0 border-t-[7px] border-r-[7px] border-t-transparent border-r-red-600 z-10 cursor-help"
                              title={getCriticalFieldError(r, 'email')!}
                            />
                          )}
                          <input
                            type="email"
                            data-cell={`${r.id}-email`}
                            value={rowData.email}
                            placeholder="email@example.com"
                            onChange={(e) => updateCell(r.id, 'email', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'email')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Gender Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <select
                            data-cell={`${r.id}-gender`}
                            value={rowData.gender}
                            onChange={(e) => {
                              updateCell(r.id, 'gender', e.target.value)
                              saveCellOnBlur(r.id)
                            }}
                            className="w-full h-full px-2 text-xs text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white cursor-pointer"
                          >
                            <option value="">Select</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </td>

                        {/* Marital Status Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <select
                            data-cell={`${r.id}-marital_status`}
                            value={rowData.marital_status}
                            onChange={(e) => {
                              updateCell(r.id, 'marital_status', e.target.value)
                              saveCellOnBlur(r.id)
                            }}
                            className="w-full h-full px-2 text-xs text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white cursor-pointer"
                          >
                            <option value="">Select</option>
                            <option value="SINGLE">Single</option>
                            <option value="MARRIED">Married</option>
                            <option value="SEPARATED">Separated</option>
                            <option value="DIVORCED">Divorced</option>
                            <option value="WIDOWED">Widowed</option>
                          </select>
                        </td>

                        {/* Date of Birth Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-birth_date`}
                            value={rowData.birth_date}
                            placeholder="e.g. 7-Nov"
                            onChange={(e) => updateCell(r.id, 'birth_date', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'birth_date')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Anniversary Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-anniversary_date`}
                            value={rowData.anniversary_date}
                            placeholder="e.g. 6-Nov"
                            onChange={(e) => updateCell(r.id, 'anniversary_date', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'anniversary_date')}
                            className="w-full h-full px-2.5 text-xs text-muted-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </td>

                        {/* Primary Team Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <select
                            data-cell={`${r.id}-primary_team`}
                            value={rowData.primary_team}
                            onChange={(e) => {
                              updateCell(r.id, 'primary_team', e.target.value)
                              saveCellOnBlur(r.id)
                            }}
                            className="w-full h-full px-2 text-xs text-foreground bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white cursor-pointer"
                          >
                            <option value="">No Team</option>
                            {(teams.data ?? []).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Occupation Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <input
                            type="text"
                            data-cell={`${r.id}-occupation`}
                            value={rowData.occupation}
                            placeholder="e.g. Accountant"
                            onChange={(e) => updateCell(r.id, 'occupation', e.target.value)}
                            onBlur={() => saveCellOnBlur(r.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'occupation')}
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

                        {/* Standing Cell */}
                        <td className="relative border-r border-border/50 p-0 h-8 bg-white focus-within:z-10">
                          <select
                            data-cell={`${r.id}-membership_status`}
                            value={rowData.membership_status}
                            onChange={(e) => {
                              updateCell(r.id, 'membership_status', e.target.value)
                              saveCellOnBlur(r.id)
                            }}
                            className="w-full h-full px-2 text-xs font-semibold text-primary bg-transparent outline-none border border-transparent focus:border-2 focus:border-primary focus:bg-white cursor-pointer"
                          >
                            <option value="WORK_FORCE">WORK_FORCE (Workforce)</option>
                            <option value="MEMBER">MEMBER (Member)</option>
                            <option value="FOUNDATION">FOUNDATION</option>
                            <option value="FIRST_TIMER">FIRST_TIMER</option>
                            <option value="VISITOR">VISITOR</option>
                          </select>
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
                                title="Sanitized duplicate: by default updates existing member to avoid duplicate records"
                              >
                                <option value="UPDATE_EXISTING">Update Existing Member</option>
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
                                className="h-6 w-full rounded px-1.5 text-[11px] font-semibold border border-zinc-200 bg-zinc-50 text-zinc-700 outline-none cursor-pointer"
                                title="Duplicate contact in CSV: skipped by default to avoid duplicates"
                              >
                                <option value="SKIP">Skip Duplicate in CSV</option>
                                <option value="CREATE">Force Create Separate</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground px-2">New record</span>
                          )}
                        </td>

                        {/* Actions (Sticky Right) */}
                        <td className="sticky right-0 z-10 border-l border-border/50 bg-card/95 px-2 py-0 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectorRowId(r.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-white text-muted-foreground shadow-2xs transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:scale-95"
                              title="Open row details modal"
                              aria-label={`Edit member row ${r.row_index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {!committed && (
                              <button
                                type="button"
                                onClick={() => deleteRowMutation.mutate(r.id)}
                                disabled={deleteRowMutation.isPending && deleteRowMutation.variables === r.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-white text-muted-foreground shadow-2xs transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-40"
                                title="Delete row from import batch"
                                aria-label={`Delete member row ${r.row_index}`}
                              >
                                {deleteRowMutation.isPending && deleteRowMutation.variables === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Centered Pop-up Modal Inspector */}
      {(inspectorRow || isAddingNew) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
          onClick={() => {
            setInspectorRowId(null)
            setIsAddingNew(false)
          }}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isAddingNew
                      ? 'Add Member Row'
                      : `Row #${inspectorRow?.row_index}: ${sheetData[inspectorRow!.id]?.first_name || '—'} ${sheetData[inspectorRow!.id]?.last_name || ''}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isAddingNew
                      ? 'Insert a new person record into this import batch.'
                      : 'Inspect cell details, resolve duplicate conflicts, and verify validation.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectorRowId(null)
                  setIsAddingNew(false)
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
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
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <UserCheck className="h-4 w-4 text-amber-700" />
                      MATCH FOUND IN CHURCH DIRECTORY
                    </div>
                    {inspectorRow.matched_person.is_verified && (
                      <Badge variant="success" className="text-[10px]">
                        Verified Profile
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/90 p-3 rounded-xl border border-amber-200">
                    <div>
                      <div className="font-bold text-muted-foreground mb-1">In Church Database:</div>
                      <div className="font-bold text-foreground">
                        {inspectorRow.matched_person.first_name} {inspectorRow.matched_person.last_name}
                      </div>
                      <div className="text-muted-foreground mt-0.5">📞 {inspectorRow.matched_person.phone || 'No phone'}</div>
                      <div className="text-muted-foreground">✉️ {inspectorRow.matched_person.email || 'No email'}</div>
                      <div className="text-muted-foreground">
                        DOB: {formatMonthDay(inspectorRow.matched_person.birth_month, inspectorRow.matched_person.birth_day) || '—'} ·
                        Anniv: {formatMonthDay(inspectorRow.matched_person.anniversary_month, inspectorRow.matched_person.anniversary_day) || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-muted-foreground mb-1">In Current Upload:</div>
                      <div className="font-bold text-foreground">
                        {sheetData[inspectorRow.id]?.first_name} {sheetData[inspectorRow.id]?.last_name}
                      </div>
                      <div className="text-muted-foreground mt-0.5">📞 {sheetData[inspectorRow.id]?.phone || 'No phone'}</div>
                      <div className="text-muted-foreground">✉️ {sheetData[inspectorRow.id]?.email || 'No email'}</div>
                      <div className="text-muted-foreground">
                        DOB: {sheetData[inspectorRow.id]?.birth_date || '—'} ·
                        Anniv: {sheetData[inspectorRow.id]?.anniversary_date || '—'}
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
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-foreground border-border hover:border-emerald-500'
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
                        placeholder="email@example.com"
                        onChange={(e) => setNewRowForm({ ...newRowForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Primary Team</label>
                    <select
                      className="w-full h-9 rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-primary"
                      value={newRowForm.primary_team}
                      onChange={(e) => setNewRowForm({ ...newRowForm, primary_team: e.target.value })}
                    >
                      <option value="">No Team</option>
                      {(teams.data ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : inspectorRow ? (
                <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/10">
                  <div className="font-semibold text-foreground">Member Information:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Primary Team:</span>{' '}
                      <strong>{getTeamName(sheetData[inspectorRow.id]?.primary_team) || 'None'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Standing:</span>{' '}
                      <strong>{sheetData[inspectorRow.id]?.membership_status}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Occupation:</span>{' '}
                      <strong>{sheetData[inspectorRow.id]?.occupation || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address:</span>{' '}
                      <strong className="truncate inline-block max-w-[200px]" title={sheetData[inspectorRow.id]?.address}>
                        {sheetData[inspectorRow.id]?.address || '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t border-border/70 p-4 bg-secondary/30 flex items-center justify-between">
              <div>
                {inspectorRow && !committed && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => {
                      deleteRowMutation.mutate(inspectorRow.id)
                      setInspectorRowId(null)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Row
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInspectorRowId(null)
                    setIsAddingNew(false)
                  }}
                >
                  Close
                </Button>
                {isAddingNew && newRowForm && (
                  <Button
                    type="button"
                    size="sm"
                    loading={addRowMutation.isPending}
                    onClick={() => {
                      addRowMutation.mutate({
                        first_name: newRowForm.first_name.trim(),
                        last_name: newRowForm.last_name.trim(),
                        phone: newRowForm.phone.trim() || null,
                        email: newRowForm.email.trim() || null,
                        primary_team: newRowForm.primary_team || null,
                        membership_status: newRowForm.membership_status || targetMembershipStatus,
                        action: 'CREATE',
                      })
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Imports History */}
      <section className="glass-card rounded-2xl border border-border/60 p-5">
        <h2 className="mb-3 text-sm font-bold text-foreground">Recent imports</h2>
        {(history.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No imports yet.</p>
        ) : (
          <ul className="divide-y border-border/50 text-xs">
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
                  onClick={async () => {
                    const fresh = await api<ImportJobDetail>(`/people/import-jobs/${j.id}`)
                    setJob(fresh)
                  }}
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
