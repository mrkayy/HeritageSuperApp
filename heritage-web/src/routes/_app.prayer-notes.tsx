import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Mail,
  Phone,
  Save,
  Send,
  Sparkles,
  User,
} from 'lucide-react'
import { Alert, Badge, Button, PageBanner } from '#/components/ui'
import { api, ApiError, type PrayerNoteItem } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

export const Route = createFileRoute('/_app/prayer-notes')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!hasCapability(me, 'prayer_notes.manage')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: PrayerNotesPage,
})

function PrayerNotesPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const canSendToPastor = hasCapability(me, 'prayer_notes.email_pastor')

  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all')
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  const notesQuery = useQuery({
    queryKey: ['prayer-notes'],
    queryFn: () => api<PrayerNoteItem[]>('/prayer-notes'),
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return api<{ id: string; content: string; updated_at: string }>(`/prayer-notes/${id}`, {
        method: 'PATCH',
        body: { content },
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-notes'] })
      setEditingNotes((prev) => {
        const next = { ...prev }
        delete next[vars.id]
        return next
      })
      setBanner({ tone: 'success', text: 'Prayer note updated successfully.' })
    },
    onError: (err) => {
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update prayer note.',
      })
    },
  })

  const sendPastorMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return api<{ id: string; sent_to_pastor_at: string; recipient: string }>(
        `/prayer-notes/${id}/send-pastor`,
        { method: 'POST' },
      )
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-notes'] })
      setBanner({
        tone: 'success',
        text: `Prayer request successfully formatted and emailed to Resident Pastor (${data.recipient}).`,
      })
    },
    onError: (err) => {
      setBanner({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to email Resident Pastor.',
      })
    },
  })

  const notes = notesQuery.data ?? []
  const filtered = notes.filter((n) => {
    if (filter === 'pending') return !n.sent_to_pastor_at
    if (filter === 'sent') return Boolean(n.sent_to_pastor_at)
    return true
  })

  return (
    <div className="space-y-6">
      <PageBanner
        badge="Membership Team · Pastoral Care"
        badgeIcon={<HeartHandshake className="h-3.5 w-3.5" />}
        secondaryBadge={
          <Badge variant="outline" className="font-normal">
            {notes.length} requests captured
          </Badge>
        }
        title="Confidential Prayer Notes & Pastoral Briefs"
        subtitle="Review visitor and member prayer requests, format them with the in-app editor, and dispatch structured briefings directly to the Resident Pastor."
        actions={
          <div className="flex rounded-xl border border-border/70 bg-white/80 p-1 text-xs font-semibold shadow-2xs">
            {(
              [
                ['all', 'All Notes'],
                ['pending', 'Needs Review / Pending'],
                ['sent', 'Sent to Pastor'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                  filter === key
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {banner && <Alert tone={banner.tone === 'success' ? 'success' : 'error'}>{banner.text}</Alert>}

      {notesQuery.isLoading && (
        <div className="glass-card flex items-center justify-center p-12 text-sm text-muted-foreground">
          Loading confidential prayer notes…
        </div>
      )}

      {notesQuery.isSuccess && filtered.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
          <HeartHandshake className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">No prayer requests in this view</p>
          <p className="text-xs text-muted-foreground mt-1">
            Prayer requests submitted during visitor intake or pastoral inquiries will appear here.
          </p>
        </div>
      )}

      <div className="grid gap-5">
        {filtered.map((note) => {
          const currentText = editingNotes[note.id] ?? note.content
          const hasEdits = currentText !== note.content
          const isSent = Boolean(note.sent_to_pastor_at)

          return (
            <div
              key={note.id}
              className="glass-card space-y-4 rounded-2xl border border-border/60 p-5 shadow-xs transition hover:border-border"
            >
              {/* Note Header & Member Metadata */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-3.5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-foreground">
                      {note.person.first_name} {note.person.last_name}
                    </h3>
                    <Badge variant="secondary">{note.person.membership_status}</Badge>
                    {isSent ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Sent to Resident Pastor
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Clock className="h-3 w-3" /> Pending Pastoral Brief
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {note.person.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-primary/70" />
                        {note.person.phone}
                      </span>
                    )}
                    {note.person.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 text-primary/70" />
                        {note.person.email}
                      </span>
                    )}
                    {note.service_occurrence && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary/70" />
                        {note.service_occurrence.title} ({note.service_occurrence.service_date.slice(0, 10)})
                      </span>
                    )}
                  </div>
                </div>

                {isSent && note.sent_to_pastor_at && (
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="font-medium text-emerald-800">
                      Dispatched on {new Date(note.sent_to_pastor_at).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      by {note.sent_to_pastor_by_name ?? 'Membership Lead'}
                    </p>
                  </div>
                )}
              </div>

              {/* In-App Text Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`editor-${note.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    In-App Prayer Request Editor (Format for Resident Pastor)
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingNotes((prev) => ({
                          ...prev,
                          [note.id]: `[URGENT PRAYER FOCUS]\n${currentText}`,
                        }))
                      }
                      className="rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
                    >
                      + Urgent Focus
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingNotes((prev) => ({
                          ...prev,
                          [note.id]: `${currentText}\n\nPastoral Note: Recommended for direct pastoral call.`,
                        }))
                      }
                      className="rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
                    >
                      + Pastoral Note
                    </button>
                  </div>
                </div>

                <textarea
                  id={`editor-${note.id}`}
                  rows={4}
                  value={currentText}
                  onChange={(e) =>
                    setEditingNotes((prev) => ({ ...prev, [note.id]: e.target.value }))
                  }
                  className="w-full rounded-xl border border-input bg-white/90 p-3.5 text-sm leading-relaxed text-foreground shadow-2xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Format prayer request text here..."
                />
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-muted-foreground">
                  Captured by: <strong className="text-foreground">{note.created_by_name}</strong> on{' '}
                  {new Date(note.created_at).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2">
                  {hasEdits && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveMutation.mutate({ id: note.id, content: currentText })}
                      disabled={saveMutation.isPending}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                  )}

                  {canSendToPastor && (
                    <Button
                      size="sm"
                      variant={isSent ? 'secondary' : 'primary'}
                      onClick={() => sendPastorMutation.mutate({ id: note.id })}
                      disabled={sendPastorMutation.isPending}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendPastorMutation.isPending
                        ? 'Sending…'
                        : isSent
                          ? 'Re-send to Resident Pastor'
                          : 'Send to Resident Pastor'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
