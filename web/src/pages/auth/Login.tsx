import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth redirect errors
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'not_profiled') {
      toast({
        title: "Authentication Error",
        description: "This email is not registered, please reachout to an admin",
        variant: "destructive"
      });
    } else if (err === 'auth_failed') {
      toast({
        title: "Authentication Error",
        description: "Google authentication failed. Please try again.",
        variant: "destructive"
      });
    } else if (err === 'email_required') {
      toast({
        title: "Authentication Error",
        description: "Email is required to sign in with Google.",
        variant: "destructive"
      });
    }
  }, [searchParams]);

  // If already logged in, redirect to home/dashboard
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email to continue with Google.",
        variant: "destructive"
      });
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(googleEmail.trim())}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <img
              src="/lovable-uploads/e1aa47db-ce0d-41de-acc4-3fd9d77b6b39.png"
              alt="Soul Bank Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Soul Bank</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="glass-card shadow-lg border-0">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your portal with Google
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showGooglePrompt ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  className="w-full h-12"
                  onClick={() => setShowGooglePrompt(true)}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            ) : (
              <form onSubmit={handleGoogleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Church Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.name@hofchurch.org"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => {
                      setShowGooglePrompt(false);
                      setGoogleEmail('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full h-12">
                    Continue
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Are you a platform administrator?{" "}
                <Link to="/admin-login" className="text-primary hover:underline font-medium">
                  Access Super Admin Portal
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
