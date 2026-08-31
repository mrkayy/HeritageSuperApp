import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, ShieldAlert, ArrowLeft, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

const ClaimAccount = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'unprofiled'>('idle');

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email Required", description: "Please enter your registered email address.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      setStatus('idle');

      // Check member existence
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      // Redirect to Google OAuth / Magic link flow with email
      window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(email.trim())}`;
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('not profiled') || err.message?.includes('not_profiled')) {
        setStatus('unprofiled');
      } else {
        toast({
          title: "Error",
          description: err.response?.data?.message || err.message || "Failed to process account claim request.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Heritage of Faith International Church
          </h1>
          <p className="text-xs text-muted-foreground">
            Member Account Activation & Single-Sign-On Center
          </p>
        </div>

        {status === 'unprofiled' ? (
          /* Un-profiled Rejection Card */
          <Card className="glass-card border-amber-500/30 shadow-lg animate-in fade-in zoom-in-95">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <HelpCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">Record Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4 pt-0">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                "We couldn't find your record. Please visit the Information Center at church or reach out to the Membership Team."
              </div>
              <p className="text-xs text-muted-foreground">
                Account claiming requires prior member profiling by the church staff. Once profiled, your email will be authorized for single-click activation.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStatus('idle')} 
                className="w-full text-xs"
              >
                Try Another Email Address
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Main Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          /* Main Claim Account Form Card */
          <Card className="glass-card shadow-lg border border-border/50">
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                  <Sparkles className="w-3 h-3 mr-1" /> Account Claiming
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold">Claim Your Member Account</CardTitle>
              <CardDescription className="text-xs">
                Enter your registered church email address to verify your member profile and activate your account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleClaimAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="claim-email" className="text-xs font-medium">Registered Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="claim-email"
                      type="email"
                      placeholder="e.g. member@hofchurchng.org"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full text-xs py-5">
                  {loading ? "Verifying Member Profile..." : "Send Login / Claim Link"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2 text-center border-t border-border/40">
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                Already have password / Security PIN?
                <Link to="/login" className="text-primary hover:underline font-semibold ml-1">
                  Sign In
                </Link>
              </div>

              <div className="text-[11px] text-muted-foreground pt-1">
                Need administrative access? <Link to="/admin-login" className="text-foreground hover:underline font-medium">Admin Portal</Link>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClaimAccount;
