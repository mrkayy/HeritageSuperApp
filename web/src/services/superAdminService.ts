import api from '@/lib/api';

export interface LocalChurchBranch {
  id: string;
  name: string;
  center: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  resident_pastor_id?: string;
  resident_pastor_name?: string;
  church_admin_id?: string;
  church_admin_name?: string;
  is_active: boolean;
  total_members: number;
  created_at: string;
}

export interface CreateBranchPayload {
  name: string;
  center?: string;
  slug?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  resident_pastor_id?: string;
  church_admin_id?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  center?: string;
  slug?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  is_active?: boolean;
}

export interface LeadershipInvite {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  church_id?: string;
  church_name?: string;
  sector_id?: string;
  otp_code: string;
  used: boolean;
  expires_at: string;
  created_at: string;
}

export interface CreateLeadershipInvitePayload {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  church_id?: string;
  sector_id?: string;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  church_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export const SuperAdminService = {
  // Branches (Local Churches)
  async listBranches(): Promise<LocalChurchBranch[]> {
    const res = await api.get('/super-admin/churches');
    return res.data || [];
  },

  async createBranch(payload: CreateBranchPayload): Promise<LocalChurchBranch> {
    const res = await api.post('/super-admin/churches', payload);
    return res.data;
  },

  async updateBranch(id: string, payload: UpdateBranchPayload): Promise<LocalChurchBranch> {
    const res = await api.put(`/super-admin/churches/${id}`, payload);
    return res.data;
  },

  async reassignLeadership(id: string, payload: { resident_pastor_id?: string; church_admin_id?: string }): Promise<void> {
    await api.post(`/super-admin/churches/${id}/reassign-leadership`, payload);
  },

  async toggleBranchStatus(id: string): Promise<{ is_active: boolean }> {
    const res = await api.post(`/super-admin/churches/${id}/toggle-status`);
    return res.data;
  },

  // Leadership Invites
  async listLeadershipInvites(): Promise<LeadershipInvite[]> {
    const res = await api.get('/super-admin/leadership/invites');
    return res.data || [];
  },

  async createLeadershipInvite(payload: CreateLeadershipInvitePayload): Promise<LeadershipInvite> {
    const res = await api.post('/super-admin/leadership/invite', payload);
    return res.data;
  },

  async revokeLeadershipInvite(id: string): Promise<void> {
    await api.delete(`/super-admin/leadership/invites/${id}`);
  },

  // Audit Logs
  async listAuditLogs(limit = 50): Promise<AuditLog[]> {
    const res = await api.get('/super-admin/audit-logs', { params: { limit } });
    return res.data || [];
  },
};
