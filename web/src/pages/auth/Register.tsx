
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Users, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AuthenticationService, RegisterData } from '@/services/AuthenticationService';
import { useForm, } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sector, Church, Team, Invite } from '@/integrations/type_def';
import { AdminBackOfficeServices } from '@/services/AdminBackOfficeServices';
import { useLoadingStore } from '@/store/loadingState';


const guestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const memberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm your password"),
  role: z.enum(['member', 'guest']),
  team_id: z.string().optional(),
  sector_id: z.string().optional(),
  church_id: z.string().optional(),
  otp: z.string().min(6, "OTP is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type GuestRegisterForm = z.infer<typeof guestSchema>;
type MemberRegisterForm = z.infer<typeof memberSchema>;

const Register = () => {

  const guestDefaultData = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  }
  const memberDefaultData = {
    otp: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    team_id: '',
    sector_id: '',
    church_id: '',
  }

  const guestFormData = useForm<GuestRegisterForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: guestDefaultData,
  });

  const memberFormData = useForm<MemberRegisterForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: memberDefaultData,
  });

  const [inviteData, setInviteData] = useState<Invite>();
  const [teams, setTeams] = useState<Team[]>();
  const [sectors, setSectors] = useState<Sector[]>();
  const [churches, setChurches] = useState<Church[]>();
  const [showPassword, setShowPassword] = useState({
    guest: false,
    guestConfirm: false,
    member: false,
    memberConfirm: false
  });

  const loading = useLoadingStore((state) => state.loading);

  console.log('LOAING_STATE:: '+ loading);

  useEffect(() => {
    const fetchSectors = async () => {
      const data = await AdminBackOfficeServices.fetchSectors();
      setSectors(data || []);
    };
    const fetchTeams = async () => {
      const data = await AdminBackOfficeServices.fetchTeams();
      setTeams(data || []);
    };
    const fetchChurches = async () => {
      const data = await AdminBackOfficeServices.fetchChurches();
      setChurches(data || []);
    };

    fetchSectors();
    fetchTeams();
    fetchChurches();
  }, [])

  const onGuestSubmit = async (data: GuestRegisterForm) => {

    try {
      guestSchema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((error) => {
          guestFormData.setError(error.path[0] as keyof GuestRegisterForm, { type: "manual", message: error.message });
        })
      }
      return;
    }

    const payload: RegisterData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: "guest",
      team_id: "",
      sector_id: "",
      church_id: "",
      otp: "",
    }


    try {
      const res = await AuthenticationService.registerGuest(payload)
      toast({
        title: "Account created!",
        description: "Welcome to Soul Bank. Please check your email to verify your account."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Registration failed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const onMemberSubmit = async (data: MemberRegisterForm) => {
    try {
      memberSchema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((error) => {
          memberFormData.setError(error.path[0] as keyof GuestRegisterForm, { type: "manual", message: error.message });
        })
      }
      return;
    }

    try {
      const payload: RegisterData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: "member",
        team_id: data.team_id,
        sector_id: data.sector_id,
        church_id: data.church_id,
        otp: data.otp,
      }

      await AuthenticationService.memberRegistraton(payload);
      toast({
        title: "Account created!",
        description: "Welcome to Soul Bank. Please check your email to verify your account."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Registration failed. Please try again.",
        variant: "destructive"
      });
    }
  };

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
                <form onSubmit={guestFormData.handleSubmit(onGuestSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest-firstName">First Name *</Label>
                      <Input
                        {...guestFormData.register("firstName")}
                        id="guest-firstName"
                        placeholder="Enter first name"
                        className="h-12"
                      />
                      {guestFormData.formState.errors.firstName && (
                        <span className="text-red-500 text-xs">
                          {guestFormData.formState.errors.firstName.message}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guest-lastName">Last Name *</Label>
                      <Input
                        id="guest-lastName"
                        {...guestFormData.register("lastName")}
                        placeholder="Enter last name"
                        className="h-12"
                      />
                      {guestFormData.formState.errors.lastName && (
                        <span className="text-red-500 text-xs">
                          {guestFormData.formState.errors.lastName.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest-email">Email *</Label>
                    <Input
                      id="guest-email"
                      {...guestFormData.register("email")}
                      type="email"
                      placeholder="Enter your email"
                      className="h-12"
                    />
                    {guestFormData.formState.errors.email && (
                      <span className="text-red-500 text-xs">
                        {guestFormData.formState.errors.email.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="guest-password"
                        {...guestFormData.register("password")}
                        type={showPassword.guest ? "text" : "password"}
                        placeholder="Create a password"
                        className="h-12 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(prev => ({ ...prev, guest: !prev.guest }))}
                      >
                        {showPassword.guest ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                      {guestFormData.formState.errors.password && (
                        <span className="text-red-500 text-xs">
                          {guestFormData.formState.errors.password.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest-confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="guest-confirmPassword"
                        {...guestFormData.register("confirmPassword")}
                        type={showPassword.guestConfirm ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="h-12 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(prev => ({ ...prev, guestConfirm: !prev.guestConfirm }))}
                      >
                        {showPassword.guestConfirm ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                      {guestFormData.formState.errors.confirmPassword && (
                        <span className="text-red-500 text-xs">
                          {guestFormData.formState.errors.confirmPassword.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12" disabled={guestFormData.formState.isSubmitting}>
                    {guestFormData.formState.isSubmitting ? "Creating Account..." : "Create Guest Account"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="member">
                <Form {...memberFormData}>
                  <form onSubmit={memberFormData.handleSubmit(onMemberSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={memberFormData.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="member-firstName">First Name *</FormLabel>
                            <FormControl>
                              <Input id="member-firstName" placeholder="Enter first name" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={memberFormData.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="member-lastName">Last Name *</FormLabel>
                            <FormControl>
                              <Input id="member-lastName" placeholder="Enter last name" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={memberFormData.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="member-email">Email *</FormLabel>
                          <FormControl>
                            <Input id="member-email" type="email" placeholder="Enter your email" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={memberFormData.control}
                      name="otp"
                      render={({ field }) => {
                        // Regex for IH00-993-9UT
                        // const otpRegex = /^[A-Z0-9]{4}-\d{3}-[A-Z0-9]{3}$/;
                        // Format input as IH00-993-9UT as user types
                        const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                          // Insert dashes at correct positions
                          if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
                          if (value.length > 8) value = value.slice(0, 8) + '-' + value.slice(8);
                          value = value.slice(0, 12); // Max length with dashes
                          field.onChange(value);
                        };
                        return (
                          <FormItem>
                            <FormLabel htmlFor="member-otp">Member OTP *</FormLabel>
                            <FormControl>
                              <Input
                                id="member-otp"
                                placeholder="Enter Otp code"
                                className="h-12"
                                maxLength={12}
                                value={field.value || ''}
                                onChange={handleOtpChange}
                                autoComplete="off"
                              />
                            </FormControl>
                            {loading && (
                              <span className="text-gray-500 text-xs">
                                Verifying OTP...
                              </span>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={memberFormData.control}
                        name="team_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="member-team">Team</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select your team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(teams || []).map((team) => (
                                  <SelectItem key={team.team_id} value={team.team_id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberFormData.control}
                        name="church_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="member-church">Church Center *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select your Center" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(churches || []).map((church) => (
                                  <SelectItem key={church.church_id} value={church.church_id}>
                                    {church.name}-{church.center}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {memberFormData.watch('church_id') && (
                      <FormField
                        control={memberFormData.control}
                        name="sector_id"
                        render={({ field }) => {
                          const selectedChurchId = memberFormData.watch('church_id');
                          const filteredSectors = (sectors || []).filter((sector) => sector.church_id === selectedChurchId);
                          return (
                            <FormItem>
                              <FormLabel>Sector (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select sector" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredSectors.map((sector) => (
                                    <SelectItem key={sector.sector_id} value={sector.sector_id}>
                                      {sector.sector_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    <FormField
                      control={memberFormData.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="member-password">Password *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                id="member-password"
                                type={showPassword.member ? "text" : "password"}
                                placeholder="Create a password"
                                className="h-12 pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(prev => ({ ...prev, member: !prev.member }))}
                                tabIndex={-1}
                              >
                                {showPassword.member ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={memberFormData.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="member-confirmPassword">Confirm Password *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                id="member-confirmPassword"
                                type={showPassword.memberConfirm ? "text" : "password"}
                                placeholder="Confirm your password"
                                className="h-12 pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(prev => ({ ...prev, memberConfirm: !prev.memberConfirm }))}
                                tabIndex={-1}
                              >
                                {showPassword.memberConfirm ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12" disabled={memberFormData.formState.isSubmitting}>
                      {memberFormData.formState.isSubmitting ? "Creating Account..." : "Create Member Account"}
                    </Button>

                  </form>
                </Form>
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
