import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { guestRegistrationSchema, type GuestRegistrationFormValues } from '@/lib/schemas/auth';
import { AuthenticationService, RegisterData } from '@/services/AuthenticationService';

const initialValues: GuestRegistrationFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function GuestRegistrationForm() {
  const { errors, isSubmitting, getInputProps, handleSubmit } = useZodForm({
    schema: guestRegistrationSchema,
    initialValues,
  });

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm: false,
  });

  const onSubmit = async (data: GuestRegistrationFormValues) => {
    const payload: RegisterData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: 'guest',
      team_id: '',
      sector_id: '',
      church_id: '',
      otp: '',
    };

    try {
      await AuthenticationService.registerGuest(payload);
      toast({
        title: 'Account created!',
        description: 'Welcome to HOFMM Console. Please check your email to verify your account.',
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
          <Label htmlFor="guest-firstName">First Name *</Label>
          <Input
            {...getInputProps('firstName')}
            id="guest-firstName"
            placeholder="Enter first name"
            className="h-12"
          />
          <FieldError message={errors.firstName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest-lastName">Last Name *</Label>
          <Input
            {...getInputProps('lastName')}
            id="guest-lastName"
            placeholder="Enter last name"
            className="h-12"
          />
          <FieldError message={errors.lastName} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-email">Email *</Label>
        <Input
          {...getInputProps('email')}
          id="guest-email"
          type="email"
          placeholder="Enter your email"
          className="h-12"
        />
        <FieldError message={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-password">Password *</Label>
        <div className="relative">
          <Input
            {...getInputProps('password')}
            id="guest-password"
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
          >
            {showPassword.password ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
          <FieldError message={errors.password} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Input
            {...getInputProps('confirmPassword')}
            id="guest-confirmPassword"
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
          >
            {showPassword.confirm ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
          <FieldError message={errors.confirmPassword} />
        </div>
      </div>

      <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Create Guest Account'}
      </Button>
    </form>
  );
}
