import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { inviteSchema, type InviteFormValues } from '@/lib/schemas/admin';
import type { Sector, LocalChurch as Church } from '@/integrations/type_def';

interface InviteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churches: Church[];
  sectors: Sector[];
  onSubmit: (data: InviteFormValues) => Promise<void>;
  loading: boolean;
  userId?: string;
  defaultChurchId?: string;
}

export function InviteFormDialog({
  open,
  onOpenChange,
  churches,
  sectors,
  onSubmit,
  loading,
  userId,
  defaultChurchId,
}: InviteFormDialogProps) {
  const defaultValues: InviteFormValues = {
    email: '',
    otp_code: '',
    role: 'member',
    used: false,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    sector_id: null,
    church_id: defaultChurchId ?? null,
    created_by_user_id: userId ?? null,
    used_by_user_id: null,
  };

  const {
    values,
    errors,
    setValue,
    handleSubmit,
    reset,
    getInputProps,
    getSelectProps,
  } = useZodForm<InviteFormValues>({
    schema: inviteSchema,
    initialValues: defaultValues,
  });

  const resetAndOpen = () => {
    reset(defaultValues);
  };

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
    reset(defaultValues);
    onOpenChange(false);
  });

  const filteredSectors = values.church_id
    ? sectors.filter((sector) => sector.church_id === values.church_id)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={resetAndOpen}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Invite</DialogTitle>
        </DialogHeader>
        <form onSubmit={onFormSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              placeholder="Enter email address"
              {...getInputProps('email')}
            />
            <FieldError message={errors.email} />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <Select {...getSelectProps('role')}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="church_admin">Church Admin</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={errors.role} />
          </div>

          <div>
            <label className="text-sm font-medium">
              Church Center (Optional)
            </label>
            <Select {...getSelectProps('church_id')}>
              <SelectTrigger>
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

          {values.church_id && (
            <div>
              <label className="text-sm font-medium">Sector (Optional)</label>
              <Select {...getSelectProps('sector_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSectors.map((sector) => (
                    <SelectItem
                      key={sector.sector_id}
                      value={sector.sector_id || ''}
                    >
                      {sector.sector_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.sector_id} />
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-sm font-medium">Expiry Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !values.expires_at && 'text-muted-foreground',
                  )}
                >
                  {values.expires_at ? (
                    format(values.expires_at, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    values.expires_at
                      ? new Date(values.expires_at)
                      : undefined
                  }
                  onSelect={(date) => {
                    setValue(
                      'expires_at',
                      date ? date.toISOString() : '',
                    );
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FieldError message={errors.expires_at} />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
