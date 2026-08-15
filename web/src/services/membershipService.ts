import api from '@/lib/api';

export interface Member {
  id: string;
  firstName: string;
  surname: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  homeAddress?: string;
  gender?: string;
  dateOfBirthDay?: number;
  dateOfBirthMonth?: number;
  maritalStatus?: string;
  weddingAnniversaryDay?: number;
  weddingAnniversaryMonth?: number;
  jobOccupation?: string;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  medicalNotes?: string;
  isPlaceholder?: boolean;
  sourceTeam?: string;
  createdBy?: string;
  localChurchId?: string;
  localChurchName?: string;
  sectorId?: string;
  sectorName?: string;
  teamId?: string;
  teamName?: string;
  currentStage: string;
  role?: string;
  roles?: string[];
  joinedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaveMemberPayload {
  firstName: string;
  surname: string;
  email?: string;
  phoneNumber?: string;
  homeAddress?: string;
  gender?: string;
  dateOfBirthDay?: number | null;
  dateOfBirthMonth?: number | null;
  maritalStatus?: string;
  weddingAnniversaryDay?: number | null;
  weddingAnniversaryMonth?: number | null;
  jobOccupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  medicalNotes?: string;
  currentStage?: string;
  localChurchId?: string;
  sectorId?: string;
  teamId?: string;
}

export class MembershipService {
  static async fetchMembers(): Promise<Member[]> {
    const { data } = await api.get('/members');
    return data || [];
  }

  static async fetchStageCounts(): Promise<Record<string, number>> {
    const { data } = await api.get('/members/stage-counts');
    return data || {};
  }

  static async fetchGuardianRelationships(memberId: string): Promise<any[]> {
    const { data } = await api.get(`/members/${memberId}/relationships`);
    return data || [];
  }

  static async addGuardianRelationship(payload: { child_member_id: string; guardian_member_id: string; relationship: string }): Promise<void> {
    await api.post(`/members/relationships`, payload);
  }

  static async deleteGuardianRelationship(relId: string): Promise<void> {
    await api.delete(`/members/relationships/${relId}`);
  }

  static async fetchMembersPaginated(
    page: number,
    limit: number,
    search: string,
    stage: string,
    teamId?: string
  ): Promise<{
    members: Member[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { data } = await api.get('/members', {
      params: { page, limit, search, stage, teamId },
    });
    return data;
  }

  static async getMember(id: string): Promise<Member> {
    const { data } = await api.get(`/members/${id}`);
    return data;
  }

  static async updateMember(id: string, payload: SaveMemberPayload): Promise<Member> {
    const { data } = await api.put(`/members/${id}`, payload);
    return data;
  }

  static async addMember(payload: SaveMemberPayload): Promise<Member> {
    const { data } = await api.post('/members', payload);
    return data;
  }

  static async profileMember(payload: {
    name: string;
    email: string;
    role: string;
    current_stage: string;
    team_id?: string;
    sector_id?: string;
    church_id?: string;
  }): Promise<Member> {
    const { data } = await api.post('/members/profile', payload);
    return data;
  }

  static async deleteMember(id: string): Promise<void> {
    await api.delete(`/members/${id}`);
  }

  static async bulkProfileCSV(file: File): Promise<{
    totalRecords: number;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    errors: { row: number; name: string; error: string }[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/members/bulk-profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  static async bulkProfileJSON(members: any[]): Promise<{
    totalRecords: number;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    errors: { row: number; name: string; error: string }[];
  }> {
    const { data } = await api.post('/members/bulk-profile-json', { members });
    return data;
  }
}
