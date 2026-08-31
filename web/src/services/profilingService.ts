import api from '@/lib/api';

export interface TeamTodo {
  id: string;
  church_id: string;
  target_team: string;
  title: string;
  description?: string;
  entity_type: string;
  entity_id: string;
  status: string;
  created_by: string;
  completed_by?: string;
  created_at: string;
  completed_at?: string;
}

export const ProfilingService = {
  async listProfilingQueue(): Promise<TeamTodo[]> {
    const res = await api.get('/members/profiling-queue');
    return res.data || [];
  },

  async profileVisitor(visitorId: string): Promise<unknown> {
    const res = await api.post(`/members/profile-visitor/${visitorId}`);
    return res.data;
  },
};
