import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, GraduationCap } from 'lucide-react';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { memberProfileSchema, type MemberProfileFormValues } from '@/lib/schemas/member';
import { MEMBERSHIP_STAGES, USER_ROLES } from '@/lib/constants';
import type { MemberProfile, LocalChurch, Sector, Team } from '@/hooks/useMemberDirectory';

interface MemberProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMember: MemberProfile | null;
  churches: LocalChurch[];
  sectors: Sector[];
  teams: Team[];
  onSave: (data: MemberProfileFormValues) => Promise<void>;
  loading: boolean;
  userChurchId?: string;
}

export function MemberProfileDialog({
  open,
  onOpenChange,
  editingMember,
  churches,
  sectors,
  teams,
  onSave,
  loading,
  userChurchId,
}: MemberProfileDialogProps) {
  const defaultValues: MemberProfileFormValues = {
    name: '',
    email: '',
    role: 'member',
    current_stage: 'first_time_guest',
    church_id: userChurchId || '',
    sector_id: '',
    team_id: '',
  };

  const { values, errors, handleSubmit, reset, getInputProps, getSelectProps } = useZodForm<MemberProfileFormValues>({
    schema: memberProfileSchema,
    initialValues: defaultValues,
  });

  const hideSectorAndTeam = [
    'first_time_guest',
    'foundation_class',
    'sunday_school_module_1',
    'sunday_school_module_2',
  ].includes(values.current_stage);

  // Reset form when dialog opens/closes or editingMember changes
  useEffect(() => {
    if (open) {
      if (editingMember) {
        const memberName = (
          editingMember.name ||
          `${editingMember.firstName || ''} ${editingMember.surname || ''}`
        ).trim();
        const cleanedStage = (editingMember.currentStage || 'first_time_guest').replace(/'/g, '');

        reset({
          name: memberName,
          email: editingMember.email || '',
          role: 'member',
          current_stage: cleanedStage,
          church_id: editingMember.localChurchId || userChurchId || '',
          sector_id: editingMember.sectorId || '',
          team_id: editingMember.teamId || '',
        });
      } else {
        reset(defaultValues);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingMember]);

  const onFormSubmit = handleSubmit(async (data) => {
    if (hideSectorAndTeam) {
      data.sector_id = '';
      data.team_id = '';
    }
    await onSave(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMember ? 'Edit Member Profile' : 'Profile New Member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onFormSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Full Name</label>
            <Input placeholder="Enter full name (e.g. John Doe)" {...getInputProps('name')} />
            <FieldError message={errors.name} />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Email Address</label>
            <Input placeholder="Enter email address" {...getInputProps('email')} />
            <FieldError message={errors.email} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Account Role
              </label>
              <Select {...getSelectProps('role')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.role} />
            </div>

            {/* Current Stage */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                Current Stage
              </label>
              <Select {...getSelectProps('current_stage')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select membership stage" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERSHIP_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.current_stage} />
            </div>
          </div>

          {/* Local Church */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Local Church</label>
            <Select {...getSelectProps('church_id')}>
              <SelectTrigger>
                <SelectValue placeholder="Default (Creator's Local Church)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default (Creator's Local Church)</SelectItem>
                {churches.map((church) => (
                  <SelectItem key={church.id} value={church.id}>
                    {church.name} {church.center ? `(${church.center})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.church_id} />
          </div>

          {/* Sector and Team (Hidden for first timer, foundation class, Sunday school module 1 & 2) */}
          {!hideSectorAndTeam && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sector */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Sector (Optional)</label>
                <Select {...getSelectProps('sector_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Sector</SelectItem>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.sector_id} />
              </div>

              {/* Team */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Team (Optional)</label>
                <Select {...getSelectProps('team_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.team_id} />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editingMember ? 'Update Member' : 'Profile Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
