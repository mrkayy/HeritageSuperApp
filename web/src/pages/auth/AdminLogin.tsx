import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ShieldCheck, KeyRound, Building2, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
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
        title: "Welcome Back!",
        description: "Authenticated successfully with administrative credentials."
      });
      navigate('/');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Invalid credentials or Security PIN.";
      toast({
        title: "Authentication Error",
        description: errMsg,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Church Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Heritage of Faith International Church
          </h1>
          <p className="text-xs text-muted-foreground">
            Executive & Administrative Access Portal
          </p>
        </div>

        <Card className="glass-card shadow-xl border border-border/50 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                <ShieldCheck className="w-3 h-3 mr-1" /> Elevated Access
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold">Admin & Leadership Sign In</CardTitle>
            <CardDescription className="text-xs">
              Sign in with your registered email and Security PIN / Password
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Security PIN Required:</span> Super Admins, Pastors, Church Admins, and Ministry Leads must use their assigned Security PIN.
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-medium">Administrator Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@hofchurch.org"
                    className="pl-9 text-xs h-11"
                    autoFocus
                    {...form.getInputProps('email')}
                  />
                </div>
                <FieldError message={form.errors.email} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-xs font-medium">Security PIN / Password</Label>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                    <Lock className="w-2.5 h-2.5 mr-1" /> 4–6 Digit PIN
                  </Badge>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your security PIN"
                    className="pl-9 pr-10 text-xs h-11 font-mono tracking-wider"
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
                className="w-full h-11 text-xs font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-md" 
                disabled={form.isSubmitting}
              >
                {form.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Security PIN...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Authenticate Admin
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center space-y-2 border-t border-border/40">
              <Link to="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Standard Member Portal
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
