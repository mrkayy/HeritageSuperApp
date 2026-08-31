import React, { useEffect } from 'react';
import { Member } from '@/services/membershipService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cake, Heart } from 'lucide-react';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { memberCRMSchema, type MemberCRMFormValues } from '@/lib/schemas/member';
import {
  MEMBERSHIP_STAGES,
  MONTHS,
  DAYS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from '@/lib/constants';

const INITIAL_VALUES: MemberCRMFormValues = {
  firstName: '',
  surname: '',
  email: '',
  phoneNumber: '',
  homeAddress: '',
  gender: '',
  dateOfBirthDay: null,
  dateOfBirthMonth: null,
  maritalStatus: '',
  weddingAnniversaryDay: null,
  weddingAnniversaryMonth: null,
  jobOccupation: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergies: '',
  medicalNotes: '',
  currentStage: 'first_time_guest',
};

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSave: (data: MemberCRMFormValues) => Promise<void>;
  saving: boolean;
}

function memberToFormValues(member: Member): MemberCRMFormValues {
  return {
    firstName: member.firstName || '',
    surname: member.surname || '',
    email: member.email || '',
    phoneNumber: member.phoneNumber || '',
    homeAddress: member.homeAddress || '',
    gender: member.gender || '',
    dateOfBirthDay: member.dateOfBirthDay ?? null,
    dateOfBirthMonth: member.dateOfBirthMonth ?? null,
    maritalStatus: member.maritalStatus || '',
    weddingAnniversaryDay: member.weddingAnniversaryDay ?? null,
    weddingAnniversaryMonth: member.weddingAnniversaryMonth ?? null,
    jobOccupation: member.jobOccupation || '',
    emergencyContactName: member.emergencyContactName || '',
    emergencyContactPhone: member.emergencyContactPhone || '',
    allergies: member.allergies || '',
    medicalNotes: member.medicalNotes || '',
    currentStage: member.currentStage || 'first_time_guest',
  };
}

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  onSave,
  saving,
}: MemberFormDialogProps) {
  const form = useZodForm<MemberCRMFormValues>({
    schema: memberCRMSchema,
    initialValues: INITIAL_VALUES,
  });

  useEffect(() => {
    if (open) {
      if (member) {
        form.reset(memberToFormValues(member));
      } else {
        form.reset();
      }
    }
  }, [open, member]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {member
              ? `Edit Member: ${member.firstName} ${member.surname}`
              : 'Add New Member'}
          </DialogTitle>
          <DialogDescription>
            Update member profile information, stage history, and celebration dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-2">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="dates">Birth & Anniversary</TabsTrigger>
              <TabsTrigger value="other">Contact & Medical</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Info */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...form.getInputProps('firstName')}
                    placeholder="e.g. John"
                  />
                  <FieldError message={form.errors.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname *</Label>
                  <Input
                    id="surname"
                    {...form.getInputProps('surname')}
                    placeholder="e.g. Doe"
                  />
                  <FieldError message={form.errors.surname} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.getInputProps('email')}
                    placeholder="john.doe@example.com"
                  />
                  <FieldError message={form.errors.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    {...form.getInputProps('phoneNumber')}
                    placeholder="+234..."
                  />
                  <FieldError message={form.errors.phoneNumber} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentStage">Current Membership Stage</Label>
                  <Select {...form.getSelectProps('currentStage')}>
                    <SelectTrigger id="currentStage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBERSHIP_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select {...form.getSelectProps('gender')}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Birth & Wedding Anniversary */}
            <TabsContent value="dates" className="space-y-6">
              {/* Date of Birth Section */}
              <div className="space-y-3 p-4 rounded-xl border border-pink-500/20 bg-pink-500/5">
                <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-semibold text-sm">
                  <Cake className="w-4 h-4" /> Date of Birth (Day & Month)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dobMonth">Birth Month</Label>
                    <Select
                      value={form.values.dateOfBirthMonth ? String(form.values.dateOfBirthMonth) : ''}
                      onValueChange={(val) =>
                        form.setValue('dateOfBirthMonth', val ? Number(val) : null)
                      }
                    >
                      <SelectTrigger id="dobMonth">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dobDay">Birth Day</Label>
                    <Select
                      value={form.values.dateOfBirthDay ? String(form.values.dateOfBirthDay) : ''}
                      onValueChange={(val) =>
                        form.setValue('dateOfBirthDay', val ? Number(val) : null)
                      }
                    >
                      <SelectTrigger id="dobDay">
                        <SelectValue placeholder="Select Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            Day {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Wedding Anniversary Section */}
              <div className="space-y-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
                  <Heart className="w-4 h-4" /> Wedding Anniversary (Day & Month)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annMonth">Anniversary Month</Label>
                    <Select
                      value={
                        form.values.weddingAnniversaryMonth
                          ? String(form.values.weddingAnniversaryMonth)
                          : ''
                      }
                      onValueChange={(val) =>
                        form.setValue('weddingAnniversaryMonth', val ? Number(val) : null)
                      }
                    >
                      <SelectTrigger id="annMonth">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annDay">Anniversary Day</Label>
                    <Select
                      value={
                        form.values.weddingAnniversaryDay
                          ? String(form.values.weddingAnniversaryDay)
                          : ''
                      }
                      onValueChange={(val) =>
                        form.setValue('weddingAnniversaryDay', val ? Number(val) : null)
                      }
                    >
                      <SelectTrigger id="annDay">
                        <SelectValue placeholder="Select Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            Day {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select {...form.getSelectProps('maritalStatus')}>
                  <SelectTrigger id="maritalStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS_OPTIONS.map((ms) => (
                      <SelectItem key={ms.value} value={ms.value}>
                        {ms.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Tab 3: Contact & Medical */}
            <TabsContent value="other" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeAddress">Home Address</Label>
                <Input
                  id="homeAddress"
                  {...form.getInputProps('homeAddress')}
                  placeholder="Residential address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobOccupation">Job / Occupation</Label>
                <Input
                  id="jobOccupation"
                  {...form.getInputProps('jobOccupation')}
                  placeholder="e.g. Software Engineer, Accountant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyName"
                    {...form.getInputProps('emergencyContactName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    {...form.getInputProps('emergencyContactPhone')}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
