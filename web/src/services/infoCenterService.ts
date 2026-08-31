import api from '@/lib/api';

export interface Visitor {
  visitor_id: string;
  church_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  email?: string;
  address: string;
  first_attendance_date: string;
  prayer_request?: string;
  invited_by_member_id?: string;
  invited_by_text?: string;
  visit_count: number;
  last_attended_date: string;
  status: 'first_timer' | 'returning_visitor' | 'foundation_class_candidate' | 'profiled';
  notes?: string;
  created_by: string;
  profiled_member_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  attendance_id: string;
  church_id: string;
  visitor_id: string;
  service_date: string;
  service_type?: string;
  recorded_by: string;
  created_at: string;
}

export interface ChurchSettings {
  id: string;
  church_id: string;
  foundation_class_min_attendance: number;
}

export interface CreateVisitorPayload {
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  email?: string;
  address: string;
  prayer_request?: string;
  invited_by_member_id?: string;
  invited_by_text?: string;
  notes?: string;
}

export interface MarkAttendancePayload {
  visitor_id: string;
  service_type?: string;
}

export const InfoCenterService = {
  // Visitors
  async createVisitor(data: CreateVisitorPayload): Promise<Visitor> {
    const res = await api.post('/info-center/visitors', data);
    return res.data;
  },

  async listVisitors(params?: { query?: string; status?: string }): Promise<Visitor[]> {
    const res = await api.get('/info-center/visitors', { params });
    return res.data || [];
  },

  async getVisitor(id: string): Promise<Visitor> {
    const res = await api.get(`/info-center/visitors/${id}`);
    return res.data;
  },

  async updateVisitor(id: string, data: Partial<CreateVisitorPayload>): Promise<Visitor> {
    const res = await api.patch(`/info-center/visitors/${id}`, data);
    return res.data;
  },

  async checkPhone(phone: string): Promise<Visitor | null> {
    try {
      const res = await api.get('/info-center/visitors/check-phone', { params: { phone } });
      return res.data;
    } catch {
      return null;
    }
  },

  // Attendance
  async markAttendance(data: MarkAttendancePayload): Promise<AttendanceRecord> {
    const res = await api.post('/info-center/attendance/mark', data);
    return res.data;
  },

  async getVisitorAttendance(visitorId: string): Promise<AttendanceRecord[]> {
    const res = await api.get(`/info-center/visitors/${visitorId}/attendance`);
    return res.data || [];
  },

  // Foundation Class
  async listFoundationCandidates(): Promise<Visitor[]> {
    const res = await api.get('/info-center/foundation-candidates');
    return res.data || [];
  },

  async recommendForFoundation(visitorId: string, notes?: string): Promise<void> {
    await api.post(`/info-center/foundation-recommendations/${visitorId}`, { notes });
  },

  // Settings
  async getSettings(): Promise<ChurchSettings> {
    const res = await api.get('/info-center/settings');
    return res.data;
  },

  async updateSettings(data: { foundation_class_min_attendance: number }): Promise<ChurchSettings> {
    const res = await api.put('/info-center/settings', data);
    return res.data;
  },
};
