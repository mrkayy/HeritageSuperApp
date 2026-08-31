import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { MemberProfileFormValues } from '@/lib/schemas/member';

// ---- Shared types ----

export interface LocalChurch {
  id: string;
  name: string;
  center?: string;
}

export interface Sector {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  firstName?: string;
  surname?: string;
  email: string;
  currentStage?: string;
  localChurchId?: string;
  localChurchName?: string;
  sectorId?: string;
  sectorName?: string;
  teamId?: string;
  teamName?: string;
  createdAt: string;
}

export interface SystemUser {
  user_id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  roles?: string[];
  user_team: {
    team: {
      team_id: string;
      name: string;
    };
  }[];
  user_sector: {
    sector: {
      sector_id: string;
      sector_name: string;
    };
  }[];
}

// ---- Hook ----

interface UseMemberDirectoryOptions {
  userChurchId?: string;
}

export function useMemberDirectory({ userChurchId }: UseMemberDirectoryOptions = {}) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [churches, setChurches] = useState<LocalChurch[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);

  // Role edit modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<SystemUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['member']);
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Filters for User Roles tab
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Search filter for Members tab
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberStageFilter, setMemberStageFilter] = useState('all');

  // ---- Data fetching ----

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/members');
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchChurches = useCallback(async () => {
    try {
      const { data } = await api.get('/churches');
      const mapped = (data || []).map((item: any) => ({
        id: item.id || item.church_id || '',
        name: item.name || '',
        center: item.center || '',
      }));
      setChurches(mapped);
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  }, []);

  const fetchSectors = useCallback(async () => {
    try {
      const { data } = await api.get('/sectors');
      const mapped = (data || []).map((item: any) => ({
        id: item.id || item.sector_id || '',
        name: item.name || item.sector_name || '',
      }));
      setSectors(mapped);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await api.get('/teams');
      const mapped = (data || []).map((item: any) => ({
        id: item.id || item.team_id || '',
        name: item.name || item.team_name || '',
      }));
      setTeams(mapped);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchUsers();
    fetchChurches();
    fetchSectors();
    fetchTeams();
  }, [fetchMembers, fetchUsers, fetchChurches, fetchSectors, fetchTeams]);

  // ---- CRUD operations ----

  const saveMember = async (data: MemberProfileFormValues) => {
    try {
      setLoading(true);

      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || nameParts[0];

      if (editingMember) {
        const updatePayload = {
          firstName,
          surname,
          role: data.role || 'member',
          email: data.email.trim(),
          currentStage: data.current_stage || 'first_time_guest',
          localChurchId: data.church_id || userChurchId || undefined,
          sectorId: data.sector_id || undefined,
          teamId: data.team_id || undefined,
        };

        await api.put(`/members/${editingMember.id}`, updatePayload);
        toast({
          title: 'Success',
          description: 'Member updated successfully',
        });
      } else {
        const profilePayload = {
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role || 'member',
          current_stage: data.current_stage || 'first_time_guest',
          church_id: data.church_id || userChurchId || undefined,
          sector_id: data.sector_id || undefined,
          team_id: data.team_id || undefined,
        };

        await api.post('/members/profile', profilePayload);
        toast({
          title: 'Success',
          description: 'Member profiled successfully',
        });
      }

      setEditingMember(null);
      setIsDialogOpen(false);
      fetchMembers();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving member:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to save member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member: MemberProfile) => {
    setEditingMember(member);
    setIsDialogOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member profile?')) return;

    try {
      setLoading(true);
      await api.delete(`/members/${memberId}`);
      toast({
        title: 'Success',
        description: 'Member deleted successfully',
      });
      fetchMembers();
      fetchUsers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openNewMemberDialog = () => {
    setEditingMember(null);
    setIsDialogOpen(true);
  };

  const handleOpenRoleModal = (u: SystemUser) => {
    setSelectedUserForRole(u);
    setSelectedRole(u.role || 'member');
    const initialRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role || 'member'];
    setSelectedRoles(initialRoles);
    setRoleModalOpen(true);
  };

  const handleToggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        const filtered = prev.filter((r) => r !== role);
        return filtered.length > 0 ? filtered : ['member'];
      }
      return [...prev, role];
    });
  };

  const handleUpdateRole = async () => {
    if (!selectedUserForRole) return;
    try {
      setRoleUpdating(true);
      await api.put(`/users/${selectedUserForRole.user_id}/roles`, {
        roles: selectedRoles,
      });

      toast({
        title: 'Success',
        description: 'User roles updated successfully',
      });

      setRoleModalOpen(false);
      setSelectedUserForRole(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user roles:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update user roles',
        variant: 'destructive',
      });
    } finally {
      setRoleUpdating(false);
    }
  };

  // ---- Filtered lists ----

  const filteredMembers = members.filter((m) => {
    const fullName = (m.name || `${m.firstName || ''} ${m.surname || ''}`).toLowerCase();
    const email = (m.email || '').toLowerCase();
    const search = memberSearchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search);

    const stageCleaned = (m.currentStage || '').replace(/'/g, '');
    const matchesStage = memberStageFilter === 'all' || stageCleaned === memberStageFilter;

    return matchesSearch && matchesStage;
  });

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const search = userSearchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search);
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

    return matchesSearch && matchesRole;
  });

  return {
    // Data
    members,
    users,
    churches,
    sectors,
    teams,
    loading,
    filteredMembers,
    filteredUsers,

    // Member profile dialog
    isDialogOpen,
    setIsDialogOpen,
    editingMember,
    openNewMemberDialog,
    saveMember,
    handleEdit,
    handleDelete,

    // Role edit dialog
    roleModalOpen,
    setRoleModalOpen,
    selectedUserForRole,
    selectedRole,
    setSelectedRole,
    selectedRoles,
    setSelectedRoles,
    handleToggleRole,
    roleUpdating,
    handleOpenRoleModal,
    handleUpdateRole,

    // Filters
    memberSearchTerm,
    setMemberSearchTerm,
    memberStageFilter,
    setMemberStageFilter,
    userSearchTerm,
    setUserSearchTerm,
    userRoleFilter,
    setUserRoleFilter,
  };
}
