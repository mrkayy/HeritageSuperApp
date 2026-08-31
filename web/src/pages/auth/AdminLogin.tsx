import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from 'lucide-react';
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
        title: "Welcome Admin!",
        description: "Successfully authenticated as administrator."
      });
      navigate('/');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Invalid admin credentials";
      toast({
        title: "Authentication Error",
        description: errMsg,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <img
                src="/logo-design.png"
                alt="Soul Bank Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
          <h1 className="text-3xl font-bold text-primary">Soul Bank</h1>
          <p className="text-muted-foreground">Super Admin Access Portal</p>
        </div>

        <Card className="glass-card shadow-lg border-0">
          <CardHeader>
            <CardTitle>Super Admin Sign In</CardTitle>
            <CardDescription>
              Sign in with your system administrator credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@hofchurch.org"
                  className="h-12"
                  autoFocus
                  {...form.getInputProps('email')}
                />
                <FieldError message={form.errors.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">System Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 pr-10"
                    {...form.getInputProps('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                <FieldError message={form.errors.password} />
              </div>

              <Button type="submit" className="w-full h-12" disabled={form.isSubmitting}>
                {form.isSubmitting ? "Authenticating..." : "Authenticate Admin"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ← Return to Standard SSO Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
