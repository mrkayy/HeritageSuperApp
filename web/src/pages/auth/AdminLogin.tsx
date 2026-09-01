import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { adminLoginSchema } from '@/lib/schemas/auth';

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const form = useZodForm({
    schema: adminLoginSchema,
    initialValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await login(data.email, data.password);
      toast({
        title: "Welcome Back",
        description: "Authenticated successfully."
      });
      navigate('/');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Invalid email or Security PIN.";
      toast({
        title: "Authentication Error",
        description: errMsg,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admin Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in with your administrative Security PIN
          </p>
        </div>

        <Card className="glass-card shadow-lg border border-border/50 rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-medium text-muted-foreground">
                  Admin Email
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@hofchurch.org"
                    className="pl-9 text-xs h-11 bg-background/50"
                    autoFocus
                    {...form.getInputProps('email')}
                  />
                </div>
                <FieldError message={form.errors.email} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-xs font-medium text-muted-foreground">
                    Security PIN
                  </Label>
                  <span className="text-[10px] text-muted-foreground/80">4–6 digits</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    className="pl-9 pr-10 text-xs h-11 bg-background/50 font-mono tracking-widest"
                    {...form.getInputProps('password')}
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
                <FieldError message={form.errors.password} />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-xs font-medium bg-primary hover:bg-primary/90 shadow-xs" 
                disabled={form.isSubmitting}
              >
                {form.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Main Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
