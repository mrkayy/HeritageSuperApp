import api from '@/lib/api';

export interface UniversalMemberSearchResult {
  id: string;
  first_name: string;
  surname: string;
  email?: string;
  phone_number?: string;
  church_id: string;
  church_name: string;
  current_stage: string;
  role: string;
}

export interface Member360Dossier {
  member: {
    id: string;
    firstName: string;
    surname: string;
    email?: string;
    phoneNumber?: string;
    homeAddress?: string;
    gender?: string;
    maritalStatus?: string;
    jobOccupation?: string;
    currentStage: string;
    isProfiled: boolean;
  };
  church_name: string;
  stages: Array<{
    stage: string;
    changed_at: string;
  }>;
  attendance: Array<{
    service_type: string;
    attended_at: string;
  }>;
  teams: string[];
  total_visits: number;
  sit_reps: Array<{
    category: string;
    notes: string;
    reported_at: string;
    reported_by: string;
  }>;
}

export interface ExecutiveSummary {
  total_active_members: number;
  total_visitors: number;
  total_first_timers: number;
  total_foundation_class: number;
  total_stewards: number;
  total_souls_won: number;
  branch_performance: Array<{
    church_id: string;
    church_name: string;
    member_count: number;
    visitor_count: number;
    first_timer_count: number;
    souls_won_count: number;
  }>;
}

export const GeneralOverseerService = {
  async searchMembers(query: string): Promise<UniversalMemberSearchResult[]> {
    const res = await api.get('/general-overseer/members/search', { params: { q: query } });
    return res.data || [];
  },

  async getMember360Dossier(id: string): Promise<Member360Dossier> {
    const res = await api.get(`/general-overseer/members/${id}/360-dossier`);
    return res.data;
  },

  async getExecutiveSummary(): Promise<ExecutiveSummary> {
    const res = await api.get('/analytics/executive-summary');
    return res.data;
  },
};
