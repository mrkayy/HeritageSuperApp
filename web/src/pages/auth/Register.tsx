import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus } from 'lucide-react';
import { GuestRegistrationForm } from '@/components/auth/GuestRegistrationForm';
import { MemberRegistrationForm } from '@/components/auth/MemberRegistrationForm';

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <img
              src="/lovable-uploads/e1aa47db-ce0d-41de-acc4-3fd9d77b6b39.png"
              alt="Soul Bank Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Soul Bank</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <Card className="glass-card shadow-lg border-0">
          <CardHeader>
            <CardTitle>Join Our Mission</CardTitle>
            <CardDescription>
              Register to start tracking souls and follow-ups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="guest" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="guest" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Guest User
                </TabsTrigger>
                <TabsTrigger value="member" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Church Member
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guest">
                <GuestRegistrationForm />
              </TabsContent>

              <TabsContent value="member">
                <MemberRegistrationForm />
              </TabsContent>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
