import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Loader2, 
  Building2, 
  UserCheck, 
  Sparkles, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active Tab: 'pin' (Admin/Leader) or 'google' (Member SSO)
  const defaultTab = searchParams.get('tab') === 'google' ? 'google' : 'pin';
  const [activeTab, setActiveTab] = useState<'pin' | 'google'>(defaultTab);

  // PIN Form States
  const [pinEmail, setPinEmail] = useState('');
  const [pinPassword, setPinPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingPin, setSubmittingPin] = useState(false);

  // Google Form States
  const [googleEmail, setGoogleEmail] = useState('');
  const [showGoogleInput, setShowGoogleInput] = useState(false);

  // Handle URL errors
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'not_profiled') {
      toast({
        title: "Profile Not Found",
        description: "This email is not registered in the members directory. Please reach out to the Membership Team or Information Center.",
        variant: "destructive"
      });
    } else if (err === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Google authentication failed. Please try again.",
        variant: "destructive"
      });
    } else if (err === 'email_required') {
      toast({
        title: "Email Required",
        description: "Email is required to sign in with Google.",
        variant: "destructive"
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Handle PIN Sign-in
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinEmail.trim() || !pinPassword) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your registered email and Security PIN / Password.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmittingPin(true);
      await login(pinEmail.trim(), pinPassword);
      toast({
        title: "Welcome back!",
        description: "Authenticated successfully with Security PIN.",
      });
      navigate('/');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Invalid email or Security PIN.";
      toast({
        title: "Authentication Error",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setSubmittingPin(false);
    }
  };

  // Handle Google OAuth Sign-in
  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your registered church email address.",
        variant: "destructive"
      });
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(googleEmail.trim())}`;
  };

  const handleDirectGoogleLogin = () => {
    setShowGoogleInput(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Church Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Heritage of Faith International Church
          </h1>
          <p className="text-xs text-muted-foreground">
            Ministry Management & Discipleship SuperApp Portal
          </p>
        </div>

        <Card className="glass-card shadow-xl border border-border/50 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-xl font-bold">Sign In to Portal</CardTitle>
            <CardDescription className="text-xs">
              Select your authentication method below to access your workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs 
              value={activeTab} 
              onValueChange={(val) => setActiveTab(val as 'pin' | 'google')} 
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 bg-secondary/40 p-1 rounded-xl mb-4">
                <TabsTrigger value="pin" className="text-xs font-semibold gap-1.5 py-2">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  Admin & Leader PIN
                </TabsTrigger>
                <TabsTrigger value="google" className="text-xs font-semibold gap-1.5 py-2">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  Member Google SSO
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Leader & Admin PIN Sign-In */}
              <TabsContent value="pin" className="space-y-4 animate-in fade-in-50">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Leadership & Staff Portal:</span> Enter your registered email and the <strong>Security PIN / Password</strong> created during onboarding.
                  </div>
                </div>

                <form onSubmit={handlePinLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pin-email" className="text-xs font-medium">Registered Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pin-email"
                        type="email"
                        placeholder="pastor@hofchurch.org"
                        className="pl-9 text-xs h-11"
                        value={pinEmail}
                        onChange={e => setPinEmail(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pin-password" className="text-xs font-medium">Security PIN / Password</Label>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                        <Lock className="w-2.5 h-2.5 mr-1" /> 4–6 Digit PIN
                      </Badge>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your security PIN"
                        className="pl-9 pr-10 text-xs h-11 font-mono tracking-wider"
                        value={pinPassword}
                        onChange={e => setPinPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingPin}
                    className="w-full h-11 text-xs font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-md"
                  >
                    {submittingPin ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Security PIN...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Sign In with Security PIN
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-2 text-center space-y-2 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground">
                    Received an invitation magic link?{" "}
                    <Link to="/auth/claim-account" className="text-primary hover:underline font-semibold">
                      Activate Account
                    </Link>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Forgot your PIN? Please contact your branch administrator for a magic link reset.
                  </p>
                </div>
              </TabsContent>

              {/* Tab 2: Church Member Google SSO */}
              <TabsContent value="google" className="space-y-4 animate-in fade-in-50">
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-xs text-muted-foreground flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Member Single Sign-On:</span> One-click Google sign-in for registered stewards and congregation members.
                  </div>
                </div>

                {!showGoogleInput ? (
                  <div className="space-y-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 text-xs font-semibold gap-3 border-border/80 hover:bg-secondary/40 shadow-xs"
                      onClick={handleDirectGoogleLogin}
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Sign In with Google Workspace
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleGoogleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="google-email" className="text-xs font-medium">Registered Church Email</Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="google-email"
                          type="email"
                          placeholder="your.name@hofchurch.org"
                          className="pl-9 text-xs h-11"
                          value={googleEmail}
                          onChange={e => setGoogleEmail(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/2 h-11 text-xs"
                        onClick={() => setShowGoogleInput(false)}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="w-1/2 h-11 text-xs font-semibold gap-1 bg-primary hover:bg-primary/90"
                      >
                        Continue to Google <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </form>
                )}

                <div className="pt-2 text-center space-y-2 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground">
                    First time logging in as a member?{" "}
                    <Link to="/auth/claim-account" className="text-primary hover:underline font-semibold">
                      Claim Your Account
                    </Link>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer Support Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Need assistance? Reach out to church support or info center.
          </p>
        </div>
      </div>
    </div>
  );
}
