import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Loader2, AlertCircle, CheckCircle2, ArrowRight,
  Camera, Link2, PartyPopper,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PinKeypad from '@/components/auth/PinKeypad';
import PhotoUpload from '@/components/auth/PhotoUpload';

type WizardStep = 1 | 2 | 3 | 4 | 5;
type PinSubState = 'entering' | 'confirming';

interface VerifyResponse {
  valid: boolean;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  message?: string;
}

const STEPS = ['Verify', 'Photo', 'PIN', 'Google', 'Done'];

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();

  const code = searchParams.get('code') || '';
  const email = searchParams.get('email') || '';

  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState<VerifyResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const [pinSubState, setPinSubState] = useState<PinSubState>('entering');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const PIN_LENGTH = 6;
  const [submitting, setSubmitting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!code || !email) {
      setVerifying(false);
      setErrorMsg('Missing magic link verification parameters in URL.');
      return;
    }

    api.get(`/auth/magic-link/verify?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`)
      .then(res => {
        if (res.data.valid) {
          setInviteData(res.data);
          setFirstName(res.data.first_name || '');
          setLastName(res.data.last_name || '');
        } else {
          setErrorMsg(res.data.message || 'This magic link is invalid or has expired.');
        }
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.message || 'Invalid or expired magic link invitation.');
      })
      .finally(() => setVerifying(false));
  }, [code, email]);

  useEffect(() => {
    if (step !== 5) return;
    countdownRef.current = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current!);
  }, [step, navigate]);

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePinChange = (val: string) => {
    if (pinSubState === 'entering') {
      setPin(val);
      setPinError('');
      if (val.length === PIN_LENGTH) {
        setTimeout(() => { setPinSubState('confirming'); setConfirmPin(''); }, 120);
      }
    } else {
      setConfirmPin(val);
      setPinError('');
      if (val.length === PIN_LENGTH && val !== pin) {
        setPinError('PINs do not match. Please try again.');
        setTimeout(() => { setPinSubState('entering'); setPin(''); setConfirmPin(''); }, 900);
      }
    }
  };

  const pinConfirmed = pin.length === PIN_LENGTH && confirmPin === pin;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/auth/magic-link/complete', {
        code, email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        pin,
      });
      const data = res.data;
      storeLogin({
        user_id: data.user_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.currentRole || data.roles?.[0] || 'member',
        roles: data.roles || [],
        team_id: data.teamId,
        team_name: data.teamName,
      }, data.token);
      setStep(4);
    } catch (err: any) {
      toast({
        title: 'Activation Failed',
        description: err.response?.data?.message || 'Failed to complete account activation.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center page-background p-4 sm:p-8">
      <div className="w-full max-w-sm space-y-8">

        {/* Branding */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 mx-auto flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-border/50 p-2">
            <img src="/logo-design.png" alt="Heritage Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground mt-3">Account Activation</h1>
          <p className="text-xs text-muted-foreground">Heritage MMC</p>
        </div>

        {/* States */}
        {verifying ? (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-semibold text-sm">Verifying your link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Validating your invitation token</p>
            </div>
          </div>

        ) : errorMsg ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">Invalid Magic Link</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{errorMsg}</p>
            </div>
            <Button asChild variant="outline" className="w-full text-xs">
              <Link to="/login">Return to Login</Link>
            </Button>
          </div>

        ) : inviteData ? (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">

            {/* Step progress */}
            <div className="px-6 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center justify-between mb-3">
                {STEPS.map((label, i) => {
                  const num = i + 1;
                  const done = step > num;
                  const active = step === num;
                  return (
                    <div key={label} className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                        done
                          ? 'bg-primary text-primary-foreground'
                          : active
                          ? 'border-2 border-primary text-primary'
                          : 'border border-border text-muted-foreground'
                      }`}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
                      </div>
                      <span className={`text-[9px] font-medium hidden sm:block ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${((step - 1) / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Step content */}
            <div className="p-6">

              {/* Step 1 - Identity */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-semibold text-base text-foreground">Confirm Your Identity</h2>
                    <p className="text-xs text-muted-foreground">
                      Activating account for{' '}
                      <span className="font-medium text-foreground">{inviteData.email}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-xs font-medium">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Kayode"
                        className="text-sm h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Joseph"
                        className="text-sm h-10"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => setStep(2)}
                    disabled={!firstName.trim() || !lastName.trim()}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Step 2 - Photo */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-semibold text-base text-foreground">Add Your Profile Photo</h2>
                    <p className="text-xs text-muted-foreground">
                      A clear photo helps teammates recognise you.
                    </p>
                  </div>

                  <PhotoUpload
                    previewUrl={photoPreview}
                    onSelect={handlePhotoSelect}
                    onSkip={() => setStep(3)}
                  />

                  {photoFile && (
                    <Button className="w-full gap-2" onClick={() => setStep(3)}>
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Step 3 - PIN */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-semibold text-base text-foreground">
                      {pinSubState === 'entering' ? 'Create Your Security PIN' : 'Confirm Your PIN'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {pinSubState === 'entering'
                        ? 'Choose a 6-digit PIN to unlock your account.'
                        : 'Re-enter your PIN to confirm it.'}
                    </p>
                  </div>

                  <PinKeypad
                    value={pinSubState === 'entering' ? pin : confirmPin}
                    onChange={handlePinChange}
                    maxLength={PIN_LENGTH}
                  />

                  {pinError && (
                    <p className="text-xs text-destructive text-center">{pinError}</p>
                  )}

                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmit}
                    disabled={!pinConfirmed || submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Activating</>
                    ) : (
                      <>Activate Account <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>
              )}

              {/* Step 4 - Link Google */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-semibold text-base text-foreground">Link Google Account</h2>
                    <p className="text-xs text-muted-foreground">
                      Enable one-tap sign-in for future visits.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2.5 h-11"
                      onClick={() => {
                        const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
                        window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(email)}`;
                      }}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Link Google Account
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground text-xs"
                      onClick={() => setStep(5)}
                    >
                      Skip, I'll do this later
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5 - Done */}
              {step === 5 && (
                <div className="space-y-5 text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <PartyPopper className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-semibold text-lg text-foreground">You're all set, {firstName}!</h2>
                    <p className="text-sm text-muted-foreground">
                      Your account is active and your security PIN has been saved.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                    <p className="text-xs text-muted-foreground">
                      Redirecting to your dashboard in{' '}
                      <span className="font-bold text-primary">{redirectCountdown}s</span>
                    </p>
                  </div>

                  <Button className="w-full gap-2" onClick={() => navigate('/')}>
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

            </div>
          </div>

        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
