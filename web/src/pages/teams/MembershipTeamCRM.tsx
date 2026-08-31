import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { useMemberCRM } from '@/hooks/useMemberCRM';
import { MemberCRMTable } from '@/components/teams/MemberCRMTable';
import { MemberFormDialog } from '@/components/teams/MemberFormDialog';

export default function MembershipTeamCRM() {
  const {
    filteredMembers,
    loading,
    searchTerm,
    setSearchTerm,
    stageFilter,
    setStageFilter,
    editModalOpen,
    setEditModalOpen,
    selectedMember,
    saving,
    loadMembers,
    handleOpenAdd,
    handleOpenEdit,
    handleSave,
    handleDelete,
  } = useMemberCRM();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            Membership CRM
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Member Management Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage birthdays, wedding anniversaries, stage progression, and contact info for all members.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadMembers} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenAdd} size="sm" className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <MemberCRMTable
        members={filteredMembers}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        stageFilter={stageFilter}
        setStageFilter={setStageFilter}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <MemberFormDialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        member={selectedMember}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
