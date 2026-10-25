import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, Camera, CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { z } from 'zod'
import { Alert, AuthCard, Badge, Button, Field } from '#/components/ui'
import { api, ApiError, type ClaimPreview } from '#/lib/api'
import { meQuery } from '#/lib/auth'

/**
 * Controlled Account Claim & Onboarding Wizard (HOF-002-S01 / S03 / S04).
 * - GET preview never consumes the token (mail-scanner safe).
 * - Multi-step wizard (Google linking skipped per scope):
 *     Step 1: Confirm Identity & Personal Baseline Permissions
 *     Step 2: Set Account Password
 *     Step 3: Member Photo & 4-6 Digit Quick-Unlock PIN (optional) -> Atomic Activation
 */
export const Route = createFileRoute('/auth/claim')({
  validateSearch: z.object({ token: z.string().optional() }),
  ssr: false,
  component: ClaimPage,
})

function ClaimPage() {
  const { token: tokenFromUrl } = Route.useSearch()
  const [token] = useState(tokenFromUrl)

  useEffect(() => {
    if (tokenFromUrl) window.history.replaceState(null, '', '/auth/claim')
  }, [tokenFromUrl])

  const preview = useQuery({
    queryKey: ['claim-preview', token],
    enabled: !!token,
    retry: false,
    queryFn: () => api<ClaimPreview>(`/auth/claims/inspect?token=${encodeURIComponent(token!)}`),
  })

  if (!token || preview.isError) {
    const message =
      preview.error instanceof ApiError
        ? preview.error.message
        : 'This invitation link is incomplete. Ask your team lead or the church admin to resend it.'
    return (
      <AuthCard title="Invitation Unavailable" badge="Steward & Member Activation">
        <Alert>{message}</Alert>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Steward Sign In
        </Link>
      </AuthCard>
    )
  }

  if (preview.isPending) {
    return (
      <AuthCard title="Verifying Invitation…" badge="Steward & Member Activation">
        <p className="text-sm text-muted-foreground" role="status">
          Checking your invitation details…
        </p>
      </AuthCard>
    )
  }

  if (preview.data.purpose !== 'CLAIM') {
    return (
      <AuthCard title="Wrong Link Type" badge="Steward & Member Activation">
        <Alert>This is a sign-in link, not an invitation. Open it from the email again.</Alert>
      </AuthCard>
    )
  }

  return <ClaimWizard token={token} preview={preview.data} />
}

function ClaimWizard({ token, preview }: { token: string; preview: ClaimPreview }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(preview.photo_url)
  const [pin, setPin] = useState('')
  const [stepError, setStepError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)

  function handleNextFromIdentity() {
    if (!identityConfirmed) {
      setStepError('Please confirm that this profile belongs to you.')
      return
    }
    setStepError(null)
    setStep(2)
  }

  function handleNextFromPassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setStepError('Password must be at least 10 characters and include a letter and a number.')
      return
    }
    if (password !== confirmPassword) {
      setStepError('Passwords do not match.')
      return
    }
    setStepError(null)
    setStep(3)
  }

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 250 * 1024) {
      setStepError('Please choose an image smaller than 250 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result)
        setStepError(null)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleFinish(e: FormEvent) {
    e.preventDefault()
    if (pin && !/^\d{4,6}$/.test(pin)) {
      setStepError('Quick-unlock PIN must be 4 to 6 digits (or leave blank to skip).')
      return
    }
    setStepError(null)
    setApiError(null)
    setPending(true)
    try {
      await api('/auth/claims/complete', {
        method: 'POST',
        body: {
          token,
          password,
          identity_confirmed: identityConfirmed,
          photo_url: photoDataUrl,
          pin: pin || null,
        },
      })
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
      await navigate({ to: '/dashboard', replace: true })
    } catch (err) {
      setApiError(err instanceof ApiError ? err : null)
      setPending(false)
    }
  }

  return (
    <AuthCard
      title={`Welcome, ${preview.first_name}`}
      subtitle={`Step ${step} of 3 · ${
        step === 1 ? 'Confirm your identity' : step === 2 ? 'Set your password' : 'Member photo & quick-unlock PIN'
      }`}
      badge="Claim Account"
    >
      {/* Progress indicator */}
      <div className="mb-5 grid grid-cols-3 gap-1.5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 rounded-full transition-colors ${
              n <= step ? 'bg-primary' : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      {stepError && (
        <div className="mb-4">
          <Alert>{stepError}</Alert>
        </div>
      )}
      {apiError && (
        <div className="mb-4">
          <Alert>{apiError.message}</Alert>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <dl className="space-y-2.5 rounded-xl border border-primary/20 bg-secondary/60 p-4 text-xs sm:text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Full Name</dt>
              <dd className="font-semibold text-foreground">
                {preview.first_name} {preview.last_name}
              </dd>
            </div>
            {preview.email && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">{preview.email}</dd>
              </div>
            )}
            {preview.masked_phone && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium text-foreground">{preview.masked_phone}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Standing</dt>
              <dd>
                <Badge variant="default">{preview.membership_status}</Badge>
              </dd>
            </div>
            {preview.appointments.length > 0 ? (
              preview.appointments.map((a) => (
                <div key={`${a.role}-${a.team_name}`} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Appointment</dt>
                  <dd className="inline-flex items-center gap-1 font-semibold text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {a.role_label}
                    {a.team_name ? ` · ${a.team_name}` : ''}
                  </dd>
                </div>
              ))
            ) : (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Access</dt>
                <dd className="text-xs font-medium text-muted-foreground">Personal Member Baseline</dd>
              </div>
            )}
          </dl>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-white/80 p-3.5 text-sm transition hover:border-primary/40">
            <input
              type="checkbox"
              checked={identityConfirmed}
              onChange={(e) => setIdentityConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-xs leading-relaxed text-foreground">
              I confirm that I am <strong>{preview.first_name} {preview.last_name}</strong> and this invitation was sent
              to me.
            </span>
          </label>

          <Button type="button" onClick={handleNextFromIdentity} className="w-full">
            Continue to Password Setup
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Not you? Do not continue — contact the Information Center or Membership team so they can correct the record.
          </p>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleNextFromPassword} className="space-y-4" noValidate>
          <Field
            label="Create password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            icon={<Lock className="h-4 w-4" />}
            hint="At least 10 characters, including a letter and a number."
          />
          <Field
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            icon={<Lock className="h-4 w-4" />}
          />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleFinish} className="space-y-4" noValidate>
          {/* Optional Member Photo */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Camera className="h-3.5 w-3.5 text-primary" />
              Member Photo <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt="Member preview"
                  className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {preview.first_name[0]}
                  {preview.last_name[0]}
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                className="text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </div>
          </div>

          {/* Optional Quick-Unlock PIN */}
          <Field
            label="Quick-Unlock PIN (optional)"
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            placeholder="4 to 6 digits"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            icon={<KeyRound className="h-4 w-4" />}
            hint="Used for fast keypad unlock on your enrolled device."
            error={apiError?.fieldErrors.pin}
          />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="flex-1">
              Back
            </Button>
            <Button type="submit" loading={pending} className="flex-1">
              <CheckCircle2 className="h-4 w-4" />
              Complete &amp; Activate
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  )
}
