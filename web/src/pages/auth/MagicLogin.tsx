import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface VerifyResponse {
  valid: boolean;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  message?: string;
}

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();

  const code = searchParams.get('code') || '';
  const email = searchParams.get('email') || '';

  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState<VerifyResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code || !email) {
      setVerifying(false);
      setErrorMsg("Missing magic link verification parameters in URL.");
      return;
    }

    const verifyCode = async () => {
      try {
        setVerifying(true);
        const res = await api.get(`/auth/magic-link/verify?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`);
        if (res.data.valid) {
          setInviteData(res.data);
          setFirstName(res.data.first_name || '');
          setLastName(res.data.last_name || '');
        } else {
          setErrorMsg(res.data.message || "This magic link is invalid or has expired.");
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || "Invalid or expired magic link invitation.");
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [code, email]);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both your First Name and Last Name.",
        variant: "destructive",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Your Security PIN/Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Security PIN/Password and Confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/magic-link/complete', {
        code,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
      });

      const data = res.data;
      const storeUser = {
        user_id: data.user_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.currentRole || (data.roles?.[0]) || 'member',
        roles: data.roles || [],
        team_id: data.teamId,
        team_name: data.teamName,
      };

      storeLogin(storeUser, data.token);

      toast({
        title: "Account Activated Successfully!",
        description: `Welcome to Heritage MMC, ${data.first_name}! Your leadership account is active.`,
      });

      navigate('/');
    } catch (err: any) {
      toast({
        title: "Onboarding Failed",
        description: err.response?.data?.message || "Failed to complete account activation.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/30 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-card border border-primary/20 shadow-xl flex items-center justify-center p-2 mb-1">
            <img 
              src="/logo-design.png" 
              alt="Heritage Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Heritage MMC</h1>
          <p className="text-xs text-muted-foreground">Leadership Onboarding & Account Claim</p>
        </div>

        {verifying ? (
          <Card className="glass-card border border-border/50 text-center p-8 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-semibold text-base">Verifying Magic Link</p>
              <p className="text-xs text-muted-foreground mt-1">Validating your single-use leadership invitation token...</p>
            </div>
          </Card>
        ) : errorMsg ? (
          <Card className="glass-card border-destructive/30 bg-destructive/5 text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Invalid Magic Link</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{errorMsg}</p>
            </div>
            <div className="pt-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Return to Login</Link>
              </Button>
            </div>
          </Card>
        ) : inviteData ? (
          <Card className="glass-card border border-border/50 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                <Badge variant="outline" className="text-primary border-primary/30 px-3 py-1 text-xs gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Leadership Role: {inviteData.role?.toUpperCase() || 'MEMBER'}
                </Badge>
              </div>
              <CardTitle className="text-xl">Complete Your Profile</CardTitle>
              <CardDescription className="text-xs">
                Set up your security PIN to activate access for <span className="font-semibold text-foreground">{inviteData.email}</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Kayode"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Joseph"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Set Password / Security PIN</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full mt-2 gap-2" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      Activate Account & Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center border-t border-border/40 pt-4">
              <p className="text-xs text-muted-foreground text-center">
                Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
              </p>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
