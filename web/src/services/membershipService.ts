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
  isProfiled?: boolean;
  sourceTeam?: string;
  createdBy?: string;
  localChurchId?: string;
  localChurchName?: string;
  sectorId?: string;
  sectorName?: string;
  teamId?: string;
  teamName?: string;
  volunteeringTeamId?: string;
  volunteeringTeamName?: string;
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
  role?: string;
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

export interface ProfileChangeRequest {
  id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  requested_by_user_id: string;
  requested_by_name: string;
  reviewed_by_user_id?: string;
  reviewed_by_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  payload_json: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface FirstTimerAssignment {
  id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  first_visit_date: string;
  assigned_to_user_id: string;
  assigned_to_name: string;
  assigned_by_user_id: string;
  status: 'pending' | 'contacted' | 'unreachable' | 'completed';
  current_stage: string;
  created_at: string;
}

export interface CallLog {
  id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  caller_id: string;
  caller_name: string;
  call_date: string;
  outcome: 'reached_welcomed' | 'unreachable' | 'requested_callback' | 'pastoral_attention';
  summary_notes: string;
  pastoral_escalation_needed: boolean;
  created_at: string;
}

export interface WeeklyPastoralSummary {
  week_label: string;
  total_first_timers_received: number;
  total_calls_completed: number;
  total_unreachable: number;
  pastoral_escalation_count: number;
  recent_logs: CallLog[];
}

export interface AcademyCohort {
  id: string;
  church_id: string;
  module_type: string;
  cohort_name: string;
  start_date: string;
  end_date?: string;
  status: 'enrolling' | 'active' | 'completed';
  total_count: number;
  created_at: string;
}

export interface ContinuousAssessment {
  id: string;
  enrollment_id: string;
  assignment_score: number;
  verbal_assessment_score: number;
  participation_score: number;
  disciplers_report_score: number;
  proof_of_note_score: number;
  attendance_score: number;
  total_score: number;
  discipler_devotion_rating: number;
  discipler_evangelism_rating: number;
  makeup_completed: boolean;
  graded_by_user_id?: string;
  updated_at: string;
}

export interface CohortEnrollment {
  id: string;
  cohort_id: string;
  member_id: string;
  member_name: string;
  teacher_id?: string;
  teacher_name?: string;
  status: 'enrolled' | 'passed' | 'makeup_required' | 'retake_required' | 'dropped';
  assessment?: ContinuousAssessment;
  created_at: string;
}

export interface VolunteerApplication {
  id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  preferred_team_1_id?: string;
  preferred_team_1_name?: string;
  preferred_team_2_id?: string;
  preferred_team_2_name?: string;
  skills_notes: string;
  status: 'pending' | 'placed';
  placed_by_user_id?: string;
  placed_at?: string;
  created_at: string;
}

export interface CelebrationAlert {
  member_id: string;
  member_name: string;
  phone: string;
  email?: string;
  type: 'birthday' | 'anniversary' | 'landmark';
  date_label: string;
  days_remaining: number;
  photo_url?: string;
  landmark_details?: string;
}

export interface MemberLandmark {
  id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  landmark_type: 'graduation' | 'childbirth' | 'wedding' | 'career' | 'custom';
  title: string;
  institution_or_org: string;
  event_date: string;
  notes: string;
  created_by_user_id?: string;
  created_at: string;
}

export interface SituationReport {
  id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  category: 'health' | 'bereavement' | 'childbirth' | 'academic_distress' | 'job_loss' | 'counseling' | 'relocation' | 'general';
  notes: string;
  action_taken: string;
  is_urgent: boolean;
  filed_by_user_id: string;
  filed_by_name: string;
  pastor_reviewed: boolean;
  created_at: string;
}

export interface UnprofiledVisitor {
  id: string;
  church_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  first_attendance_date: string;
  address: string;
  email?: string;
  visit_count: number;
  foundation_recommended: boolean;
}

export interface MemberTransfer {
  id: string;
  member_id: string;
  member_name: string;
  origin_church_id: string;
  origin_church_name: string;
  destination_church_id: string;
  destination_church_name: string;
  transfer_reason: string;
  pastoral_recommendation: string;
  status: 'pending' | 'approved' | 'rejected';
  initiated_by_user_id: string;
  initiated_by_name: string;
  reviewed_by_user_id?: string;
  reviewed_by_name?: string;
  created_at: string;
  reviewed_at?: string;
}

export class MembershipService {
  static async fetchMembers(teamId?: string): Promise<Member[]> {
    const { data } = await api.get('/members', {
      params: teamId ? { teamId } : undefined,
    });
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

  static async fetchMemberById(id: string): Promise<Member> {
    const { data } = await api.get(`/members/${id}`);
    return data;
  }

  static async createMember(payload: SaveMemberPayload): Promise<Member> {
    const { data } = await api.post('/members', payload);
    return data;
  }

  // Alias for createMember
  static async addMember(payload: SaveMemberPayload): Promise<Member> {
    return this.createMember(payload);
  }

  static async bulkProfileJSON(payload: SaveMemberPayload[]): Promise<any> {
    const { data } = await api.post('/members/bulk', payload);
    return data;
  }

  static async profileMember(payload: SaveMemberPayload): Promise<Member> {
    const { data } = await api.post('/members/profile', payload);
    return data;
  }

  static async updateMember(id: string, payload: SaveMemberPayload): Promise<Member> {
    const { data } = await api.put(`/members/${id}`, payload);
    return data;
  }

  static async deleteMember(id: string): Promise<void> {
    await api.delete(`/members/${id}`);
  }

  // 1. Maker-Checker Profile Change Requests
  static async proposeUpdate(memberId: string, payload: Partial<SaveMemberPayload>): Promise<ProfileChangeRequest> {
    const { data } = await api.post(`/members/${memberId}/propose-update`, payload);
    return data;
  }

  static async listPendingChangeRequests(): Promise<ProfileChangeRequest[]> {
    const { data } = await api.get('/members/change-requests');
    return data || [];
  }

  static async reviewChangeRequest(id: string, approved: boolean, rejectionReason?: string): Promise<void> {
    await api.post(`/members/change-requests/${id}/review`, { approved, rejection_reason: rejectionReason });
  }

  // 2. First-Timer CRM Call Allocation
  static async assignFirstTimers(visitorIds: string[], assignedToId: string): Promise<void> {
    await api.post('/members/assignments/batch', { visitor_ids: visitorIds, assigned_to_id: assignedToId });
  }

  static async listMyAssignedFirstTimers(): Promise<FirstTimerAssignment[]> {
    const { data } = await api.get('/members/assignments/my');
    return data || [];
  }

  static async logCall(payload: { member_id: string; outcome: string; summary_notes: string; pastoral_escalation_needed: boolean }): Promise<CallLog> {
    const { data } = await api.post('/members/call-logs', payload);
    return data;
  }

  static async getWeeklyPastoralSummary(): Promise<WeeklyPastoralSummary> {
    const { data } = await api.get('/members/reports/weekly-pastoral-summary');
    return data;
  }

  // 3. Discipleship Academy Pipeline
  static async createCohort(payload: { module_type: string; cohort_name: string; start_date: string }): Promise<AcademyCohort> {
    const { data } = await api.post('/members/cohorts', payload);
    return data;
  }

  static async listCohorts(): Promise<AcademyCohort[]> {
    const { data } = await api.get('/members/cohorts');
    return data || [];
  }

  static async enrollStudent(cohortId: string, payload: { member_id: string; teacher_id?: string }): Promise<CohortEnrollment> {
    const { data } = await api.post(`/members/cohorts/${cohortId}/enroll`, payload);
    return data;
  }

  static async listEnrollments(cohortId: string): Promise<CohortEnrollment[]> {
    const { data } = await api.get(`/members/cohorts/${cohortId}/enrollments`);
    return data || [];
  }

  static async gradeAssessment(enrollmentId: string, payload: Partial<ContinuousAssessment>): Promise<ContinuousAssessment> {
    const { data } = await api.put(`/members/enrollments/${enrollmentId}/grade`, payload);
    return data;
  }

  static async graduateEnrollment(enrollmentId: string): Promise<void> {
    await api.post(`/members/enrollments/${enrollmentId}/graduate`);
  }

  // 4. Volunteering Intake
  static async applyVolunteer(payload: { preferred_team_1_id?: string; preferred_team_2_id?: string; skills_notes: string }): Promise<VolunteerApplication> {
    const { data } = await api.post('/members/volunteer-applications', payload);
    return data;
  }

  static async listVolunteerApplications(): Promise<VolunteerApplication[]> {
    const { data } = await api.get('/members/volunteer-applications');
    return data || [];
  }

  static async placeVolunteer(applicationId: string, targetTeamId: string): Promise<void> {
    await api.post('/members/volunteer-assignments', { application_id: applicationId, target_team_id: targetTeamId });
  }

  // 5. Celebrations & Landmarks
  static async getUpcomingCelebrations(days: number = 3): Promise<CelebrationAlert[]> {
    const { data } = await api.get('/members/celebrations/upcoming', { params: { days } });
    return data || [];
  }

  static async createLandmark(payload: { member_id: string; landmark_type: string; title: string; institution_or_org: string; event_date: string; notes: string }): Promise<MemberLandmark> {
    const { data } = await api.post('/members/landmarks', payload);
    return data;
  }

  static async listLandmarks(): Promise<MemberLandmark[]> {
    const { data } = await api.get('/members/landmarks');
    return data || [];
  }

  // 6. Pastoral Situation Reports
  static async createSitRep(payload: { member_id: string; category: string; notes: string; action_taken: string; is_urgent: boolean }): Promise<SituationReport> {
    const { data } = await api.post('/members/situation-reports', payload);
    return data;
  }

  static async listSitRepsForMember(memberId: string): Promise<SituationReport[]> {
    const { data } = await api.get(`/members/${memberId}/situation-reports`);
    return data || [];
  }

  // 7. Gatekeeper Visitor Profiling
  static async listUnprofiledVisitors(): Promise<UnprofiledVisitor[]> {
    const { data } = await api.get('/members/unprofiled-visitors');
    return data || [];
  }

  static async profileVisitorFull(visitorId: string, payload: any): Promise<Member> {
    const { data } = await api.post(`/members/visitors/${visitorId}/profile-full`, payload);
    return data;
  }

  // 8. Inter-Branch Member Transfers
  static async initiateTransfer(payload: { member_id: string; destination_church_id: string; transfer_reason: string; pastoral_recommendation: string }): Promise<MemberTransfer> {
    const { data } = await api.post('/members/transfers/initiate', payload);
    return data;
  }

  static async listInboundTransfers(): Promise<MemberTransfer[]> {
    const { data } = await api.get('/members/transfers/inbound');
    return data || [];
  }

  static async reviewTransfer(transferId: string, approved: boolean, sectorId?: string): Promise<void> {
    await api.post(`/members/transfers/${transferId}/review`, { approved, sector_id: sectorId });
  }
}
