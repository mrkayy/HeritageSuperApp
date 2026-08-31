import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { soulService } from '@/services/soulService';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { soulRegistrationSchema, type SoulRegistrationFormValues } from '@/lib/schemas/soul';
import { GENDER_OPTIONS, AGE_RANGES, RESPONSE_STATUS_OPTIONS } from '@/lib/constants';

interface SoulRegistrationFormProps {
  onSuccess: () => void;
}

export function SoulRegistrationForm({ onSuccess }: SoulRegistrationFormProps) {
  const { user } = useAuthStore();

  const initialValues: SoulRegistrationFormValues = {
    full_name: '',
    phone: '',
    gender: '',
    age_range: '',
    address: '',
    response_status: 'saved',
    note: '',
    latitude: 0.0,
    longitude: 0.0,
    sector_id: user?.sector_id ?? '',
    team_id: user?.team_id ?? '',
    added_by_user_id: user?.user_id ?? '',
    outreach_date: new Date().toISOString(),
    is_active: false,
  };

  const {
    errors,
    isSubmitting,
    handleSubmit,
    reset,
    getInputProps,
    getSelectProps,
  } = useZodForm<SoulRegistrationFormValues>({
    schema: soulRegistrationSchema,
    initialValues,
  });

  const onSubmit = async (data: SoulRegistrationFormValues) => {
    if (!user) return;

    try {
      await soulService.createSoul(data);
      toast({
        title: "Success",
        description: "Soul registered successfully",
      });
      reset();
      onSuccess();
    } catch (error) {
      console.error('Error registering soul:', error);
      toast({
        title: "Error",
        description: "Failed to register soul",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Register New Soul</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...getInputProps('full_name')}
                placeholder="Enter full name"
                className="w-full"
              />
              <FieldError message={errors.full_name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                {...getInputProps('phone')}
                placeholder="Enter phone number"
                className="w-full"
              />
              <FieldError message={errors.phone} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select {...getSelectProps('gender')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.gender} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age_range">Age Range *</Label>
              <Select {...getSelectProps('age_range')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.age_range} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...getInputProps('address')}
              placeholder="Enter address"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="response_status">Status *</Label>
            <Select {...getSelectProps('response_status')}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.response_status} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              {...getInputProps('note')}
              placeholder="Add any additional notes..."
              className="min-h-[100px] w-full"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? "Registering..." : "Register Soul"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
