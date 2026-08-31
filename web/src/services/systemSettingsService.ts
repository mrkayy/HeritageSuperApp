import api from '@/lib/api';

export interface SystemSettings {
  ministry_name: string;
  support_email: string;
  support_phone: string;
  website_url: string;
  timezone: string;
  date_format: string;
  default_language: string;
  session_timeout_minutes: number;
  max_pin_attempts: number;
  pin_lockout_minutes: number;
  magic_link_expiry_hours: number;
  enforce_pin_login: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  foundation_class_min_attendance: number;
  followup_sla_days: number;
  auto_archive_inactive_months: number;
  email_sender_name: string;
  email_sender_address: string;
  sms_enabled: boolean;
  sms_sender_id: string;
  updated_at: string;
}

export type UpdateSystemSettingsPayload = Partial<Omit<SystemSettings, 'updated_at'>>;

export interface RolePermissionsMatrix {
  permissions: Record<string, Record<string, Record<string, boolean>>>;
  updated_at: string;
}

export interface SystemDiagnostics {
  status: string;
  database_status: string;
  server_time: string;
  uptime_seconds: number;
  environment: string;
  version: string;
  total_users: number;
  total_churches: number;
  total_members: number;
  active_feature_flags: number;
}

export interface BranchSetting {
  id: string;
  church_id: string;
  foundation_class_min_attendance: number;
}

export const SystemSettingsService = {
  async getSettings(): Promise<SystemSettings> {
    const res = await api.get('/super-admin/settings');
    return res.data;
  },

  async updateSettings(payload: UpdateSystemSettingsPayload): Promise<SystemSettings> {
    const res = await api.put('/super-admin/settings', payload);
    return res.data;
  },

  async getRolePermissions(): Promise<RolePermissionsMatrix> {
    const res = await api.get('/super-admin/settings/permissions');
    return res.data;
  },

  async updateRolePermissions(permissions: Record<string, Record<string, Record<string, boolean>>>): Promise<RolePermissionsMatrix> {
    const res = await api.put('/super-admin/settings/permissions', { permissions });
    return res.data;
  },

  async getDiagnostics(): Promise<SystemDiagnostics> {
    const res = await api.get('/super-admin/settings/diagnostics');
    return res.data;
  },

  async getChurchSettings(churchId: string): Promise<BranchSetting> {
    const res = await api.get(`/super-admin/settings/churches/${churchId}`);
    return res.data;
  },

  async updateChurchSettings(churchId: string, minAttendance: number): Promise<BranchSetting> {
    const res = await api.put(`/super-admin/settings/churches/${churchId}`, {
      foundation_class_min_attendance: minAttendance
    });
    return res.data;
  },
};
