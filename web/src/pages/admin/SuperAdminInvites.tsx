
import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, UserPlus } from 'lucide-react';
import { useInvites } from '@/hooks/useInvites';
import { InviteFormDialog } from '@/components/admin/InviteFormDialog';
import { InviteTable } from '@/components/admin/InviteTable';

const SuperAdminInvites = () => {
  const { user } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check permissions
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don&apos;t have Super Admin permissions to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    invites,
    churches,
    sectors,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    churchFilter,
    setChurchFilter,
    statusFilter,
    setStatusFilter,
    handleSubmit,
    handleDelete,
    handleUpdateStatus,
  } = useInvites(user?.user_id);

  return (
    <div className="p-6 page-background space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Member Invites
          </h1>
          <p className="text-muted-foreground">Manage invites for new members</p>
        </div>
        <InviteFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          churches={churches}
          sectors={sectors}
          onSubmit={handleSubmit}
          loading={loading}
          userId={user?.user_id}
          defaultChurchId={user?.church_id}
        />
      </div>

      <InviteTable
        invites={invites}
        loading={loading}
        onDelete={handleDelete}
        onUpdateStatus={handleUpdateStatus}
        churches={churches}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        churchFilter={churchFilter}
        onChurchFilterChange={setChurchFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />
    </div>
  );
};

export default SuperAdminInvites;
