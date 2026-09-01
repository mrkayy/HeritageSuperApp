import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle URL errors
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'not_profiled') {
      toast({
        title: "Profile Not Found",
        description: "This email is not registered in the members directory.",
        variant: "destructive"
      });
    } else if (err === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Google authentication failed. Please try again.",
        variant: "destructive"
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter your email and Security PIN.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      navigate('/');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Invalid email or Security PIN.";
      toast({
        title: "Sign In Failed",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    const targetEmail = email.trim();
    if (targetEmail) {
      window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(targetEmail)}`;
    } else {
      window.location.href = `${apiBase}/auth/login/google`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Clean Logo Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <img
              src="/logo-design.png"
              alt="Church Logo"
              className="w-9 h-9 object-contain"
              onError={(e) => {
                // Fallback to lock icon if image not available
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Heritage Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in with your Security PIN or Google
          </p>
        </div>

        <Card className="glass-card shadow-lg border border-border/50 rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@hofchurch.org"
                    className="pl-9 text-xs h-11 bg-background/50"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pin" className="text-xs font-medium text-muted-foreground">
                    Security PIN
                  </Label>
                  <span className="text-[10px] text-muted-foreground/80">4–6 digits</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="pin"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    className="pl-9 pr-10 text-xs h-11 bg-background/50 font-mono tracking-widest"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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
                disabled={loading}
                className="w-full h-11 text-xs font-medium bg-primary hover:bg-primary/90 shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In with PIN"}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full h-11 text-xs font-medium gap-2 border-border/70 hover:bg-secondary/40"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Have an invitation link?{" "}
              <Link to="/auth/claim-account" className="text-primary hover:underline font-medium">
                Activate account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
