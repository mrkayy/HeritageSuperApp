import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { loginSchema } from '@/lib/schemas/auth';
import api from '@/lib/api';
import {
  Send,
  CheckCircle2,
  HelpCircle,
  Mail,
  Info,
  ArrowLeft,
  Building2,
  KeyRound,
  UserPlus,
} from 'lucide-react';

const Login = () => {
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimState, setClaimState] = useState<'form' | 'sent' | 'error'>('form');

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const form = useZodForm({ schema: loginSchema, initialValues: { googleEmail: '' } });

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'not_profiled') {
      setClaimState('error');
      toast({
        title: "Account Not Profiled",
        description: "This email is not yet registered. Please claim your account or visit the Information Center.",
        variant: "destructive",
      });
    } else if (err === 'auth_failed') {
      toast({ title: "Authentication Error", description: "Google authentication failed. Please try again.", variant: "destructive" });
    } else if (err === 'email_required') {
      toast({ title: "Authentication Error", description: "Email is required to sign in with Google.", variant: "destructive" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const onGoogleSubmit = (data: { googleEmail: string }) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(data.googleEmail.trim())}`;
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimEmail.trim()) {
      toast({ title: "Email Required", description: "Please enter your registered church email.", variant: "destructive" });
      return;
    }
    try {
      setClaimLoading(true);
      await api.post('/auth/magic-link/request', { email: claimEmail.trim() });
      setClaimState('sent');
      toast({ title: "Activation Link Sent!", description: `We've sent an activation link to ${claimEmail.trim()}.` });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || '';
      if (err.response?.status === 404 || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not profiled')) {
        setClaimState('error');
      } else {
        toast({
          title: "Claim Request Failed",
          description: msg || "Failed to process your account claim. Please try again or contact church staff.",
          variant: "destructive",
        });
      }
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center page-background p-4 sm:p-8">
      <div className="w-full max-w-3xl space-y-8">

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-border/50 p-2">
            <img src="/logo-design.png" alt="Heritage Logo" className="w-12 h-12 object-contain" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <Building2 className="w-3 h-3" />
            Heritage of Faith International Church
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Member Portal</h1>
          <p className="text-sm text-muted-foreground">
            Access your profile, discipleship pathways, and ministry assignments
          </p>
        </div>

        {/* Two Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

          {/* ── Sign In Card ── */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">Sign In</h2>
                <p className="text-[11px] text-muted-foreground">Returning member</p>
              </div>
            </div>

            {!showGooglePrompt ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full h-11 text-sm font-medium flex items-center justify-center gap-2.5"
                  onClick={() => setShowGooglePrompt(true)}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Use your church-registered Google account
                </p>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onGoogleSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="google-email" className="text-xs font-medium">Church Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="google-email"
                      type="email"
                      placeholder="yourname@gmail.com"
                      className="pl-9 h-11 text-xs"
                      autoFocus
                      {...form.getInputProps('googleEmail')}
                    />
                  </div>
                  <FieldError message={form.errors.googleEmail} />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-3"
                    onClick={() => { setShowGooglePrompt(false); form.reset(); }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button type="submit" className="flex-1 h-11 text-xs">
                    Proceed to Google
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* ── Claim Account Card ── */}
          <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.08] shadow-sm p-6 space-y-5">

            {claimState === 'sent' ? (
              <div className="space-y-4 text-center py-1">
                <div className="mx-auto w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-semibold text-sm text-foreground">Check Your Email</h2>
                  <p className="text-[11px] text-muted-foreground">Activation link sent to</p>
                  <p className="text-xs font-semibold text-primary">{claimEmail}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-[11px] text-muted-foreground text-left space-y-1.5 border border-border/40">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-primary shrink-0" /> Next steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                    <li>Open the email from <strong>Heritage MMC</strong></li>
                    <li>Click <strong>Activate Account</strong></li>
                    <li>Set your 6-digit PIN and upload your photo</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setClaimState('form'); setClaimEmail(''); }}
                  className="w-full text-xs"
                >
                  Try a different email
                </Button>
              </div>
            ) : claimState === 'error' ? (
              <div className="space-y-4 text-center py-1">
                <div className="mx-auto w-11 h-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold text-sm text-foreground">Member Record Not Found</h2>
                  <p className="text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 leading-relaxed text-left">
                    Your record needs to be profiled by church staff first. Visit the Information Center at church or contact the Membership Team on Sunday.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setClaimState('form'); setClaimEmail(''); }}
                    className="flex-1 text-xs"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGooglePrompt(false)}
                    className="flex-1 text-xs"
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Claim Account</h2>
                    <p className="text-[11px] text-muted-foreground">Profiled or invited member</p>
                  </div>
                </div>

                <form onSubmit={handleClaimSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="claim-email" className="text-xs font-medium">
                      Email used at church registration
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="claim-email"
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={claimEmail}
                        onChange={(e) => setClaimEmail(e.target.value)}
                        className="pl-9 h-11 text-xs bg-white/60 dark:bg-slate-900/40"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={claimLoading}
                    variant="outline"
                    className="w-full h-11 text-xs gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {claimLoading ? "Verifying..." : "Send Activation Link"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pb-4">
          <p className="text-[11px] text-muted-foreground">
            Church leadership or staff?{' '}
            <Link to="/admin-login" className="text-primary font-medium hover:underline">
              Admin Console
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground">
            <Link to="/terms-of-service" className="hover:underline">Terms of Service</Link>
            <span className="mx-2 opacity-40">|</span>
            <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
