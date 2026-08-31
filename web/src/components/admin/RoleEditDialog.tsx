import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield } from 'lucide-react';
import { USER_ROLES } from '@/lib/constants';
import type { SystemUser } from '@/hooks/useMemberDirectory';

interface RoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: SystemUser | null;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function RoleEditDialog({
  open,
  onOpenChange,
  selectedUser,
  selectedRole,
  onRoleChange,
  onSave,
  loading,
}: RoleEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Update User Role
          </DialogTitle>
        </DialogHeader>
        {selectedUser && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">User</p>
              <p className="text-sm text-muted-foreground">
                {`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim()} ({selectedUser.email})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={selectedRole} onValueChange={onRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Save Role'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
