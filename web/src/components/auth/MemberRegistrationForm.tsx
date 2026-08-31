import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { memberRegistrationSchema, type MemberRegistrationFormValues } from '@/lib/schemas/auth';
import { AuthenticationService, RegisterData } from '@/services/AuthenticationService';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { useLoadingStore } from '@/store/loadingState';

const initialValues: MemberRegistrationFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'member',
  team_id: '',
  sector_id: '',
  church_id: '',
  otp: '',
};

export function MemberRegistrationForm() {
  const { values, errors, isSubmitting, getInputProps, getSelectProps, setValue, handleSubmit } =
    useZodForm({
      schema: memberRegistrationSchema,
      initialValues,
    });

  const { teams, sectors, churches } = useRegistrationData();
  const loading = useLoadingStore((state) => state.loading);

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm: false,
  });

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
    if (value.length > 8) value = value.slice(0, 8) + '-' + value.slice(8);
    value = value.slice(0, 12);
    setValue('otp', value as any);
  };

  const filteredSectors = sectors.filter((sector) => sector.church_id === values.church_id);

  const onSubmit = async (data: MemberRegistrationFormValues) => {
    const payload: RegisterData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: 'member',
      team_id: data.team_id,
      sector_id: data.sector_id,
      church_id: data.church_id,
      otp: data.otp,
    };

    try {
      await AuthenticationService.memberRegistraton(payload);
      toast({
        title: 'Account created!',
        description: 'Welcome to Soul Bank. Please check your email to verify your account.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Registration failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="member-firstName">First Name *</Label>
          <Input
            {...getInputProps('firstName')}
            id="member-firstName"
            placeholder="Enter first name"
            className="h-12"
          />
          <FieldError message={errors.firstName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-lastName">Last Name *</Label>
          <Input
            {...getInputProps('lastName')}
            id="member-lastName"
            placeholder="Enter last name"
            className="h-12"
          />
          <FieldError message={errors.lastName} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="member-email">Email *</Label>
        <Input
          {...getInputProps('email')}
          id="member-email"
          type="email"
          placeholder="Enter your email"
          className="h-12"
        />
        <FieldError message={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="member-otp">Member OTP *</Label>
        <Input
          id="member-otp"
          placeholder="Enter Otp code"
          className="h-12"
          maxLength={12}
          value={values.otp}
          onChange={handleOtpChange}
          autoComplete="off"
        />
        {loading && <span className="text-gray-500 text-xs">Verifying OTP...</span>}
        <FieldError message={errors.otp} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="member-team">Team</Label>
          <Select {...getSelectProps('team_id')}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select your team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.team_id} value={team.team_id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.team_id} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-church">Church Center *</Label>
          <Select {...getSelectProps('church_id')}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select your Center" />
            </SelectTrigger>
            <SelectContent>
              {churches.map((church) => (
                <SelectItem key={church.church_id} value={church.church_id}>
                  {church.name}-{church.center}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.church_id} />
        </div>
      </div>

      {values.church_id && (
        <div className="space-y-2">
          <Label>Sector (Optional)</Label>
          <Select {...getSelectProps('sector_id')}>
            <SelectTrigger>
              <SelectValue placeholder="Select sector" />
            </SelectTrigger>
            <SelectContent>
              {filteredSectors.map((sector) => (
                <SelectItem key={sector.sector_id} value={sector.sector_id}>
                  {sector.sector_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.sector_id} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="member-password">Password *</Label>
        <div className="relative">
          <Input
            {...getInputProps('password')}
            id="member-password"
            type={showPassword.password ? 'text' : 'password'}
            placeholder="Create a password"
            className="h-12 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
            onClick={() => setShowPassword((prev) => ({ ...prev, password: !prev.password }))}
            tabIndex={-1}
          >
            {showPassword.password ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
        <FieldError message={errors.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="member-confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Input
            {...getInputProps('confirmPassword')}
            id="member-confirmPassword"
            type={showPassword.confirm ? 'text' : 'password'}
            placeholder="Confirm your password"
            className="h-12 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
            onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
            tabIndex={-1}
          >
            {showPassword.confirm ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
        <FieldError message={errors.confirmPassword} />
      </div>

      <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Create Member Account'}
      </Button>
    </form>
  );
}
