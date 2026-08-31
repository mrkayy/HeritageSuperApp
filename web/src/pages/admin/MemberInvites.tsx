import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Plus, Users, Shield } from 'lucide-react';
import { useMemberDirectory } from '@/hooks/useMemberDirectory';
import { MemberProfileDialog } from '@/components/admin/MemberProfileDialog';
import { MemberDirectoryTable } from '@/components/admin/MemberDirectoryTable';
import { UserRolesTable } from '@/components/admin/UserRolesTable';
import { RoleEditDialog } from '@/components/admin/RoleEditDialog';

const MemberInvites = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');

  const {
    members,
    users,
    churches,
    sectors,
    teams,
    loading,
    filteredMembers,
    filteredUsers,

    isDialogOpen,
    setIsDialogOpen,
    editingMember,
    openNewMemberDialog,
    saveMember,
    handleEdit,
    handleDelete,

    roleModalOpen,
    setRoleModalOpen,
    selectedUserForRole,
    selectedRole,
    setSelectedRole,
    roleUpdating,
    handleOpenRoleModal,
    handleUpdateRole,

    memberSearchTerm,
    setMemberSearchTerm,
    memberStageFilter,
    setMemberStageFilter,
    userSearchTerm,
    setUserSearchTerm,
    userRoleFilter,
    setUserRoleFilter,
  } = useMemberDirectory({ userChurchId: user?.church_id });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Member Directory & Role Management
          </h1>
          <p className="text-muted-foreground">
            Manage membership records, progression stages, and user account roles
          </p>
        </div>

        {activeTab === 'members' && (
          <Button onClick={openNewMemberDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Profile New Member
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'members' | 'roles')}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profiled Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            User Roles ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <MemberDirectoryTable
            members={members}
            filteredMembers={filteredMembers}
            loading={loading}
            memberSearchTerm={memberSearchTerm}
            onSearchChange={setMemberSearchTerm}
            memberStageFilter={memberStageFilter}
            onStageFilterChange={setMemberStageFilter}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <UserRolesTable
            users={users}
            filteredUsers={filteredUsers}
            userSearchTerm={userSearchTerm}
            onSearchChange={setUserSearchTerm}
            userRoleFilter={userRoleFilter}
            onRoleFilterChange={setUserRoleFilter}
            onEditRole={handleOpenRoleModal}
          />
        </TabsContent>
      </Tabs>

      {/* Member Profile Dialog (create / edit) */}
      <MemberProfileDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingMember={editingMember}
        churches={churches}
        sectors={sectors}
        teams={teams}
        onSave={saveMember}
        loading={loading}
        userChurchId={user?.church_id}
      />

      {/* Role Edit Dialog */}
      <RoleEditDialog
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        selectedUser={selectedUserForRole}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onSave={handleUpdateRole}
        loading={roleUpdating}
      />
    </div>
  );
};

export default MemberInvites;
