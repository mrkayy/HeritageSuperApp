import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Shield, Plus, X, Check } from 'lucide-react';
import { USER_ROLES } from '@/lib/constants';
import type { SystemUser } from '@/hooks/useMemberDirectory';

interface RoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: SystemUser | null;
  selectedRoles: string[];
  onToggleRole: (role: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function RoleEditDialog({
  open,
  onOpenChange,
  selectedUser,
  selectedRoles,
  onToggleRole,
  onSave,
  loading,
}: RoleEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manage User Roles (Multi-Role Support)
          </DialogTitle>
          <DialogDescription>
            Assign or revoke system roles. A user can hold multiple roles simultaneously (e.g. Team Lead + Steward).
          </DialogDescription>
        </DialogHeader>

        {selectedUser && (
          <div className="space-y-5 py-2">
            {/* User Details */}
            <div className="p-3 rounded-xl bg-card border border-border/50 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">User Account</p>
              <p className="text-sm font-semibold text-foreground">
                {`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 'User Account'}
              </p>
              <p className="text-xs text-muted-foreground font-mono">{selectedUser.email}</p>
            </div>

            {/* Currently Active Roles Badges */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Roles ({selectedRoles.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-primary/20 bg-primary/5 min-h-[48px] items-center">
                {selectedRoles.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No roles assigned (defaults to member)</span>
                ) : (
                  selectedRoles.map((r) => {
                    const matched = USER_ROLES.find((item) => item.value === r);
                    const label = matched ? matched.label : r;
                    return (
                      <Badge 
                        key={r} 
                        variant="secondary" 
                        className="bg-primary/15 text-primary hover:bg-primary/25 transition-colors gap-1 text-xs py-1 px-2.5"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => onToggleRole(r)}
                          className="hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                          title={`Remove ${label} role`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            {/* Checkbox Selector for All System Roles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Toggle System Roles
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-xl p-3 bg-card/40 max-h-[220px] overflow-y-auto">
                {USER_ROLES.map((r) => {
                  const isChecked = selectedRoles.includes(r.value);
                  return (
                    <label
                      key={r.value}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-primary/50 bg-primary/10 text-foreground font-medium' 
                          : 'border-border/40 hover:bg-card/80 text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => onToggleRole(r.value)}
                      />
                      <span className="flex-1 truncate">{r.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="text-xs"
              >
                {loading ? 'Saving Roles...' : 'Save User Roles'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
