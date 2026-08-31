import { useState, useEffect, useCallback } from 'react';
import { MembershipService, Member, SaveMemberPayload } from '@/services/membershipService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { MemberCRMFormValues } from '@/lib/schemas/member';

export function useMemberCRM() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MembershipService.fetchMembers(user?.teamId);
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to load members directory',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${m.firstName} ${m.surname} ${m.name}`.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      fullName.includes(searchLower) ||
      (m.email && m.email.toLowerCase().includes(searchLower)) ||
      (m.phoneNumber && m.phoneNumber.includes(searchTerm));
    const matchesStage = stageFilter === 'all' || m.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleOpenAdd = useCallback(() => {
    setSelectedMember(null);
    setEditModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((member: Member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: MemberCRMFormValues) => {
      try {
        setSaving(true);
        const payload: SaveMemberPayload = {
          ...data,
          firstName: data.firstName,
          surname: data.surname,
          role: data.role || 'member',
        };
        if (selectedMember) {
          await MembershipService.updateMember(selectedMember.id, payload);
          toast({ title: 'Success', description: 'Member profile updated successfully' });
        } else {
          await MembershipService.addMember(payload);
          toast({ title: 'Success', description: 'Member added successfully' });
        }
        setEditModalOpen(false);
        loadMembers();
      } catch (err: any) {
        console.error(err);
        toast({
          title: 'Save Failed',
          description:
            err.response?.data?.message || err.message || 'Failed to save member profile',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [selectedMember, loadMembers],
  );

  const handleDelete = useCallback(
    async (member: Member) => {
      if (
        !window.confirm(
          `Are you sure you want to delete member "${member.firstName} ${member.surname}"? This operation will remove all associated stage histories.`,
        )
      ) {
        return;
      }

      try {
        await MembershipService.deleteMember(member.id);
        toast({ title: 'Member Deleted', description: `Member ${member.name} deleted` });
        loadMembers();
      } catch (err: any) {
        console.error(err);
        toast({
          title: 'Delete Failed',
          description:
            err.response?.data?.message || err.message || 'Failed to delete member',
          variant: 'destructive',
        });
      }
    },
    [loadMembers],
  );

  return {
    members,
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
  };
}
