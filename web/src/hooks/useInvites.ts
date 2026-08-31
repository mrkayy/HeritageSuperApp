import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { generateOTP } from '@/lib/utils';
import type { Sector, LocalChurch as Church, User, AdminUser as Admin } from '@/integrations/type_def';
import type { InviteFormValues } from '@/lib/schemas/admin';

export interface Invite {
  id: string;
  email: string;
  otp_code: string;
  role: string;
  used: boolean;
  expires_at: string;
  created_at: string;
  sector?: Sector;
  church?: Church;
  created_by_user_id?: Admin;
  used_by_user_id?: Partial<User>;
}

export function useInvites(userId?: string) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [churchFilter, setChurchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/otp-invites');
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invites',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChurches = useCallback(async () => {
    try {
      const { data } = await api.get('/churches');
      setChurches(data || []);
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  }, []);

  const fetchSectors = useCallback(async () => {
    try {
      const { data } = await api.get('/sectors');
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
    fetchSectors();
    fetchChurches();
  }, [fetchInvites, fetchSectors, fetchChurches]);

  const handleSubmit = useCallback(
    async (formValues: InviteFormValues) => {
      if (!userId) return;

      try {
        setLoading(true);

        const insertData = {
          email: formValues.email,
          otp_code: generateOTP(),
          role: formValues.role,
          used: false,
          expires_at: formValues.expires_at
            ? new Date(formValues.expires_at).toISOString()
            : null,
          sector_id:
            formValues.sector_id && formValues.sector_id !== 'none'
              ? formValues.sector_id
              : null,
          church_id:
            formValues.church_id && formValues.church_id !== 'none'
              ? formValues.church_id
              : null,
          created_by_user_id: userId,
        };

        await api.post('/otp-invites/invite', insertData);

        toast({
          title: 'Success',
          description: 'Invite created successfully',
        });

        fetchInvites();
      } catch (error) {
        console.error('Error saving invite:', error);
        toast({
          title: 'Error',
          description: 'Failed to save invite.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchInvites],
  );

  const handleDelete = useCallback(
    async (inviteId: string) => {
      if (!confirm('Are you sure you want to delete this invite?')) return;

      try {
        setLoading(true);
        await api.delete(`/otp-invites/${inviteId}`);
        toast({
          title: 'Success',
          description: 'Invite deleted successfully',
        });
        fetchInvites();
      } catch (error) {
        console.error('Error deleting invite:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete invite',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [fetchInvites],
  );

  const handleUpdateStatus = useCallback(
    async (inviteId: string, used: boolean) => {
      try {
        setLoading(true);
        await api.put(`/otp-invites/${inviteId}/status`, { used });
        toast({
          title: 'Success',
          description: `Invite ${used ? 'activated' : 'deactivated'} successfully`,
        });
        fetchInvites();
      } catch (error) {
        console.error('Error updating invite status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update invite status',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [fetchInvites],
  );

  const filteredInvites = invites.filter((invite) => {
    const matchesSearch =
      invite.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.otp_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || invite.role === roleFilter;
    const matchesChurch =
      churchFilter === 'all' || invite.church?.church_id === churchFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'used' && invite.used) ||
      (statusFilter === 'unused' && !invite.used) ||
      (statusFilter === 'expired' &&
        new Date(invite.expires_at || '') < new Date());

    return matchesSearch && matchesRole && matchesChurch && matchesStatus;
  });

  return {
    invites: filteredInvites,
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
  };
}
