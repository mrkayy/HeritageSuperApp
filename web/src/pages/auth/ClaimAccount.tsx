import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, ArrowLeft, CheckCircle2, HelpCircle, Send, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

const ClaimAccount = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'unprofiled' | 'magic_sent'>('idle');

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email Required", description: "Please enter your registered church email address.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      setStatus('idle');
      await api.post('/auth/magic-link/request', { email: email.trim() });
      setStatus('magic_sent');
      toast({ title: "Activation Link Sent", description: `We've sent an activation link to ${email.trim()}.` });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || '';
      if (err.response?.status === 404 || msg.toLowerCase().includes('not profiled') || msg.toLowerCase().includes('not found')) {
        setStatus('unprofiled');
      } else {
        toast({ title: "Error", description: msg || "Failed to process account claim request.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center page-background p-4 sm:p-8">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-border/50 p-2">
            <img src="/logo-design.png" alt="Heritage Logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <Building2 className="w-3 h-3" />
            Heritage of Faith International Church
          </div>
          <h1 className="text-xl font-bold text-foreground">Claim Your Account</h1>
          <p className="text-xs text-muted-foreground">
            Enter the email you used when registering at church
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6">

          {status === 'magic_sent' ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-base text-foreground">Check Your Inbox</h2>
                <p className="text-xs text-muted-foreground">Activation link sent to</p>
                <p className="text-sm font-semibold text-primary">{email}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-[11px] text-muted-foreground text-left space-y-1.5 border border-border/40">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-primary shrink-0" /> What to do next:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-0.5">
                  <li>Click the activation button in your email</li>
                  <li>Verify your name and upload your profile photo</li>
                  <li>Set your 6-digit security PIN</li>
                </ol>
              </div>
              <p className="text-[11px] text-muted-foreground">
                The link expires in 72 hours and can only be used once.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setStatus('idle'); setEmail(''); }} className="w-full text-xs">
                  Try a different email
                </Button>
                <Link to="/login" className="w-full">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Login
                  </Button>
                </Link>
              </div>
            </div>

          ) : status === 'unprofiled' ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="space-y-3">
                <h2 className="font-semibold text-base text-foreground">Member Record Not Found</h2>
                <p className="text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 leading-relaxed text-left">
                  Your record needs to be profiled by church staff first. Visit the Information Center at church or contact the Membership Team on Sunday.
                </p>
                <p className="text-[11px] text-muted-foreground text-left leading-relaxed">
                  Account claiming requires prior member profiling. Once profiled, your email will be authorized for activation.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setStatus('idle')} className="w-full text-xs">
                  Try another email
                </Button>
                <Link to="/login" className="w-full">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Login
                  </Button>
                </Link>
              </div>
            </div>

          ) : (
            <form onSubmit={handleClaimAccount} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="claim-email" className="text-xs font-medium">Registered Church Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="claim-email"
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9 h-11 text-xs"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 text-xs gap-2">
                <Send className="w-3.5 h-3.5" />
                {loading ? "Verifying..." : "Send Activation Link"}
              </Button>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <Link to="/login" className="hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>
                <Link to="/admin-login" className="hover:underline">
                  Admin Portal
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClaimAccount;
